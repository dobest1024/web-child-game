import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HINTS_PER_PUZZLE,
  createGame,
  isEditable,
  countsRemaining,
  conflictPairs,
  judgePlacement,
  applyValue,
  clearCell,
  applyHint,
  isSolved,
  score,
  sanitizeProgress,
  formatDuration,
} from '../engine.js';

// 手工 4×4 题面：givens 全部取自 solution，(3,0) 附近专门构造了宫冲突。
const puzzleFixture = () => ({
  difficulty: 'easy',
  index: 0,
  size: 4,
  boxRows: 2,
  boxCols: 2,
  useDigits: false,
  givens: [
    [0, 2, 0, 4],
    [0, 4, 0, 0],
    [0, 1, 4, 0],
    [0, 0, 2, 0],
  ],
  solution: [
    [1, 2, 3, 4],
    [3, 4, 1, 2],
    [2, 1, 4, 3],
    [4, 3, 2, 1],
  ],
});

test('correct placements pass, wrong ones conflict or miss the mark', () => {
  const game = createGame(puzzleFixture());
  assert.deepEqual(judgePlacement(game, 0, 0, 1), {
    allowed: true,
    correct: true,
    conflict: false,
  });
  assert.deepEqual(judgePlacement(game, 3, 0, 4), {
    allowed: true,
    correct: true,
    conflict: false,
  });
  // (3,0) 放 1：与宫里的 (2,1)=1 撞了
  assert.deepEqual(judgePlacement(game, 3, 0, 1), {
    allowed: true,
    correct: false,
    conflict: true,
  });
  // (1,0) 放 4：与同行的 (1,1)=4 撞了
  assert.equal(judgePlacement(game, 1, 0, 4).conflict, true);
  // (0,2) 放 2：与同列的 (3,2)=2 撞了
  assert.equal(judgePlacement(game, 0, 2, 2).conflict, true);
  // (3,0) 放 3：错了但没有撞上任何同伴
  assert.deepEqual(judgePlacement(game, 3, 0, 3), {
    allowed: true,
    correct: false,
    conflict: false,
  });
});

test('given cells and hinted cells are not editable', () => {
  let game = createGame(puzzleFixture());
  assert.deepEqual(judgePlacement(game, 0, 1, 3).allowed, false);
  assert.equal(isEditable(game, 0, 1), false);
  const hinted = applyHint(game, 3, 0);
  game = hinted.game;
  assert.equal(game.grid[3][0], 4);
  assert.equal(isEditable(game, 3, 0), false);
  assert.deepEqual(judgePlacement(game, 3, 0, 4).allowed, false);
});

test('conflictPairs marks every cell taking part in a duplicate', () => {
  let game = createGame(puzzleFixture());
  game = applyValue(game, 3, 0, 1);
  const pairs = conflictPairs(game.grid, 2, 2);
  assert.ok(pairs.some(([r, c]) => r === 3 && c === 0));
  assert.ok(pairs.some(([r, c]) => r === 2 && c === 1));
  assert.equal(
    conflictPairs(puzzleFixture().solution, 2, 2).length,
    0,
    'clean solution has no conflicts',
  );
});

test('applyValue updates the tray counts and clearCell restores empty cells', () => {
  let game = createGame(puzzleFixture());
  let counts = countsRemaining(game);
  assert.equal(counts[1], 3);
  assert.equal(counts[2], 2);
  assert.equal(counts[3], 4);
  assert.equal(counts[4], 1);
  game = applyValue(game, 3, 0, 4);
  assert.equal(game.grid[3][0], 4);
  assert.equal(countsRemaining(game)[4], 0);
  game = clearCell(game, 3, 0);
  assert.equal(game.grid[3][0], 0);
  const untouched = clearCell(game, 0, 1);
  assert.equal(untouched, game, 'given cells ignore clearing');
});

test('hints fill correct values, lock the cell and consume the budget', () => {
  let game = createGame(puzzleFixture());
  const first = applyHint(game);
  assert.deepEqual(first.at, [0, 0], 'picks the first unfinished cell');
  assert.equal(first.value, 1);
  assert.equal(first.game.grid[0][0], 1);
  assert.equal(first.game.hintsLeft, HINTS_PER_PUZZLE - 1);
  game = first.game;
  const targeted = applyHint(game, 3, 0);
  assert.deepEqual(targeted.at, [3, 0], 'prefers the selected cell');
  assert.equal(targeted.game.hintsLeft, HINTS_PER_PUZZLE - 2);
  game = targeted.game;
  const correctCell = applyValue(game, 1, 2, 1);
  const skipped = applyHint(correctCell, 1, 2);
  assert.deepEqual(skipped.at, [0, 2], 'already-correct cells are skipped');
  game = skipped.game;
  const last = applyHint(game);
  game = last.game;
  assert.equal(game.hintsLeft, 0);
  assert.deepEqual(applyHint(game).at, null, 'budget exhausted');
  assert.ok(game.hinted.has('0,0'));
  assert.ok(game.hinted.has('3,0'));
});

test('isSolved only accepts the full unique solution', () => {
  const { solution } = puzzleFixture();
  let game = createGame(puzzleFixture());
  assert.equal(isSolved(game), false);
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (!game.grid[r][c]) game = applyValue(game, r, c, solution[r][c]);
  assert.equal(isSolved(game), true);
  const wrong = applyValue(game, 0, 0, 2);
  assert.equal(isSolved(wrong), false);
  const hintedLast = applyHint(wrong, 0, 0);
  assert.equal(isSolved(hintedLast.game), true);
});

test('stars reward speed and no hints, never punish a finished board', () => {
  assert.equal(score('easy', 60000, 0), 3);
  assert.equal(score('easy', 60000, 1), 2);
  assert.equal(score('easy', 300000, 0), 2);
  assert.equal(score('easy', 300000, 2), 1);
  assert.equal(score('hard', 800000, 0), 3);
  assert.equal(score('hard', 800000, 1), 2);
  assert.equal(score('hard', 900001, 3), 1);
  assert.equal(score('unknown', 10, 0), 3);
});

test('sanitizeProgress keeps only known difficulties with clamped numbers', () => {
  const empty = {
    easy: { next: 0, solved: 0, bestStars: 0, bestMs: 0 },
    medium: { next: 0, solved: 0, bestStars: 0, bestMs: 0 },
    hard: { next: 0, solved: 0, bestStars: 0, bestMs: 0 },
  };
  assert.deepEqual(sanitizeProgress(null), empty);
  assert.deepEqual(sanitizeProgress(undefined), empty);
  assert.deepEqual(sanitizeProgress('oops'), empty);
  assert.deepEqual(sanitizeProgress(42), empty);
  const messy = {
    easy: { next: 2.9, solved: 5, bestStars: 9, bestMs: -3 },
    medium: 'broken',
    hard: { next: NaN, solved: '3', bestMs: 125000 },
    bonus: { next: 99 },
  };
  const clean = sanitizeProgress(messy);
  assert.deepEqual(clean.easy, { next: 2, solved: 5, bestStars: 3, bestMs: 0 });
  assert.deepEqual(clean.medium, empty.medium);
  assert.deepEqual(clean.hard, { next: 0, solved: 3, bestStars: 0, bestMs: 125000 });
  assert.equal('bonus' in clean, false);
  const valid = {
    easy: { next: 1, solved: 1, bestStars: 2, bestMs: 60000 },
  };
  assert.deepEqual(sanitizeProgress(valid).easy, valid.easy);
});

test('formatDuration renders minutes and zero-padded seconds', () => {
  assert.equal(formatDuration(0), '0:00');
  assert.equal(formatDuration(59000), '0:59');
  assert.equal(formatDuration(60000), '1:00');
  assert.equal(formatDuration(3661000), '61:01');
  assert.equal(formatDuration(-5), '0:00');
});
