// Circuit Lab Engine
// Components on grid:
// - 'battery': { id, row, col, dir: 'E' } (provides + out in dir, - in opp)
// - 'wire': { id, row, col, type: 'straight'|'corner'|'t-junction'|'cross', rot: 0|1|2|3 }
// - 'switch': { id, row, col, closed: boolean, dir: 'H'|'V' }
// - 'bulb': { id, row, col, color: 'yellow'|'red'|'blue', lit: boolean }
// - 'fan': { id, row, col, spinning: boolean }
// - 'buzzer': { id, row, col, active: boolean }

export const GRID_SIZE = 6;

// Port directions: 0 = North, 1 = East, 2 = South, 3 = West
export const OPPOSITE = { 0: 2, 1: 3, 2: 0, 3: 1 };
export const DELTAS = {
  0: { dr: -1, dc: 0 },
  1: { dr: 0, dc: 1 },
  2: { dr: 1, dc: 0 },
  3: { dr: 0, dc: -1 },
};

export function getComponentPorts(comp) {
  if (!comp) return [];
  switch (comp.type) {
    case 'battery':
      // Battery has positive terminal in comp.rot and negative in opposite
      return [comp.rot, OPPOSITE[comp.rot]];
    case 'bulb':
    case 'fan':
    case 'buzzer':
      // 2 opposite terminals (default H: [1, 3] or V: [0, 2])
      return comp.dir === 'V' ? [0, 2] : [1, 3];
    case 'switch':
      // Only connects if closed!
      if (!comp.closed) return [];
      return comp.dir === 'V' ? [0, 2] : [1, 3];
    case 'wire':
      if (comp.wireType === 'straight') {
        return comp.rot % 2 === 0 ? [0, 2] : [1, 3];
      }
      if (comp.wireType === 'corner') {
        // rot 0: N-E (0, 1); rot 1: E-S (1, 2); rot 2: S-W (2, 3); rot 3: W-N (3, 0)
        return [comp.rot, (comp.rot + 1) % 4];
      }
      if (comp.wireType === 't-junction') {
        // All except (rot + 2) % 4
        return [0, 1, 2, 3].filter((d) => d !== (comp.rot + 2) % 4);
      }
      if (comp.wireType === 'cross') {
        return [0, 1, 2, 3];
      }
      return [];
    default:
      return [];
  }
}

export function solveCircuit(components) {
  const map = new Map();
  for (const c of components) {
    map.set(`${c.row},${c.col}`, c);
  }

  const battery = components.find((c) => c.type === 'battery');
  if (!battery) {
    return { isShortCircuit: false, poweredItems: new Set() };
  }

  const posPort = battery.rot; // positive terminal
  const negPort = OPPOSITE[battery.rot]; // negative terminal

  // Check connectivity from posPort back to negPort using BFS/DFS
  // State: (row, col, enterPort)
  const poweredItems = new Set();
  let isShortCircuit = false;

  // Find closed loops through battery:
  // Step out from battery's positive port:
  const startDelta = DELTAS[posPort];
  const startR = battery.row + startDelta.dr;
  const startC = battery.col + startDelta.dc;

  const queue = [{
    r: startR,
    c: startC,
    fromPort: OPPOSITE[posPort],
    pathLoads: [],
    visited: new Set([`${battery.row},${battery.col}`]),
  }];

  const validLoops = [];

  while (queue.length > 0) {
    const curr = queue.shift();
    if (curr.r === battery.row && curr.c === battery.col) {
      if (curr.fromPort === negPort) {
        // Returned to negative terminal! Valid closed loop!
        validLoops.push(curr.pathLoads);
      }
      continue;
    }

    if (curr.r < 0 || curr.r >= GRID_SIZE || curr.c < 0 || curr.c >= GRID_SIZE) continue;

    const comp = map.get(`${curr.r},${curr.c}`);
    if (!comp) continue;

    const ports = getComponentPorts(comp);
    if (!ports.includes(curr.fromPort)) continue; // Can't enter this component through this port

    const stateKey = `${curr.r},${curr.c}`;
    if (curr.visited.has(stateKey)) continue;

    const nextVisited = new Set(curr.visited);
    nextVisited.add(stateKey);

    const nextLoads = [...curr.pathLoads];
    if (['bulb', 'fan', 'buzzer'].includes(comp.type)) {
      nextLoads.push(comp.id);
    }

    // Pass through to other available ports
    for (const outPort of ports) {
      if (outPort === curr.fromPort) continue;
      const d = DELTAS[outPort];
      queue.push({
        r: curr.r + d.dr,
        c: curr.c + d.dc,
        fromPort: OPPOSITE[outPort],
        pathLoads: nextLoads,
        visited: nextVisited,
      });
    }
  }

  for (const loopLoads of validLoops) {
    if (loopLoads.length === 0) {
      // Direct battery (+) to (-) without load -> Short circuit!
      isShortCircuit = true;
    } else {
      for (const id of loopLoads) {
        poweredItems.add(id);
      }
    }
  }

  // If there's a short circuit, batteries heat up and components might not power
  return { isShortCircuit, poweredItems };
}

export function isLevelSolved(targetItems, poweredItems, isShortCircuit) {
  if (isShortCircuit) return false;
  return targetItems.every((id) => poweredItems.has(id));
}

export function sanitizeProgress(raw) {
  const fallback = { cleared: {} };
  if (!raw || typeof raw !== 'object') return fallback;
  const cleared = {};
  if (raw.cleared && typeof raw.cleared === 'object') {
    for (const [k, v] of Object.entries(raw.cleared)) {
      if (typeof v === 'number' && v >= 1 && v <= 3) cleared[k] = v;
    }
  }
  return { cleared };
}
