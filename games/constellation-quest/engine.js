// Constellation Quest (星空连线家) Engine

/**
 * Normalizes an edge representation [idA, idB] so idA < idB
 */
export function normalizeEdge(idA, idB) {
  return idA < idB ? `${idA}-${idB}` : `${idB}-${idA}`;
}

/**
 * Check if the player's connected lines match target constellation lines
 * @param {Array<[string, string]>} targetLines - Array of [starA, starB]
 * @param {Array<string>} userEdges - Array of normalized edge keys
 * @returns {{ matched: boolean, missing: number, extra: number }}
 */
export function verifyConstellation(targetLines, userEdges) {
  const targetSet = new Set(targetLines.map(([a, b]) => normalizeEdge(a, b)));
  const userSet = new Set(userEdges);

  let missing = 0;
  for (const edge of targetSet) {
    if (!userSet.has(edge)) missing++;
  }

  let extra = 0;
  for (const edge of userSet) {
    if (!targetSet.has(edge)) extra++;
  }

  return {
    matched: missing === 0 && extra === 0,
    missing,
    extra,
    totalTarget: targetSet.size,
  };
}

export function calculateStars(missing, extra, mistakes) {
  if (missing > 0) return 0;
  if (extra === 0 && mistakes === 0) return 3;
  if (extra <= 1 && mistakes <= 2) return 2;
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
