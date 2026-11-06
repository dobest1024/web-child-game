// Gear Lab (齿轮连动坊) Engine

export const GEAR_TYPES = {
  S: { id: 'S', radius: 30, teeth: 12, name: '小齿轮 (12齿)', color: '#3b82f6' },
  M: { id: 'M', radius: 45, teeth: 18, name: '中齿轮 (18齿)', color: '#10b981' },
  L: { id: 'L', radius: 60, teeth: 24, name: '大齿轮 (24齿)', color: '#f59e0b' },
};

export const MESH_TOLERANCE = 5; // px tolerance for distance matching

export function distance(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.hypot(dx, dy);
}

export function canMesh(pegA, gearTypeA, pegB, gearTypeB) {
  const d = distance(pegA, pegB);
  const targetDist = gearTypeA.radius + gearTypeB.radius;
  return Math.abs(d - targetDist) <= MESH_TOLERANCE;
}

/**
 * Solve gear train mechanics:
 * @param {Array} pegs - Array of peg definitions: { id, x, y, fixedGear?: 'S'|'M'|'L', isMotor?: boolean, motorDir?: 1|-1, isTarget?: boolean, targetReq?: { dir?: 1|-1, minSpeed?: number } }
 * @param {Object} placedGears - Map of pegId -> gearType ('S'|'M'|'L')
 * @returns {Object} result: { solved: boolean, jammed: boolean, gearStates: Map<pegId, { speed, dir, angle }>, errors: string[] }
 */
export function solveGears(pegs, placedGears = {}) {
  const pegMap = new Map();
  pegs.forEach(p => pegMap.set(p.id, p));

  // Build active gear map: pegId -> gearType object
  const activeGears = new Map();
  for (const peg of pegs) {
    const gType = peg.fixedGear || placedGears[peg.id];
    if (gType && GEAR_TYPES[gType]) {
      activeGears.set(peg.id, {
        peg,
        type: GEAR_TYPES[gType],
        isMotor: !!peg.isMotor,
        motorDir: peg.motorDir || 1, // 1: CW, -1: CCW
        isTarget: !!peg.isTarget,
        targetReq: peg.targetReq || {},
      });
    }
  }

  // Find all motor gears
  const motorPegIds = [];
  for (const [pegId, item] of activeGears.entries()) {
    if (item.isMotor) motorPegIds.push(pegId);
  }

  if (motorPegIds.length === 0) {
    return { solved: false, jammed: false, gearStates: {}, activeCount: activeGears.size };
  }

  // Check pairwise meshing and build adjacency graph
  const adj = new Map();
  for (const pegId of activeGears.keys()) {
    adj.set(pegId, []);
  }

  const activeEntries = Array.from(activeGears.entries());
  for (let i = 0; i < activeEntries.length; i++) {
    for (let j = i + 1; j < activeEntries.length; j++) {
      const [idA, itemA] = activeEntries[i];
      const [idB, itemB] = activeEntries[j];
      const d = distance(itemA.peg, itemB.peg);
      const sumR = itemA.type.radius + itemB.type.radius;

      // Overlap collision error (distance strictly less than sum of radii without tolerance)
      if (d < sumR - MESH_TOLERANCE) {
        return {
          solved: false,
          jammed: true,
          jamReason: '齿轮相互重叠卡死',
          gearStates: {},
          activeCount: activeGears.size,
        };
      }

      if (Math.abs(d - sumR) <= MESH_TOLERANCE) {
        adj.get(idA).push(idB);
        adj.get(idB).push(idA);
      }
    }
  }

  // BFS / DFS propagation from motor(s)
  const gearStates = {};
  const queue = [];

  for (const motorId of motorPegIds) {
    const motor = activeGears.get(motorId);
    gearStates[motorId] = {
      speed: 1.0,
      dir: motor.motorDir,
      angSpeed: motor.motorDir * 1.0, // signed angular velocity
    };
    queue.push(motorId);
  }

  let jammed = false;

  while (queue.length > 0) {
    const currId = queue.shift();
    const currState = gearStates[currId];
    const currItem = activeGears.get(currId);

    const neighbors = adj.get(currId) || [];
    for (const nextId of neighbors) {
      const nextItem = activeGears.get(nextId);
      // Transmission ratio: nextSpeed = currSpeed * (currTeeth / nextTeeth)
      // Direction alternates: nextDir = -currDir
      const expectedSignedSpeed = -currState.angSpeed * (currItem.type.teeth / nextItem.type.teeth);

      if (gearStates[nextId]) {
        // Already assigned, check consistency (tolerance 0.001)
        if (Math.abs(gearStates[nextId].angSpeed - expectedSignedSpeed) > 0.001) {
          jammed = true;
          break;
        }
      } else {
        gearStates[nextId] = {
          speed: Math.abs(expectedSignedSpeed),
          dir: expectedSignedSpeed > 0 ? 1 : -1,
          angSpeed: expectedSignedSpeed,
        };
        queue.push(nextId);
      }
    }
    if (jammed) break;
  }

  if (jammed) {
    return {
      solved: false,
      jammed: true,
      jamReason: '齿轮传动死锁 (奇数环或矛盾转速咬合)',
      gearStates: {},
      activeCount: activeGears.size,
    };
  }

  // Check if all targets are reached and satisfy requirements
  let allTargetsSatisfied = true;
  let targetCount = 0;

  for (const [pegId, item] of activeGears.entries()) {
    if (item.isTarget) {
      targetCount++;
      const state = gearStates[pegId];
      if (!state) {
        allTargetsSatisfied = false;
        break;
      }
      if (item.targetReq.dir && state.dir !== item.targetReq.dir) {
        allTargetsSatisfied = false;
        break;
      }
      if (item.targetReq.minSpeed && state.speed < item.targetReq.minSpeed - 0.001) {
        allTargetsSatisfied = false;
        break;
      }
    }
  }

  const solved = targetCount > 0 && allTargetsSatisfied;

  return {
    solved,
    jammed: false,
    gearStates,
    activeCount: activeGears.size,
  };
}

export function calculateStars(solved, gearsUsed, optimalGears) {
  if (!solved) return 0;
  if (gearsUsed <= optimalGears) return 3;
  if (gearsUsed <= optimalGears + 1) return 2;
  return 1;
}

export function sanitizeProgress(raw) {
  const fallback = { cleared: {}, stars: {} };
  if (!raw || typeof raw !== 'object') return fallback;
  const cleared = {};
  const stars = {};
  if (raw.cleared && typeof raw.cleared === 'object') {
    for (const [k, v] of Object.entries(raw.cleared)) {
      if (v === true) cleared[k] = true;
    }
  }
  if (raw.stars && typeof raw.stars === 'object') {
    for (const [k, v] of Object.entries(raw.stars)) {
      if (typeof v === 'number' && v >= 1 && v <= 3) stars[k] = Math.floor(v);
    }
  }
  return { cleared, stars };
}
