'use strict';
// ===== 棋盘规则（纯函数，tests/board.test.mjs 覆盖）=====
// 棋盘是 COLS 列，每列从下往上叠方块；方块只记部件 { part }。
// 落下的方块只和"相邻列的最上面一块"或"本列最上面一块"拼：
//   落在本列：和下面那块上下拼（自己在上）
//   落在右边一列：和左边那块左右拼（自己在右）；落在左边一列：自己在左

const COLS = 5;
const ROWS = 8;

// 浏览器里 chars.js 的顶层常量是全局词法绑定，直接取名字
const charRules = typeof module === 'object' ? require('./chars.js') : { CHARS, charOf };

function createBoard(cols = COLS, rows = ROWS) {
  return { cols, rows, stacks: Array.from({ length: cols }, () => []) };
}
const height = (b, c) => b.stacks[c].length;
const topOf = (b, c) => (c >= 0 && c < b.cols ? b.stacks[c][b.stacks[c].length - 1] || null : null);
const hasRoom = (b, c, need = 1) => c >= 0 && c < b.cols && height(b, c) + need <= b.rows;
const maxHeight = (b) => Math.max(...b.stacks.map((s) => s.length));

// 落在第 c 列时，能和哪几块拼（最多三种）
function formations(b, c, part) {
  const list = [];
  const below = topOf(b, c);
  if (below) list.push({ layout: 'tb', first: part, second: below.part, baseCol: c });
  const left = topOf(b, c - 1);
  if (left) list.push({ layout: 'lr', first: left.part, second: part, baseCol: c - 1 });
  const right = topOf(b, c + 1);
  if (right) list.push({ layout: 'lr', first: part, second: right.part, baseCol: c + 1 });
  return list.map((f) => ({ ...f, char: charRules.charOf(f.layout, f.first, f.second) }));
}

// 判定：right 拼出目标字；bonus 拼出别的学过的字；near 碰到了目标字的另一半但位置不对；stack 放在别处
function judge(b, c, part, target, known = new Set()) {
  const list = formations(b, c, part);
  const right = list.find((f) => f.char === target);
  if (right) return { kind: 'right', ...right };
  const bonus = list.find((f) => f.char && known.has(f.char));
  if (bonus) return { kind: 'bonus', ...bonus };
  const partner = partnerOf(target, part);
  const near = partner && list.find((f) => (f.baseCol === c ? f.second : f.baseCol < c ? f.first : f.second) === partner);
  if (near) return { kind: 'near', ...near, char: null };
  return { kind: 'stack', baseCol: null, char: null };
}

// 目标字里另一半部件（piece 是其中一半）
function partnerOf(target, part) {
  const ch = charRules.CHARS[target];
  if (!ch) return null;
  if (ch.parts[0] === part) return ch.parts[1];
  if (ch.parts[1] === part) return ch.parts[0];
  return null;
}

// 现在落到哪些列能拼出目标字
function answerColumns(b, target, part) {
  const cols = [];
  for (let c = 0; c < b.cols; c++) if (hasRoom(b, c) && judge(b, c, part, target).kind === 'right') cols.push(c);
  return cols;
}

// 目标字拆成"底座"和"落下来的方块"：上下结构落上面那块；左右结构随机落左边或右边那块
function splitTarget(target, random = Math.random) {
  const ch = charRules.CHARS[target];
  if (ch.layout === 'tb') return { piece: ch.parts[0], base: ch.parts[1], side: 'top' };
  return random() < 0.5
    ? { piece: ch.parts[1], base: ch.parts[0], side: 'right' }
    : { piece: ch.parts[0], base: ch.parts[1], side: 'left' };
}

// 没有能用的底座时，选一列把底座送过去；选不出来就是堆满了（返回 -1）
function deliveryColumn(b, split, random = Math.random) {
  const ok = [];
  for (let c = 0; c < b.cols; c++) {
    if (split.side === 'top' && !hasRoom(b, c, 2)) continue;
    if (split.side !== 'top' && !hasRoom(b, c)) continue;
    if (split.side === 'right' && !hasRoom(b, c + 1)) continue;
    if (split.side === 'left' && !hasRoom(b, c - 1)) continue;
    ok.push(c);
  }
  if (!ok.length) return -1;
  const low = Math.min(...ok.map((c) => height(b, c)));
  const best = ok.filter((c) => height(b, c) === low);
  return best[Math.floor(random() * best.length)];
}

// 方块出现在哪一列：尽量不在答案列、也不挨着另一半，孩子要自己挪过去
function spawnColumn(b, target, part, random = Math.random) {
  const open = [];
  for (let c = 0; c < b.cols; c++) if (hasRoom(b, c)) open.push(c);
  if (!open.length) return -1;
  const neutral = open.filter((c) => judge(b, c, part, target).kind === 'stack');
  const notAnswer = open.filter((c) => judge(b, c, part, target).kind !== 'right');
  const pool = neutral.length ? neutral : notAnswer.length ? notAnswer : open;
  const mid = (b.cols - 1) / 2;
  pool.sort((x, y) => Math.abs(x - mid) - Math.abs(y - mid) || random() - 0.5);
  return pool[0];
}

function push(b, c, part) { b.stacks[c].push({ part }); }
function pop(b, c) { return b.stacks[c].pop(); }

// 开局随机摆几块，每列最多 2 块
function fillStart(b, parts, count, random = Math.random) {
  for (let i = 0; i < count; i++) {
    const open = [];
    for (let c = 0; c < b.cols; c++) if (height(b, c) < 2) open.push(c);
    if (!open.length) break;
    push(b, open[Math.floor(random() * open.length)], parts[Math.floor(random() * parts.length)]);
  }
}

if (typeof module === 'object') {
  module.exports = {
    COLS, ROWS, createBoard, height, topOf, hasRoom, maxHeight, formations, judge, partnerOf,
    answerColumns, splitTarget, deliveryColumn, spawnColumn, push, pop, fillStart,
  };
}
