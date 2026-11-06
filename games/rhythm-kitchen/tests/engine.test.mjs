import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { judgeHit, calculateStars, sanitizeProgress, WINDOWS } from '../engine.js';
import { RECIPES } from '../levels.js';

describe('Rhythm Kitchen Engine', () => {
  it('correctly judges perfect, good, and miss timings', () => {
    // Exact hit
    assert.equal(judgeHit(1000, 1000).rating, 'PERFECT');
    assert.equal(judgeHit(1000, 1000).score, 100);

    // Near boundary of perfect
    assert.equal(judgeHit(1000, 1000 + WINDOWS.PERFECT).rating, 'PERFECT');

    // Inside good window
    assert.equal(judgeHit(1000, 1000 + WINDOWS.PERFECT + 10).rating, 'GOOD');
    assert.equal(judgeHit(1000, 1000 - WINDOWS.GOOD).rating, 'GOOD');

    // Outside good window
    assert.equal(judgeHit(1000, 1000 + WINDOWS.GOOD + 10).rating, 'MISS');
    assert.equal(judgeHit(1000, 1000 - WINDOWS.GOOD - 10).rating, 'MISS');
  });

  it('calculates stars accurately according to performance', () => {
    // 3 stars: no misses and >= 90%
    assert.equal(calculateStars(950, 1000, 0), 3);

    // 2 stars: misses <= 2 and >= 70%
    assert.equal(calculateStars(750, 1000, 1), 2);
    assert.equal(calculateStars(720, 1000, 2), 2);

    // 1 star: low score or many misses
    assert.equal(calculateStars(600, 1000, 4), 1);
  });

  it('sanitizes and validates progress records safely', () => {
    assert.deepEqual(sanitizeProgress(null), { cleared: {}, highScores: {} });
    assert.deepEqual(sanitizeProgress('invalid'), { cleared: {}, highScores: {} });

    const raw = {
      cleared: { '1': 3, '2': 2, 'bad': 5 },
      highScores: { '1': 800, '2': -10, 'bad': 'score' },
    };
    const clean = sanitizeProgress(raw);
    assert.deepEqual(clean.cleared, { '1': 3, '2': 2 });
    assert.deepEqual(clean.highScores, { '1': 800 });
  });

  it('ensures recipe metadata has valid beat timings and monotonic order', () => {
    assert.ok(RECIPES.length >= 8, 'At least 8 recipes defined');
    for (const recipe of RECIPES) {
      assert.ok(recipe.bpm > 0, `Recipe ${recipe.id} BPM should be positive`);
      assert.ok(recipe.beats.length > 0, `Recipe ${recipe.id} must have beats`);
      let prevBeat = 0;
      for (const b of recipe.beats) {
        assert.ok(b.beat >= prevBeat, `Recipe ${recipe.id} beats must be monotonic`);
        assert.ok(b.icon, `Recipe ${recipe.id} beat item must have an icon`);
        prevBeat = b.beat;
      }
    }
  });
});
