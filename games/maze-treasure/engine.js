// 迷宫寻宝队 · 移动与评分（纯逻辑，可在 Node 中直接 import，不碰 DOM）。
// 状态是一个可序列化的普通对象：{ at, steps, keys, stars }。
import { vectors, key, parse, levels } from './levels.js';
export function startState(level) {
  return { at: level.start, steps: 0, keys: [], stars: [] };
}
export function canMove(level, at, direction) {
  const [x, y] = parse(at);
  const nx = x + vectors[direction][0],
    ny = y + vectors[direction][1];
  if (nx < 0 || ny < 0 || nx >= level.size || ny >= level.size) return false;
  return Boolean(level.masks[y * level.size + x] & (1 << direction));
}
// 撞墙和被锁门挡住都不移动、不计步；走进星星或钥匙格自动拾取（去重）。
export function move(level, state, direction) {
  if (!canMove(level, state.at, direction)) return { state, event: 'wall' };
  const [x, y] = parse(state.at);
  const next = key([x + vectors[direction][0], y + vectors[direction][1]]);
  if (next === level.exit && state.keys.length < level.keys.length)
    return { state, event: 'locked' };
  const pickedStar = level.stars.includes(next) && !state.stars.includes(next);
  const pickedKey = level.keys.includes(next) && !state.keys.includes(next);
  const moved = {
    ...state,
    at: next,
    steps: state.steps + 1,
    stars: pickedStar ? [...state.stars, next] : state.stars,
    keys: pickedKey ? [...state.keys, next] : state.keys,
  };
  const event = next === level.exit
    ? 'home'
    : pickedKey
      ? 'key'
      : pickedStar
        ? 'star'
        : 'move';
  return { state: moved, event };
}
// 星级：平安回家 1 星；步数 ≤ 1.5× 参考步数 2 星；
// 捡齐全部星星且步数 ≤ 参考步数 3 星。超步数只少拿星，永远不惩罚重来。
export function score(level, state) {
  if (state.at !== level.exit) return 0;
  if (state.steps <= level.par && state.stars.length === level.stars.length)
    return 3;
  if (state.steps <= Math.ceil(level.par * 1.5)) return 2;
  return 1;
}
// 存档清洗：只保留已知关卡里 1-3 的星数，其余一律丢弃。
export function sanitizeProgress(raw) {
  const clean = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return clean;
  for (const level of levels) {
    const value = raw[level.id] ?? raw[String(level.id)];
    if (value === 1 || value === 2 || value === 3) clean[level.id] = value;
  }
  return clean;
}
