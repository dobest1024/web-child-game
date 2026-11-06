// 种子化数独生成器：同 seed 同题。先回溯生成完整解，再按难度挖洞并做唯一解检查。
export const DIFFICULTIES = {
  easy: {
    key: 'easy',
    name: '小小乐园',
    size: 4,
    boxRows: 2,
    boxCols: 2,
    digMin: 6,
    digMax: 8,
    useDigits: false,
    parMs: 120000,
    blurb: '4×4 棋盘，4 只小动物',
    story: '小花园里的第一场数独派对，4 只小动物等你来安排座位。',
  },
  medium: {
    key: 'medium',
    name: '森林进阶',
    size: 6,
    boxRows: 2,
    boxCols: 3,
    digMin: 12,
    digMax: 16,
    useDigits: false,
    parMs: 300000,
    blurb: '6×6 棋盘，6 只小动物',
    story: '森林运动会开始啦，6 只小动物要各自站好队伍。',
  },
  hard: {
    key: 'hard',
    name: '数字高峰',
    size: 9,
    boxRows: 3,
    boxCols: 3,
    digMin: 40,
    digMax: 50,
    useDigits: true,
    parMs: 900000,
    blurb: '9×9 数字棋盘，给大孩子的挑战',
    story: '数字山丘的大挑战，用 1-9 把整座山填得整整齐齐。',
  },
};
const hashSeed = (text) => {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};
export function createRng(seed) {
  let state = typeof seed === 'number' ? seed >>> 0 : hashSeed(String(seed));
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}
export const seedFor = (difficulty, index) =>
  `animal-sudoku:${difficulty}:${index}`;
const popcount = (mask) => {
  let total = 0;
  while (mask) {
    mask &= mask - 1;
    total++;
  }
  return total;
};
const shuffle = (list, rng) => {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};
// 位掩码 + 最少候选优先（MRV）的回溯求解：rng 传入时随机填充（生成完整解），
// limit 限制解数用于唯一解检查，达到上限立即早退。不会改动传入的棋盘。
function search(grid, size, boxRows, boxCols, rng, limit) {
  const work = grid.map((row) => [...row]);
  const stacks = size / boxCols;
  const boxOf = (r, c) =>
    Math.floor(r / boxRows) * stacks + Math.floor(c / boxCols);
  const rows = new Array(size).fill(0),
    cols = new Array(size).fill(0),
    boxes = new Array(size).fill(0);
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) {
      if (!work[r][c]) continue;
      const bit = 1 << work[r][c];
      rows[r] |= bit;
      cols[c] |= bit;
      boxes[boxOf(r, c)] |= bit;
    }
  const full = (1 << (size + 1)) - 2;
  let count = 0,
    solution = null;
  const walk = () => {
    let bestR = -1,
      bestC = -1,
      bestMask = 0,
      bestN = size + 1;
    outer: for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++) {
        if (work[r][c]) continue;
        const mask = full & ~(rows[r] | cols[c] | boxes[boxOf(r, c)]);
        const n = popcount(mask);
        if (n < bestN) {
          bestN = n;
          bestR = r;
          bestC = c;
          bestMask = mask;
          if (n <= 1) break outer;
        }
      }
    if (bestR < 0) {
      count++;
      if (!solution) solution = work.map((row) => [...row]);
      return count >= limit;
    }
    if (bestN === 0) return false;
    const candidates = [];
    for (let value = 1; value <= size; value++)
      if (bestMask & (1 << value)) candidates.push(value);
    if (rng) shuffle(candidates, rng);
    for (const value of candidates) {
      const bit = 1 << value;
      work[bestR][bestC] = value;
      rows[bestR] |= bit;
      cols[bestC] |= bit;
      boxes[boxOf(bestR, bestC)] |= bit;
      if (walk()) {
        work[bestR][bestC] = 0;
        return true;
      }
      work[bestR][bestC] = 0;
      rows[bestR] &= ~bit;
      cols[bestC] &= ~bit;
      boxes[boxOf(bestR, bestC)] &= ~bit;
    }
    return false;
  };
  walk();
  return { count, solution };
}
export function countSolutions(grid, size, boxRows, boxCols, limit = 2) {
  return search(grid, size, boxRows, boxCols, null, limit).count;
}
// 挖洞：随机顺序逐格尝试，每次挖掉后必须仍然唯一解，否则放回。
// 9×9 只挖一遍（控制生成时间）；小棋盘允许多扫几遍，尽量达到目标洞数。
function digHoles(solution, cfg, rng) {
  const size = cfg.size;
  const puzzle = solution.map((row) => [...row]);
  const target = cfg.digMin + Math.floor(rng() * (cfg.digMax - cfg.digMin + 1));
  const passes = size >= 9 ? 1 : 3;
  let holes = 0;
  for (let pass = 0; pass < passes && holes < target; pass++) {
    const order = shuffle(
      Array.from({ length: size * size }, (_, i) => i),
      rng,
    );
    for (const flat of order) {
      if (holes >= target) break;
      const r = Math.floor(flat / size),
        c = flat % size;
      if (!puzzle[r][c]) continue;
      const backup = puzzle[r][c];
      puzzle[r][c] = 0;
      if (countSolutions(puzzle, size, cfg.boxRows, cfg.boxCols, 2) === 1)
        holes++;
      else puzzle[r][c] = backup;
    }
  }
  return { puzzle, holes };
}
export function generatePuzzle(difficulty, seed, index = 0) {
  const cfg = DIFFICULTIES[difficulty];
  if (!cfg) throw new Error(`未知难度：${difficulty}`);
  const rng = createRng(seed);
  const empty = Array.from({ length: cfg.size }, () =>
    Array(cfg.size).fill(0),
  );
  const { solution } = search(empty, cfg.size, cfg.boxRows, cfg.boxCols, rng, 1);
  const { puzzle, holes } = digHoles(solution, cfg, rng);
  return {
    difficulty,
    index,
    size: cfg.size,
    boxRows: cfg.boxRows,
    boxCols: cfg.boxCols,
    useDigits: cfg.useDigits,
    givens: puzzle,
    solution,
    holes,
    seed: String(seed),
  };
}
