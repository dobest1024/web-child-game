import test from 'node:test';
import assert from 'node:assert/strict';
import {
  UNDO_LIMIT,
  WIN_VALUE,
  applyMove,
  canUndo,
  isGameOver,
  moveBoard,
  newGame,
  slideLine,
  spawnTile,
  undoMove,
} from '../engine.js';

const rows = (...lines) => lines.flat();
const cell = (value, at) => {
  const board = Array(16).fill(0);
  board[at] = value;
  return board;
};

test('单行压缩合并：同级只合并一次，不跨块合并', () => {
  assert.deepEqual(slideLine([2, 2, 2, 2]), {
    line: [4, 4, 0, 0],
    gained: 8,
    merged: [0, 1],
  });
  assert.deepEqual(slideLine([2, 2, 4, 0]), {
    line: [4, 4, 0, 0],
    gained: 4,
    merged: [0],
  });
  assert.deepEqual(slideLine([4, 2, 2, 4]).line, [4, 4, 4, 0]);
  assert.equal(slideLine([4, 2, 2, 4]).gained, 4);
  assert.deepEqual(slideLine([2, 2, 2, 0]).line, [4, 2, 0, 0]);
  assert.deepEqual(slideLine([0, 0, 0, 2]).line, [2, 0, 0, 0]);
  assert.deepEqual(slideLine([2, 4, 8, 16]).line, [2, 4, 8, 16]);
  assert.equal(slideLine([4, 4, 8, 8]).gained, 24);
  assert.equal(slideLine([0, 0, 0, 0]).gained, 0);
});

test('四个方向的移动矩阵都正确', () => {
  const board = rows(
    [2, 2, 0, 0],
    [0, 4, 0, 4],
    [2, 0, 0, 2],
    [8, 8, 8, 0],
  );
  const left = moveBoard(board, 'left');
  assert.deepEqual(left.board, [4, 0, 0, 0, 8, 0, 0, 0, 4, 0, 0, 0, 16, 8, 0, 0]);
  assert.equal(left.gained, 32);
  assert.equal(left.moved, true);
  assert.deepEqual(left.layout[0], { value: 4, from: [0, 1] });
  assert.deepEqual(moveBoard(board, 'right').board, [
    0, 0, 0, 4, 0, 0, 0, 8, 0, 0, 0, 4, 0, 0, 8, 16,
  ]);
  const up = moveBoard(board, 'up');
  assert.deepEqual(up.board, [4, 2, 8, 4, 8, 4, 0, 2, 0, 8, 0, 0, 0, 0, 0, 0]);
  assert.equal(up.gained, 4);
  const down = moveBoard(board, 'down');
  assert.deepEqual(down.board, [0, 0, 0, 0, 0, 2, 0, 0, 4, 4, 0, 4, 8, 8, 8, 2]);
  assert.equal(down.gained, 4);
});

test('没有变化的移动不推进棋局', () => {
  const state = {
    board: cell(2, 0),
    score: 10,
    undos: 3,
    won: false,
    seen: [2],
    history: [],
  };
  const still = applyMove(state, 'left', () => 0);
  assert.equal(still.moved, false);
  assert.equal(still.gained, 0);
  assert.equal(still.state, state);
  assert.equal(state.history.length, 0);
  assert.equal(applyMove(state, 'up', () => 0).moved, false);
  assert.equal(applyMove(state, 'right', () => 0).moved, true);
});

test('无空格且无相邻同级判为结束，有空格或可合并则继续', () => {
  const full = rows(
    [2, 4, 2, 4],
    [4, 2, 4, 2],
    [2, 4, 2, 4],
    [4, 2, 4, 2],
  );
  assert.equal(isGameOver(full), true);
  const mergeable = rows(
    [2, 2, 4, 8],
    [4, 8, 2, 4],
    [2, 4, 8, 2],
    [8, 2, 4, 8],
  );
  assert.equal(isGameOver(mergeable), false);
  const spare = rows(
    [2, 4, 8, 0],
    [4, 2, 8, 16],
    [2, 4, 16, 32],
    [4, 8, 32, 64],
  );
  assert.equal(isGameOver(spare), false);
});

test('合并出独角兽判胜利，庆祝只出现一次', () => {
  const state = {
    board: rows([1024, 1024, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]),
    score: 100,
    undos: 3,
    won: false,
    seen: [1024],
    history: [],
  };
  const result = applyMove(state, 'left', () => 0);
  assert.equal(result.wonNow, true);
  assert.equal(result.state.won, true);
  assert.ok(result.state.board.includes(WIN_VALUE));
  assert.equal(WIN_VALUE, 2048);
  const again = applyMove(result.state, 'right', () => 0);
  assert.equal(again.moved, true);
  assert.equal(again.wonNow, false);
  assert.equal(again.state.won, true);
});

test('新块生成可用注入随机源控制：90% 蛋、10% 第二级', () => {
  const board = cell(4, 5);
  const egg = spawnTile(board, () => 0);
  assert.equal(egg.at, 0);
  assert.equal(egg.value, 2);
  const chick = spawnTile(board, () => 0.95);
  assert.equal(chick.value, 4);
  assert.equal(spawnTile(board, () => 0.9).value, 4);
  assert.equal(spawnTile(board, () => 0.89).value, 2);
  const last = spawnTile(board, () => 14 / 15);
  assert.equal(last.at, 15);
  assert.equal(spawnTile(Array(16).fill(2), () => 0), null);
});

test('新开一局有两个起始动物并记入见过的图鉴', () => {
  const state = newGame(() => 0);
  assert.equal(state.board.filter(Boolean).length, 2);
  assert.equal(state.score, 0);
  assert.equal(state.undos, UNDO_LIMIT);
  assert.equal(state.won, false);
  assert.deepEqual(state.seen, [2]);
  assert.deepEqual(state.history, []);
});

test('每次成功移动都会把上一步棋盘与分数压入历史', () => {
  const state = {
    board: cell(2, 3),
    score: 7,
    undos: UNDO_LIMIT,
    won: false,
    seen: [2],
    history: [],
  };
  const result = applyMove(state, 'left', () => 0);
  assert.equal(result.state.history.length, 1);
  assert.deepEqual(result.state.history.at(-1), { board: cell(2, 3), score: 7 });
});

test('撤销恢复上一步棋盘与分数并扣减次数，用完拒绝', () => {
  const boardA = cell(2, 3);
  const boardB = cell(4, 0);
  const boardC = cell(2, 1);
  let state = {
    board: cell(4, 3),
    score: 6,
    undos: UNDO_LIMIT,
    won: false,
    seen: [2, 4],
    history: [
      { board: boardA, score: 0 },
      { board: boardB, score: 2 },
      { board: boardC, score: 4 },
    ],
  };
  const firstUndo = undoMove(state);
  assert.equal(firstUndo.ok, true);
  assert.deepEqual(firstUndo.state.board, boardC);
  assert.equal(firstUndo.state.score, 4);
  assert.equal(firstUndo.state.undos, UNDO_LIMIT - 1);
  assert.equal(canUndo(firstUndo.state), true);
  const secondUndo = undoMove(firstUndo.state);
  assert.deepEqual(secondUndo.state.board, boardB);
  assert.equal(secondUndo.state.score, 2);
  assert.equal(secondUndo.state.undos, 1);
  const thirdUndo = undoMove(secondUndo.state);
  assert.deepEqual(thirdUndo.state.board, boardA);
  assert.equal(thirdUndo.state.score, 0);
  assert.equal(thirdUndo.state.undos, 0);
  assert.deepEqual(thirdUndo.state.history, []);
  assert.deepEqual(thirdUndo.state.seen, [2, 4]);
  assert.equal(canUndo(thirdUndo.state), false);
  const refused = undoMove(thirdUndo.state);
  assert.equal(refused.ok, false);
  assert.equal(refused.state, thirdUndo.state);
});

test('撤销不会丢掉已经见过的动物', () => {
  const random = () => 0.2;
  const first = applyMove(newGame(random), 'left', random).state;
  assert.ok(first.seen.length >= 1);
  const undone = undoMove(first);
  assert.equal(undone.ok, true);
  assert.deepEqual(undone.state.seen, first.seen);
});
