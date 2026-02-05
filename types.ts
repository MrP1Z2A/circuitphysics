
export enum ComponentType {
  BATTERY = 'BATTERY',
  RESISTOR = 'RESISTOR',
  POTENTIOMETER = 'POTENTIOMETER',
  SWITCH = 'SWITCH',
  LED = 'LED',
  AMMETER = 'AMMETER',
  VOLTMETER = 'VOLTMETER',
  FUSE = 'FUSE',
  MOTOR = 'MOTOR',
  BUZZER = 'BUZZER',
  LDR = 'LDR',
  CAPACITOR = 'CAPACITOR',
  DIODE = 'DIODE',
  SOLAR_PANEL = 'SOLAR_PANEL',
  HEATER = 'HEATER',
  BULB = 'BULB'
}

export interface Point {
  x: number;
  y: number;
}

export interface Terminal {
  id: string;
  relX: number;
  relY: number;
  type: 'pos' | 'neg' | 'generic';
}

export interface CircuitComponent {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
  terminals: Terminal[];
  state?: boolean; 
  value?: number;  
  current?: number; 
  maxCurrent?: number; 
  isBlown?: boolean; 
  flipped?: boolean; 
}

export interface Wire {
  id: string;
  fromTerminalId: string;
  toTerminalId: string;
  isActive?: boolean;
  current?: number;
  direction?: number; // 1 (forward) or -1 (reverse) for conventional flow
}

export interface LabStats {
  totalVoltage: number;
  totalResistance: number;
  totalCurrent: number;
}
