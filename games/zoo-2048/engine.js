// 2048动物园纯逻辑模块：可在 Node 中 import，绝不出现 window/document/localStorage。
// 棋盘是长度 16 的一维数组，0 表示空格，非 0 是动物分值（2^级，2=蛋 … 2048=独角兽）。
import { ANIMALS, MAX_LEVEL } from './levels.js';

export const SIZE = 4;
export const UNDO_LIMIT = 3;
export const WIN_VALUE = 2 ** MAX_LEVEL;
export const DIRECTIONS = ['left', 'up', 'right', 'down'];
const EGG_CHANCE = 0.9;
const HISTORY_LIMIT = UNDO_LIMIT;
const VALID_VALUES = new Set([0, ...ANIMALS.map((animal) => animal.value)]);

export function emptyBoard() {
  return Array(SIZE * SIZE).fill(0);
}

const entriesOf = (board) =>
  board.map((value, at) => (value ? { value, from: [at] } : null));

// 一次向左压缩：滑块靠拢，相邻同级只合并一次。返回带来源索引的条目，供 UI 做滑动动画。
function slideEntries(entries) {
  const tiles = entries.filter(Boolean);
  const line = [];
  let gained = 0;
  const merged = [];
  for (let i = 0; i < tiles.length; i++) {
    if (i + 1 < tiles.length && tiles[i].value === tiles[i + 1].value) {
      line.push({
        value: tiles[i].value * 2,
        from: [...tiles[i].from, ...tiles[i + 1].from],
      });
      gained += tiles[i].value * 2;
      merged.push(line.length - 1);
      i++;
    } else line.push({ ...tiles[i], from: [...tiles[i].from] });
  }
  while (line.length < entries.length) line.push(null);
  return { line, gained, merged };
}

export function slideLine(line) {
  const result = slideEntries(entriesOf(line));
  return {
    line: result.line.map((entry) => (entry ? entry.value : 0)),
    gained: result.gained,
    merged: result.merged,
  };
}

function lineIndices(direction) {
  const lines = [];
  for (let i = 0; i < SIZE; i++) {
    const line = [];
    for (let j = 0; j < SIZE; j++) {
      const [r, c] = {
        left: [i, j],
        right: [i, SIZE - 1 - j],
        up: [j, i],
        down: [SIZE - 1 - j, i],
      }[direction];
      line.push(r * SIZE + c);
    }
    lines.push(line);
  }
  return lines;
}

export function moveBoard(board, direction) {
  const layout = Array(SIZE * SIZE).fill(null);
  const merges = [];
  let gained = 0;
  let moved = false;
  for (const indices of lineIndices(direction)) {
    const result = slideEntries(
      indices.map((at) => (board[at] ? { value: board[at], from: [at] } : null)),
    );
    result.line.forEach((entry, j) => {
      if (!entry) return;
      const at = indices[j];
      layout[at] = entry;
      if (entry.from.length > 1 || entry.from[0] !== at) moved = true;
    });
    for (const j of result.merged) merges.push(indices[j]);
    gained += result.gained;
  }
  return {
    board: layout.map((entry) => (entry ? entry.value : 0)),
    layout,
    gained,
    moved,
    merges,
  };
}

export function emptyCells(board) {
  const cells = [];
  for (let at = 0; at < board.length; at++) if (!board[at]) cells.push(at);
  return cells;
}

// 90% 出蛋（2），10% 出第二级（4）。random 注入便于测试。
export function spawnTile(board, random = Math.random) {
  const cells = emptyCells(board);
  if (!cells.length) return null;
  const at = cells[Math.floor(random() * cells.length)];
  const value = random() < EGG_CHANCE ? 2 : 4;
  const next = [...board];
  next[at] = value;
  return { board: next, at, value };
}

export function valuesOf(board) {
  return [...new Set(board.filter(Boolean))].sort((a, b) => a - b);
}

export function isGameOver(board) {
  if (board.some((value) => !value)) return false;
  return DIRECTIONS.every((direction) => !moveBoard(board, direction).moved);
}

export function newGame(random = Math.random) {
  const first = spawnTile(emptyBoard(), random);
  const second = spawnTile(first.board, random);
  const board = second.board;
  return {
    board,
    score: 0,
    undos: UNDO_LIMIT,
    won: false,
    seen: valuesOf(board),
    history: [],
  };
}

export function applyMove(state, direction, random = Math.random) {
  const result = moveBoard(state.board, direction);
  if (!result.moved)
    return { state, moved: false, gained: 0, merges: [], layout: result.layout };
  const spawned =
    spawnTile(result.board, random) ??
    { board: result.board, at: null, value: 0 };
  const board = spawned.board;
  const wonNow = !state.won && board.includes(WIN_VALUE);
  const seen = [...new Set([...state.seen, ...valuesOf(board)])].sort(
    (a, b) => a - b,
  );
  const history = [
    ...state.history,
    { board: state.board, score: state.score },
  ].slice(-HISTORY_LIMIT);
  return {
    state: {
      board,
      score: state.score + result.gained,
      undos: state.undos,
      won: state.won || wonNow,
      seen,
      history,
    },
    moved: true,
    gained: result.gained,
    layout: result.layout,
    merges: result.merges,
    spawnedAt: spawned.at,
    spawnValue: spawned.value,
    wonNow,
  };
}

export function canUndo(state) {
  return state.undos > 0 && state.history.length > 0;
}

export function undoMove(state) {
  if (!canUndo(state)) return { state, ok: false };
  const history = [...state.history];
  const previous = history.pop();
  return {
    state: {
      ...state,
      board: previous.board,
      score: previous.score,
      undos: state.undos - 1,
      history,
    },
    ok: true,
  };
}

const toCount = (value) =>
  Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

const cleanCell = (value) => (VALID_VALUES.has(value) ? value : 0);

const cleanValues = (list) =>
  [
    ...new Set(
      (Array.isArray(list) ? list : []).filter(
        (value) => value > 0 && VALID_VALUES.has(value),
      ),
    ),
  ].sort((a, b) => a - b);

const cleanBoard = (board) =>
  Array.isArray(board) ? board.map(cleanCell) : null;

// 清洗进行中棋局：坏格子清零，长度不符、类型不对或全空棋盘则整局作废。
export function sanitizeState(raw) {
  if (
    !raw ||
    typeof raw !== 'object' ||
    !Array.isArray(raw.board) ||
    raw.board.length !== SIZE * SIZE
  )
    return null;
  const board = cleanBoard(raw.board);
  if (!board.some((value) => value > 0)) return null;
  const seen = [
    ...new Set([...cleanValues(raw.seen), ...valuesOf(board)]),
  ].sort((a, b) => a - b);
  const history = (Array.isArray(raw.history) ? raw.history : [])
    .filter(
      (entry) =>
        entry &&
        typeof entry === 'object' &&
        Array.isArray(entry.board) &&
        entry.board.length === SIZE * SIZE,
    )
    .map((entry) => ({
      board: cleanBoard(entry.board),
      score: toCount(entry.score),
    }))
    .filter((entry) => entry.board.some((value) => value > 0))
    .slice(-HISTORY_LIMIT);
  return {
    board,
    score: toCount(raw.score),
    undos: Math.min(UNDO_LIMIT, toCount(raw.undos)),
    won: raw.won === true,
    seen,
    history,
  };
}

// 清洗总存档：最高分、最高进化动物、收藏册、进行中棋局。
export function sanitizeProgress(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const album = cleanValues(source.album);
  const bestAnimal =
    source.bestAnimal > 0 && VALID_VALUES.has(source.bestAnimal)
      ? source.bestAnimal
      : album.length
        ? Math.max(...album)
        : 0;
  return {
    best: toCount(source.best),
    bestAnimal,
    album,
    game: sanitizeState(source.game),
  };
}
