// Pet Reversi (萌宠黑白棋) Engine

export const EMPTY = 0;
export const BLACK = 1; // 🐱 咪咪猫 (先手)
export const WHITE = 2; // 🐶 汪汪狗 (后手)

export const BOARD_SIZE = 8;

export const DIRECTIONS = [
  [-1, 0], [1, 0], [0, -1], [0, 1], // N, S, W, E
  [-1, -1], [-1, 1], [1, -1], [1, 1], // NW, NE, SW, SE
];

// Classic 8x8 positional weights matrix
export const WEIGHTS = [
  [100, -20, 10,  5,  5, 10, -20, 100],
  [-20, -50, -2, -2, -2, -2, -50, -20],
  [ 10,  -2, -1, -1, -1, -1,  -2,  10],
  [  5,  -2, -1,  0,  0, -1,  -2,   5],
  [  5,  -2, -1,  0,  0, -1,  -2,   5],
  [ 10,  -2, -1, -1, -1, -1,  -2,  10],
  [-20, -50, -2, -2, -2, -2, -50, -20],
  [100, -20, 10,  5,  5, 10, -20, 100],
];

export function createInitialBoard() {
  const board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
  board[3][3] = WHITE;
  board[3][4] = BLACK;
  board[4][3] = BLACK;
  board[4][4] = WHITE;
  return board;
}

export function cloneBoard(board) {
  return board.map(row => [...row]);
}

export function isValidCoord(r, c) {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

/**
 * Returns array of [r, c] opponent pieces that would be flipped in a given direction
 */
export function getFlippableInDir(board, r, c, dr, dc, color) {
  const oppColor = color === BLACK ? WHITE : BLACK;
  const flippable = [];
  let cr = r + dr;
  let cc = c + dc;

  while (isValidCoord(cr, cc) && board[cr][cc] === oppColor) {
    flippable.push([cr, cc]);
    cr += dr;
    cc += dc;
  }

  if (isValidCoord(cr, cc) && board[cr][cc] === color && flippable.length > 0) {
    return flippable;
  }
  return [];
}

/**
 * Returns all coordinates flipped if placing piece of `color` at `(r, c)`
 */
export function getFlippablePieces(board, r, c, color) {
  if (!isValidCoord(r, c) || board[r][c] !== EMPTY) return [];
  const allFlippable = [];
  for (const [dr, dc] of DIRECTIONS) {
    const list = getFlippableInDir(board, r, c, dr, dc, color);
    if (list.length > 0) {
      allFlippable.push(...list);
    }
  }
  return allFlippable;
}

export function isLegalMove(board, r, c, color) {
  return getFlippablePieces(board, r, c, color).length > 0;
}

export function getLegalMoves(board, color) {
  const moves = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const flips = getFlippablePieces(board, r, c, color);
      if (flips.length > 0) {
        moves.push({ r, c, flips });
      }
    }
  }
  return moves;
}

export function applyMove(board, r, c, color) {
  const flips = getFlippablePieces(board, r, c, color);
  if (flips.length === 0) return null;

  const nextBoard = cloneBoard(board);
  nextBoard[r][c] = color;
  for (const [fr, fc] of flips) {
    nextBoard[fr][fc] = color;
  }
  return { nextBoard, flips };
}

export function countPieces(board) {
  let black = 0;
  let white = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === BLACK) black++;
      else if (board[r][c] === WHITE) white++;
    }
  }
  return { black, white, total: black + white };
}

export function isGameOver(board) {
  const blackMoves = getLegalMoves(board, BLACK);
  const whiteMoves = getLegalMoves(board, WHITE);
  return blackMoves.length === 0 && whiteMoves.length === 0;
}

/**
 * AI Move Evaluation:
 * @param {Array} board
 * @param {number} color
 * @param {'easy'|'medium'|'hard'} difficulty
 */
export function chooseAiMove(board, color, difficulty = 'medium') {
  const legalMoves = getLegalMoves(board, color);
  if (legalMoves.length === 0) return null;

  if (difficulty === 'easy') {
    // Random move from legal moves
    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
  }

  if (difficulty === 'medium') {
    // 1-ply positional greedy evaluation
    let bestScore = -Infinity;
    let bestMove = legalMoves[0];

    for (const move of legalMoves) {
      let score = WEIGHTS[move.r][move.c] + move.flips.length * 2;
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    return bestMove;
  }

  // Hard: 2-ply Minimax with Alpha-Beta
  const oppColor = color === BLACK ? WHITE : BLACK;
  let bestScore = -Infinity;
  let bestMove = legalMoves[0];

  for (const move of legalMoves) {
    const res = applyMove(board, move.r, move.c, color);
    const oppMoves = getLegalMoves(res.nextBoard, oppColor);

    let minOppScore = Infinity;
    if (oppMoves.length === 0) {
      minOppScore = 0; // opp passes, good for us
    } else {
      for (const oppMove of oppMoves) {
        const oppVal = WEIGHTS[oppMove.r][oppMove.c] + oppMove.flips.length * 2;
        if (oppVal < minOppScore) {
          minOppScore = oppVal;
        }
      }
    }

    const netScore = WEIGHTS[move.r][move.c] * 2 + move.flips.length - minOppScore;
    if (netScore > bestScore) {
      bestScore = netScore;
      bestMove = move;
    }
  }

  return bestMove;
}

export function sanitizeProgress(raw) {
  const fallback = { wins: 0, losses: 0, draws: 0 };
  if (!raw || typeof raw !== 'object') return fallback;
  return {
    wins: typeof raw.wins === 'number' && raw.wins >= 0 ? Math.floor(raw.wins) : 0,
    losses: typeof raw.losses === 'number' && raw.losses >= 0 ? Math.floor(raw.losses) : 0,
    draws: typeof raw.draws === 'number' && raw.draws >= 0 ? Math.floor(raw.draws) : 0,
  };
}
