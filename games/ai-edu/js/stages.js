// 层先法 8 个阶段 + 四步 CFOP 的阶段：完成判定、进度、根据当前状态给提示、随机出题
// 提示永远基于"魔方现在的样子"计算，孩子走哪条路都能得到正确的下一步。
import { Cube, D_CORNERS, invertSeq } from './cube.js';

export const ALGS = {
  spell: ['R', 'U', "R'", "U'"],
  right: ['U', 'R', "U'", "R'", "U'", "F'", 'U', 'F'],
  left: ["U'", "L'", 'U', 'L', 'U', 'F', "U'", "F'"],
  oll: ['F', 'R', 'U', "R'", "U'", "F'"],
  sune: ['R', 'U', "R'", 'U', 'R', 'U2', "R'"],
  aperm: ["R'", 'F', "R'", 'B2', 'R', "F'", "R'", 'B2', 'R2'],
  uperm: ['R', "U'", 'R', 'U', 'R', 'U', 'R', "U'", "R'", "U'", 'R2'],
  // ---- 四步 CFOP ----
  // F2L 的 6 个小公式：只动右前方的槽和顶层
  rur: ['R', 'U', "R'"], ruir: ['R', "U'", "R'"], ru2r: ['R', 'U2', "R'"],
  fuf: ["F'", 'U', 'F'], fuif: ["F'", "U'", 'F'], fu2f: ["F'", 'U2', 'F'],
  // OLL 第二步：7 种顶角图案
  anti: ['R', 'U2', "R'", "U'", 'R', "U'", "R'"],
  holl: ['R', 'U', "R'", 'U', 'R', "U'", "R'", 'U', 'R', 'U2', "R'"],
  pi: ['R', 'U2', 'R2', "U'", 'R2', "U'", 'R2', 'U2', 'R'],
  head: ['R2', 'D', "R'", 'U2', 'R', "D'", "R'", 'U2', "R'"],
  toll: ['r', 'U', "R'", "U'", "r'", 'F', 'R', "F'"],
  loll: ['F', "R'", "F'", 'r', 'U', 'R', "U'", "r'"],
  // PLL：角（相邻用 aperm）、棱（A 就是 uperm）
  yperm: ['F', 'R', "U'", "R'", "U'", 'R', 'U', "R'", "F'", 'R', 'U', "R'", "U'", "R'", 'F', 'R', "F'"],
  ub: ['R2', 'U', 'R', 'U', "R'", "U'", "R'", "U'", "R'", 'U', "R'"],
  hperm: ['R2', 'U2', 'R', 'U2', 'R2', 'U2', 'R2', 'U2', 'R', 'U2', 'R2'],
  zperm: ["R'", "U'", 'R', "U'", 'R', 'U', 'R', "U'", "R'", 'U', 'R', 'U', 'R2', "U'", "R'", 'U2'],
};
// 只用于出题打乱
const ANTISUNE = ALGS.anti;
const TPERM = ['R', 'U', "R'", "U'", "R'", 'F', 'R2', "U'", "R'", "U'", 'R', 'U', "R'", "F'"];

export const MACROS = {
  spell: { label: '✨ 魔法咒语', alg: ALGS.spell },
  right: { label: '➡️ 往右放', alg: ALGS.right },
  left: { label: '⬅️ 往左放', alg: ALGS.left },
  oll: { label: '➕ 黄十字咒语', alg: ALGS.oll },
  sune: { label: '🐟 小鱼咒语', alg: ALGS.sune },
  aperm: { label: '🔺 换角咒语', alg: ALGS.aperm },
  uperm: { label: '🔁 换棱咒语', alg: ALGS.uperm },
  rur: { label: '👉 右手 ⬅', alg: ALGS.rur },
  ruir: { label: '👉 右手 ➡', alg: ALGS.ruir },
  ru2r: { label: '👉 右手 ⬅⬅', alg: ALGS.ru2r },
  fuf: { label: '🫲 前手 ⬅', alg: ALGS.fuf },
  fuif: { label: '🫲 前手 ➡', alg: ALGS.fuif },
  fu2f: { label: '🫲 前手 ⬅⬅', alg: ALGS.fu2f },
  anti: { label: '🐠 反小鱼', alg: ALGS.anti },
  holl: { label: '🅷 大H', alg: ALGS.holl },
  pi: { label: '🥧 派', alg: ALGS.pi },
  head: { label: '🔦 车头灯', alg: ALGS.head },
  toll: { label: '🆃 T字', alg: ALGS.toll },
  loll: { label: '🎀 领结', alg: ALGS.loll },
  aperm2: { label: '🔺 相邻换角', alg: ALGS.aperm },
  yperm: { label: '✖️ 对角换角', alg: ALGS.yperm },
  ua: { label: '↪️ 换棱 A', alg: ALGS.uperm },
  ub: { label: '↩️ 换棱 B', alg: ALGS.ub },
  hperm: { label: '🔀 对面换棱', alg: ALGS.hperm },
  zperm: { label: '⚡ 邻边换棱', alg: ALGS.zperm },
};
// 提示/出题里 macro 名字对应的公式（按钮别名指向同一串转动）
const algOf = id => ALGS[id] || MACROS[id].alg;

const tokens = s => (s ? s.split(' ') : []);
const U4 = ['', 'U', "U'", 'U2'];
const Y4 = ['', 'y', "y'", 'y2'];
// 先转上面再转整体，按步数从少到多排列
const UY = U4.flatMap(u => Y4.map(y => [u, y].filter(Boolean).join(' '))).sort((a, b) => tokens(a).length - tokens(b).length);

// 提示路线缓存：算出一整条路线后记住沿途每个状态的下一步，
// 孩子照着走就一直沿用，避免"先碰掉一片再放回去"这种来回反复
const keyOf = c => c.cubies.map(q => q.pos.join() + q.m.join()).join('|');
const planCache = new Map();
function planned(tag, cube, compute) {
  const key = tag + keyOf(cube);
  if (planCache.has(key)) return planCache.get(key);
  const plan = compute();
  if (!plan) return null;
  if (planCache.size > 2000) planCache.clear();
  if (!plan.length) return null;
  const c = cube.clone();
  plan.forEach(step => {
    planCache.set(tag + keyOf(c), step);
    if (step.move) c.move(step.move); else c.moves(algOf(step.macro));
  });
  return plan[0];
}

// 逐层扩展：找到让 metric 变大的最短转法
function searchMoves(cube, metric, faces, maxDepth = 4) {
  const base = metric(cube);
  const moves = faces.flatMap(f => [f, f + "'", f + '2']);
  const seen = new Set([keyOf(cube)]);
  let frontier = [{ c: cube, path: [] }];
  for (let d = 1; d <= maxDepth; d++) {
    const next = [];
    for (const node of frontier) {
      const last = node.path.length ? node.path[node.path.length - 1][0] : '';
      for (const m of moves) {
        if (m[0] === last) continue;
        const c = node.c.clone().move(m);
        const path = [...node.path, m];
        if (metric(c) > base) return path.map(move => ({ move }));
        const key = keyOf(c);
        if (seen.has(key)) continue;
        seen.add(key);
        next.push({ c, path });
      }
    }
    frontier = next;
  }
  return null;
}

// 以"调整 + 咒语"为一个单位搜索，直到 goal 成立（最后允许再调整一次）
function searchMacro(cube, { setups, macros, finals = [''], goal, maxDepth = 3 }) {
  const asSteps = s => tokens(s).map(move => ({ move }));
  let frontier = [{ c: cube, path: [] }];
  for (let d = 0; d <= maxDepth; d++) {
    for (const node of frontier) {
      const s = finals.find(f => goal(node.c.clone().moves(tokens(f))));
      if (s !== undefined) return [...node.path, ...asSteps(s)];
    }
    if (d === maxDepth) break;
    frontier = frontier.flatMap(node => setups.flatMap(s => macros.map(m => ({
      c: node.c.clone().moves([...tokens(s), ...algOf(m)]),
      path: [...node.path, ...asSteps(s), { macro: m }],
    }))));
  }
  return null;
}

const sameSpot = (a, b) => a[0] === b[0] && a[2] === b[2];
const FR = [1, -1, 1];
const UFR = [1, 1, 1];

// 白角：家在右前下方、角块在它正上方 → 念咒语；否则先转上面对准，再转整体
function cornerHint(c) {
  const done = p => c.pieceSolved(p);
  const piecePos = p => c.findPiece(c.homeColors(p));
  if (!done(FR)) {
    const q = piecePos(FR);
    if (q.join() === UFR.join() || q.join() === FR.join()) return { macro: 'spell' };
  }
  const tryMoves = (list, ok) => list.find(m => ok(c.clone().move(m)));
  for (const p of D_CORNERS) {
    if (done(p)) continue;
    const q = piecePos(p);
    if (q[1] !== 1) continue;
    if (!sameSpot(q, p)) {
      const m = tryMoves(['U', "U'", 'U2'], c2 => sameSpot(c2.findPiece(c2.homeColors(p)), p));
      return { move: m };
    }
    const m = tryMoves(['y', "y'", 'y2'], c2 => !c2.pieceSolved(FR) && c2.findPiece(c2.homeColors(FR)).join() === UFR.join());
    return { move: m };
  }
  // 白角卡在底层错的位置：转到右前下方，念一次咒语把它请出来
  for (const p of D_CORNERS) {
    if (done(p) || !c.cubieAt(p).stickers.some(s => s.c === 'W')) continue;
    if (p.join() === FR.join()) return { macro: 'spell' };
    return { move: ['y', "y'", 'y2'].find(m => { const c2 = c.clone().move(m); return !c2.pieceSolved(FR) && c2.cubieAt(FR).stickers.some(s => s.c === 'W'); }) };
  }
  return null;
}

const FULL = ['R', 'L', 'U', 'D', 'F', 'B'];

// ---- F2L：把要做的槽转到右前方，只用 U 和 6 个小公式配对入槽 ----
const SLOT_C = [1, -1, 1];
const SLOT_E = [1, 0, 1];
const TRIGS = ['rur', 'ruir', 'ru2r', 'fuf', 'fuif', 'fu2f'];
const slotDone = c => c.pieceSolved(SLOT_C) && c.pieceSolved(SLOT_E);
const pieceIndex = (c, colors) => {
  const want = [...colors].sort().join();
  return c.cubies.findIndex(q => q.stickers.map(s => s.c).sort().join() === want);
};
const stepsCost = plan => plan.reduce((n, s) => n + (s.macro ? 3 : 1), 0);

// 右前方的槽：角块和棱块都在顶层或这个槽里时，按"只看这两块"的状态做 BFS（最多 150 种状态）
function pairPlan(c) {
  const ci = pieceIndex(c, c.homeColors(SLOT_C));
  const ei = pieceIndex(c, c.homeColors(SLOT_E));
  const free = q => q.pos[1] === 1 || sameSpot(q.pos, SLOT_C);
  if (!free(c.cubies[ci]) || !free(c.cubies[ei])) return null;
  const key = x => [ci, ei].map(i => x.cubies[i].pos.join() + x.cubies[i].m.join()).join('|');
  const units = [...['U', "U'", 'U2'].map(move => ({ move })), ...TRIGS.map(macro => ({ macro }))];
  const seen = new Set([key(c)]);
  let frontier = [{ c, path: [] }];
  while (frontier.length) {
    const next = [];
    for (const node of frontier) {
      if (slotDone(node.c)) return node.path;
      for (const u of units) {
        if (u.move && node.path.at(-1)?.move) continue;
        const x = node.c.clone().moves(u.move ? [u.move] : ALGS[u.macro]);
        const k = key(x);
        if (seen.has(k)) continue;
        seen.add(k);
        next.push({ c: x, path: [...node.path, u] });
      }
    }
    frontier = next;
  }
  return null;
}

// 挑一个最省事的槽；所有槽的块都卡在别的槽里时，先用 R U R' 请出来（角和棱可能卡在两个槽里，最多请两次）
function f2lPlan(c) {
  let best = null;
  const consider = (prefix, x) => {
    for (const y of Y4) {
      const x2 = x.clone().moves(tokens(y));
      if (slotDone(x2)) continue;
      const p = pairPlan(x2);
      if (!p) continue;
      const plan = [...prefix, ...tokens(y).map(move => ({ move })), ...p];
      if (!best || stepsCost(plan) < stepsCost(best)) best = plan;
    }
  };
  let frontier = [{ prefix: [], x: c }];
  for (let round = 0; round < 3 && !best; round++) {
    frontier.forEach(({ prefix, x }) => consider(prefix, x));
    frontier = frontier.flatMap(({ prefix, x }) => Y4.flatMap(y => {
      const x2 = x.clone().moves(tokens(y));
      if (slotDone(x2)) return [];
      return [{ prefix: [...prefix, ...tokens(y).map(move => ({ move })), { macro: 'rur' }], x: x2.moves(ALGS.rur) }];
    }));
  }
  return best;
}

const crossHint = c => planned('crossD', c, () =>
  searchMoves(c, x => x.crossCount(), FULL, 4) || searchMoves(c, x => x.crossCount() * 10 + x.petalCount(), FULL, 3));
const LL_DONE = c => c.isF2L() && c.yellowEdgesUp() === 4 && c.yellowCornersUp() === 4;
const OLL4 = ['sune', 'anti', 'holl', 'pi'];
const OLL7 = [...OLL4, 'head', 'toll', 'loll'];
const ollHint = macros => c => planned('oll' + macros.length, c, () =>
  searchMacro(c, { setups: U4, macros, goal: x => x.yellowCornersUp() === 4, maxDepth: 2 }));

export const STAGES = {
  daisy: {
    label: '🌼 花瓣', pad: ['R', 'L', 'U', 'F', 'B'],
    count: c => c.petalCount(), done: c => c.isDaisy(),
    hint: c => planned('daisy', c, () => searchMoves(c, x => x.petalCount(), ['R', 'L', 'U', 'F', 'B'], 3)),
    tips: {},
  },
  // 完整挑战用：花瓣和已经做好的十字块都算数
  daisyAny: {
    title: '种小白花', label: '🌼 花瓣', pad: FULL,
    count: c => c.petalCount() + c.crossCount(), done: c => c.petalCount() + c.crossCount() === 4,
    hint: c => planned('daisyAny', c, () => searchMoves(c, x => x.petalCount() + x.crossCount(), FULL, 4)),
    tips: {},
  },
  cross: {
    title: '白色大十字', label: '✚ 十字', pad: ['R', 'L', 'U', 'F', 'B'],
    count: c => c.crossCount(), done: c => c.isWhiteCross(),
    hint: c => planned('cross', c, () => searchMoves(c, x => x.crossCount() * 10 + x.petalCount(), ['R', 'L', 'U', 'F', 'B'], 3)),
    tips: { U: '转上面，让花瓣侧面的颜色和下面的中心块一样', side: '颜色对上啦！把这一面转两下，花瓣就掉到底部了' },
  },
  corners: {
    title: '白色第一层', label: '⬜ 白角', pad: ['U', 'y'], macros: ['spell'],
    count: c => c.cornerCount(), done: c => c.isFirstLayer(), hint: cornerHint,
    tips: { U: '转上面，把白角送到它家的正上方', y: '转整个魔方，让它的家在右前下方', macro: '念咒语，一直念到角块回家' },
  },
  middle: {
    title: '中间第二层', label: '🧱 第二层', pad: ['U', 'y'], macros: ['right', 'left'],
    count: c => c.middleCount(), done: c => c.isF2L(),
    hint: c => planned('middle', c, () => searchMacro(c, { setups: UY, macros: ['right', 'left'], goal: x => x.middleCount() > c.middleCount(), maxDepth: 2 })),
    tips: { U: '转上面，让一个没有黄色的棱块和中心对成倒立的 T', y: '转整个魔方，把 T 转到正前方', macro: '看 T 顶上的颜色和哪边中心一样，就往哪边放' },
  },
  ycross: {
    title: '黄色十字', label: '➕ 黄十字', pad: ['U'], macros: ['oll'],
    count: c => c.yellowEdgesUp(), done: c => c.isF2L() && c.yellowEdgesUp() === 4,
    hint: c => planned('ycross', c, () => searchMacro(c, { setups: U4, macros: ['oll'], goal: x => x.yellowEdgesUp() === 4 })),
    tips: { U: '转上面：小拐角放到左后方，横线要横着放', macro: '摆好啦，念黄十字咒语' },
  },
  yface: {
    title: '黄色顶面', label: '🟨 黄面', pad: ['U'], macros: ['sune'],
    count: c => c.yellowCornersUp(), done: c => c.isF2L() && c.yellowEdgesUp() === 4 && c.yellowCornersUp() === 4,
    hint: c => planned('yface', c, () => searchMacro(c, { setups: U4, macros: ['sune'], goal: x => x.yellowCornersUp() === 4 })),
    tips: { U: '转上面换个位置', macro: '位置对了，念小鱼咒语' },
  },
  ycorners: {
    title: '顶层角块归位', label: '🔺 顶角', pad: ['U'], macros: ['aperm'],
    count: c => c.topCornerCount(), done: c => c.isF2L() && c.yellowCornersUp() === 4 && c.yellowEdgesUp() === 4 && c.topCornerCount() === 4,
    hint: c => planned('ycorners', c, () => searchMacro(c, { setups: U4, macros: ['aperm'], finals: U4, goal: x => x.topCornerCount() === 4 })),
    tips: { U: '转上面：把颜色一样的一对「车灯」放到后面', macro: '念换角咒语' },
  },
  yedges: {
    title: '顶层棱块归位', label: '🏁 顶棱', pad: ['U', 'y'], macros: ['uperm'],
    count: c => c.topEdgeCount(), done: c => c.isSolved(),
    hint: c => planned('yedges', c, () => searchMacro(c, { setups: [...Y4, 'U', "U'", 'U2'], macros: ['uperm'], finals: U4, goal: x => x.isSolved() })),
    tips: { y: '转整个魔方，把已经拼好的一整面放到后面', U: '转上面对齐颜色', macro: '念换棱咒语' },
  },
};

// ---- 四步 CFOP ----
Object.assign(STAGES, {
  crossD: {
    title: '底部十字', label: '✚ 十字', pad: FULL,
    count: c => c.crossCount(), done: c => c.isWhiteCross(), hint: crossHint,
    tips: { side: '把白色棱块直接送到底部，侧面颜色要和中心对上' },
  },
  f2l: {
    title: 'F2L 前两层', label: '🤝 槽', pad: ['U', 'y'], macros: TRIGS,
    count: c => (c.isWhiteCross() ? c.pairCount() : 0), done: c => c.isF2L(),
    hint: c => planned('f2l', c, () => f2lPlan(c)),
    tips: { U: '转上面，把角块和棱块摆到小公式能用的位置', y: '转整个魔方，把要做的槽放到右前方', macro: '用小公式配对或入槽' },
  },
  oll4: {
    title: 'OLL 顶面', label: '🟨 黄角', pad: ['U'], macros: OLL4,
    count: c => c.yellowCornersUp(), done: LL_DONE, hint: ollHint(OLL4),
    tips: { U: '转上面，把图案摆到公式要求的位置', macro: '认出图案啦' },
  },
  oll: {
    title: 'OLL 顶面', label: '🟨 黄角', pad: ['U'], macros: OLL7,
    count: c => c.yellowCornersUp(), done: LL_DONE, hint: ollHint(OLL7),
    tips: { U: '转上面，把图案摆到公式要求的位置', macro: '认出图案啦' },
  },
  pllc: {
    title: 'PLL 角块', label: '🔺 顶角', pad: ['U'], macros: ['aperm2', 'yperm'],
    count: c => c.topCornerCount(), done: c => LL_DONE(c) && c.topCornerCount() === 4,
    hint: c => planned('pllc', c, () => searchMacro(c, { setups: U4, macros: ['aperm2', 'yperm'], finals: U4, goal: x => x.topCornerCount() === 4, maxDepth: 2 })),
    tips: { U: '转上面：有车灯就把车灯放到后面，对齐颜色', macro: '念换角公式' },
  },
  plle: {
    title: 'PLL 棱块', label: '🏁 顶棱', pad: ['U', 'y'], macros: ['ua', 'ub', 'hperm', 'zperm'],
    count: c => c.topEdgeCount(), done: c => c.isSolved(),
    hint: c => planned('plle', c, () => searchMacro(c, { setups: UY, macros: ['ua', 'ub', 'hperm', 'zperm'], finals: U4, goal: x => x.isSolved(), maxDepth: 2 })),
    tips: { y: '转整个魔方，把拼好的一面放到后面', U: '转上面对齐颜色', macro: '看前面中间那块的颜色，选对公式' },
  },
});

// 完整挑战：按顺序找出现在该做哪一步
export const STAGE_ORDER = ['daisyAny', 'cross', 'corners', 'middle', 'ycross', 'yface', 'ycorners', 'yedges'];
export function currentStage(c) {
  if (c.petalCount() + c.crossCount() < 4) return 'daisyAny';
  if (!c.isWhiteCross()) return 'cross';
  if (c.cornerCount() < 4) return 'corners';
  if (c.middleCount() < 4) return 'middle';
  if (c.yellowEdgesUp() < 4) return 'ycross';
  if (c.yellowCornersUp() < 4) return 'yface';
  if (c.topCornerCount() < 4) return 'ycorners';
  return 'yedges';
}

export const CFOP_ORDER = ['crossD', 'f2l', 'ycross', 'oll', 'pllc', 'plle'];
export function currentStageCfop(c) {
  if (!c.isWhiteCross()) return 'crossD';
  if (!c.isF2L()) return 'f2l';
  if (c.yellowEdgesUp() < 4) return 'ycross';
  if (c.yellowCornersUp() < 4) return 'oll';
  if (c.topCornerCount() < 4) return 'pllc';
  return 'plle';
}
export const ORDERS = {
  beginner: { list: STAGE_ORDER, current: currentStage },
  cfop: { list: CFOP_ORDER, current: currentStageCfop },
};

// ---- 出题 ----
const pick = (arr, rand) => arr[Math.floor(rand() * arr.length)];
const U_Y = [['U'], ["U'"], ['y'], ["y'"]];

function scramble(units, n, ok, rand) {
  for (let tries = 0; tries < 200; tries++) {
    const c = new Cube();
    for (let i = 0; i < n; i++) c.moves(pick(units, rand));
    if (ok(c)) return { start: c };
  }
  throw new Error('scramble failed');
}

const KEEP_CROSS = [...U_Y, ['R', 'U', "R'"], ['R', "U'", "R'"], ["L'", "U'", 'L'], ['F', 'U', "F'"], ['B', "U'", "B'"], ALGS.right, ALGS.left, ALGS.sune];
const KEEP_LAYER1 = [...U_Y, ALGS.right, ALGS.left, ALGS.sune, ALGS.oll];
const KEEP_F2L = [...U_Y, ALGS.oll, ALGS.sune, ANTISUNE, ALGS.aperm, TPERM];
const KEEP_YCROSS = [...U_Y, ALGS.sune, ANTISUNE, ALGS.aperm, ALGS.uperm];
const KEEP_YFACE = [...U_Y, ALGS.aperm, ALGS.uperm, TPERM];

export const PUZZLES = {
  corners: (rand = Math.random) => scramble(KEEP_CROSS, 18, c => c.isWhiteCross() && c.cornerCount() <= 1, rand),
  middle: (rand = Math.random) => scramble(KEEP_LAYER1, 14, c => c.isFirstLayer() && c.middleCount() <= 1, rand),
  ycross: (rand = Math.random) => scramble(KEEP_F2L, 10, c => c.isF2L() && c.yellowEdgesUp() < 4, rand),
  yface: (rand = Math.random) => scramble(KEEP_YCROSS, 10, c => STAGES.ycross.done(c) && c.yellowCornersUp() < 4, rand),
  ycorners: (rand = Math.random) => scramble(KEEP_YFACE, 10, c => STAGES.yface.done(c) && U4.every(u => c.clone().moves(tokens(u)).topCornerCount() < 4), rand),
  yedges: (rand = Math.random) => scramble([['y'], ALGS.uperm], 8, c => STAGES.ycorners.done(c) && !c.isSolved(), rand),
  // CFOP：只乱右前方一个槽 / 十字完好、四个槽全乱
  f2lOne: (rand = Math.random) => scramble([['U'], ["U'"], ...TRIGS.map(t => ALGS[t])], 7, c => c.isWhiteCross() && c.pairCount() === 3 && !slotDone(c), rand),
  f2l: (rand = Math.random) => scramble([...U_Y, ...TRIGS.map(t => ALGS[t])], 24, c => c.isWhiteCross() && c.pairCount() <= 1, rand),
  // 只出这 4 种顶角图案：从还原态倒做其中一个公式，再随机转一转
  oll4: (rand = Math.random) => {
    const c = new Cube().moves(invertSeq(ALGS[pick(OLL4, rand)]));
    for (let i = 0; i < 3; i++) c.moves(pick([['U'], ["U'"], ['y'], ALGS.uperm, ALGS.aperm], rand));
    return { start: c };
  },
  oll: (rand = Math.random) => scramble([...U_Y, ...OLL7.map(k => ALGS[k]), ALGS.aperm], 8, c => c.isF2L() && c.yellowEdgesUp() === 4 && c.yellowCornersUp() < 4, rand),
  pllc: (rand = Math.random) => scramble([...U_Y, ALGS.aperm, ALGS.yperm, ALGS.uperm], 8, c => LL_DONE(c) && U4.every(u => c.clone().moves(tokens(u)).topCornerCount() < 4), rand),
  plle: (rand = Math.random) => scramble([['y'], ALGS.uperm, ALGS.ub, ALGS.hperm, ALGS.zperm], 6, c => LL_DONE(c) && c.topCornerCount() === 4 && !c.isSolved(), rand),
  full: (rand = Math.random) => {
    const faces = ['R', 'L', 'U', 'D', 'F', 'B'];
    const seq = [];
    while (seq.length < 25) {
      const f = pick(faces, rand);
      if (seq.length && seq[seq.length - 1][0] === f) continue;
      seq.push(f + pick(['', "'", '2'], rand));
    }
    return { start: new Cube().moves(seq) };
  },
};

// 从还原态倒推：做完 solution 正好完成，适合做简单的引导题
export const fromSolved = solution => ({ start: new Cube().moves(invertSeq(solution)) });
