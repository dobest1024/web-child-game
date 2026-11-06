// 纯逻辑层：不接触任何浏览器对象，可在 Node 里直接 import。
import { quickSeconds } from './levels.js';

// 把单个差异应用到参数对象上，返回新对象，不修改原参数。
export function applyDiff(params, diff) {
  const next = structuredClone(params);
  const keys = diff.path.split('.');
  let node = next;
  for (const key of keys.slice(0, -1)) {
    node = node[key];
    if (!node || typeof node !== 'object')
      throw new Error(`差异路径不存在：${diff.path}`);
  }
  const last = keys[keys.length - 1];
  if (!(last in node)) throw new Error(`差异路径不存在：${diff.path}`);
  node[last] = diff.value;
  return next;
}

// 依次应用全部差异，得到第二幅图的参数。
export const applyDiffs = (params, diffs) => diffs.reduce(applyDiff, params);

// 命中判定：点落在热区圆内（含边界）返回差异下标，否则返回 -1。
export function hitTest(diffs, x, y) {
  for (let index = 0; index < diffs.length; index++) {
    const zone = diffs[index].zone;
    const dx = x - zone.x,
      dy = y - zone.y;
    if (dx * dx + dy * dy <= zone.r * zone.r) return index;
  }
  return -1;
}

// 洗牌差异下标，让键盘 Tab 的热区顺序不泄露位置规律。random 可注入便于测试。
export function shuffleDiffs(diffs, random = Math.random) {
  const order = diffs.map((_, index) => index);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

// 星级：不用提示且 90 秒内 3 星；不用提示超时或 90 秒内最多 1 次提示 2 星；其余过关 1 星。
export function score({ usedHints = 0, seconds = quickSeconds + 1 } = {}) {
  if (usedHints === 0 && seconds <= quickSeconds) return 3;
  if (usedHints === 0 || (usedHints <= 1 && seconds <= quickSeconds)) return 2;
  return 1;
}

// 存档清洗：只保留合法关卡下标与 1–3 的整数星数。
export function cleanProgress(saved, total) {
  const clean = {};
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return clean;
  for (const [id, stars] of Object.entries(saved)) {
    const index = Number(id);
    if (!Number.isInteger(index) || index < 0 || index >= total) continue;
    if (!Number.isInteger(stars) || stars < 1 || stars > 3) continue;
    clean[index] = stars;
  }
  return clean;
}

export const solvedCount = (progress) => Object.keys(progress).length;

export const isComplete = (progress, total) => solvedCount(progress) >= total;

export function formatTime(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
