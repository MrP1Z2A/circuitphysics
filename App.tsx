
import React, { useState, useEffect, useCallback } from 'react';
import { ComponentType, CircuitComponent, Wire, LabStats } from './types';
import { simulate } from './services/simulationEngine';
import { analyzeCircuit } from './services/geminiService';
import { ComponentPalette } from './components/ComponentPalette';
import { CircuitCanvas } from './components/CircuitCanvas';

const App: React.FC = () => {
  const [components, setComponents] = useState<CircuitComponent[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [stats, setStats] = useState<LabStats>({ totalVoltage: 0, totalResistance: 0, totalCurrent: 0 });
  const [analysis, setAnalysis] = useState<string>('Physics Lab initialized. Experiment with series and parallel circuits.');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Responsive sidebar state based on Desktop (lg: 1024px+) vs Mobile/Tablet
  const isDesktop = () => window.innerWidth >= 1024;
  
  const [sidebarOpen, setSidebarOpen] = useState(isDesktop());

  // Listen for resize changes to ensure sidebar behavior stays consistent with device category
  useEffect(() => {
    const handleResize = () => {
      if (isDesktop()) {
        setSidebarOpen(true);
      } else {
        // If transitioning from desktop to tablet/phone, default to closed
        if (sidebarOpen && window.innerWidth < 1024) {
          // Optional: We can choose to keep it open or close it. 
          // Closing it feels more natural for mobile interaction design.
        }
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  const runSimulation = useCallback((currentComponents: CircuitComponent[], currentWires: Wire[]) => {
    const result = simulate(currentComponents, currentWires);
    setComponents(result.components);
    setWires(result.wires);
    setStats(result.stats);
  }, []);

  const handleAddComponent = (type: ComponentType) => {
    const id = `comp_${Date.now()}`;
    const newComp: CircuitComponent = {
      id,
      type,
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      state: type === ComponentType.SWITCH,
      value: type === ComponentType.POTENTIOMETER ? 500 : 0,
      current: 0,
      maxCurrent: type === ComponentType.FUSE ? 0.3 : undefined,
      isBlown: false,
      flipped: false,
      terminals: [
        { id: `${id}-0`, relX: -40, relY: 0, type: type === ComponentType.BATTERY ? 'pos' : 'generic' },
        { id: `${id}-1`, relX: 40, relY: 0, type: type === ComponentType.BATTERY ? 'neg' : 'generic' },
      ]
    };
    runSimulation([...components, newComp], wires);
    // Auto-close menu on phone/tablet to show the component
    if (!isDesktop()) {
      setSidebarOpen(false);
    }
  };

  const handleUpdateComponent = (updatedComp: CircuitComponent) => {
    runSimulation(components.map(c => c.id === updatedComp.id ? updatedComp : c), wires);
  };

  const handleUpdateComponentProps = (id: string, props: Partial<CircuitComponent>) => {
    runSimulation(components.map(c => c.id === id ? { ...c, ...props } : c), wires);
  };

  const handleAddWire = (fromTerminalId: string, toTerminalId: string) => {
    if (fromTerminalId === toTerminalId) return;
    const existing = wires.find(w => 
      (w.fromTerminalId === fromTerminalId && w.toTerminalId === toTerminalId) ||
      (w.fromTerminalId === toTerminalId && w.toTerminalId === fromTerminalId)
    );
    if (existing) return;
    const newWire: Wire = { id: `wire_${Date.now()}`, fromTerminalId, toTerminalId, isActive: false, current: 0 };
    runSimulation(components, [...wires, newWire]);
  };

  const handleAnalyze = async () => {
    if (components.length === 0) return;
    setIsAnalyzing(true);
    const result = await analyzeCircuit(components, wires);
    setAnalysis(result);
    setIsAnalyzing(false);
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-[#0a0f1a] text-slate-100 overflow-hidden select-none font-sans relative">
      {/* 
        Menu Bar (Header): 
        Visible on Phone/Tablet (Portrait & Landscape).
        Hidden on Computer/Laptop (lg:1024px+).
      */}
      <div className="lg:hidden flex items-center justify-between p-3 border-b border-slate-800 bg-[#111827] z-50 shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
             <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <h1 className="text-lg font-bold text-blue-400">LuminaLab</h1>
        </div>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)} 
          className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-blue-400 active:scale-95 transition-transform"
          aria-label="Toggle Equipment Menu"
        >
           <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16m-7 6h7"} />
           </svg>
        </button>
      </div>

      {/* 
        Sidebar:
        Fixed static width on Desktop (Laptop/Computer).
        Overlay Drawer on Mobile/Tablet.
      */}
      <aside className={`
        fixed lg:static top-0 left-0 h-full bg-[#111827] border-r border-slate-800 
        transition-all duration-300 ease-in-out z-40 flex flex-col shadow-2xl
        ${sidebarOpen 
          ? 'translate-x-0 w-72 lg:w-80 p-5 opacity-100' 
          : '-translate-x-full w-0 p-0 opacity-0 overflow-hidden lg:translate-x-0 lg:w-0 lg:border-none'
        }
      `}>
        {/* Sidebar Header (Laptop Only) */}
        <div className="hidden lg:flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-blue-400 whitespace-nowrap">LuminaLab Pro</h1>
        </div>

        {/* Real-time Telemetry */}
        <div className="grid grid-cols-1 gap-2 bg-slate-900/80 p-4 rounded-xl border border-slate-700 shadow-inner mb-6">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Net Potential</span>
            <span className="text-sm font-mono text-emerald-400 font-bold">{stats.totalVoltage.toFixed(2)} V</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Resistance (Req)</span>
            <span className="text-sm font-mono text-amber-400">{stats.totalResistance.toFixed(1)} Ω</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Current (It)</span>
            <span className="text-sm font-mono text-blue-400">{(stats.totalCurrent * 1000).toFixed(1)} mA</span>
          </div>
        </div>

        {/* Component Inventory */}
        <div className="flex-grow overflow-y-auto custom-scrollbar min-h-0">
          <ComponentPalette onAdd={handleAddComponent} />
        </div>

        {/* Lab Controls */}
        <div className="mt-6 flex flex-col gap-3">
          <button onClick={() => { setComponents([]); setWires([]); setStats({totalVoltage:0,totalResistance:0,totalCurrent:0}); if(!isDesktop()) setSidebarOpen(false); }} 
            className="w-full py-3 px-4 rounded-xl bg-red-900/20 hover:bg-red-900/40 text-red-400 transition-all border border-red-900/30 text-[10px] font-bold uppercase tracking-widest active:scale-95">
            Clear Laboratory
          </button>

          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Physics Assistant</h3>
              <button onClick={handleAnalyze} disabled={isAnalyzing} className="text-[10px] font-bold text-blue-400 hover:text-blue-300 disabled:opacity-50">
                {isAnalyzing ? '...' : 'ANALYZE'}
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400 italic font-medium line-clamp-4">
              "{analysis}"
            </p>
          </div>
        </div>
      </aside>

      {/* Simulation Workspace */}
      <main className="flex-grow relative flex flex-col bg-[#0f172a] grid-bg touch-none">
        {/* Floating Status Indicators */}
        <div className="absolute top-4 right-4 lg:left-4 lg:right-auto z-10 flex bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-lg px-3 py-1.5 text-[10px] font-bold text-slate-400 shadow-xl items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="hidden sm:inline">REAL-TIME SOLVER ACTIVE</span>
            <span className="sm:hidden">SOLVER ON</span>
          </div>
          <div className="flex items-center gap-2 border-l border-slate-700 pl-4 text-blue-400">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeWidth="3" /></svg>
            <span className="hidden sm:inline">CONVENTIONAL FLOW</span>
            <span className="sm:hidden">FLOW</span>
          </div>
        </div>
        
        <CircuitCanvas 
          components={components} 
          wires={wires} 
          onUpdateComponent={handleUpdateComponent}
          onUpdateComponentProps={handleUpdateComponentProps}
          onDeleteComponent={(id) => runSimulation(components.filter(c => c.id !== id), wires.filter(w => !w.fromTerminalId.startsWith(id) && !w.toTerminalId.startsWith(id)))}
          onAddWire={handleAddWire}
          onDeleteWire={(id) => runSimulation(components, wires.filter(w => w.id !== id))}
        />
      </main>

      {/* Sidebar Backdrop (Mobile & Tablet) */}
      {sidebarOpen && !isDesktop() && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30" onClick={() => setSidebarOpen(false)}></div>
      )}
    </div>
  );
};

export default App;
