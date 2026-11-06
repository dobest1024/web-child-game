import test from 'node:test';
import assert from 'node:assert/strict';
import { UNDO_LIMIT, sanitizeProgress, sanitizeState } from '../engine.js';

const zeros = () => Array(16).fill(0);
const withCell = (value, at) => {
  const board = zeros();
  board[at] = value;
  return board;
};

test('棋局存档清洗：坏格子清零，非法分值与撤销次数被纠正', () => {
  const board = [
    2, 4, '8', null, 1024, 2048, 3, 0, true, 32, 0, 0, 0, 0, 0, 64,
  ];
  const cleaned = sanitizeState({
    board,
    score: -20,
    undos: 99,
    won: 'yes',
    seen: [2, 2, 4, 999, 'x', 2048],
    history: [],
  });
  assert.deepEqual(cleaned.board, [
    2, 4, 0, 0, 1024, 2048, 0, 0, 0, 32, 0, 0, 0, 0, 0, 64,
  ]);
  assert.equal(cleaned.score, 0);
  assert.equal(cleaned.undos, UNDO_LIMIT);
  assert.equal(cleaned.won, false);
  assert.deepEqual(cleaned.seen, [2, 4, 32, 64, 1024, 2048]);
});

test('棋局存档长度不符或类型不对则整局作废', () => {
  assert.equal(sanitizeState(null), null);
  assert.equal(sanitizeState('x'), null);
  assert.equal(sanitizeState(42), null);
  assert.equal(sanitizeState({ board: [2, 2] }), null);
  assert.equal(sanitizeState({ board: Array(15).fill(0) }), null);
  assert.equal(sanitizeState({ board: zeros() }), null);
  assert.equal(sanitizeState({ board: Array(16).fill(999) }), null);
  const kept = sanitizeState({ board: withCell(4, 0), score: 3 });
  assert.equal(kept.score, 3);
  assert.deepEqual(kept.board, withCell(4, 0));
});

test('棋局存档的 seen 与棋盘取并集，历史栈裁剪到 3 步且条目被清洗', () => {
  const history = Array.from({ length: 6 }, (_, i) => ({
    board: withCell(2 ** (i + 1), 0),
    score: i + 1,
    junk: true,
  }));
  history.unshift({ board: [1, 2], score: -5 }, null, 'oops');
  const cleaned = sanitizeState({
    board: withCell(8, 5),
    score: 5,
    undos: 2,
    won: false,
    seen: [2],
    history,
  });
  assert.deepEqual(cleaned.seen, [2, 8]);
  assert.equal(cleaned.history.length, UNDO_LIMIT);
  assert.deepEqual(cleaned.history.map((entry) => entry.score), [4, 5, 6]);
  assert.deepEqual(cleaned.history[0].board, withCell(16, 0));
  assert.deepEqual(cleaned.history.at(-1).board, withCell(64, 0));
  assert.equal(cleaned.undos, 2);
});

test('进度存档清洗：最高分、收藏册与最高进化动物', () => {
  const cleaned = sanitizeProgress({
    best: 'abc',
    bestAnimal: 999,
    album: [2, 2, 64, 7, 'egg'],
    game: null,
  });
  assert.equal(cleaned.best, 0);
  assert.equal(cleaned.bestAnimal, 64);
  assert.deepEqual(cleaned.album, [2, 64]);
  assert.equal(cleaned.game, null);
  const minimal = sanitizeProgress({ best: 55 });
  assert.equal(minimal.best, 55);
  assert.equal(minimal.bestAnimal, 0);
  assert.deepEqual(minimal.album, []);
  assert.equal(minimal.game, null);
  assert.deepEqual(sanitizeProgress(undefined).album, []);
});

test('进度存档清洗：进行中棋局被逐项清洗后保留', () => {
  const game = {
    board: withCell(8, 0),
    score: 42,
    undos: 2,
    won: false,
    seen: [2],
    history: [],
  };
  const cleaned = sanitizeProgress({ best: 10, album: [2], game });
  assert.equal(cleaned.game.score, 42);
  assert.deepEqual(cleaned.game.board, withCell(8, 0));
  assert.deepEqual(cleaned.game.seen, [2, 8]);
  assert.equal(cleaned.best, 10);
  const broken = sanitizeProgress({
    best: 10,
    album: [2],
    game: { board: [2, 2] },
  });
  assert.equal(broken.game, null);
  assert.equal(broken.best, 10);
});
