
import React, { useState, useRef, useEffect } from 'react';
import { CircuitComponent, Wire, Point } from '../types';
import { CircuitComponentView } from './CircuitComponent';

const GRID_SIZE = 20;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3.0;

interface CircuitCanvasProps {
  components: CircuitComponent[];
  wires: Wire[];
  onUpdateComponent: (comp: CircuitComponent) => void;
  onUpdateComponentProps: (id: string, props: Partial<CircuitComponent>) => void;
  onDeleteComponent: (id: string) => void;
  onAddWire: (fromId: string, toId: string) => void;
  onDeleteWire: (id: string) => void;
}

export const CircuitCanvas: React.FC<CircuitCanvasProps> = ({ 
  components, 
  wires, 
  onUpdateComponent, 
  onUpdateComponentProps,
  onDeleteComponent,
  onAddWire,
  onDeleteWire
}) => {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [activeTerminal, setActiveTerminal] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
  
  const [viewTransform, setViewTransform] = useState({ x: 0, y: 0, k: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement>(null);
  const contentRef = useRef<SVGGElement>(null);

  const getEventPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent): Point => {
    const contentGroup = contentRef.current;
    if (!contentGroup) return { x: 0, y: 0 };
    
    const CTM = contentGroup.getScreenCTM();
    if (!CTM) return { x: 0, y: 0 };
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = (e as any).touches[0].clientX;
      clientY = (e as any).touches[0].clientY;
    } else {
      clientX = (e as any).clientX;
      clientY = (e as any).clientY;
    }
    
    const inv = CTM.inverse();
    return {
      x: clientX * inv.a + clientY * inv.c + inv.e,
      y: clientX * inv.b + clientY * inv.d + inv.f
    };
  };

  const snap = (val: number) => Math.round(val / GRID_SIZE) * GRID_SIZE;

  const handleStart = (e: React.MouseEvent | React.TouchEvent, id: string) => {
    e.stopPropagation();
    const pos = getEventPos(e);
    const comp = components.find(c => c.id === id);
    if (comp) {
      setDragId(id);
      setDragOffset({ x: comp.x - pos.x, y: comp.y - pos.y });
    }
  };

  const handleBgStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeTerminal) return;
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = (e as any).touches[0].clientX;
      clientY = (e as any).touches[0].clientY;
    } else {
      clientX = (e as any).clientX;
      clientY = (e as any).clientY;
    }

    setIsPanning(true);
    setPanStart({ x: clientX - viewTransform.x, y: clientY - viewTransform.y });
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getEventPos(e);
    setMousePos(pos);

    let clientX, clientY;
    if ('touches' in e) {
      clientX = (e as any).touches[0].clientX;
      clientY = (e as any).touches[0].clientY;
    } else {
      clientX = (e as any).clientX;
      clientY = (e as any).clientY;
    }

    if (dragId) {
      const comp = components.find(c => c.id === dragId);
      if (comp) {
        onUpdateComponent({ ...comp, x: snap(pos.x + dragOffset.x), y: snap(pos.y + dragOffset.y) });
      }
    } else if (isPanning) {
      setViewTransform(prev => ({
        ...prev,
        x: clientX - panStart.x,
        y: clientY - panStart.y
      }));
    }
  };

  const handleEnd = () => {
    setDragId(null);
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 1 - e.deltaY * 0.001;
    const newK = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewTransform.k * zoomFactor));
    
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const dx = (mouseX - viewTransform.x) / viewTransform.k;
    const dy = (mouseY - viewTransform.y) / viewTransform.k;

    setViewTransform({
      k: newK,
      x: mouseX - dx * newK,
      y: mouseY - dy * newK
    });
  };

  const adjustZoom = (delta: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const newK = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewTransform.k + delta));
    const dx = (centerX - viewTransform.x) / viewTransform.k;
    const dy = (centerY - viewTransform.y) / viewTransform.k;

    setViewTransform({
      k: newK,
      x: centerX - dx * newK,
      y: centerY - dy * newK
    });
  };

  const resetZoom = () => {
    setViewTransform({ x: 0, y: 0, k: 1 });
  };

  const getTerminalPos = (terminalId: string): Point => {
    const [compId, termIdx] = terminalId.split('-');
    const comp = components.find(c => c.id === compId);
    if (!comp) return { x: 0, y: 0 };
    const term = comp.terminals[parseInt(termIdx)];
    return { x: comp.x + term.relX, y: comp.y + term.relY };
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      <svg 
        ref={svgRef} 
        className={`w-full h-full touch-none ${isPanning ? 'cursor-grabbing' : 'cursor-default'}`} 
        onMouseMove={handleMove} 
        onMouseUp={handleEnd} 
        onMouseLeave={handleEnd}
        onMouseDown={handleBgStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        onTouchStart={handleBgStart}
        onWheel={handleWheel}
        onClick={() => setActiveTerminal(null)}
      >
        <defs>
          <pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#1e293b" />
          </pattern>
          <style>{`
            @keyframes electron-flow { from { stroke-dashoffset: 40; } to { stroke-dashoffset: 0; } }
            @keyframes electron-flow-reverse { from { stroke-dashoffset: 0; } to { stroke-dashoffset: 40; } }
            .electron-path { animation: electron-flow var(--flow-speed, 1s) linear infinite; }
            .electron-path-reverse { animation: electron-flow-reverse var(--flow-speed, 1s) linear infinite; }
          `}</style>
        </defs>

        <rect width="100%" height="100%" fill="url(#grid)" />

        <g ref={contentRef} transform={`translate(${viewTransform.x}, ${viewTransform.y}) scale(${viewTransform.k})`}>
          <rect x="-10000" y="-10000" width="20000" height="20000" fill="url(#grid)" opacity="0.3" pointerEvents="none" />

          {wires.map(wire => {
            const p1 = getTerminalPos(wire.fromTerminalId);
            const p2 = getTerminalPos(wire.toTerminalId);
            
            // Strictly check for conventional current flow (+ to -)
            const isCurrentlyActive = wire.isActive && (wire.current || 0) > 0.0001;
            
            // Dynamic flow speed based on current magnitude - visually intuitive
            const flowSpeed = isCurrentlyActive ? Math.max(0.1, 1.2 / Math.min(5, (wire.current || 0.1) * 3)) : 0;
            const isReverse = (wire.direction || 1) < 0;

            return (
              <g key={wire.id} className="group">
                <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} className="stroke-transparent stroke-[24] cursor-pointer" onClick={(e) => { e.stopPropagation(); onDeleteWire(wire.id); }} />
                <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} className={`transition-all duration-700 ${isCurrentlyActive ? 'stroke-blue-400/30' : 'stroke-slate-700'} stroke-[4] group-hover:stroke-red-500/50`} strokeLinecap="round" />
                
                {/* Conventional current flow animation (High V -> Low V) */}
                {isCurrentlyActive && (
                  <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} 
                    className={`stroke-blue-300 stroke-[2.5] ${isReverse ? 'electron-path-reverse' : 'electron-path'} pointer-events-none drop-shadow-[0_0_2px_rgba(56,189,248,0.5)]`}
                    strokeDasharray="8 16" 
                    style={{ '--flow-speed': `${flowSpeed}s` } as React.CSSProperties} 
                    strokeLinecap="round"
                  />
                )}
              </g>
            );
          })}

          {activeTerminal && (
            <line x1={getTerminalPos(activeTerminal).x} y1={getTerminalPos(activeTerminal).y} x2={mousePos.x} y2={mousePos.y} className="stroke-blue-400 stroke-2 opacity-50 pointer-events-none" strokeDasharray="4" />
          )}

          {components.map(comp => (
            <CircuitComponentView key={comp.id} component={comp} 
              onMouseDown={(e) => handleStart(e, comp.id)} 
              onTouchStart={(e) => handleStart(e, comp.id)}
              onDelete={() => onDeleteComponent(comp.id)}
              onTerminalClick={(e, tid) => { 
                e.stopPropagation(); 
                if (activeTerminal) { 
                  onAddWire(activeTerminal, tid); 
                  setActiveTerminal(null); 
                } else { 
                  setActiveTerminal(tid); 
                } 
              }}
              onUpdateValue={(val) => onUpdateComponentProps(comp.id, { value: val })}
              onUpdateProps={(props) => onUpdateComponentProps(comp.id, props)}
              onToggle={() => onUpdateComponent({ ...comp, state: !comp.state })}
              isSourceOfWire={activeTerminal?.startsWith(comp.id)} />
          ))}
        </g>
      </svg>

      <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-20">
        <button onClick={() => adjustZoom(0.2)} className="w-10 h-10 bg-slate-800/90 border border-slate-700 text-white rounded-lg shadow-xl flex items-center justify-center hover:bg-slate-700 active:scale-95 transition-all text-xl font-bold">
          +
        </button>
        <button onClick={() => adjustZoom(-0.2)} className="w-10 h-10 bg-slate-800/90 border border-slate-700 text-white rounded-lg shadow-xl flex items-center justify-center hover:bg-slate-700 active:scale-95 transition-all text-xl font-bold">
          −
        </button>
        <button onClick={resetZoom} className="w-10 h-10 bg-slate-800/90 border border-slate-700 text-slate-300 rounded-lg shadow-xl flex items-center justify-center hover:bg-slate-700 active:scale-95 transition-all">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>
      </div>

      <div className="absolute bottom-6 left-6 pointer-events-none">
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 px-3 py-1 rounded-full text-[10px] text-slate-500 font-mono">
          ZOOM: {Math.round(viewTransform.k * 100)}%
        </div>
      </div>
    </div>
  );
};
