import test from 'node:test';
import assert from 'node:assert/strict';
import { pieces, levels } from '../levels.js';
import {
  transformPolygon,
  placementPolygon,
  fingerprint,
  traceOutline,
  shoelace,
  pointInPolygon,
} from '../engine.js';

const pieceById = new Map(pieces.map((piece) => [piece.id, piece]));
const keyOf = ([x, y]) => `${x},${y}`;

// 网格采样点（避开所有可能出现平/斜边的固定偏移）
function* samples(minX, maxX, minY, maxY) {
  for (let y = Math.floor(minY) - 1; y <= Math.ceil(maxY) + 1; y += 1)
    for (let x = Math.floor(minX) - 1; x <= Math.ceil(maxX) + 1; x += 1)
      yield [x + 0.21, y + 0.57];
}

test('12 个关卡：名称齐备、7 块积木各就各位且形状吻合', () => {
  assert.equal(levels.length, 12);
  const names = new Set();
  for (const level of levels) {
    assert.ok(level.name.length > 0 && level.hint.length > 0 && level.emoji.length > 0, level.name);
    names.add(level.name);
    assert.equal(level.slots.length, 7, level.name);
    const ids = new Set(level.slots.map((slot) => slot.pieceId));
    assert.equal(ids.size, 7, level.name);
    for (const piece of pieces) assert.ok(ids.has(piece.id), `${level.name} 缺少 ${piece.id}`);
    for (const slot of level.slots) {
      const piece = pieceById.get(slot.pieceId);
      assert.equal(slot.shape, piece.shape, level.name);
      // 摆放数据能复原设计给出的目标多边形
      const placed = placementPolygon(piece, slot);
      assert.equal(fingerprint(placed), fingerprint(slot.polygon), `${level.name} ${piece.id}`);
      assert.ok(slot.rot >= 0 && slot.rot < 8, level.name);
    }
  }
  assert.equal(names.size, 12);
});

test('每关七块面积之和等于剪影面积（shoelace）', () => {
  for (const level of levels) {
    const sum = level.slots.reduce((s, slot) => s + Math.abs(shoelace(slot.polygon)), 0);
    assert.ok(Math.abs(sum - 64) < 1e-6, `${level.name} 七块合计 ${sum}`);
    assert.ok(Math.abs(level.area - 64) < 1e-6, `${level.name} 剪影 ${level.area}`);
    const outline = traceOutline(level.slots.map((slot) => slot.polygon));
    assert.equal(outline.length, 1, `${level.name} 外轮廓环数`);
    assert.ok(Math.abs(Math.abs(shoelace(outline[0])) - 64) < 1e-6, `${level.name} 轮廓面积`);
    assert.equal(fingerprint(outline[0]), fingerprint(level.silhouette), level.name);
  }
});

test('块与块在网格采样下两两不重叠', () => {
  for (const level of levels) {
    const polys = level.slots.map((slot) => slot.polygon);
    const xs = polys.flat().map((p) => p[0]);
    const ys = polys.flat().map((p) => p[1]);
    const seen = [];
    for (const point of samples(Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys))) {
      let hits = 0;
      for (const poly of polys) if (pointInPolygon(point, poly)) hits++;
      if (hits > 1) seen.push(point);
    }
    assert.deepEqual(seen, [], `${level.name} 重叠样本 ${JSON.stringify(seen.slice(0, 3))}`);
  }
});

test('七块的并集完整覆盖剪影：任一剪影内的采样点都被某块覆盖', () => {
  for (const level of levels) {
    const polys = level.slots.map((slot) => slot.polygon);
    const xs = level.silhouette.map((p) => p[0]);
    const ys = level.silhouette.map((p) => p[1]);
    const missed = [];
    for (const point of samples(Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys))) {
      if (!pointInPolygon(point, level.silhouette)) continue;
      if (!polys.some((poly) => pointInPolygon(point, poly))) missed.push(point);
    }
    // 面积相等已保证覆盖，这里只要求采样意义上无空洞
    assert.ok(missed.length === 0, `${level.name} 空洞样本 ${JSON.stringify(missed.slice(0, 3))}`);
  }
});

test('槽位数据与摆法严格一致：变换后与目标多边形顶点集合相同', () => {
  for (const level of levels)
    for (const slot of level.slots) {
      const piece = pieceById.get(slot.pieceId);
      const placed = transformPolygon(piece.polygon, slot);
      const norm = (poly) => poly
        .map(([x, y]) => [x, y])
        .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      assert.deepEqual(norm(placed), norm(slot.polygon), `${level.name} ${piece.id}`);
    }
});

test('关卡按难度递进的元数据齐全（预算为正、边界正确）', () => {
  for (const level of levels) {
    const xs = level.silhouette.map(([x]) => x);
    const ys = level.silhouette.map(([, y]) => y);
    assert.equal(level.bounds.minX, Math.min(...xs), level.name);
    assert.equal(level.bounds.maxX, Math.max(...xs), level.name);
    assert.equal(level.bounds.minY, Math.min(...ys), level.name);
    assert.equal(level.bounds.maxY, Math.max(...ys), level.name);
    assert.ok(level.budget >= 7 && level.budget <= 40, `${level.name} 预算 ${level.budget}`);
  }
});
