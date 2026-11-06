import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultDifficulty,
  difficulties,
  getDifficulty,
  parseProgress,
  sanitizeProgress,
  starsFor,
} from '../levels.js';
import { shuffleBoard } from '../engine.js';

test('three difficulties cover the 3×3, 4×4 and 5×5 boards', () => {
  assert.deepEqual(
    difficulties.map((difficulty) => difficulty.size),
    [3, 4, 5],
  );
  assert.deepEqual(
    difficulties.map((difficulty) => difficulty.steps),
    [30, 80, 150],
  );
  assert.equal(getDifficulty('middle'), difficulties[1]);
  assert.equal(getDifficulty('nope'), defaultDifficulty);
});

test('star thresholds stay ordered, stay reachable and map moves to 1-3 stars', () => {
  for (const difficulty of difficulties) {
    const { three, two } = difficulty.starMoves;
    assert.ok(three < two, difficulty.id);
    // Replaying the scramble backwards always solves it in `steps` moves,
    // so three stars stay reachable while the limit covers the scramble.
    assert.ok(three >= difficulty.steps, difficulty.id);
    assert.equal(starsFor(difficulty, three), 3);
    assert.equal(starsFor(difficulty, three + 1), 2);
    assert.equal(starsFor(difficulty, two), 2);
    assert.equal(starsFor(difficulty, two + 1), 1);
    assert.equal(starsFor(difficulty, 100000), 1);
    assert.equal(starsFor(difficulty, 0), 0);
  }
});

test('recorded scramble paths never exceed the three-star budget', () => {
  for (const difficulty of difficulties) {
    for (const seed of [1, 2, 3]) {
      const { moves } = shuffleBoard(difficulty.size, difficulty.steps, seed);
      assert.ok(
        moves.length <= difficulty.starMoves.three,
        `${difficulty.id} seed ${seed}`,
      );
    }
  }
});

test('progress sanitation keeps valid records and fills missing fields with null', () => {
  const good = { small: { bestMoves: 42, bestTimeMs: 61000, stars: 2 } };
  assert.deepEqual(sanitizeProgress(good), good);
  assert.deepEqual(
    sanitizeProgress({ small: { bestMoves: 7 }, middle: { stars: 3 } }),
    {
      small: { bestMoves: 7, bestTimeMs: null, stars: null },
      middle: { bestMoves: null, bestTimeMs: null, stars: 3 },
    },
  );
});

test('progress sanitation returns defaults for wrong types and out-of-range values', () => {
  assert.deepEqual(sanitizeProgress(null), {});
  assert.deepEqual(sanitizeProgress(42), {});
  assert.deepEqual(sanitizeProgress('nope'), {});
  assert.deepEqual(
    sanitizeProgress({
      small: { bestMoves: '42', bestTimeMs: -1, stars: 9 },
      middle: { bestMoves: 3.5, bestTimeMs: true, stars: -2 },
      grand: 'x',
      unknown: { bestMoves: 5 },
    }),
    {},
  );
  assert.deepEqual(
    sanitizeProgress({ small: { bestMoves: 0, bestTimeMs: 0, stars: 0 } }),
    { small: { bestMoves: null, bestTimeMs: 0, stars: 0 } },
  );
});

test('parseProgress never throws and falls back to empty defaults', () => {
  assert.deepEqual(parseProgress('not json'), {});
  assert.deepEqual(parseProgress(''), {});
  assert.deepEqual(parseProgress(undefined), {});
  assert.deepEqual(parseProgress('null'), {});
  assert.deepEqual(parseProgress('[]'), {});
  assert.deepEqual(
    parseProgress('{"small":{"bestMoves":9,"bestTimeMs":1000,"stars":1}}'),
    { small: { bestMoves: 9, bestTimeMs: 1000, stars: 1 } },
  );
});
