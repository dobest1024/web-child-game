// 魔方逻辑模型（不依赖渲染，可在 Node 中测试）
// 坐标：x 向右、y 向上、z 朝前；默认黄色朝上、白色朝下、绿色朝前（层先法"小白花"的拿法）
export const FACE_COLOR = { U: 'Y', D: 'W', F: 'G', B: 'B', R: 'O', L: 'R' };
export const FACES = {
  U: { axis: 1, layer: 1 }, D: { axis: 1, layer: -1 },
  R: { axis: 0, layer: 1 }, L: { axis: 0, layer: -1 },
  F: { axis: 2, layer: 1 }, B: { axis: 2, layer: -1 },
};
export const SIDES = ['F', 'R', 'B', 'L'];
// 整体转动：y 和 U 同向转整个魔方；r 是右边两层一起转（CFOP 公式里会用到）
const ROTATIONS = { y: { axis: 1, layer: null }, r: { axis: 0, layer: 1, layers: [1, 0] } };

// 绕 x / y / z 轴逆时针 90°（右手定则）的旋转矩阵，行优先
const ROT90 = [
  [1, 0, 0, 0, 0, -1, 0, 1, 0],
  [0, 0, 1, 0, 1, 0, -1, 0, 0],
  [0, -1, 0, 1, 0, 0, 0, 0, 1],
];
const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];

const mulMV = (m, v) => [0, 1, 2].map(i => m[i * 3] * v[0] + m[i * 3 + 1] * v[1] + m[i * 3 + 2] * v[2]);
function mulMM(a, b) {
  const r = new Array(9).fill(0);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      for (let k = 0; k < 3; k++) r[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j];
  return r;
}
const eq = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

export function normalOf(face) {
  const { axis, layer } = FACES[face];
  const n = [0, 0, 0];
  n[axis] = layer;
  return n;
}
export const faceOf = n => Object.keys(FACES).find(f => n[FACES[f].axis] === FACES[f].layer);

// ---- 转动记号：R 顺时针、R' 逆时针、R2 两下 ----
export function parseMove(m) {
  const amount = m.endsWith("'") ? 3 : m.endsWith('2') ? 2 : 1;
  return { face: m[0], amount };
}
export function moveStr(face, amount) {
  const a = ((amount % 4) + 4) % 4;
  return a === 0 ? '' : face + (a === 2 ? '2' : a === 3 ? "'" : '');
}
export const invert = m => { const { face, amount } = parseMove(m); return moveStr(face, 4 - amount); };
export const invertSeq = seq => seq.slice().reverse().map(invert);

// 合并相邻的同面转动：U U → U2，U U' → (无)
export function normalize(seq) {
  const out = [];
  for (const m of seq) {
    const { face, amount } = parseMove(m);
    const last = out.length ? parseMove(out[out.length - 1]) : null;
    if (last && last.face === face) {
      out.pop();
      const merged = moveStr(face, last.amount + amount);
      if (merged) out.push(merged);
    } else out.push(m);
  }
  return out;
}

export class Cube {
  constructor() {
    this.cubies = [];
    let id = 0;
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++) {
          if (!x && !y && !z) continue;
          const home = [x, y, z];
          const stickers = [];
          for (let axis = 0; axis < 3; axis++) {
            if (!home[axis]) continue;
            const n = [0, 0, 0];
            n[axis] = home[axis];
            stickers.push({ n, c: FACE_COLOR[faceOf(n)] });
          }
          this.cubies.push({ id: id++, home, pos: [...home], m: [...IDENTITY], stickers });
        }
  }

  clone() {
    const c = Object.create(Cube.prototype);
    c.cubies = this.cubies.map(q => ({ ...q, pos: [...q.pos], m: [...q.m] }));
    return c;
  }

  // 一步转动对应：绕哪根轴、哪一层（null = 整个魔方）、逆时针转几个 90°
  static turnInfo(move) {
    const { face, amount } = parseMove(move);
    const { axis, layer, layers } = FACES[face] || ROTATIONS[face];
    return { face, axis, layer, layers, q: (((-(layer ?? 1) * amount) % 4) + 4) % 4 };
  }

  static inTurn(cubie, { axis, layer, layers }) {
    if (layers) return layers.includes(cubie.pos[axis]);
    return layer === null || cubie.pos[axis] === layer;
  }

  move(move) {
    const info = Cube.turnInfo(move);
    let R = IDENTITY;
    for (let i = 0; i < info.q; i++) R = mulMM(ROT90[info.axis], R);
    for (const c of this.cubies) {
      if (!Cube.inTurn(c, info)) continue;
      c.pos = mulMV(R, c.pos);
      c.m = mulMM(R, c.m);
    }
    return this;
  }

  moves(seq) { seq.forEach(m => this.move(m)); return this; }

  cubieAt(pos) { return this.cubies.find(q => eq(q.pos, pos)); }

  colorAt(pos, n) {
    const c = this.cubieAt(pos);
    const s = c && c.stickers.find(s => eq(mulMV(c.m, s.n), n));
    return s ? s.c : null;
  }

  center(face) { const n = normalOf(face); return this.colorAt(n, n); }

  typeOf(id) {
    const nz = this.cubies[id].home.filter(v => v !== 0).length;
    return ['', 'center', 'edge', 'corner'][nz];
  }

  isSolved() {
    return this.cubies.every(c => c.stickers.every(s => {
      const n = mulMV(c.m, s.n);
      return s.c === this.center(faceOf(n));
    }));
  }

  // 小白花：顶层 4 个棱块的白色都朝上
  petalCount() {
    const up = normalOf('U');
    return SIDES.filter(f => this.colorAt(add(up, normalOf(f)), up) === 'W').length;
  }
  isDaisy() { return this.petalCount() === 4; }

  // 白十字：底层 4 个棱块白色朝下，侧面颜色和中心对齐
  crossCount() {
    const down = normalOf('D');
    return SIDES.filter(f => {
      const pos = add(down, normalOf(f));
      return this.colorAt(pos, down) === 'W' && this.colorAt(pos, normalOf(f)) === this.center(f);
    }).length;
  }
  isWhiteCross() { return this.crossCount() === 4; }

  // 某个位置上的小块是否已经归位（每张贴纸都和所在面的中心同色）
  pieceSolved(pos) {
    const c = this.cubieAt(pos);
    return c.stickers.every(s => {
      const n = mulMV(c.m, s.n);
      return s.c === this.center(faceOf(n));
    });
  }
  countSolved(list) { return list.filter(p => this.pieceSolved(p)).length; }

  // 哪个位置上的小块恰好是这几种颜色
  findPiece(colors) {
    const want = [...colors].sort().join();
    return this.cubies.find(c => c.stickers.map(s => s.c).sort().join() === want).pos;
  }
  // 某个位置"应该"放的小块的颜色（由相邻中心决定）
  homeColors(pos) {
    return [0, 1, 2].filter(a => pos[a]).map(a => { const n = [0, 0, 0]; n[a] = pos[a]; return this.center(faceOf(n)); });
  }

  cornerCount() { return this.countSolved(D_CORNERS); }
  isFirstLayer() { return this.isWhiteCross() && this.cornerCount() === 4; }
  middleCount() { return this.countSolved(MID_EDGES); }
  isF2L() { return this.isFirstLayer() && this.middleCount() === 4; }
  // CFOP 的 F2L：白角和它上面的中层棱块都归位，才算一个槽做好
  pairCount() { return D_CORNERS.filter((p, i) => this.pieceSolved(p) && this.pieceSolved(MID_EDGES[i])).length; }
  yellowEdgesUp() { return U_EDGES.filter(p => this.colorAt(p, [0, 1, 0]) === 'Y').length; }
  yellowCornersUp() { return U_CORNERS.filter(p => this.colorAt(p, [0, 1, 0]) === 'Y').length; }
  topCornerCount() { return this.countSolved(U_CORNERS); }
  topEdgeCount() { return this.countSolved(U_EDGES); }
}

const ring = y => [[1, y, 1], [-1, y, 1], [-1, y, -1], [1, y, -1]];
export const D_CORNERS = ring(-1);
export const U_CORNERS = ring(1);
export const MID_EDGES = ring(0);
export const U_EDGES = [[0, 1, 1], [1, 1, 0], [0, 1, -1], [-1, 1, 0]];

// ---- 关卡题目 ----
// 从还原状态把 4 个白色棱块翻到顶上，正好是一朵对齐的小白花
export const daisyBase = () => new Cube().moves(['F2', 'R2', 'B2', 'L2']);

// 已知解法 solution，倒推出题目的起始状态
export const puzzleFrom = (base, solution) => ({ start: base.clone().moves(invertSeq(solution)), solution });

// 随机小白花：从还原态逐个把白棱送上去，再随机转顶层打乱花瓣位置；逆序就是做十字的标准解
export function randomCrossPuzzle(rand = Math.random) {
  const c = new Cube();
  const seq = [];
  const up = normalOf('U');
  const order = SIDES.slice().sort(() => rand() - 0.5);
  for (const f of order) {
    while (c.colorAt(add(up, normalOf(f)), up) === 'W') { c.move('U'); seq.push('U'); }
    c.move(f + '2'); seq.push(f + '2');
    const k = Math.floor(rand() * 4);
    for (let i = 0; i < k; i++) { c.move('U'); seq.push('U'); }
  }
  return { start: c, solution: normalize(invertSeq(seq)) };
}
