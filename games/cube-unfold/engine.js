// Cube Unfold & 3D Rolling Engine

export function createCube(faces = { top: 1, bottom: 6, front: 2, back: 5, left: 3, right: 4 }) {
  return { ...faces };
}

export function rollCube(cube, dir) {
  const { top, bottom, front, back, left, right } = cube;
  switch (dir) {
    case 'N': // roll forward/up
      return { top: front, bottom: back, front: bottom, back: top, left, right };
    case 'S': // roll backward/down
      return { top: back, bottom: front, front: top, back: bottom, left, right };
    case 'E': // roll right
      return { top: left, bottom: right, front, back, left: bottom, right: top };
    case 'W': // roll left
      return { top: right, bottom: left, front, back, left: top, right: bottom };
    default:
      return cube;
  }
}

/**
 * Net definition: array of 6 faces with coordinates (r, c) on a local grid,
 * plus face identifiers (1 to 6) and precomputed opposite pairs.
 */
export function checkOppositePair(oppositePairs, faceA, faceB) {
  return oppositePairs.some(
    ([a, b]) => (a === faceA && b === faceB) || (a === faceB && b === faceA),
  );
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
