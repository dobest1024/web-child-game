// Logic Detective (密室小侦探) Engine

/**
 * Checks if the player's deduced assignments match the case solution
 * @param {Object} solution - { [entityId]: { [attrGroup]: attrValue } }
 * @param {Object} assignments - { [entityId]: { [attrGroup]: attrValue } }
 * @returns {{ solved: boolean, errors: number, total: number }}
 */
export function verifyDeduction(solution, assignments) {
  let errors = 0;
  let total = 0;

  for (const [entityId, attrs] of Object.entries(solution)) {
    const userAttrs = assignments[entityId] || {};
    for (const [group, expectedVal] of Object.entries(attrs)) {
      total++;
      if (userAttrs[group] !== expectedVal) {
        errors++;
      }
    }
  }

  return {
    solved: errors === 0,
    errors,
    total,
  };
}

/**
 * Updates a 2D elimination grid when an assignment is confirmed
 * (auto-marks ❌ on same row and column)
 */
export function markConfirmed(grid, rowIdx, colIdx) {
  const next = grid.map(r => [...r]);
  for (let c = 0; c < next[rowIdx].length; c++) {
    if (c !== colIdx) next[rowIdx][c] = 'no';
  }
  for (let r = 0; r < next.length; r++) {
    if (r !== rowIdx) next[r][colIdx] = 'no';
  }
  next[rowIdx][colIdx] = 'yes';
  return next;
}

export function calculateStars(errors, hintsUsed) {
  if (errors > 0) return 0;
  if (hintsUsed === 0) return 3;
  if (hintsUsed <= 1) return 2;
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
