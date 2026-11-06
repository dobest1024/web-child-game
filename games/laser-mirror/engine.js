export const GRID_SIZE = 7;

export const DIRECTIONS = {
  N: { dr: -1, dc: 0, opp: 'S' },
  S: { dr: 1, dc: 0, opp: 'N' },
  E: { dr: 0, dc: 1, opp: 'W' },
  W: { dr: 0, dc: -1, opp: 'E' },
};

export function createMirror(row, col, angle = 0, movable = true) {
  return { type: 'mirror', row, col, angle, movable }; // angle: 0 = '/', 1 = '\'
}

export function createTarget(row, col, color = 'red') {
  return { type: 'target', row, col, color, lit: false };
}

export function createRock(row, col) {
  return { type: 'rock', row, col };
}

export function createEmitter(row, col, dir = 'E', color = 'red') {
  return { type: 'emitter', row, col, dir, color };
}

export function reflectDir(dir, angle) {
  if (angle === 0) {
    // '/' mirror
    if (dir === 'E') return 'N';
    if (dir === 'S') return 'W';
    if (dir === 'W') return 'S';
    if (dir === 'N') return 'E';
  } else {
    // '\' mirror
    if (dir === 'E') return 'S';
    if (dir === 'N') return 'W';
    if (dir === 'W') return 'N';
    if (dir === 'S') return 'E';
  }
  return null;
}

export function traceLaser(emitters, items) {
  const itemMap = new Map();
  for (const item of items) {
    itemMap.set(`${item.row},${item.col}`, item);
  }

  const segments = [];
  const hitTargets = new Set();
  const visited = new Set();

  const queue = [];
  for (const em of emitters) {
    queue.push({
      r: em.row,
      c: em.col,
      dir: em.dir,
      color: em.color,
    });
  }

  while (queue.length > 0) {
    const beam = queue.shift();
    let currR = beam.r;
    let currC = beam.c;
    let currDir = beam.dir;
    const color = beam.color;

    // Step forward until leaving grid or hitting item
    while (true) {
      const stateKey = `${currR},${currC},${currDir},${color}`;
      if (visited.has(stateKey)) break;
      visited.add(stateKey);

      const d = DIRECTIONS[currDir];
      const nextR = currR + d.dr;
      const nextC = currC + d.dc;

      // Out of bounds
      if (nextR < 0 || nextR >= GRID_SIZE || nextC < 0 || nextC >= GRID_SIZE) {
        segments.push({ r1: currR, c1: currC, r2: nextR, c2: nextC, color, terminated: true });
        break;
      }

      segments.push({ r1: currR, c1: currC, r2: nextR, c2: nextC, color });
      currR = nextR;
      currC = nextC;

      const item = itemMap.get(`${currR},${currC}`);
      if (!item) continue;

      if (item.type === 'rock') {
        break; // blocked
      } else if (item.type === 'target') {
        if (item.color === color || item.color === 'any') {
          hitTargets.add(`${currR},${currC}`);
        }
        break; // absorbed by crystal
      } else if (item.type === 'mirror') {
        const nextDir = reflectDir(currDir, item.angle);
        if (nextDir) {
          currDir = nextDir;
        } else {
          break;
        }
      } else if (item.type === 'splitter') {
        // Splits beam into 90-degree left and right
        const leftDir = reflectDir(currDir, 0);
        const rightDir = reflectDir(currDir, 1);
        if (leftDir) queue.push({ r: currR, c: currC, dir: leftDir, color });
        if (rightDir) queue.push({ r: currR, c: currC, dir: rightDir, color });
        break;
      } else if (item.type === 'filter') {
        // change color to filter's color
        queue.push({ r: currR, c: currC, dir: currDir, color: item.color });
        break;
      }
    }
  }

  return { segments, hitTargets };
}

export function isLevelSolved(targets, hitTargets) {
  if (targets.length === 0) return false;
  return targets.every((t) => hitTargets.has(`${t.row},${t.col}`));
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
