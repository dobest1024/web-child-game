// 数字华容道核心逻辑：棋盘、可复现打乱、滑动规则。纯逻辑，可在 Node 中直接 import。
export const vectors = [
  [0, -1], // 上
  [1, 0], // 右
  [0, 1], // 下
  [-1, 0], // 左
];
export const directionNames = ['上', '右', '下', '左'];
// Deterministic PRNG (mulberry32) so the same seed always scrambles the same way.
export function createRng(seed) {
  let state = Number(seed) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}
export function solvedBoard(size) {
  const total = size * size;
  return Array.from({ length: total }, (value, index) => (index + 1) % total);
}
export function blankAt(board) {
  return board.indexOf(0);
}
export function neighbors(size, index) {
  const row = Math.floor(index / size);
  const col = index % size;
  const list = [];
  if (row > 0) list.push(index - size);
  if (col < size - 1) list.push(index + 1);
  if (row < size - 1) list.push(index + size);
  if (col > 0) list.push(index - 1);
  return list;
}
export function isSolved(board, size) {
  const total = size * size;
  return board.every((value, index) => value === (index + 1) % total);
}
// Slide the tile at `from` into the single blank cell. Returns the new board,
// or null when the move is illegal (out of range, not adjacent, wrap-around).
export function slide(board, size, from) {
  const blank = board.indexOf(0);
  if (!Number.isInteger(from) || from < 0 || from >= board.length) return null;
  if (!neighbors(size, blank).includes(from)) return null;
  const next = board.slice();
  next[blank] = board[from];
  next[from] = 0;
  return next;
}
// `direction` is where the tile moves: the tile on the opposite side of the
// blank slides in, so pressing ArrowUp always sends a tile upward.
export function slideTowards(board, size, direction) {
  const [dx, dy] = vectors[direction] || [];
  if (!dx && !dy) return null;
  const blank = board.indexOf(0);
  return slide(board, size, blank - dx - dy * size);
}
// Scramble by playing `steps` random legal moves from the solved board, never
// undoing the previous move. The recorded path lets tests replay it backwards
// to prove every scramble can be restored.
export function shuffleBoard(size, steps, seed) {
  const rng = createRng(seed);
  let board = solvedBoard(size);
  const moves = [];
  let previous = -1;
  while (moves.length < steps || isSolved(board, size)) {
    const blank = board.indexOf(0);
    const options = neighbors(size, blank).filter(
      (index) => index !== previous,
    );
    const from = options[Math.floor(rng() * options.length)];
    moves.push({ from, to: blank });
    board = slide(board, size, from);
    previous = blank;
  }
  return { board, moves, seed };
}
// Stateful wrapper for the UI and tests: counts moves and detects completion.
export function createGame(size, steps, seed) {
  const setup = shuffleBoard(size, steps, seed);
  const game = {
    size,
    steps,
    seed,
    path: setup.moves,
    board: setup.board,
    moves: 0,
    finished: false,
    slide(from) {
      if (game.finished) return { moved: false, reason: 'finished' };
      const blank = game.board.indexOf(0);
      const next = slide(game.board, size, from);
      if (!next) return { moved: false, reason: 'blocked' };
      game.board = next;
      game.moves += 1;
      game.finished = isSolved(next, size);
      return { moved: true, from, to: blank, solved: game.finished };
    },
    towards(direction) {
      const [dx, dy] = vectors[direction] || [];
      if (!dx && !dy) return { moved: false, reason: 'blocked' };
      const blank = game.board.indexOf(0);
      return game.slide(blank - dx - dy * size);
    },
  };
  return game;
}
