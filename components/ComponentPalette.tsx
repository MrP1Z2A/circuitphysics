
import React from 'react';
import { ComponentType } from '../types';

interface ComponentPaletteProps {
  onAdd: (type: ComponentType) => void;
}

export const ComponentPalette: React.FC<ComponentPaletteProps> = ({ onAdd }) => {
  const items = [
    { type: ComponentType.BATTERY, label: '9V Battery', icon: '🔋' },
    { type: ComponentType.RESISTOR, label: 'Fixed Resistor', icon: '〰️' },
    { type: ComponentType.POTENTIOMETER, label: 'Variable Resistor', icon: '🎛️' },
    { type: ComponentType.SWITCH, label: 'Single Pole Switch', icon: '⏻' },
    { type: ComponentType.LED, label: 'Signal LED', icon: '💡' },
    { type: ComponentType.MOTOR, label: 'Electric Motor', icon: '⚙️' },
    { type: ComponentType.BUZZER, label: 'Piezo Buzzer', icon: '🔔' },
    { type: ComponentType.LDR, label: 'Photoresistor', icon: '🔆' },
    { type: ComponentType.SOLAR_PANEL, label: 'Solar Panel', icon: '☀️' },
    { type: ComponentType.DIODE, label: 'Rectifier Diode', icon: '▶️' },
    { type: ComponentType.BULB, label: 'Light Bulb', icon: '🔦' },
    { type: ComponentType.HEATER, label: 'Heater', icon: '🔥' },
    { type: ComponentType.CAPACITOR, label: 'Capacitor', icon: '🔋' },
    { type: ComponentType.FUSE, label: 'Safety Fuse', icon: '🧨' },
    { type: ComponentType.AMMETER, label: 'Ammeter (Series)', icon: '⏱️' },
    { type: ComponentType.VOLTMETER, label: 'Voltmeter (Parallel)', icon: '🌡️' },
  ];

  return (
    <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
      <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-slate-500">Equipment Inventory</h2>
      <div className="grid grid-cols-1 gap-2 pb-6">
        {items.map(item => (
          <button
            key={item.type}
            onClick={() => onAdd(item.type)}
            className="group flex items-center gap-3 p-3 bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 hover:border-blue-500/50 rounded-xl transition-all text-left shadow-sm"
          >
            <span className="text-xl group-hover:scale-125 transition-transform duration-300">{item.icon}</span>
            <span className="text-xs font-semibold text-slate-300 group-hover:text-blue-400">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
