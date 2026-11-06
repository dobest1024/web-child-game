// Color Lab (光影调色师) Engine

/**
 * Mix light beams (Additive RGB mixing)
 * @param {number} r - 0 to 1
 * @param {number} g - 0 to 1
 * @param {number} b - 0 to 1
 * @returns {{ r: number, g: number, b: number, hex: string }}
 */
export function mixLight(r, g, b) {
  const clamp = v => Math.min(255, Math.max(0, Math.round(v * 255)));
  const ir = clamp(r);
  const ig = clamp(g);
  const ib = clamp(b);
  const hex = '#' + [ir, ig, ib].map(x => x.toString(16).padStart(2, '0')).join('');
  return { r: ir, g: ig, b: ib, hex };
}

/**
 * Mix pigments (Subtractive CMYK mixing)
 * Cyan, Magenta, Yellow, plus White (lightens) and Black (darkens)
 * @param {Object} drops - { c: number, m: number, y: number, w: number, k: number }
 * @returns {{ r: number, g: number, b: number, hex: string }}
 */
export function mixPigment(drops = {}) {
  const c = drops.c || 0;
  const m = drops.m || 0;
  const y = drops.y || 0;
  const w = drops.w || 0;
  const k = drops.k || 0;

  const coloredTotal = c + m + y;
  const total = coloredTotal + w + k;

  if (total === 0) {
    return { r: 255, g: 255, b: 255, hex: '#ffffff' }; // blank white canvas
  }

  // Normalized CMY absorption
  let normC = coloredTotal > 0 ? c / (coloredTotal + 1) : 0;
  let normM = coloredTotal > 0 ? m / (coloredTotal + 1) : 0;
  let normY = coloredTotal > 0 ? y / (coloredTotal + 1) : 0;

  // Black adds to absorption
  if (k > 0) {
    const kRatio = k / total;
    normC = Math.min(1, normC + kRatio * 0.8);
    normM = Math.min(1, normM + kRatio * 0.8);
    normY = Math.min(1, normY + kRatio * 0.8);
  }

  // White dilutes absorption
  if (w > 0) {
    const wRatio = w / total;
    normC *= (1 - wRatio * 0.6);
    normM *= (1 - wRatio * 0.6);
    normY *= (1 - wRatio * 0.6);
  }

  // Convert CMY absorption to RGB: R = 255 * (1 - C), etc.
  const r = Math.round(255 * (1 - normC));
  const g = Math.round(255 * (1 - normM));
  const b = Math.round(255 * (1 - normY));

  const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  return { r, g, b, hex };
}

/**
 * Color distance (perceptual approximation in weighted RGB)
 */
export function colorDistance(rgb1, rgb2) {
  const dr = rgb1.r - rgb2.r;
  const dg = rgb1.g - rgb2.g;
  const db = rgb1.b - rgb2.b;
  // Weighted RGB distance for human eye perception (green is most sensitive)
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db) / 3;
}

export function isColorMatch(currentRgb, targetRgb, threshold = 25) {
  return colorDistance(currentRgb, targetRgb) <= threshold;
}

export function calculateStars(distance, optimalMoves, actualMoves) {
  if (distance > 25) return 0;
  if (distance <= 12 && actualMoves <= optimalMoves) return 3;
  if (distance <= 20) return 2;
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
