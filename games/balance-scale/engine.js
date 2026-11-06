import { levels } from './levels.js';

export const WEIGHT_VALUES = [20, 50, 100, 200];
// Visual tilt is capped so a heavy side never flips the scene over.
export const MAX_TILT = 12;
const TILT_FLOOR = 3;

export function itemCount(item) {
  return item.count || 1;
}
export function itemsTotal(items) {
  return items.reduce((sum, item) => sum + item.weight * itemCount(item), 0);
}
export function weightsTotal(weights) {
  return weights.reduce((sum, weight) => sum + weight.value, 0);
}
export function createWeights(stock) {
  const weights = [];
  for (const value of WEIGHT_VALUES)
    for (let i = 0; i < (stock[value] || 0); i++)
      weights.push({ id: `w${value}-${i}`, value });
  return weights;
}
export function emptyState(stock) {
  return { box: createWeights(stock), left: [], right: [] };
}
const byWeight = (a, b) => a.value - b.value || a.id.localeCompare(b.id);
export function placeWeight(state, side, id) {
  if (side !== 'left' && side !== 'right') return state;
  const weight = state.box.find((item) => item.id === id);
  if (!weight) return state;
  return {
    box: state.box.filter((item) => item.id !== id),
    left: side === 'left' ? [...state.left, weight] : state.left,
    right: side === 'right' ? [...state.right, weight] : state.right,
  };
}
export function removeWeight(state, id) {
  const side = state.left.some((item) => item.id === id)
    ? 'left'
    : state.right.some((item) => item.id === id)
      ? 'right'
      : null;
  if (!side) return state;
  const weight = state[side].find((item) => item.id === id);
  return {
    box: [...state.box, weight].sort(byWeight),
    left: side === 'left' ? state.left.filter((item) => item.id !== id) : state.left,
    right:
      side === 'right' ? state.right.filter((item) => item.id !== id) : state.right,
  };
}
export function clearPans(state) {
  return {
    box: [...state.box, ...state.left, ...state.right].sort(byWeight),
    left: [],
    right: [],
  };
}
export function panTotals(level, state) {
  return {
    left: itemsTotal(level.left) + weightsTotal(state.left),
    right: itemsTotal(level.right) + weightsTotal(state.right),
  };
}
export function diffOf(level, state) {
  const totals = panTotals(level, state);
  return totals.left - totals.right;
}
export function usedWeights(state) {
  return state.left.length + state.right.length;
}
export function isSolved(level, state) {
  return usedWeights(state) > 0 && diffOf(level, state) === 0;
}
export function tiltOf(level, state) {
  const diff = diffOf(level, state);
  if (diff === 0) return { side: null, deg: 0 };
  const deg = Math.min(MAX_TILT, Math.max(TILT_FLOOR, Math.abs(diff) * 0.06));
  return { side: diff > 0 ? 'left' : 'right', deg };
}
export function score(level, state, takeBacks) {
  if (!isSolved(level, state)) return 0;
  const used = usedWeights(state);
  return 1 + (used <= level.threeStar ? 1 : 0) + (takeBacks === 0 ? 1 : 0);
}
// Exhaustive search over every way to leave stock weights in the box or on a
// pan. Stock never exceeds eight weights, so 3^n states stay tiny. Prefers
// fewer weights, then fewer weights on the left pan.
function popcount(value) {
  let count = 0;
  while (value) {
    value &= value - 1;
    count++;
  }
  return count;
}
function valuesOf(stock, mask) {
  return stock
    .filter((_, i) => mask & (1 << i))
    .map((weight) => weight.value)
    .sort((a, b) => b - a);
}
export function findSolution(level) {
  const stock = createWeights(level.stock);
  const need = itemsTotal(level.right) - itemsTotal(level.left);
  const n = stock.length;
  let best = null;
  for (let used = 0; used < 1 << n; used++) {
    const usedCount = popcount(used);
    if (best && usedCount > best.used) continue;
    for (let leftMask = used; ; leftMask = (leftMask - 1) & used) {
      let leftSum = 0;
      let rightSum = 0;
      for (let i = 0; i < n; i++) {
        const bit = 1 << i;
        if (leftMask & bit) leftSum += stock[i].value;
        else if (used & bit) rightSum += stock[i].value;
      }
      if (leftSum - rightSum === need) {
        const leftCount = popcount(leftMask);
        if (
          !best ||
          usedCount < best.used ||
          (usedCount === best.used && leftCount < best.leftCount)
        )
          best = {
            used: usedCount,
            leftCount,
            left: valuesOf(stock, leftMask),
            right: valuesOf(stock, used & ~leftMask),
          };
      }
      if (leftMask === 0) break;
    }
  }
  return best;
}
export function describeEquation(level, state) {
  const side = (pan) => [
    ...level[pan].flatMap((item) =>
      Array(itemCount(item)).fill(item.weight),
    ),
    ...state[pan].map((weight) => weight.value),
  ];
  const terms = (values) =>
    values
      .sort((a, b) => b - a)
      .join(' + ') || '0';
  return `${terms(side('left'))} = ${terms(side('right'))}`;
}
export function hiddenReveal(level) {
  return [...level.left, ...level.right]
    .filter((item) => item.hidden)
    .map((item) => `${item.name}重 ${item.weight} 克`);
}
export function cleanProgress(raw) {
  const clean = {};
  if (!raw || typeof raw !== 'object') return clean;
  for (const [id, stars] of Object.entries(raw)) {
    const levelId = Number(id);
    if (!Number.isInteger(levelId) || levelId < 0 || levelId >= levels.length)
      continue;
    if (!Number.isInteger(stars) || stars < 1 || stars > 3) continue;
    clean[levelId] = stars;
  }
  return clean;
}
