import test from 'node:test';
import assert from 'node:assert/strict';
import { pieces, levels, placementFor } from '../levels.js';
import {
  SNAP_TOLERANCE,
  rotatePlacement,
  flipPlacement,
  transformPolygon,
  placementPolygon,
  fingerprint,
  placementsMatch,
  findMatchingSlot,
  placementDistance,
  minPresses,
  score,
  sanitizeProgress,
  shoelace,
  pointInPolygon,
} from '../engine.js';

const pieceById = new Map(pieces.map((piece) => [piece.id, piece]));

test('七块积木面积合计为 64（8×8 标准正方形）', () => {
  const total = pieces.reduce((sum, piece) => sum + Math.abs(shoelace(piece.polygon)), 0);
  assert.equal(total, 64);
  assert.deepEqual(pieces.map((piece) => piece.id).sort(), [
    'large-1', 'large-2', 'medium', 'para', 'small-1', 'small-2', 'square',
  ]);
});

test('旋转 45° 步进 8 次回到原角度', () => {
  let placement = { tx: 3, ty: 5, rot: 0, flip: false };
  const start = { ...placement };
  for (let i = 0; i < 8; i++) placement = rotatePlacement(placement, 1);
  assert.equal(placement.rot, start.rot);
  // 单步旋转与直接设置一致
  assert.deepEqual(rotatePlacement(start, 3), { ...start, rot: 3 });
  assert.deepEqual(rotatePlacement(start, 9), { ...start, rot: 1 });
  assert.deepEqual(rotatePlacement(start, -1), { ...start, rot: 7 });
});

test('翻转是自逆：翻两次与多边形一致', () => {
  for (const piece of pieces) {
    const placement = { tx: 2, ty: 1, rot: 3, flip: false };
    const once = flipPlacement(placement);
    assert.equal(once.flip, true);
    const twice = flipPlacement(once);
    assert.equal(twice.flip, false);
    assert.deepEqual(
      fingerprint(placementPolygon(piece, twice)),
      fingerprint(placementPolygon(piece, placement)),
    );
  }
});

test('翻转后的平行四边形不能靠旋转得到（手性）', () => {
  const para = pieceById.get('para');
  const plain = placementPolygon(para, { tx: 0, ty: 0, rot: 0, flip: false });
  const mirrored = placementPolygon(para, { tx: 0, ty: 0, rot: 0, flip: true });
  const prints = new Set();
  for (let rot = 0; rot < 8; rot++)
    prints.add(fingerprint(placementPolygon(para, { tx: 0, ty: 0, rot, flip: false })));
  assert.ok(!prints.has(fingerprint(mirrored)));
  assert.notDeepEqual(plain, mirrored);
});

test('所有 12 个关卡的摆放都能吸附到对应槽位，旋转或平移错位则不能', () => {
  assert.equal(levels.length, 12);
  for (const level of levels) {
    for (const slot of level.slots) {
      const piece = pieceById.get(slot.pieceId);
      const slotLike = { tx: slot.tx, ty: slot.ty, rot: slot.rot, flip: slot.flip };
      // 放在容差内（半格以内）可以吸附
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [-1.5, 0.5]]) {
        const near = { ...slotLike, tx: slot.tx + dx, ty: slot.ty + dy };
        assert.ok(
          Math.hypot(dx, dy) <= SNAP_TOLERANCE,
          '测试数据应落在容差内',
        );
        assert.equal(placementsMatch(piece, near, slot), true, `${level.name} ${piece.id}`);
      }
      // 平移超过容差失败
      const far = { ...slotLike, tx: slot.tx + SNAP_TOLERANCE + 0.5, ty: slot.ty };
      assert.equal(placementsMatch(piece, far, slot), false);
      // 旋转错 45°：不对称的积木形状必须不同
      const rotated = { ...slotLike, rot: (slot.rot + 1) % 8 };
      const rotatedPolygon = placementPolygon(piece, rotated);
      if (fingerprint(rotatedPolygon) !== fingerprint(placementPolygon(piece, slot)))
        assert.equal(placementsMatch(piece, rotated, slot), false, `${level.name} ${piece.id}`);
      // 手性积木翻转后失败
      if (piece.chiral) {
        const flipped = { ...slotLike, flip: !slot.flip };
        assert.equal(placementsMatch(piece, flipped, slot), false, `${level.name} 平行四边形`);
      }
      // 同形状才匹配：换一块不同形状的积木失败
      const other = pieces.find((p) => p.shape !== slot.shape);
      assert.equal(placementsMatch(other, slotLike, slot), false);
    }
  }
});

test('形状等价类：正方形转 90° 与小三角翻面后仍可吸附', () => {
  const square = pieceById.get('square');
  const slot = { shape: 'square', tx: 5, ty: 5, rot: 0, flip: false };
  const turned = { ...slot, rot: 2 };
  assert.equal(placementsMatch(square, turned, slot), true);
  const small = pieceById.get('small-1');
  const triSlot = { shape: 'small', tx: 5, ty: 5, rot: 0, flip: false };
  const mirrored = { ...triSlot, flip: true };
  assert.equal(placementsMatch(small, mirrored, triSlot), true);
});

test('minPresses：对齐槽位为 0，双向各差一格都为 1，平行四边形翻面加一', () => {
  const level = levels[0];
  for (const slot of level.slots) {
    const piece = pieceById.get(slot.pieceId);
    assert.equal(minPresses(piece, slot, slot), 0);
    const behind = { tx: slot.tx, ty: slot.ty, rot: (slot.rot + 7) % 8, flip: slot.flip };
    assert.equal(minPresses(piece, behind, slot), 1);
    const ahead = { tx: slot.tx, ty: slot.ty, rot: (slot.rot + 1) % 8, flip: slot.flip };
    assert.equal(minPresses(piece, ahead, slot), 1);
  }
  const para = pieceById.get('para');
  const target = { tx: 0, ty: 0, rot: 0, flip: false };
  const fromFlipped = { tx: 0, ty: 0, rot: 0, flip: true };
  assert.equal(minPresses(para, fromFlipped, target), 1);
  const fromTurnedFlipped = { tx: 0, ty: 0, rot: 1, flip: true };
  assert.equal(minPresses(para, fromTurnedFlipped, target), 2);
});

test('星级：拼完保底 1 星，不用提示、旋转达标再各加 1 星', () => {
  assert.equal(score(true, 999, 10), 1);
  assert.equal(score(false, 999, 10), 2);
  assert.equal(score(true, 5, 10), 2);
  assert.equal(score(false, 5, 10), 3);
  assert.equal(score(false, 10, 10), 3);
  assert.equal(score(false, 11, 10), 2);
});

test('每个关卡预算内可以拿满 3 星且预算为正', () => {
  for (const level of levels) {
    assert.ok(level.budget > 0, level.name);
    assert.equal(score(false, level.budget, level.budget), 3, level.name);
  }
});

test('存档清洗：坏数据回默认空进度，不抛异常', () => {
  assert.deepEqual(sanitizeProgress(null, 12), {});
  assert.deepEqual(sanitizeProgress(undefined, 12), {});
  assert.deepEqual(sanitizeProgress('乱写的', 12), {});
  assert.deepEqual(sanitizeProgress(42, 12), {});
  assert.deepEqual(sanitizeProgress([], 12), {});
  assert.deepEqual(sanitizeProgress({ '0': 'x' }, 12), {});
  assert.deepEqual(sanitizeProgress({ 0: 0 }, 12), {});
  assert.deepEqual(sanitizeProgress({ 3: 4 }, 12), {});
  assert.deepEqual(sanitizeProgress({ '-1': 2 }, 12), {});
  assert.deepEqual(sanitizeProgress({ 99: 2 }, 12), {});
  assert.deepEqual(sanitizeProgress({ 12: 2 }, 12), {});
  assert.deepEqual(sanitizeProgress({ '2': 2, '5': '3' }, 12), { 2: 2, 5: 3 });
  assert.deepEqual(sanitizeProgress({ 1: 3, junk: 2 }, 12), { 1: 3 });
  assert.deepEqual(sanitizeProgress({ 7: 2.5 }, 12), {});
});

test('shoelace 与点在多边形内的基础判定', () => {
  assert.equal(shoelace([[0, 0], [4, 0], [4, 4], [0, 4]]), 16);
  assert.ok(pointInPolygon([2, 2], [[0, 0], [4, 0], [4, 4], [0, 4]]));
  assert.ok(!pointInPolygon([5, 2], [[0, 0], [4, 0], [4, 4], [0, 4]]));
  assert.ok(!pointInPolygon([5, 2], [[0, 0], [4, 0], [4, 4]]));
});

test('placementFor 与 placementDistance 的往返一致性', () => {
  const large = pieceById.get('large-1');
  const target = [[6, 2], [10, 6], [6, 10]];
  const placement = placementFor(large, target);
  assert.deepEqual(fingerprint(placementPolygon(large, placement)), fingerprint(target));
  assert.equal(placementDistance(placement, placement), 0);
  assert.equal(placementsMatch(large, placement, { ...placement, shape: 'large' }), true);
  assert.throws(() => placementFor(large, [[0, 0], [1, 0], [0, 1]]), /无法摆成/);
});

test('同形状积木不会重复锁定到已被占用的同一槽位', () => {
  const level = levels[0];
  const large1Index = level.slots.findIndex((slot) => slot.pieceId === 'large-1');
  const slot = level.slots[large1Index];
  const large1 = pieceById.get('large-1');
  const large2 = pieceById.get('large-2');
  const item1 = { pieceId: 'large-1', locked: true, lockedSlot: large1Index };
  const item2 = { pieceId: 'large-2', locked: false, lockedSlot: -1 };
  const items = [item1, item2];
  assert.equal(
    findMatchingSlot(large1, slot, level.slots, items, item1),
    large1Index,
  );
  assert.equal(
    findMatchingSlot(large2, slot, level.slots, items, item2),
    -1,
    'large-2 不应锁进已被 large-1 锁定的槽位',
  );
});
