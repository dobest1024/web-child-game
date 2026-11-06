// 迷宫寻宝队 · 关卡生成器（纯逻辑，可在 Node 中直接 import，不碰 DOM）。
// 每关用带 seed 的递归回溯算法生成完美迷宫，再用 BFS 校验连通性，
// 并用 BFS + 全排列算出「起点 → 全部星星和钥匙 → 出口」的最短路线，
// 参考步数（3 星线）= 该路线 × 1.15 上取整。同 seed 生成同一座迷宫。
export const vectors = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
export const key = ([x, y]) => `${x},${y}`;
export const parse = (at) => at.split(',').map(Number);
// 四个方向：0 上、1 右、2 下、3 左。墙记录成 4 位掩码，1 << 方向 表示该方向可走。
export const themes = [
  {
    name: '苔藓森林',
    icon: '🌿',
    background: '#dce8c4',
    ground: '#eef4da',
    accent: '#5f8a4f',
    wall: '#4c6e3c',
    story: '小狐狸皮皮从窝里出发，去捡回亮晶晶的星星。',
  },
  {
    name: '萤火虫谷',
    icon: '🍄',
    background: '#e6e0b8',
    ground: '#f4efd3',
    accent: '#8a9a4a',
    wall: '#6b7a3c',
    story: '天色慢慢暗了，萤火虫提着小灯，照着迷宫里的路。',
  },
  {
    name: '月光树洞',
    icon: '🌙',
    background: '#d4dde6',
    ground: '#e8edf3',
    accent: '#7b93a8',
    wall: '#55707f',
    story: '月亮升起来啦，陪皮皮走完最后一段寻宝路。',
  },
];
// 每关配置：名字、边长、星星数、钥匙数（0 表示出口不上锁）、提示。
const designs = [
  ['第一颗星星', 8, 1, 0, '顺着小路走，踩到星星就会捡起来，最后回到回家的门。'],
  ['弯弯的小路', 8, 2, 0, '走错不要紧，看看步数，想一想哪条路更短。'],
  ['蘑菇岔路口', 9, 2, 0, '先看清楚岔路，星星常常藏在迷宫的角落里。'],
  ['苔藓三宝', 9, 3, 0, '三颗星星都要捡到，才有机会拿到三颗星哦。'],
  ['上锁的家门', 10, 2, 1, '门锁着啦！先找到金钥匙，门就会自动打开。'],
  ['萤火虫的钥匙', 10, 3, 1, '钥匙可能藏在死胡同里，把每条小路都逛一逛。'],
  ['谷底寻宝', 11, 3, 1, '先计划好路线：捡完星星和钥匙，最后再回家。'],
  ['两把钥匙', 11, 3, 2, '两把金钥匙都要拿到，锁着的门才会打开。'],
  ['月光开门', 12, 3, 2, '月光很亮，先看清整条路再出发，能省下很多步数。'],
  ['树洞迷宫', 12, 3, 2, '迷宫变大啦，一段一段记路，走错就原路退回来。'],
  ['三把钥匙', 13, 3, 3, '三把钥匙藏在三个角落，规划一条顺路的路线吧。'],
  ['满载而归', 14, 3, 3, '最后一关啦！捡齐所有宝贝，一步都不浪费地回家。'],
];
export const SEEDS = [11, 23, 37, 53, 67, 83, 97, 109, 127, 139, 151, 167];
const mulberry32 = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
// 递归回溯（用栈迭代实现）：每一格都打通到访问树里，得到完美迷宫。
function carveMaze(size, rng) {
  const masks = new Array(size * size).fill(0);
  const visited = new Uint8Array(size * size);
  const home = Math.floor(rng() * size * size);
  const stack = [home];
  visited[home] = 1;
  while (stack.length) {
    const current = stack[stack.length - 1];
    const x = current % size,
      y = Math.floor(current / size);
    const neighbors = [];
    for (let direction = 0; direction < 4; direction++) {
      const nx = x + vectors[direction][0],
        ny = y + vectors[direction][1];
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      const next = ny * size + nx;
      if (!visited[next]) neighbors.push([direction, next]);
    }
    if (!neighbors.length) {
      stack.pop();
      continue;
    }
    const [direction, next] = neighbors[Math.floor(rng() * neighbors.length)];
    masks[current] |= 1 << direction;
    masks[next] |= 1 << ((direction + 2) % 4);
    visited[next] = 1;
    stack.push(next);
  }
  return { masks, home };
}
export function cellMask(level, x, y) {
  return level.masks[y * level.size + x] || 0;
}
// 广度优先：返回 from 到各格的步数。blocked 里的格子当作不能路过（例如上锁的出口）。
export function bfs(level, from, blocked = null) {
  const size = level.size;
  const dist = new Map([[from, 0]]);
  const queue = [from];
  for (let i = 0; i < queue.length; i++) {
    const at = queue[i];
    const [x, y] = parse(at);
    const distance = dist.get(at);
    for (let direction = 0; direction < 4; direction++) {
      if (!(cellMask(level, x, y) & (1 << direction))) continue;
      const nx = x + vectors[direction][0],
        ny = y + vectors[direction][1];
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      const next = key([nx, ny]);
      if (dist.has(next) || (blocked && blocked.has(next))) continue;
      dist.set(next, distance + 1);
      queue.push(next);
    }
  }
  return dist;
}
const shuffle = (rng, arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};
// 最短寻宝路线：起点出发，按最优顺序捡完所有星星和钥匙，最后进出口。
// 中途不允许穿过出口（上锁时根本进不去），只把它当作终点。
export function tourDistance(level) {
  const stops = [...level.stars, ...level.keys];
  if (!stops.length) return bfs(level, level.start).get(level.exit);
  const blocked = new Set([level.exit]);
  const fromStart = bfs(level, level.start, blocked);
  const maps = stops.map((stop) => bfs(level, stop, blocked));
  const lastLegs = stops.map((stop) => bfs(level, stop).get(level.exit));
  let best = Infinity;
  const used = new Array(stops.length).fill(false);
  const order = [];
  const walk = (total, map) => {
    if (total >= best) return;
    if (order.length === stops.length) {
      best = Math.min(best, total + lastLegs[order[order.length - 1]]);
      return;
    }
    for (let i = 0; i < stops.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      order.push(i);
      walk(total + map.get(stops[i]), maps[i]);
      order.pop();
      used[i] = false;
    }
  };
  walk(0, fromStart);
  return best;
}
function validate(level) {
  const cells = level.size * level.size;
  let edges = 0;
  for (const mask of level.masks)
    for (let bit = 0; bit < 4; bit++) if (mask & (1 << bit)) edges++;
  if (edges / 2 !== cells - 1) return false;
  const seen = bfs(level, level.start);
  if (seen.size !== cells) return false;
  const spots = [level.exit, ...level.stars, ...level.keys];
  if (new Set(spots).size !== spots.length) return false;
  for (const at of spots)
    if (at === level.start || !seen.has(at)) return false;
  return true;
}
function buildLevel(id, design, seed, attempt) {
  const [name, size, starCount, keyCount, hint] = design;
  const rng = mulberry32(seed * 7919 + attempt * 65537 + 1);
  const { masks, home } = carveMaze(size, rng);
  const start = key([home % size, Math.floor(home / size)]);
  const distances = bfs({ size, masks }, start);
  let exit = start,
    farthest = 0;
  for (const [at, distance] of distances)
    if (distance > farthest) {
      farthest = distance;
      exit = at;
    }
  const taken = new Set([start, exit]);
  const far = [],
    near = [];
  for (const [at, distance] of distances) {
    if (taken.has(at)) continue;
    (distance >= Math.max(2, Math.round(farthest * 0.3)) ? far : near).push(at);
  }
  const pool = shuffle(rng, far).concat(shuffle(rng, near));
  const stars = pool.slice(0, starCount);
  const keys = pool.slice(starCount, starCount + keyCount);
  const level = {
    id,
    name,
    hint,
    theme: Math.floor(id / 4),
    story: themes[Math.floor(id / 4)].story,
    size,
    masks,
    start,
    exit,
    stars,
    keys,
    par: 0,
  };
  level.par = Math.ceil(tourDistance(level) * 1.15);
  return level;
}
// 生成失败就换一个确定性参数重来，同 seed 的重试序列完全一致。
export function generateLevel(id, seed = SEEDS[id]) {
  for (let attempt = 0; attempt < 64; attempt++) {
    const level = buildLevel(id, designs[id], seed, attempt);
    if (validate(level)) return level;
  }
  throw new Error(`第 ${id + 1} 关迷宫生成失败`);
}
export const levels = designs.map((design, id) => generateLevel(id));
