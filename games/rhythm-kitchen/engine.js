// Rhythm Kitchen Engine

export const WINDOWS = {
  PERFECT: 90, // ms
  GOOD: 180, // ms
};

export function judgeHit(targetMs, hitMs) {
  const diff = Math.abs(hitMs - targetMs);
  if (diff <= WINDOWS.PERFECT) {
    return { rating: 'PERFECT', score: 100, diff };
  }
  if (diff <= WINDOWS.GOOD) {
    return { rating: 'GOOD', score: 60, diff };
  }
  return { rating: 'MISS', score: 0, diff };
}

export function calculateStars(totalScore, maxScore, misses) {
  if (misses === 0 && totalScore >= maxScore * 0.9) return 3;
  if (misses <= 2 && totalScore >= maxScore * 0.7) return 2;
  if (totalScore >= maxScore * 0.5) return 1;
  return 1;
}

export function sanitizeProgress(raw) {
  const fallback = { cleared: {}, highScores: {} };
  if (!raw || typeof raw !== 'object') return fallback;
  const cleared = {};
  const highScores = {};
  if (raw.cleared && typeof raw.cleared === 'object') {
    for (const [k, v] of Object.entries(raw.cleared)) {
      if (typeof v === 'number' && v >= 1 && v <= 3) cleared[k] = v;
    }
  }
  if (raw.highScores && typeof raw.highScores === 'object') {
    for (const [k, v] of Object.entries(raw.highScores)) {
      if (typeof v === 'number' && v >= 0) highScores[k] = Math.floor(v);
    }
  }
  return { cleared, highScores };
}
