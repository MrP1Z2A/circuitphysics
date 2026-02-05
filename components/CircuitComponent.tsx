
import React, { useState } from 'react';
import { CircuitComponent, ComponentType } from '../types';

interface ComponentProps {
  component: CircuitComponent;
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onDelete: () => void;
  onTerminalClick: (e: React.MouseEvent | React.TouchEvent, terminalId: string) => void;
  onToggle: () => void;
  onUpdateValue: (val: number) => void;
  onUpdateProps: (props: Partial<CircuitComponent>) => void;
  isSourceOfWire?: boolean;
}

export const CircuitComponentView: React.FC<ComponentProps> = ({ 
  component, 
  onMouseDown,
  onTouchStart,
  onDelete, 
  onTerminalClick,
  onToggle,
  onUpdateValue,
  onUpdateProps,
  isSourceOfWire
}) => {
  const { type, state, x, y, terminals, value, current, isBlown, maxCurrent, flipped } = component;
  const [isInteracting, setIsInteracting] = useState(false);

  const renderVisual = () => {
    switch (type) {
      case ComponentType.BATTERY:
        return (
          <g transform={`translate(-40, -25) ${flipped ? 'rotate(180, 40, 25)' : ''}`}>
            <rect width="80" height="50" rx="6" className="fill-slate-800 stroke-slate-600 stroke-2" />
            <rect x="0" y="0" width="15" height="50" className="fill-blue-600" rx="3" />
            <text x="40" y="32" textAnchor="middle" transform={flipped ? 'rotate(180, 40, 32)' : ''} className="fill-blue-300 text-[9px] font-mono font-bold uppercase tracking-wider">9V CELL</text>
            <text x="7" y="30" textAnchor="middle" className="fill-white text-[14px] font-bold">+</text>
            <text x="70" y="30" textAnchor="middle" className="fill-white text-[14px] font-bold">-</text>
            <rect x="25" y="35" width="30" height="10" rx="3" className="fill-blue-900/40 cursor-pointer hover:fill-blue-700 transition-colors" 
              onClick={(e) => { e.stopPropagation(); onUpdateProps({ flipped: !flipped }); }} />
            <text x="40" y="42" textAnchor="middle" transform={flipped ? 'rotate(180, 40, 42)' : ''} className="fill-blue-200 text-[7px] font-bold pointer-events-none">FLIP</text>
          </g>
        );
      case ComponentType.SOLAR_PANEL:
        return (
          <g transform={`translate(-45, -35) ${flipped ? 'rotate(180, 45, 35)' : ''}`}>
            <rect width="90" height="70" rx="4" className="fill-blue-950 stroke-blue-800 stroke-2" />
            <line x1="0" y1="23" x2="90" y2="23" className="stroke-blue-700 stroke-1" />
            <line x1="0" y1="46" x2="90" y2="46" className="stroke-blue-700 stroke-1" />
            <line x1="30" y1="0" x2="30" y2="70" className="stroke-blue-700 stroke-1" />
            <line x1="60" y1="0" x2="60" y2="70" className="stroke-blue-700 stroke-1" />
            <text x="45" y="85" textAnchor="middle" className="fill-yellow-500 text-[8px] font-bold uppercase">Solar: {(value || 50).toFixed(0)}% Light</text>
            <circle cx={45} cy={-25} r={10} className="fill-yellow-500 blur-[2px] animate-pulse opacity-80" />
            
            <rect x="20" y="88" width="50" height="4" rx="2" className="fill-slate-800" />
            <circle cx={20 + (value || 50) / 2} cy="90" r="6" className="fill-yellow-500 stroke-slate-900 stroke-1 cursor-ew-resize"
              onMouseDown={(e) => {
                e.stopPropagation();
                setIsInteracting(true);
                const startX = e.clientX;
                const startVal = value || 50;
                const onMove = (me: MouseEvent) => {
                  const delta = (me.clientX - startX) * 0.5;
                  onUpdateValue(Math.max(0, Math.min(100, startVal + delta)));
                };
                const onUp = () => { setIsInteracting(false); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
              }}
            />
          </g>
        );
      case ComponentType.DIODE:
        return (
          <g transform={`translate(-40, -15) ${flipped ? 'rotate(180, 40, 15)' : ''}`}>
            <rect width="80" height="30" rx="4" className="fill-slate-900 stroke-slate-700 stroke-2" />
            <rect x="10" y="0" width="8" height="30" className="fill-slate-400" />
            <path d="M35 5 L55 15 L35 25 Z" className="fill-slate-500" />
            <line x1="55" y1="5" x2="55" y2="25" className="stroke-slate-500 stroke-[3]" />
            <text x="40" y="42" textAnchor="middle" className="fill-slate-500 text-[8px] font-bold uppercase tracking-widest">DIODE</text>
          </g>
        );
      case ComponentType.BULB:
        const bulbGlow = Math.min(1, (current || 0) * 1.5);
        return (
          <g transform="translate(-35, -45)">
            <circle cx="35" cy="30" r="28" className={`transition-colors duration-500 ${state ? 'fill-yellow-100 stroke-yellow-200' : 'fill-slate-800/40 stroke-slate-700'} stroke-2`} />
            {state && (
              <circle cx="35" cy="30" r="35" className="fill-yellow-400 opacity-20 blur-md animate-pulse" style={{ opacity: bulbGlow * 0.3 }} />
            )}
            <path d="M25 55 L45 55 L40 70 L30 70 Z" className="fill-slate-600 stroke-slate-500" />
            <path d="M25 25 Q 35 10 45 25" className="stroke-slate-400 fill-none stroke-2" />
            <text x="35" y="82" textAnchor="middle" className="fill-slate-500 text-[8px] font-bold">INCANDESCENT</text>
          </g>
        );
      case ComponentType.HEATER:
        const heatColor = state ? `rgb(${100 + Math.min(155, (current || 0) * 200)}, 50, 50)` : '#334155';
        return (
          <g transform="translate(-40, -25)">
            <rect width="80" height="50" rx="8" className="fill-slate-900 stroke-slate-700 stroke-2" />
            <path d="M15 15 Q 20 5 25 15 Q 30 25 35 15 Q 40 5 45 15 Q 50 25 55 15 Q 60 5 65 15" 
              className="stroke-[4] fill-none transition-colors duration-1000" 
              stroke={heatColor} strokeLinecap="round" />
            <text x="40" y="42" textAnchor="middle" className="fill-slate-500 text-[8px] font-bold uppercase">HEATER</text>
          </g>
        );
      case ComponentType.RESISTOR:
        return (
          <g transform="translate(-40, -15)">
            <rect width="80" height="30" rx="15" className="fill-[#d4b08c] stroke-slate-500 stroke-2" />
            <rect x="20" y="0" width="8" height="30" fill="#8B4513" />
            <rect x="35" y="0" width="8" height="30" fill="#FFD700" />
            <rect x="50" y="0" width="8" height="30" fill="#A52A2A" />
            <text x="40" y="48" textAnchor="middle" className="fill-slate-500 text-[10px] font-mono font-bold">100 Ω</text>
          </g>
        );
      case ComponentType.POTENTIOMETER:
        return (
          <g transform="translate(-40, -30)">
            <rect width="80" height="60" rx="8" className={`fill-slate-800 stroke-2 transition-colors ${isInteracting ? 'stroke-blue-400' : 'stroke-slate-600'}`} />
            <circle cx="40" cy="25" r="18" className={`transition-colors ${isInteracting ? 'fill-slate-600 stroke-blue-400' : 'fill-slate-700 stroke-slate-500'} stroke-2`} />
            <line x1="40" y1="25" x2={40 + 15 * Math.cos(((value! / 1000) * 1.5 - 0.75) * Math.PI)} y2={25 + 15 * Math.sin(((value! / 1000) * 1.5 - 0.75) * Math.PI)} className="stroke-blue-400 stroke-[3]" strokeLinecap="round" />
            <text x="40" y="52" textAnchor="middle" className={`text-[10px] font-mono font-bold transition-colors ${isInteracting ? 'fill-blue-400' : 'fill-blue-300'}`}>{value?.toFixed(0)} Ω</text>
            <circle cx="40" cy="25" r="28" className="fill-transparent cursor-ns-resize" 
              onMouseDown={(e) => {
                e.stopPropagation();
                setIsInteracting(true);
                const startY = e.clientY;
                const startVal = value || 0;
                const onMove = (me: MouseEvent) => {
                  const delta = (startY - me.clientY) * 5;
                  onUpdateValue(Math.max(0.1, Math.min(1000, startVal + delta)));
                };
                const onUp = () => { setIsInteracting(false); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
              }}
            />
          </g>
        );
      case ComponentType.MOTOR:
        return (
          <g transform="translate(-40, -40)">
            <circle cx="40" cy="40" r="35" className="fill-slate-800 stroke-slate-600 stroke-2" />
            <g transform={`rotate(${state ? (Date.now() / 2) % 360 : 0}, 40, 40)`}>
               <path d="M40 10 L45 40 L35 40 Z" className="fill-slate-400" />
               <circle cx="40" cy="40" r="8" className="fill-slate-500" />
               <rect x="38" y="10" width="4" height="60" rx="2" className="fill-slate-300 opacity-50" />
               <rect x="10" y="38" width="60" height="4" rx="2" className="fill-slate-300 opacity-50" />
            </g>
            <text x="40" y="45" textAnchor="middle" className="fill-white text-[10px] font-bold pointer-events-none">M</text>
          </g>
        );
      case ComponentType.BUZZER:
        return (
          <g transform={`translate(-35, -35) ${state ? 'translate('+(Math.random()*2-1)+','+(Math.random()*2-1)+')' : ''}`}>
            <rect width="70" height="70" rx="35" className="fill-slate-900 stroke-slate-700 stroke-2" />
            <circle cx="35" cy="35" r="25" className="fill-slate-800 stroke-slate-700 stroke-1" />
            <circle cx="35" cy="35" r="5" className="fill-slate-600" />
            {state && (
              <g className="stroke-blue-400 stroke-2 opacity-50 fill-none">
                <path d="M70 35 Q 85 20 85 35 Q 85 50 70 35" />
                <path d="M0 35 Q -15 20 -15 35 Q -15 50 0 35" />
              </g>
            )}
            <text x="35" y="78" textAnchor="middle" className="fill-slate-500 text-[8px] font-bold">BUZZER</text>
          </g>
        );
      case ComponentType.LDR:
        return (
          <g transform="translate(-40, -20)">
            <rect width="80" height="40" rx="20" className="fill-[#7c4d3a] stroke-slate-600 stroke-2" />
            <path d="M15 20 C 25 10, 55 30, 65 20" className="stroke-red-500 stroke-[3] fill-none" />
            <text x="40" y="12" textAnchor="middle" className="fill-white text-[6px] font-bold uppercase">LDR</text>
            <text x="40" y="55" textAnchor="middle" className="fill-yellow-500 text-[8px] font-bold">{(value || 50).toFixed(0)}% Light</text>
            
            <rect x="15" y="60" width="50" height="4" rx="2" className="fill-slate-800" />
            <circle cx={15 + (value || 50) / 2} cy="62" r="6" className="fill-yellow-500 stroke-slate-900 stroke-1 cursor-ew-resize"
              onMouseDown={(e) => {
                e.stopPropagation();
                setIsInteracting(true);
                const startX = e.clientX;
                const startVal = value || 50;
                const onMove = (me: MouseEvent) => {
                  const delta = (me.clientX - startX) * 0.5;
                  onUpdateValue(Math.max(0, Math.min(100, startVal + delta)));
                };
                const onUp = () => { setIsInteracting(false); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
              }}
            />
          </g>
        );
      case ComponentType.CAPACITOR:
        return (
          <g transform="translate(-25, -40)">
            <rect x="0" y="0" width="50" height="80" rx="4" className="fill-slate-800 stroke-slate-600 stroke-2" />
            <rect x="0" y="10" width="50" height="15" className="fill-slate-700" />
            <text x="25" y="45" textAnchor="middle" transform="rotate(90, 25, 45)" className="fill-slate-400 text-[10px] font-mono font-bold tracking-widest">100µF</text>
            <text x="25" y="70" textAnchor="middle" className="fill-slate-500 text-[14px] font-bold">-</text>
          </g>
        );
      case ComponentType.SWITCH:
        return (
          <g transform="translate(-40, -20)" onClick={(e) => { e.stopPropagation(); onToggle(); }} className="cursor-pointer">
            <rect width="80" height="40" rx="8" className="fill-slate-800 stroke-slate-600 stroke-2" />
            {state ? (
              <line x1="15" y1="20" x2="65" y2="20" className="stroke-emerald-400 stroke-[5]" strokeLinecap="round" />
            ) : (
              <line x1="15" y1="20" x2="55" y2="5" className="stroke-red-500 stroke-[5]" strokeLinecap="round" />
            )}
            <text x="40" y="35" textAnchor="middle" className="fill-slate-500 text-[7px] font-bold uppercase tracking-tight">{state ? 'CLOSED' : 'OPEN'}</text>
          </g>
        );
      case ComponentType.FUSE:
        const progress = Math.min(1, (maxCurrent || 0.3) / 2);
        return (
          <g transform="translate(-40, -35)">
            <rect width="80" height="70" rx="8" className={`fill-slate-800 stroke-2 transition-colors ${isInteracting ? 'stroke-orange-400' : 'stroke-slate-600'}`} />
            <line x1="10" y1="35" x2="70" y2="35" className={isBlown ? 'stroke-red-900 stroke-[1] stroke-dasharray-[3]' : 'stroke-orange-400 stroke-[3]'} />
            <text x="40" y="15" textAnchor="middle" className="fill-slate-500 text-[8px] font-bold">SAFETY FUSE</text>
            <text x="40" y="27" textAnchor="middle" className={`text-[12px] font-mono font-bold ${isBlown ? 'fill-red-500' : 'fill-orange-300'}`}>
               {isBlown ? 'BLOWN' : (maxCurrent || 0.3).toFixed(2) + 'A'}
            </text>
            {!isBlown ? (
              <g className="cursor-ew-resize">
                <rect x="15" y="52" width="50" height="4" rx="2" className="fill-slate-700" />
                <rect x="15" y="52" width={50 * progress} height="4" rx="2" className="fill-orange-500/50" />
                <circle cx={15 + 50 * progress} cy="54" r="6" className={`transition-colors ${isInteracting ? 'fill-orange-400' : 'fill-slate-400'} stroke-slate-900 stroke-1`} />
                <rect x="10" y="45" width="60" height="20" className="fill-transparent"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setIsInteracting(true);
                    const startX = e.clientX;
                    const startLim = maxCurrent || 0.3;
                    const onMove = (me: MouseEvent) => {
                      const delta = (me.clientX - startX) * 0.02;
                      onUpdateProps({ maxCurrent: Math.max(0.05, Math.min(2, startLim + delta)) });
                    };
                    const onUp = () => { setIsInteracting(false); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
                    window.addEventListener('mousemove', onMove);
                    window.addEventListener('mouseup', onUp);
                  }}
                />
              </g>
            ) : (
              <g onClick={(e) => { e.stopPropagation(); onUpdateProps({ isBlown: false }); }} className="cursor-pointer">
                <rect x="15" y="48" width="50" height="16" rx="8" className="fill-emerald-600 hover:fill-emerald-500 transition-colors shadow-lg shadow-emerald-900/20" />
                <text x="40" y="59" textAnchor="middle" className="fill-white text-[9px] font-bold uppercase tracking-tighter">RESET</text>
              </g>
            )}
          </g>
        );
      case ComponentType.LED:
        return (
          <g transform="translate(-30, -30)">
            <circle cx="30" cy="30" r="25" className={`transition-all duration-300 ${state ? 'fill-yellow-400 stroke-yellow-200 shadow-lg shadow-yellow-500/50' : 'fill-slate-800 stroke-slate-700'} stroke-2`} />
            {state && (
              <circle cx="30" cy="30" r={25 + Math.min(10, (current || 0) * 10)} className="fill-yellow-400 opacity-20 animate-pulse" />
            )}
            <text x="30" y="37" textAnchor="middle" className="text-[14px] pointer-events-none">💡</text>
          </g>
        );
      case ComponentType.AMMETER:
        return (
          <g transform="translate(-40, -40)">
            <circle cx="40" cy="40" r="35" className="fill-slate-900 stroke-blue-500 stroke-2" />
            <text x="40" y="32" textAnchor="middle" className="fill-blue-400 text-[8px] font-bold tracking-widest uppercase">AMMETER</text>
            <text x="40" y="55" textAnchor="middle" className="fill-white text-[14px] font-mono font-bold">{(value || 0).toFixed(1)} mA</text>
          </g>
        );
      case ComponentType.VOLTMETER:
        return (
          <g transform="translate(-40, -40)">
            <circle cx="40" cy="40" r="35" className="fill-slate-900 stroke-emerald-500 stroke-2" />
            <text x="40" y="32" textAnchor="middle" className="fill-emerald-400 text-[8px] font-bold tracking-widest uppercase">VOLTMETER</text>
            <text x="40" y="55" textAnchor="middle" className="fill-white text-[14px] font-mono font-bold">{(value || 0).toFixed(1)} V</text>
          </g>
        );
      default:
        return null;
    }
  };

  return (
    <g 
      transform={`translate(${x}, ${y})`} 
      onMouseDown={isInteracting ? undefined : onMouseDown} 
      onTouchStart={isInteracting ? undefined : onTouchStart}
      onDoubleClick={onDelete} 
      className="cursor-move group"
    >
      {renderVisual()}
      
      {(current || 0) > 0.001 && (
        <g transform="translate(0, -65)">
          <rect x="-35" y="-12" width="70" height="18" rx="5" className="fill-blue-600/90 shadow-2xl" />
          <text textAnchor="middle" y="1" className="fill-white text-[10px] font-bold font-mono tracking-tight">{(current! * 1000).toFixed(1)} mA</text>
        </g>
      )}

      {terminals.map((term, i) => (
        <g key={term.id} onClick={(e) => onTerminalClick(e, term.id)}>
          <circle cx={term.relX} cy={term.relY} r="18" className="fill-transparent cursor-crosshair" />
          <circle
            cx={term.relX}
            cy={term.relY}
            r="7"
            className={`
              transition-all duration-300 pointer-events-none
              ${isSourceOfWire && i === (term.id.endsWith('0') ? 0 : 1) ? 'fill-blue-400 r-[10] animate-pulse' : 'fill-slate-600 group-hover:fill-slate-500'}
              stroke-slate-900 stroke-2
            `}
          />
        </g>
      ))}
    </g>
  );
};
