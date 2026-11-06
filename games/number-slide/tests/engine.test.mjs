import test from 'node:test';
import assert from 'node:assert/strict';
import { difficulties } from '../levels.js';
import {
  createGame,
  createRng,
  isSolved,
  neighbors,
  shuffleBoard,
  slide,
  slideTowards,
  solvedBoard,
} from '../engine.js';

test('same seed reproduces the same scramble and every board stays a permutation', () => {
  for (const difficulty of difficulties) {
    for (const seed of [7, 2026, 987654321]) {
      const first = shuffleBoard(difficulty.size, difficulty.steps, seed);
      const again = shuffleBoard(difficulty.size, difficulty.steps, seed);
      assert.deepEqual(again.board, first.board, `${difficulty.id} ${seed}`);
      assert.deepEqual(again.moves, first.moves, `${difficulty.id} ${seed}`);
      assert.equal(first.moves.length, difficulty.steps);
      const total = difficulty.size ** 2;
      assert.deepEqual(
        [...first.board].sort((a, b) => a - b),
        [...Array(total).keys()],
      );
      assert.equal(isSolved(first.board, difficulty.size), false);
    }
  }
});

test('different seeds scramble differently', () => {
  assert.notDeepEqual(
    shuffleBoard(4, 80, 1).board,
    shuffleBoard(4, 80, 2).board,
  );
});

test('every scrambled board can be restored by replaying the recorded path backwards', () => {
  for (const difficulty of difficulties) {
    for (const seed of [3, 42, 2026]) {
      const { board, moves } = shuffleBoard(
        difficulty.size,
        difficulty.steps,
        seed,
      );
      let current = board;
      for (let i = moves.length - 1; i >= 0; i--) {
        const undone = slide(current, difficulty.size, moves[i].to);
        assert.notEqual(undone, null, `${difficulty.id} seed ${seed} step ${i}`);
        current = undone;
      }
      assert.equal(isSolved(current, difficulty.size), true, difficulty.id);
    }
  }
});

test('only tiles next to the blank may slide and illegal moves change nothing', () => {
  const base = solvedBoard(3); // blank sits in the bottom-right corner
  assert.equal(slide(base, 3, 4), null); // centre is not adjacent
  assert.equal(slide(base, 3, 8), null); // the blank itself
  assert.equal(slide(base, 3, -1), null);
  assert.equal(slide(base, 3, 9), null);
  assert.equal(slide(base, 3, 1.5), null);
  assert.deepEqual(base, solvedBoard(3));
  const moved = slide(base, 3, 5);
  assert.deepEqual(moved, [1, 2, 3, 4, 5, 0, 7, 8, 6]);
  assert.equal(moved[5], 0);
  assert.equal(moved[8], 6);
});

test('direction moves push the neighbouring tile into the blank', () => {
  const base = solvedBoard(3); // blank at the last index
  assert.equal(slideTowards(base, 3, 0), null); // no tile below the blank
  assert.equal(slideTowards(base, 3, 3), null); // no tile right of the blank
  assert.equal(slideTowards(base, 3, 9), null); // unknown direction
  assert.deepEqual(slideTowards(base, 3, 2), [1, 2, 3, 4, 5, 0, 7, 8, 6]);
  assert.deepEqual(slideTowards(base, 3, 1), [1, 2, 3, 4, 5, 6, 7, 0, 8]);
  // Wrap-around guard: a blank on the left edge must not pull the far tile.
  const edge = [1, 2, 3, 0, 4, 5, 6, 7, 8];
  assert.equal(slideTowards(edge, 3, 1), null);
  assert.notEqual(slideTowards(edge, 3, 3), null);
});

test('neighbors list every in-grid adjacent cell without wrap-around', () => {
  assert.deepEqual(neighbors(3, 0), [1, 3]);
  assert.deepEqual(neighbors(3, 4), [1, 5, 7, 3]);
  assert.deepEqual(neighbors(3, 8), [5, 7]);
});

test('createGame counts only legal moves and flags the finished board', () => {
  const game = createGame(3, 30, 2026);
  assert.equal(game.seed, 2026);
  assert.equal(game.moves, 0);
  assert.equal(game.finished, false);
  assert.equal(isSolved(game.board, 3), false);
  // (blank + 2) % 9 is never adjacent to the blank on a 3×3 board.
  const far = (game.board.indexOf(0) + 2) % 9;
  assert.equal(game.slide(far).moved, false);
  assert.equal(game.moves, 0);
  const before = [...game.board];
  assert.equal(game.slide(game.path.at(-1).to).moved, true);
  assert.equal(game.moves, 1);
  assert.notDeepEqual(game.board, before);
  assert.equal(game.finished, false);
});

test('replaying the path backwards restores the game and locks further slides', () => {
  const game = createGame(4, 80, 11);
  for (let i = game.path.length - 1; i >= 0; i--)
    assert.equal(game.slide(game.path[i].to).moved, true, `step ${i}`);
  assert.equal(game.moves, 80);
  assert.equal(game.finished, true);
  assert.equal(isSolved(game.board, 4), true);
  assert.deepEqual(game.slide(0), { moved: false, reason: 'finished' });
  assert.equal(game.moves, 80);
});

test('the random number generator depends only on its seed', () => {
  const first = Array.from({ length: 5 }, () => createRng(99)());
  assert.deepEqual(
    Array.from({ length: 5 }, () => createRng(99)()),
    first,
  );
  assert.notDeepEqual(
    Array.from({ length: 5 }, () => createRng(100)()),
    first,
  );
});
