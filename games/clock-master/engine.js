// Clock Master (时光钟表师) Engine

/**
 * Converts hours (1-12) and minutes (0-59) to dial angles in degrees (0 = 12 o'clock, clockwise)
 */
export function timeToAngles(hours, minutes) {
  const normH = hours % 12;
  const minuteAngle = (minutes % 60) * 6; // 360 / 60 = 6 deg/min
  const hourAngle = (normH * 30 + (minutes % 60) * 0.5) % 360; // 30 deg/hr + 0.5 deg/min
  return { minuteAngle, hourAngle };
}

/**
 * Adds minutes to an existing time
 */
export function addTime(hours, minutes, deltaMinutes) {
  let totalMin = hours * 60 + minutes + deltaMinutes;
  while (totalMin < 0) totalMin += 12 * 60;
  const totalHours = Math.floor(totalMin / 60);
  let h = totalHours % 12;
  if (h === 0) h = 12;
  const m = totalMin % 60;
  return { hours: h, minutes: m };
}

/**
 * Checks if user time matches target time (within tolerance of 2 minutes)
 */
export function isTimeMatch(userH, userM, targetH, targetM, toleranceMinutes = 2) {
  const uTotal = (userH % 12) * 60 + userM;
  const tTotal = (targetH % 12) * 60 + targetM;
  let diff = Math.abs(uTotal - tTotal);
  if (diff > 6 * 60) {
    diff = 12 * 60 - diff;
  }
  return diff <= toleranceMinutes;
}

export function calculateStars(moves, optimalMoves) {
  if (moves <= optimalMoves) return 3;
  if (moves <= optimalMoves + 2) return 2;
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
