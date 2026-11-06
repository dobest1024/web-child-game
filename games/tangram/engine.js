// 七巧板小达人 · 纯逻辑引擎。可在 Node 中直接 import，不出现 window/document。
// 坐标以 h 为单位（经典七巧板单位格的一半，标准正方形拼法为 8×8）。
// 每块积木用"以自转中心为原点的顶点数组"定义；摆放用 { tx, ty, rot, flip } 描述：
// 先按 flip 镜像（x 取反），再按 rot 顺时针旋转 rot×45°，最后平移 (tx, ty)。

export const SNAP_TOLERANCE = 2; // 吸附容差（h 单位）：位移不超过它且形状一致即可锁定
const QUANTUM = 1e6;
const q = (value) => Math.round(value * QUANTUM) / QUANTUM;

// 45° 旋转矩阵（y 向下屏幕坐标，正值呈顺时针）。
const rotators = [
  ([x, y]) => [x, y],
  ([x, y]) => [(x - y) / Math.SQRT2, (x + y) / Math.SQRT2],
  ([x, y]) => [-y, x],
  ([x, y]) => [-(x + y) / Math.SQRT2, (x - y) / Math.SQRT2],
  ([x, y]) => [-x, -y],
  ([x, y]) => [(y - x) / Math.SQRT2, -(x + y) / Math.SQRT2],
  ([x, y]) => [y, -x],
  ([x, y]) => [(x + y) / Math.SQRT2, (y - x) / Math.SQRT2],
];

export function rotatePlacement(placement, steps = 1) {
  return { ...placement, rot: ((((placement.rot ?? 0) + steps) % 8) + 8) % 8 };
}

export function flipPlacement(placement) {
  return { ...placement, flip: !placement.flip };
}

export function transformPolygon(polygon, placement) {
  const rotate = rotators[(((placement.rot ?? 0) % 8) + 8) % 8];
  return polygon.map(([x, y]) => {
    const [rx, ry] = rotate(placement.flip ? [-x, y] : [x, y]);
    return [q(rx + (placement.tx ?? 0)), q(ry + (placement.ty ?? 0))];
  });
}

export function placementPolygon(piece, placement) {
  return transformPolygon(piece.polygon, placement);
}

// 平移不变指纹：顶点排序后减去首个顶点。形状相同（含旋转/镜像等价）则指纹相同。
export function fingerprint(polygon) {
  const sorted = polygon
    .map(([x, y]) => [x, y])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const [ox, oy] = sorted[0];
  return JSON.stringify(sorted.map(([x, y]) => [q(x - ox), q(y - oy)]));
}

export function placementDistance(placement, slot) {
  return Math.hypot((placement.tx ?? 0) - slot.tx, (placement.ty ?? 0) - slot.ty);
}

// 同形状积木能否吸附进槽位：形状一致 + 指纹一致（旋转/翻转到位）+ 位移在容差内。
export function placementsMatch(piece, placement, slot, tolerance = SNAP_TOLERANCE) {
  if (piece.shape !== slot.shape) return false;
  const polygon = placementPolygon(piece, placement);
  const target = placementPolygon(piece, slot);
  if (fingerprint(polygon) !== fingerprint(target)) return false;
  return placementDistance(placement, slot) <= tolerance;
}

// 寻找首个可吸附且未被其它积木锁定的槽位下标，找不到返回 -1。
export function findMatchingSlot(
  piece,
  placement,
  slots,
  items = [],
  currentItem = null,
  tolerance = SNAP_TOLERANCE,
) {
  for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
    if (
      items.some(
        (other) =>
          other !== currentItem && other.locked && other.lockedSlot === slotIndex,
      )
    )
      continue;
    if (placementsMatch(piece, placement, slots[slotIndex], tolerance))
      return slotIndex;
  }
  return -1;
}

export function shoelace(polygon) {
  let sum = 0;
  for (let i = 0; i < polygon.length; i++) {
    const [ax, ay] = polygon[i];
    const [bx, by] = polygon[(i + 1) % polygon.length];
    sum += ax * by - bx * ay;
  }
  return sum / 2;
}

export function pointInPolygon([px, py], polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i++) {
    const [ax, ay] = polygon[i];
    const [bx, by] = polygon[j];
    if ((ay > py) !== (by > py) && px < ((bx - ax) * (py - ay)) / (by - ay) + ax)
      inside = !inside;
  }
  return inside;
}

const keyOf = ([x, y]) => `${x},${y}`;
const parseKey = (key) => key.split(',').map(Number);

// 把线段 a→b 按其它多边形顶点做 T 形分叉切分，返回切分后的顶点序列（含首尾）。
function splitSegment(a, b, pointSet) {
  const [ax, ay] = a;
  const dx = b[0] - ax;
  const dy = b[1] - ay;
  const length2 = dx * dx + dy * dy;
  const inner = [];
  for (const key of pointSet) {
    const [px, py] = parseKey(key);
    const t = ((px - ax) * dx + (py - ay) * dy) / length2;
    if (t <= 1e-9 || t >= 1 - 1e-9) continue;
    if (Math.abs(dx * (py - ay) - dy * (px - ax)) > 1e-6) continue;
    inner.push([t, [px, py]]);
  }
  inner.sort((u, v) => u[0] - v[0]);
  return [a, ...inner.map(([, point]) => point), b];
}

function simplifyLoop(loop) {
  const kept = [];
  const n = loop.length;
  for (let i = 0; i < n; i++) {
    const prev = loop[(i - 1 + n) % n];
    const cur = loop[i];
    const next = loop[(i + 1) % n];
    const cross =
      (cur[0] - prev[0]) * (next[1] - cur[1]) -
      (cur[1] - prev[1]) * (next[0] - cur[0]);
    if (Math.abs(cross) > 1e-9) kept.push(cur);
  }
  return kept.length >= 3 ? kept : loop;
}

// 描出多边形并集的外轮廓：先统一绕向，再消去互相重合的正反线段，把剩余边界连成环。
// 返回全部闭环（数据正确时应只有一个）。
export function traceOutline(polygons) {
  const pointSet = new Set();
  const oriented = polygons.map((polygon) =>
    shoelace(polygon) < 0 ? [...polygon].reverse() : polygon,
  );
  for (const polygon of oriented)
    for (const vertex of polygon) pointSet.add(keyOf(vertex));
  const pool = new Map();
  for (const polygon of oriented) {
    const n = polygon.length;
    for (let i = 0; i < n; i++) {
      const chain = splitSegment(polygon[i], polygon[(i + 1) % n], pointSet);
      for (let j = 1; j < chain.length; j++) {
        const key = `${keyOf(chain[j - 1])}|${keyOf(chain[j])}`;
        pool.set(key, (pool.get(key) ?? 0) + 1);
      }
    }
  }
  const outgoing = new Map();
  let remaining = 0;
  for (const [key, count] of pool) {
    const [aKey, bKey] = key.split('|');
    const left = count - (pool.get(`${bKey}|${aKey}`) ?? 0);
    for (let i = 0; i < left; i++) {
      if (!outgoing.has(aKey)) outgoing.set(aKey, []);
      outgoing.get(aKey).push(bKey);
      remaining++;
    }
  }
  const loops = [];
  while (remaining > 0) {
    const startKey = [...outgoing.keys()].find((key) => outgoing.get(key).length);
    if (startKey === undefined) break;
    const loopKeys = [startKey];
    let current = startKey;
    while (remaining > 0) {
      const stack = outgoing.get(current);
      if (!stack || !stack.length) break;
      current = stack.pop();
      remaining--;
      if (current === startKey) break;
      loopKeys.push(current);
    }
    if (current === startKey && loopKeys.length >= 3)
      loops.push(simplifyLoop(loopKeys.map(parseKey)));
  }
  return loops;
}

// 从起始摆法转到目标摆法（含翻转）最少要按几次旋转键（顺/逆时针取较小值）。
export function minPresses(piece, from, to) {
  const target = fingerprint(placementPolygon(piece, to));
  let best = Infinity;
  for (const flip of [false, true]) {
    for (let rot = 0; rot < 8; rot++) {
      const candidate = { tx: from.tx, ty: from.ty, rot, flip };
      if (fingerprint(placementPolygon(piece, candidate)) !== target) continue;
      const clockwise = (((rot - (from.rot ?? 0)) % 8) + 8) % 8;
      const cost = Math.min(clockwise, 8 - clockwise);
      best = Math.min(best, cost + (flip !== Boolean(from.flip) ? 1 : 0));
    }
  }
  return best;
}

// 星级：拼完 1 星；不开提示再 +1；旋转次数不超过巧手目标再 +1。
export function score(usedHints, rotations, budget) {
  return 1 + (usedHints ? 0 : 1) + (rotations <= budget ? 1 : 0);
}

// 存档清洗：任何坏数据都安静地回退为空进度，不抛异常。
export function sanitizeProgress(raw, levelCount) {
  const clean = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return clean;
  for (const [key, value] of Object.entries(raw)) {
    const id = Number(key);
    const stars = Number(value);
    if (Number.isInteger(id) && id >= 0 && id < levelCount && [1, 2, 3].includes(stars))
      clean[id] = stars;
  }
  return clean;
}
