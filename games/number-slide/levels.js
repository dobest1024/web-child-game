// 数字华容道的难度数据、星级规则与存档清洗。纯数据与纯函数，可在 Node 中直接 import。
export const difficulties = [
  {
    id: 'small',
    size: 3,
    steps: 30,
    name: '3×3 热身',
    blurb: '8 个数字块，先练练手感。',
    starMoves: { three: 60, two: 120 },
  },
  {
    id: 'middle',
    size: 4,
    steps: 80,
    name: '4×4 进阶',
    blurb: '15 个数字块，需要一点小策略。',
    starMoves: { three: 160, two: 320 },
  },
  {
    id: 'grand',
    size: 5,
    steps: 150,
    name: '5×5 挑战',
    blurb: '24 个数字块，慢慢想，不着急。',
    starMoves: { three: 380, two: 760 },
  },
];
export const defaultDifficulty = difficulties[0];
export function getDifficulty(id) {
  return (
    difficulties.find((difficulty) => difficulty.id === id) || defaultDifficulty
  );
}
// 步数越少星星越多：一星只要完成拼图，二星、三星看步数上限。
export function starsFor(difficulty, moves) {
  if (!Number.isFinite(moves) || moves <= 0) return 0;
  if (moves <= difficulty.starMoves.three) return 3;
  if (moves <= difficulty.starMoves.two) return 2;
  return 1;
}
// 存档字段只接受安全整数，坏数据一律记为 null（无记录），绝不抛异常。
const cleanCount = (value, min) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= min
    ? value
    : null;
export function sanitizeProgress(raw) {
  const clean = {};
  if (!raw || typeof raw !== 'object') return clean;
  for (const difficulty of difficulties) {
    const entry = raw[difficulty.id];
    if (!entry || typeof entry !== 'object') continue;
    const stars = cleanCount(entry.stars, 0);
    const record = {
      bestMoves: cleanCount(entry.bestMoves, 1),
      bestTimeMs: cleanCount(entry.bestTimeMs, 0),
      stars: stars !== null && stars <= 3 ? stars : null,
    };
    if (
      record.bestMoves !== null ||
      record.bestTimeMs !== null ||
      record.stars !== null
    )
      clean[difficulty.id] = record;
  }
  return clean;
}
export function parseProgress(text) {
  let raw = null;
  try {
    raw = JSON.parse(text);
  } catch {
    return {};
  }
  return sanitizeProgress(raw);
}
