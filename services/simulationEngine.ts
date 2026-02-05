
import { CircuitComponent, Wire, ComponentType, LabStats } from '../types';

export const simulate = (components: CircuitComponent[], wires: Wire[]) => {
  const compLookup: Record<string, CircuitComponent> = {};
  components.forEach(c => compLookup[c.id] = c);

  const getTerminalId = (compId: string, termIdx: number) => `${compId}-${termIdx}`;

  const findClusters = () => {
    const adj = new Map<string, string[]>();
    wires.forEach(w => {
      if (!adj.has(w.fromTerminalId)) adj.set(w.fromTerminalId, []);
      if (!adj.has(w.toTerminalId)) adj.set(w.toTerminalId, []);
      adj.get(w.fromTerminalId)!.push(w.toTerminalId);
      adj.get(w.toTerminalId)!.push(w.fromTerminalId);
    });

    const visited = new Set<string>();
    const clusters: string[][] = [];
    const allTerminals: string[] = [];
    components.forEach(c => {
      allTerminals.push(getTerminalId(c.id, 0));
      allTerminals.push(getTerminalId(c.id, 1));
    });

    allTerminals.forEach(t => {
      if (!visited.has(t)) {
        const cluster: string[] = [];
        const stack = [t];
        visited.add(t);
        while (stack.length > 0) {
          const curr = stack.pop()!;
          cluster.push(curr);
          (adj.get(curr) || []).forEach(next => {
            if (!visited.has(next)) {
              visited.add(next);
              stack.push(next);
            }
          });
        }
        clusters.push(cluster);
      }
    });
    return clusters;
  };

  const clusters = findClusters();
  const terminalToNodeMap = new Map<string, number>();
  clusters.forEach((cluster, idx) => {
    cluster.forEach(termId => terminalToNodeMap.set(termId, idx));
  });
  const nodeCount = clusters.length;

  const solveSystem = (currentComponents: CircuitComponent[], prevX?: Float64Array) => {
    const powerSources = currentComponents.filter(c => c.type === ComponentType.BATTERY || c.type === ComponentType.SOLAR_PANEL);
    const dim = nodeCount + powerSources.length;
    const A = Array.from({ length: dim }, () => new Float64Array(dim).fill(0));
    const z = new Float64Array(dim).fill(0);

    let groundNode = 0;
    if (powerSources.length > 0) {
      const b = powerSources[0];
      const negIdx = b.flipped ? 0 : 1;
      groundNode = terminalToNodeMap.get(getTerminalId(b.id, negIdx)) ?? 0;
    }

    const GMIN = 1e-12;
    for (let i = 0; i < nodeCount; i++) A[i][i] += GMIN;

    currentComponents.forEach(c => {
      const n0 = terminalToNodeMap.get(getTerminalId(c.id, 0))!;
      const n1 = terminalToNodeMap.get(getTerminalId(c.id, 1))!;
      if (n0 === n1) return; 

      let r = Infinity;
      switch (c.type) {
        case ComponentType.RESISTOR: r = 100; break;
        case ComponentType.POTENTIOMETER: r = Math.max(0.1, c.value || 0); break;
        case ComponentType.LED: r = 50; break;
        case ComponentType.FUSE: r = c.isBlown ? Infinity : 0.05; break;
        case ComponentType.SWITCH: r = c.state ? 0.01 : Infinity; break;
        case ComponentType.AMMETER: r = 0.01; break;
        case ComponentType.VOLTMETER: r = 1e9; break; 
        case ComponentType.MOTOR: r = 40; break;
        case ComponentType.BUZZER: r = 80; break;
        case ComponentType.BULB: r = 20; break;
        case ComponentType.HEATER: r = 10; break;
        case ComponentType.LDR: r = 1000 * (1 - (c.value ?? 50) / 101); break;
        case ComponentType.CAPACITOR: r = 1e9; break;
        case ComponentType.DIODE:
          // Simple Diode Logic: if v0 > v1 (forward), R=0.5, else R=Infinity
          // We use prevX if available to prevent oscillation
          if (prevX) {
            r = (prevX[n0] > prevX[n1]) ? 0.5 : 1e9;
          } else {
            r = 0.5; // Guess forward bias first
          }
          break;
      }

      if (r !== Infinity) {
        const g = 1 / r;
        A[n0][n0] += g;
        A[n1][n1] += g;
        A[n0][n1] -= g;
        A[n1][n0] -= g;
      }
    });

    powerSources.forEach((p, idx) => {
      const posIdx = p.flipped ? 1 : 0;
      const negIdx = p.flipped ? 0 : 1;
      const nPos = terminalToNodeMap.get(getTerminalId(p.id, posIdx))!;
      const nNeg = terminalToNodeMap.get(getTerminalId(p.id, negIdx))!;
      const sourceEqIdx = nodeCount + idx;
      const rInt = 0.1;
      A[sourceEqIdx][nPos] = 1;
      A[sourceEqIdx][nNeg] = -1;
      A[nPos][sourceEqIdx] = 1;
      A[nNeg][sourceEqIdx] = -1;
      A[sourceEqIdx][sourceEqIdx] = -rInt;
      
      if (p.type === ComponentType.SOLAR_PANEL) {
        z[sourceEqIdx] = (p.value ?? 50) * 0.12; // 0V to 12V based on light
      } else {
        z[sourceEqIdx] = 9.0;
      }
    });

    if (nodeCount > 0) {
      A[groundNode].fill(0);
      A[groundNode][groundNode] = 1;
      z[groundNode] = 0;
    }

    return solve(A, z);
  };

  // Iterative approach for nonlinear components like Diodes
  let x = solveSystem(components);
  x = solveSystem(components, x); // Second pass to settle diode states

  let fuseBlownInThisStep = false;
  const componentsWithCheckedFuses = components.map(c => {
    if (c.type === ComponentType.FUSE && !c.isBlown) {
      const n0 = terminalToNodeMap.get(getTerminalId(c.id, 0))!;
      const n1 = terminalToNodeMap.get(getTerminalId(c.id, 1))!;
      const dv = Math.abs(x[n0] - x[n1]);
      const i = dv / 0.05;
      if (i > (c.maxCurrent || 0.3)) {
        fuseBlownInThisStep = true;
        return { ...c, isBlown: true };
      }
    }
    return c;
  });

  if (fuseBlownInThisStep) {
    x = solveSystem(componentsWithCheckedFuses, x);
  }

  let maxPotentialDiff = 0;
  const finalComponents = componentsWithCheckedFuses.map(c => {
    const n0 = terminalToNodeMap.get(getTerminalId(c.id, 0))!;
    const n1 = terminalToNodeMap.get(getTerminalId(c.id, 1))!;
    const v0 = x[n0];
    const v1 = x[n1];
    const dv = Math.abs(v0 - v1);
    if (dv > maxPotentialDiff) maxPotentialDiff = dv;

    let i = 0;
    if (c.type === ComponentType.BATTERY || c.type === ComponentType.SOLAR_PANEL) {
      const sources = components.filter(s => s.type === ComponentType.BATTERY || s.type === ComponentType.SOLAR_PANEL);
      const sIdx = sources.findIndex(s => s.id === c.id);
      i = Math.abs(x[nodeCount + sIdx]);
    } else if (!c.isBlown) {
      let r = 100;
      switch (c.type) {
        case ComponentType.POTENTIOMETER: r = Math.max(0.1, c.value || 0); break;
        case ComponentType.LED: r = 50; break;
        case ComponentType.FUSE: r = 0.05; break;
        case ComponentType.SWITCH: r = c.state ? 0.01 : Infinity; break;
        case ComponentType.AMMETER: r = 0.01; break;
        case ComponentType.VOLTMETER: r = 1e9; break; 
        case ComponentType.MOTOR: r = 40; break;
        case ComponentType.BUZZER: r = 80; break;
        case ComponentType.BULB: r = 20; break;
        case ComponentType.HEATER: r = 10; break;
        case ComponentType.DIODE: r = (v0 > v1) ? 0.5 : 1e9; break;
        case ComponentType.LDR: r = 1000 * (1 - (c.value ?? 50) / 101); break;
        case ComponentType.CAPACITOR: r = 1e9; break;
      }
      if (r !== Infinity) i = dv / r;
    }

    return {
      ...c,
      current: i,
      state: [ComponentType.LED, ComponentType.MOTOR, ComponentType.BUZZER, ComponentType.BULB, ComponentType.HEATER].includes(c.type) ? i > 0.001 : c.state,
      value: c.type === ComponentType.AMMETER ? i * 1000 : (c.type === ComponentType.VOLTMETER ? dv : c.value)
    };
  });

  const FLOW_THRESHOLD = 0.0001; // 0.1mA threshold for showing flow

  const updatedWires = wires.map(w => {
    const nF = terminalToNodeMap.get(w.fromTerminalId)!;
    const nT = terminalToNodeMap.get(w.toTerminalId)!;
    const vF = x[nF];
    const vT = x[nT];
    const dv = vF - vT;
    
    // Conventional current flows High -> Low potential
    const active = Math.abs(dv) > 1e-6; // Electrical connection exists
    const currentMag = Math.abs(dv) / 0.001; // Assuming wire has negligible 1mOhm resistance for flow detection
    const hasFlow = currentMag > FLOW_THRESHOLD;
    const dir = dv >= 0 ? 1 : -1;
    
    return { ...w, isActive: hasFlow, current: currentMag, direction: dir };
  });

  const effectiveTotalI = finalComponents
    .filter(c => c.type === ComponentType.BATTERY || c.type === ComponentType.SOLAR_PANEL)
    .reduce((sum, c) => sum + (c.current || 0), 0);

  return {
    components: finalComponents,
    wires: updatedWires,
    stats: { 
      totalVoltage: maxPotentialDiff,
      totalResistance: effectiveTotalI > 1e-6 ? maxPotentialDiff / effectiveTotalI : 0,
      totalCurrent: effectiveTotalI 
    }
  };
};

function solve(A: Float64Array[], b: Float64Array): Float64Array {
  const n = b.length;
  const m = A.map(row => new Float64Array(row));
  const res = new Float64Array(b);

  for (let i = 0; i < n; i++) {
    let max = Math.abs(m[i][i]);
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(m[k][i]) > max) {
        max = Math.abs(m[k][i]);
        maxRow = k;
      }
    }
    [m[i], m[maxRow]] = [m[maxRow], m[i]];
    [res[i], res[maxRow]] = [res[maxRow], res[i]];

    const pivot = m[i][i];
    if (Math.abs(pivot) < 1e-18) continue;

    for (let k = i + 1; k < n; k++) {
      const c = -m[k][i] / pivot;
      for (let j = i; j < n; j++) {
        m[k][j] += c * m[i][j];
      }
      res[k] += c * res[i];
    }
  }

  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0;
    for (let j = i + 1; j < n; j++) {
      sum += m[i][j] * x[j];
    }
    const pivot = m[i][i];
    x[i] = Math.abs(pivot) < 1e-18 ? 0 : (res[i] - sum) / pivot;
  }
  return x;
}
