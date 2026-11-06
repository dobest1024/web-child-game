import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialBoard,
  getLegalMoves,
  applyMove,
  countPieces,
  isGameOver,
  chooseAiMove,
  sanitizeProgress,
  BLACK,
  WHITE,
  EMPTY,
} from '../engine.js';

describe('Pet Reversi Engine', () => {
  it('initializes standard 8x8 Reversi board with 2 cats and 2 dogs', () => {
    const board = createInitialBoard();
    assert.equal(board.length, 8);
    assert.equal(board[0].length, 8);

    assert.equal(board[3][3], WHITE);
    assert.equal(board[3][4], BLACK);
    assert.equal(board[4][3], BLACK);
    assert.equal(board[4][4], WHITE);

    const counts = countPieces(board);
    assert.equal(counts.black, 2);
    assert.equal(counts.white, 2);
    assert.equal(counts.total, 4);
  });

  it('calculates opening legal moves for Black (cats)', () => {
    const board = createInitialBoard();
    const moves = getLegalMoves(board, BLACK);
    // Standard Othello has 4 legal opening moves: (2,3), (3,2), (4,5), (5,4)
    assert.equal(moves.length, 4);
    const coords = moves.map(m => `${m.r},${m.c}`).sort();
    assert.deepEqual(coords, ['2,3', '3,2', '4,5', '5,4']);
  });

  it('correctly applies a move and flips opponent pieces', () => {
    const board = createInitialBoard();
    // Play move at (2, 3) for Black
    const result = applyMove(board, 2, 3, BLACK);
    assert.ok(result);
    assert.equal(result.nextBoard[2][3], BLACK);
    // (3, 3) should have flipped from WHITE to BLACK
    assert.equal(result.nextBoard[3][3], BLACK);

    const counts = countPieces(result.nextBoard);
    assert.equal(counts.black, 4);
    assert.equal(counts.white, 1);
  });

  it('supports AI move generation across difficulties', () => {
    const board = createInitialBoard();
    const easy = chooseAiMove(board, BLACK, 'easy');
    assert.ok(easy && typeof easy.r === 'number' && typeof easy.c === 'number');

    const med = chooseAiMove(board, BLACK, 'medium');
    assert.ok(med && typeof med.r === 'number' && typeof med.c === 'number');

    const hard = chooseAiMove(board, BLACK, 'hard');
    assert.ok(hard && typeof hard.r === 'number' && typeof hard.c === 'number');
  });

  it('detects game over state and sanitizes progress records', () => {
    // Empty board with no moves
    const fullBoard = Array.from({ length: 8 }, () => Array(8).fill(BLACK));
    assert.ok(isGameOver(fullBoard));

    assert.deepEqual(sanitizeProgress(null), { wins: 0, losses: 0, draws: 0 });
    const clean = sanitizeProgress({ wins: 5, losses: 2, draws: 'bad' });
    assert.deepEqual(clean, { wins: 5, losses: 2, draws: 0 });
  });
});
