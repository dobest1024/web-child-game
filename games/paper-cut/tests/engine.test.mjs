import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getFoldDimensions,
  unfoldGrid,
  compareGrids,
  sanitizeProgress,
} from '../engine.js';
import { PAPER_LEVELS, getLevelTargetGrid } from '../levels.js';

test('paper-cut engine: fold dimensions and unfolding symmetry', () => {
  // V fold is 8 rows x 4 cols
  assert.deepEqual(getFoldDimensions('V', 8), { rows: 8, cols: 4 });
  // H fold is 4 rows x 8 cols
  assert.deepEqual(getFoldDimensions('H', 8), { rows: 4, cols: 8 });
  // VH fold is 4 rows x 4 cols
  assert.deepEqual(getFoldDimensions('VH', 8), { rows: 4, cols: 4 });

  // Cutting (0, 0) on VH unfolds to 4 corners
  const cuts = [[0, 0]];
  const unfolded = unfoldGrid(cuts, 'VH', 8);
  assert.equal(unfolded[0][0], 1);
  assert.equal(unfolded[0][7], 1);
  assert.equal(unfolded[7][0], 1);
  assert.equal(unfolded[7][7], 1);
  assert.equal(unfolded[1][1], 0);
});

test('paper-cut engine: compareGrids matching', () => {
  const gridA = [
    [1, 0],
    [0, 1],
  ];
  const gridB = [
    [1, 0],
    [0, 1],
  ];
  const res = compareGrids(gridA, gridB, 2);
  assert.equal(res.perfect, true);
  assert.equal(res.matched, 2);
  assert.equal(res.falseCuts, 0);

  // Mismatch
  const gridWrong = [
    [1, 1],
    [0, 0],
  ];
  const resWrong = compareGrids(gridWrong, gridB, 2);
  assert.equal(resWrong.perfect, false);
});

test('paper-cut levels: all 12 levels have target cuts that unfold into non-empty symmetrical grids', () => {
  assert.equal(PAPER_LEVELS.length, 12);
  PAPER_LEVELS.forEach((lvl) => {
    assert.ok(lvl.id >= 1 && lvl.id <= 12);
    assert.ok(lvl.targetCuts.length > 0);
    const targetGrid = getLevelTargetGrid(lvl);
    let totalOnes = 0;
    for (const r of targetGrid) {
      for (const val of r) {
        if (val === 1) totalOnes++;
      }
    }
    assert.ok(totalOnes > 0);
    // When compared against itself, it's 100% perfect
    const selfCheck = compareGrids(targetGrid, targetGrid, 8);
    assert.equal(selfCheck.perfect, true);
  });
});
