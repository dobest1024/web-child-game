export const TOPPINGS = {
  cheese: { id: 'cheese', name: '芝士', icon: '🧀', color: '#facc15' },
  mushroom: { id: 'mushroom', name: '蘑菇', icon: '🍄', color: '#a8a29e' },
  pepper: { id: 'pepper', name: '青椒', icon: '🫑', color: '#4ade80' },
  corn: { id: 'corn', name: '玉米', icon: '🌽', color: '#fde047' },
  bacon: { id: 'bacon', name: '培根', icon: '🥓', color: '#f87171' },
  shrimp: { id: 'shrimp', name: '虾仁', icon: '🦐', color: '#fb923c' },
};

export function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
}

export function simplifyFraction(num, den) {
  if (num === 0) return { num: 0, den: 1 };
  const d = gcd(num, den);
  return { num: num / d, den: den / d };
}

export function formatFraction(num, den) {
  if (num === 0) return '0';
  if (num === den) return '1';
  return `${num}/${den}`;
}

export function getSliceCounts(slices) {
  const counts = {};
  for (const t of slices) {
    if (t) {
      counts[t] = (counts[t] || 0) + 1;
    }
  }
  return counts;
}

export function matchesOrder(slices, cuts, order) {
  const counts = getSliceCounts(slices);
  // Total occupied slices must match total required
  let totalRequiredSlices = 0;

  for (const [topping, targetFraction] of Object.entries(order)) {
    const actualCount = counts[topping] || 0;
    const actualSimp = simplifyFraction(actualCount, cuts);
    const targetSimp = simplifyFraction(targetFraction.num, targetFraction.den);
    if (actualSimp.num !== targetSimp.num || actualSimp.den !== targetSimp.den) {
      return { match: false, reason: `${TOPPINGS[topping]?.name || topping} 比例不对（需要 ${formatFraction(targetFraction.num, targetFraction.den)}，当前是 ${formatFraction(actualCount, cuts)}）` };
    }
    totalRequiredSlices += (targetFraction.num * cuts) / targetFraction.den;
  }

  // Check if unmentioned toppings exist
  for (const topping of Object.keys(counts)) {
    if (!order[topping]) {
      return { match: false, reason: `披萨上多了不该有的 ${TOPPINGS[topping]?.name || topping}` };
    }
  }

  return { match: true, reason: '完美匹配！' };
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
