import { levels } from './levels.js';
// 一笔画小画家 · 纯逻辑引擎。只依赖关卡数据，绝不含 window/document/localStorage，
// 可以在 Node 里直接 import 并测试。
export const edgeKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
const edgeIndexMap = (level) => {
  const map = new Map();
  level.edges.forEach(([a, b], index) => map.set(edgeKey(a, b), index));
  return map;
};
const adjacency = (level) => {
  const list = level.points.map(() => []);
  level.edges.forEach(([a, b], index) => {
    list[a].push({ to: b, edge: index });
    list[b].push({ to: a, edge: index });
  });
  return list;
};
export function edgeIndexOf(level, a, b) {
  return edgeIndexMap(level).get(edgeKey(a, b)) ?? -1;
}
export function degrees(level) {
  const count = level.points.map(() => 0);
  for (const [a, b] of level.edges) {
    count[a]++;
    count[b]++;
  }
  return count;
}
export function oddNodes(level) {
  return degrees(level).reduce((list, degree, node) => {
    if (degree % 2) list.push(node);
    return list;
  }, []);
}
export function isConnected(level) {
  if (degrees(level).some((degree) => !degree)) return false;
  const adj = adjacency(level);
  const seen = new Set([0]);
  const queue = [0];
  while (queue.length) {
    for (const { to } of adj[queue.shift()])
      if (!seen.has(to)) {
        seen.add(to);
        queue.push(to);
      }
  }
  return seen.size === level.points.length;
}
// 有 2 个奇度点时只能从它们出发；0 个奇度点时任何点都可以落笔。
export function startNodes(level) {
  const odd = oddNodes(level);
  return odd.length ? odd : level.points.map((_, index) => index);
}
export function canStart(level, node) {
  return startNodes(level).includes(node);
}
export function walkedEdges(level, path) {
  const walked = new Set();
  for (let i = 1; i < path.length; i++) {
    const edge = edgeIndexOf(level, path[i - 1], path[i]);
    if (edge >= 0) walked.add(edge);
  }
  return walked;
}
export function nextOptions(level, path) {
  if (!path.length) return startNodes(level);
  const walked = walkedEdges(level, path);
  const current = path[path.length - 1];
  return adjacency(level)[current]
    .filter((item) => !walked.has(item.edge))
    .map((item) => item.to);
}
export function move(level, path, target) {
  if (!path.length)
    return canStart(level, target)
      ? { ok: true, path: [target] }
      : { ok: false, reason: 'start' };
  const edge = edgeIndexOf(level, path[path.length - 1], target);
  if (edge < 0) return { ok: false, reason: 'no-edge' };
  if (walkedEdges(level, path).has(edge)) return { ok: false, reason: 'walked' };
  return { ok: true, path: [...path, target] };
}
export function isComplete(level, path) {
  return walkedEdges(level, path).size === level.edges.length;
}
export function isStuck(level, path) {
  return !isComplete(level, path) && !nextOptions(level, path).length;
}
// Hierholzer 求解器：返回从 start 出发走过所有未走边的完整路线（节点序列），
// 走不到就返回 null。walked 是要排除的边编号集合，供提示与测试复用。
export function findTrail(level, start, walked = new Set()) {
  if (!Number.isInteger(start) || start < 0 || start >= level.points.length)
    return null;
  const remaining = level.edges.length - walked.size;
  if (remaining <= 0) return [start];
  const adj = adjacency(level);
  const used = new Set(walked);
  const pointer = new Map();
  const stack = [start];
  const trail = [];
  while (stack.length) {
    const node = stack[stack.length - 1];
    const options = adj[node];
    let index = pointer.get(node) || 0;
    while (index < options.length && used.has(options[index].edge)) index++;
    pointer.set(node, index);
    if (index < options.length) {
      used.add(options[index].edge);
      stack.push(options[index].to);
    } else trail.push(stack.pop());
  }
  trail.reverse();
  if (trail.length !== remaining + 1) return null;
  const verified = new Set(walked);
  for (let i = 1; i < trail.length; i++) {
    const edge = edgeIndexOf(level, trail[i - 1], trail[i]);
    if (edge < 0 || verified.has(edge)) return null;
    verified.add(edge);
  }
  return trail;
}
// 提示：开局推荐出发点；途中推荐下一步；走死路时建议撤回。
export function hint(level, path) {
  if (!path.length) {
    const node = startNodes(level).find((start) => findTrail(level, start));
    return node === undefined ? { type: 'stuck' } : { type: 'start', node };
  }
  const current = path[path.length - 1];
  const trail = findTrail(level, current, walkedEdges(level, path));
  return trail && trail.length > 1
    ? { type: 'move', node: trail[1] }
    : { type: 'undo' };
}
// 星级：不用提示且撤销不超过 1 次 3 星；最多用 1 次提示 2 星；其余过关 1 星。
export function score(hints, undos) {
  return hints === 0 && undos <= 1 ? 3 : hints <= 1 ? 2 : 1;
}
// 存档清洗：只保留 0..关卡数-1 的整数编号和 1..3 的星级，其余一律丢弃。
// JSON 存档的编号是字符串键，数字字符串会转回数字；坏数据直接丢弃。
export function sanitizeProgress(raw) {
  const clean = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return clean;
  for (const [name, value] of Object.entries(raw)) {
    const id = /^\d+$/.test(name) ? Number(name) : -1;
    const stars =
      typeof value === 'boolean' ? NaN : Number(value);
    if (id >= 0 && id < levels.length && [1, 2, 3].includes(stars))
      clean[id] = stars;
  }
  return clean;
}
