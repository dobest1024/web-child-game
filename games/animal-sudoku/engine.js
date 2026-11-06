// 纯游戏逻辑：不放 DOM，可在 Node 里直接 import 测试。
import { DIFFICULTIES } from './levels.js';

export const HINTS_PER_PUZZLE = 3;
const cellKey = (r, c) => `${r},${c}`;
export function createGame(puzzle) {
  return {
    puzzle,
    grid: puzzle.givens.map((row) => [...row]),
    hintsLeft: HINTS_PER_PUZZLE,
    hinted: new Set(),
  };
}
export function isEditable(game, r, c) {
  return game.puzzle.givens[r][c] === 0 && !game.hinted.has(cellKey(r, c));
}
export function countsRemaining(game) {
  const size = game.puzzle.size;
  const counts = Array.from({ length: size + 1 }, () => 0);
  for (const row of game.grid)
    for (const value of row) if (value) counts[value]++;
  for (let value = 1; value <= size; value++) counts[value] = size - counts[value];
  return counts;
}
// (r, c) 的行、列、宫同伴中是否已有 value。
function peersContain(grid, r, c, value, boxRows, boxCols) {
  const size = grid.length;
  for (let i = 0; i < size; i++) {
    if (i !== c && grid[r][i] === value) return true;
    if (i !== r && grid[i][c] === value) return true;
  }
  const r0 = Math.floor(r / boxRows) * boxRows,
    c0 = Math.floor(c / boxCols) * boxCols;
  for (let rr = r0; rr < r0 + boxRows; rr++)
    for (let cc = c0; cc < c0 + boxCols; cc++)
      if ((rr !== r || cc !== c) && grid[rr][cc] === value) return true;
  return false;
}
export function cellConflicts(grid, r, c, boxRows, boxCols) {
  const value = grid[r][c];
  return value ? peersContain(grid, r, c, value, boxRows, boxCols) : false;
}
export function conflictPairs(grid, boxRows, boxCols) {
  const result = [];
  for (let r = 0; r < grid.length; r++)
    for (let c = 0; c < grid.length; c++)
      if (cellConflicts(grid, r, c, boxRows, boxCols)) result.push([r, c]);
  return result;
}
// 判定一次放置：allowed=false 表示题目固定或提示格；correct 对照唯一解；
// conflict 表示与同伴重复（允许放入，界面摇摇头提醒但不锁死）。
export function judgePlacement(game, r, c, value) {
  if (!isEditable(game, r, c))
    return { allowed: false, correct: false, conflict: false };
  const conflict = peersContain(
    game.grid,
    r,
    c,
    value,
    game.puzzle.boxRows,
    game.puzzle.boxCols,
  );
  return {
    allowed: true,
    correct: game.puzzle.solution[r][c] === value,
    conflict,
  };
}
export function applyValue(game, r, c, value) {
  return {
    ...game,
    grid: game.grid.map((row, ri) =>
      ri === r ? row.map((cell, ci) => (ci === c ? value : cell)) : [...row],
    ),
    hinted: new Set(game.hinted),
  };
}
export function clearCell(game, r, c) {
  if (!isEditable(game, r, c)) return game;
  return applyValue(game, r, c, 0);
}
// 提示优先填玩家选中的格子；没有合适目标时按扫描顺序挑第一处没填对的。
export function pickHintCell(game, r = -1, c = -1) {
  const { size, solution } = game.puzzle;
  const needs = (rr, cc) =>
    isEditable(game, rr, cc) && game.grid[rr][cc] !== solution[rr][cc];
  if (r >= 0 && r < size && c >= 0 && c < size && needs(r, c)) return [r, c];
  for (let rr = 0; rr < size; rr++)
    for (let cc = 0; cc < size; cc++) if (needs(rr, cc)) return [rr, cc];
  return null;
}
export function applyHint(game, r = -1, c = -1) {
  if (game.hintsLeft <= 0) return { game, at: null, value: 0 };
  const at = pickHintCell(game, r, c);
  if (!at) return { game, at: null, value: 0 };
  const value = game.puzzle.solution[at[0]][at[1]];
  const next = applyValue(game, at[0], at[1], value);
  next.hintsLeft -= 1;
  next.hinted.add(cellKey(at[0], at[1]));
  return { game: next, at, value };
}
export function isSolved(game) {
  const { size, solution } = game.puzzle;
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (game.grid[r][c] !== solution[r][c]) return false;
  return true;
}
// 星星只奖励不惩罚：全部填对保底 1 星，不用提示或够快得 2 星，又快又独立得 3 星。
export function score(difficulty, elapsedMs, hintsUsed) {
  const parMs = DIFFICULTIES[difficulty]?.parMs ?? 600000;
  const fast = elapsedMs <= parMs;
  if (hintsUsed === 0 && fast) return 3;
  if (hintsUsed <= 1 || fast) return 2;
  return 1;
}
const clampInt = (value, min, max) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(min, Math.min(max, Math.floor(number)));
};
// 存档清洗：只保留已知难度与字段，非法值归零、越界值收敛。
export function sanitizeProgress(raw) {
  const clean = {};
  for (const key of Object.keys(DIFFICULTIES)) {
    const entry = raw && typeof raw === 'object' ? raw[key] : null;
    clean[key] = {
      next: clampInt(entry?.next, 0, 999999),
      solved: clampInt(entry?.solved, 0, 999999),
      bestStars: clampInt(entry?.bestStars, 0, 3),
      bestMs: clampInt(entry?.bestMs, 0, 86400000),
    };
  }
  return clean;
}
export function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
