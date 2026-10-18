'use strict';
// ===== 100 关（数据来自 docs/02-100关设计.md 第 8 节）=====
// 每行：关号|名字|类型|玩法|Boss|敌人|同屏|难度D|特别标记
// 类型 n 普通 / mini 小Boss / big 大Boss / final 终极；玩法 kill / collectN / surviveN / pushN / rescueN / goldK/N
// 敌人 'g6o3' = 6 个小绿 + 3 个快快；'∞goh' = 不限数量，从这几种里抽
const LEVEL_TABLE = `
1|你好坦克|n|kill||g8|3|1|basic,quiet
2|小河弯弯|n|kill||g6o3|3|1|
3|铁锤将军|mini|kill|hammer|g4o1|3|2|
4|星星草原|n|collect6||g6o3h1|3|2|
5|机器人大王|big|kill|king|g3o3|2|3|
6|散弹大师|mini|kill|shotgun|g4o2h1|3|3|
7|坚持住！|n|survive60||∞goh|3|3|
8|推推木箱|n|push2||g5o2h1|3|3|goldSure
9|捣蛋双胞胎|mini|kill|hammer+shotgun|g3o3|3|4|
10|蜗牛大王|big|kill|snail|g3o2h2|3|4|
11|滑溜溜|n|kill||g6o3b2|4|3|
12|冰雪女王|mini|kill|frost|g3b3|3|4|
13|救救小企鹅|n|rescue3||g5o3b3h1|4|4|
14|雪花炮台|n|kill||g4o3b3h1r2|4|4|
15|雪人大将|big|kill|snowman|g2b3o2|3|5|
16|冰湖摘星|n|collect8||o4b4h2r1|4|5|starsIce
17|雪地金宝宝|n|gold5/8||g6b2|3|3|
18|企鹅滑滑|mini|kill|penguin|g3o2b2r1|4|5|
19|暴风雪|n|kill||g4o4b4h2r2|4|6|iceHalf
20|冰晶飞龙|big|kill|icedragon|b4r2h2|3|6|
21|火箭小子|mini|kill|rocket|g3o2r2|3|5|plain
22|软软流沙|n|kill||g5o4h2r2|4|4|
23|挖挖来啦|n|kill||g4o3d3r2|4|5|
24|沙虫钻钻|mini|kill|worm|g3o3d2|4|5|
25|法老金字塔|big|kill|pharaoh|g2d3r2|3|6|
26|绿洲摘星|n|collect8||o4d3h2p2|4|5|
27|沙漠双子|mini|kill|rocket+worm|o3d3r2|4|6|
28|跳跳沙丘|n|kill||g3o3d3r3p2h2|5|6|sandRiver
29|守住绿洲|n|survive75||∞odrp|5|6|
30|恐龙霸王|big|kill|dino|h3r3d2|3|7|
31|果冻弹弹|n|kill||g5o4k2h2|4|4|
32|传送门乐园|n|kill||o4k3b2r2p2|4|5|portals2
33|棒棒糖小丑|mini|kill|clown|g3k3p2|4|6|
34|糖果推推|n|push3||g4k2h2d2|4|5|
35|蛋糕女王|big|kill|cake|k3p3o2|3|6|
36|幽灵坦克|mini|kill|ghost|o3p3k2|4|6|
37|救救小熊软糖|n|rescue4||o4k3p3h2r2|5|6|
38|甜甜金宝宝|n|gold6/9||g6k2|3|3|
39|糖果双子|mini|kill|clown+ghost|k3p3d2|4|7|
40|软糖巨人|big|kill|jelly|k3p3h3|3|7|
41|海底探险|n|kill||g5o4b3h2f2|4|4|
42|螃蟹钳钳|mini|kill|crab|o3f3k2|4|6|
43|珊瑚迷宫|n|kill||o4f4k3r2p2|5|6|maze
44|珍珠收集|n|collect10||f4b3h3k2|5|6|
45|章鱼船长|big|kill|octo|f3b3o3|3|7|
46|洋流快车|n|survive80||∞ofkp|5|7|flowLoop
47|救救小海龟|n|rescue4||o3f4k3r3h2|5|7|
48|河豚胖胖|mini|kill|puffer|f4k2r2|4|7|
49|深海大战|n|kill||o3b2r3p2h3f3|5|8|
50|鲸鱼潜艇|big|kill|whale|f4k3r3|3|8|
51|蘑菇炮手|mini|kill|shroom|g3o3h2|4|6|plain
52|藤蔓长回来|n|kill||g4o4h3r2f2|5|5|
53|忍忍躲猫猫|n|kill||o3n4h3p2k2|5|6|
54|啄木鸟|mini|kill|pecker|o3n3d2|4|7|
55|大树爷爷|big|kill|tree|n3h3f3|3|7|
56|萤火虫之夜|n|kill||g6o4n2|4|6|night
57|森林双子|mini|kill|shroom+pecker|n3k3r2|4|8|
58|森林推推|n|push3||n3h3d3k3r2|5|7|
59|迷雾森林|n|survive90||∞onrf|5|8|night
60|熊熊机甲|big|kill|bear|h4n3r3|3|8|
61|熔岩小路|n|kill||g4o4h3r3l2|5|5|
62|火山金宝宝|n|gold7/10||o6l2|3|4|
63|熔岩球球|mini|kill|lavaball|o3l3r2|4|7|
64|火焰摘星|n|collect10||l4r3n2f3h2|5|7|
65|喷火龙|big|kill|firedragon|l3r3h3|3|8|
66|炎炎机器人|mini|kill|blaze|l3d3k2|4|8|
67|救救小恐龙|n|rescue4||l3d3p3h3k3|5|8|
68|火山口坚持|n|survive90||∞olrhk|5|8|ventsMany
69|火山双子|mini|kill|lavaball+blaze|l3n3r3|4|9|
70|火山魔像|big|kill|golem|l4h3r3|3|9|
71|欢迎来到工厂|n|kill||g4o4h3r3l2|5|5|
72|发条兔|mini|kill|bunny|o4k2l2|4|7|
73|开关和大门|n|kill||o4z3h3k3p2|5|6|
74|积木推推|n|push3||z3d3l3n3|5|7|
75|机械臂工厂|big|kill|crane|z3l3o3|3|8|
76|零件收集|n|collect12||z4o4r3f3l2|5|8|
77|救救玩具熊|n|rescue5||z3n3k3l3h3r2|5|8|
78|积木人|mini|kill|blocky|z3k3p2|4|8|
79|生产线大战|n|kill||o3b2r3p2h2k2f2z2|6|9|
80|锡兵大将|big|kill|tinsoldier|z4h3r3|3|9|
81|外星飞碟|mini|kill|ufo|o4z2l2|4|7|plain
82|太空漫步|n|kill||o4u4z3h3r2|5|6|
83|陨石雨|n|kill||g4o4u3l3k3|5|7|meteor
84|陨石怪|mini|kill|meteorite|u3z2l2|4|8|meteor
85|星际母舰|big|kill|mothership|u4z3r3|3|9|
86|银河摘星|n|collect12||u4n3z3f3k3|5|8|
87|太空双子|mini|kill|ufo+meteorite|u3l3z3|4|9|meteor
88|月球金宝宝|n|gold8/12||o6u2|3|5|
89|银河保卫战|n|survive100||∞ouzlnk|6|9|meteor
90|黑洞机甲|big|kill|blackhole|u4z3l3|3|9|
91|城堡大门|n|kill||g3o3h3z3q2r2|5|7|
92|魔王的花园|n|rescue5||q3n3u3l3k3f2|6|8|mixVF
93|坏坏骑士|mini|kill|knight|z3q2r2|4|9|
94|宝库摘星|n|collect15||q3z3u3l3d3p2|6|8|mixOBT
95|坏坏巫师|big|kill|wizard|q3n3u3|3|9|
96|镜子怪|mini|kill|mirror|z3l3k3|4|9|
97|最后的推箱|n|push3||q2z3n3h3|5|7|mixYB
98|城堡大决战|n|kill||o3b2r2p2h2k2f2n2z2q1|6|10|mixAll,meteor
99|魔王卫队|mini|kill|knight+mirror|q3z3u3|4|10|
100|魔王机甲|final|kill|mega|h3r3z3q3|3|10|
`;

// 每种敌人在哪一关第一次出现（自检用）
const ENEMY_INTRO = { g: 1, o: 2, h: 4, b: 11, r: 14, d: 23, p: 26, k: 31, f: 41, n: 53, l: 61, z: 73, u: 82, q: 91 };

function parseLevelRow(line) {
  const [n, name, type, modeS, bossS, enemiesS, maxOn, D, flagS] = line.split('|');
  const spec = { n: +n, name, type: type === 'n' ? 'normal' : type, maxOn: +maxOn, D: +D, flags: {} };
  for (const f of (flagS || '').split(',')) if (f) spec.flags[f] = true;
  const m = modeS.match(/^([a-z]+)(\d*)(?:\/(\d+))?$/);
  spec.mode = m[1];
  if (m[2]) spec.goal = +m[2];
  if (m[3]) spec.golds = +m[3];
  spec.bosses = bossS ? bossS.split('+') : null;
  if (enemiesS[0] === '∞') { spec.pool = enemiesS.slice(1); spec.enemyStr = ''; }
  else spec.enemyStr = enemiesS;
  spec.night = !!spec.flags.night;
  spec.meteor = !!spec.flags.meteor;
  return spec;
}
function expandEnemies(str, R) {
  const list = [];
  str.replace(/([a-z])(\d+)/g, (_, t, k) => { for (let i = 0; i < +k; i++) list.push(t); return ''; });
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return list.join('');
}

// ===== 地图生成（固定种子，每次都一样）=====
const SHAPES = [
  [[0, 0]], [[0, 0], [0, 1]], [[0, 0], [1, 0]], [[0, 0], [0, 1], [0, 2]], [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [1, 1]], [[0, 0], [0, 1], [0, 2], [1, 2]],
];
// 坦克开不过去的格子（砖、藤蔓能打掉，算能过；大门按开着算）
const MAP_BLOCK = new Set(['S', 'W', 'E', 'L', 'H', 'Y']);
function mapReach(m, extra) {
  const ok = (c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS && !MAP_BLOCK.has(m[r][c]) && !(extra && extra.has(c + ',' + r));
  const seen = new Set(), q = [[4, 10]];
  if (!ok(4, 10)) return { seen, ok };
  seen.add('4,10');
  while (q.length) {
    const [c, r] = q.shift();
    for (let d = 0; d < 4; d++) {
      const nc = c + DX[d], nr = r + DY[d], k = nc + ',' + nr;
      if (ok(nc, nr) && !seen.has(k)) { seen.add(k); q.push([nc, nr]); }
    }
  }
  return { seen, ok };
}
function mapConnected(m, extra) {
  if (m[10][4] !== 'P') return false;
  const { seen, ok } = mapReach(m, extra);
  if (!seen.has('0,0') || !seen.has('7,0') || !seen.has('14,0')) return false;
  let open = 0;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (ok(c, r)) open++;
  if (seen.size < open * 0.92) return false;
  // 开关：大门全关时也要能开到一个开关
  let hasT = false;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (m[r][c] === 'T') hasT = true;
  if (hasT) {
    const shut = new Set(extra || []);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (m[r][c] === 'D') shut.add(c + ',' + r);
    const s2 = mapReach(m, shut).seen;
    let reachT = false;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (m[r][c] === 'T' && s2.has(c + ',' + r)) reachT = true;
    if (!reachT) return false;
  }
  return true;
}

const FLIP_FLOW = { '^': '^', v: 'v', '>': '<', '<': '>' };
function genMap(L) {
  const li = L.li, world = L.world, arena = L.type === 'big' || L.type === 'final';
  const R = mulberry32(20261017 + li * 977);
  const reserved = (c, r) =>
    (r <= 1 && (c <= 1 || c >= 13 || (c >= 6 && c <= 8))) ||
    (r >= 9 && c >= 3 && c <= 11) ||
    (arena && r <= 3 && c >= 4 && c <= 10);
  for (let attempt = 0; attempt < 400; attempt++) {
    const m = [];
    for (let r = 0; r < ROWS; r++) m.push(new Array(COLS).fill('.'));
    let count = arena ? 4 + Math.floor(R() * 3) : 11 + Math.floor(R() * 4);
    if (L.flags.maze) count += 7;
    const steelP = 0.06 + Math.min(world, 4) * 0.03, waterP = L.flags.basic ? 0 : 0.09, grassP = 0.14;
    for (let k = 0; k < count; k++) {
      const sh = SHAPES[Math.floor(R() * SHAPES.length)];
      const c0 = Math.floor(R() * 7), r0 = 1 + Math.floor(R() * 9);
      const x = R();
      let mat = 'B';
      if (L.flags.basic) mat = x < 0.2 ? 'G' : 'B';
      else if (x < steelP) mat = 'S'; else if (x < steelP + waterP) mat = 'W'; else if (x < steelP + waterP + grassP) mat = 'G';
      for (const [dc, dr] of sh) {
        const c = c0 + dc, r = r0 + dr;
        if (c > 6 || r > 10 || reserved(c, r)) continue;
        m[r][c] = mat; m[r][14 - c] = mat;
      }
    }
    for (let r = 2; r <= 8; r++) if (!reserved(7, r) && R() < (arena ? 0.12 : 0.35)) m[r][7] = R() < 0.15 && !L.flags.basic ? 'S' : 'B';
    const objs = [];
    addTerrain(m, L, R, arena, reserved);
    // 底部老家
    m[9][6] = m[9][7] = m[9][8] = 'B';
    m[10][6] = 'B'; m[10][7] = 'E'; m[10][8] = 'B';
    m[10][4] = 'P';
    if (!addModeObjects(m, L, R, reserved, objs)) continue;
    const cages = new Set(objs.filter(o => o.type === 'cage').map(o => o.c + ',' + o.r));
    if (!mapConnected(m, cages)) continue;
    if (!objsReachable(m, objs, cages)) continue;
    return { map: m.map(row => row.join('')), objs };
  }
  const m = [];
  for (let r = 0; r < ROWS; r++) m.push('.'.repeat(COLS));
  m[9] = '......BBB......'; m[10] = '....P.BEB......';
  return { map: m, objs: [] };
}

// 每个世界的主地形 + 一点以前世界的地形
function addTerrain(m, L, R, arena, reserved) {
  const world = L.world, li = L.li, F = L.flags;
  const free = (c, r) => r >= 1 && r <= 8 && c >= 0 && c < COLS && !reserved(c, r) && m[r][c] === '.';
  const put = (ch, n, cMax, rows) => {
    for (let k = 0, made = 0; k < 80 && made < n; k++) {
      const c = Math.floor(R() * (cMax || 7)), r = (rows ? rows[0] : 1) + Math.floor(R() * (rows ? rows[1] - rows[0] + 1 : 8));
      if (free(c, r) && free(14 - c, r)) { m[r][c] = ch; m[r][14 - c] = ch; made++; }
    }
  };
  const patch = (ch, n, big) => {
    for (let k = 0; k < n; k++) {
      const c0 = Math.floor(R() * 5), r0 = 1 + Math.floor(R() * 6), w = 2 + Math.floor(R() * (big ? 4 : 2)), h = 2 + Math.floor(R() * 2);
      for (let r = r0; r < Math.min(9, r0 + h); r++) for (let c = c0; c < Math.min(7, c0 + w); c++) if (free(c, r)) { m[r][c] = ch; if (free(14 - c, r)) m[r][14 - c] = ch; }
    }
  };
  const portals = n => {
    for (let p = 0; p < n; p++) for (let k = 0; k < 60; k++) {
      const c = Math.floor(R() * 4), r = 2 + Math.floor(R() * 6);
      if (free(c, r) && free(14 - c, r)) { m[r][c] = 'O'; m[r][14 - c] = 'O'; break; }
    }
  };
  // 一条直的水流 / 传送带（左右对称）
  const flows = n => {
    for (let s = 0, made = 0; s < 60 && made < n; s++) {
      const horiz = R() < 0.5, len = 4 + Math.floor(R() * 3);
      const c0 = Math.floor(R() * (horiz ? 4 : 7)), r0 = 1 + Math.floor(R() * (horiz ? 8 : 5));
      const ch = horiz ? (R() < 0.5 ? '>' : '<') : (R() < 0.5 ? 'v' : '^');
      const cells = [];
      for (let i = 0; i < len; i++) cells.push(horiz ? [c0 + i, r0] : [c0, r0 + i]);
      if (cells.some(([c, r]) => c > 6 || r > 8 || !free(c, r) || !free(14 - c, r))) continue;
      for (const [c, r] of cells) { m[r][c] = ch; m[r][14 - c] = c === 7 ? ch : FLIP_FLOW[ch]; }
      made++;
    }
  };
  const flowLoop = () => {
    for (let c = 3; c <= 11; c++) { m[2][c] = '>'; m[7][c] = '<'; }
    for (let r = 2; r <= 7; r++) { m[r][11] = r === 7 ? '<' : 'v'; m[r][3] = r === 2 ? '>' : '^'; }
    for (let r = 3; r <= 6; r++) for (let c = 4; c <= 10; c++) if (m[r][c] === 'S' || m[r][c] === 'W') m[r][c] = 'B';
  };
  const swap = (from, to, p) => { for (let r = 1; r <= 8; r++) for (let c = 0; c <= 7; c++) if (m[r][c] === from && R() < p) { m[r][c] = to; m[r][14 - c] = to; } };
  const gates = () => {
    put('D', 1 + Math.floor(R() * 2));
    for (let k = 0; k < 60; k++) {
      const c = 7, r = 3 + Math.floor(R() * 5);
      if (free(c, r)) { m[r][c] = 'T'; return; }
    }
    put('T', 1);
  };
  const holes = () => {
    if (R() < 0.5) { for (let k = 0; k < 40; k++) { const r = 3 + Math.floor(R() * 4); if (free(7, r)) { m[r][7] = 'H'; return; } } }
    put('H', 1, 5, [2, 7]);
  };
  const MIX = {
    X: () => put('X', 1), I: () => patch('I', 1), Z: () => patch('Z', 1), J: () => put('J', 1), Y: () => put('Y', 1),
    O: () => portals(1), flow: () => flows(1), V: () => swap('B', 'V', 0.4), L: () => put('L', 1), F: () => put('F', 1),
    gate: () => gates(), H: () => holes(), N: () => put('N', 1),
  };
  const mix = keys => { for (const k of keys) MIX[k](); };
  const plain = F.plain;
  if (arena) {
    if (world === 1) patch('I', 2);
    else if (world === 2) patch('Z', 1);
    else if (world === 3) put('Y', 1);
    else if (world === 4) flows(1);
    else if (world === 5) swap('B', 'V', 0.5);
    else if (world === 6) { swap('W', 'L', 1); put('F', 2); }
    else if (world === 7) { flows(1); put('X', 2); }
    else if (world === 9) put('N', 1);
    if (L.bosses && L.bosses[0] === 'crane') put('X', 2);
    return;
  }
  if (F.basic) return;
  const pushMode = L.mode === 'push';
  const W = plain ? world - 1 : world;
  switch (W) {
    case 0: if (!pushMode) put('X', 2); break;
    case 1: patch('I', F.iceHalf ? 6 : 3, F.iceHalf); if (!pushMode) put('X', 1); break;
    case 2:
      if (F.sandRiver) {
        for (let c = 0; c < COLS; c++) for (const r of [4, 5]) if (!reserved(c, r) && (m[r][c] === '.' || m[r][c] === 'B' || m[r][c] === 'G')) m[r][c] = 'Z';
        for (const c of [2, 12]) { m[6][c] = 'J'; m[3][c] = 'J'; }
      } else { patch('Z', 2 + Math.floor(R() * 2)); put('J', 2); }
      mix([R() < 0.5 ? 'I' : 'X']);
      break;
    case 3: put('Y', 2); portals(F.portals2 ? 2 : 1); mix([R() < 0.5 ? 'J' : 'Z']); break;
    case 4:
      if (F.flowLoop) flowLoop(); else flows(2);
      mix([pick2(R, ['Y', 'O', 'I'])]);
      break;
    case 5: swap('B', 'V', 0.5); mix([pick2(R, ['flow', 'Z', 'Y'])]); break;
    case 6:
      swap('W', 'L', 1); put('L', 1); put('F', F.ventsMany ? 4 : 2);
      mix([R() < 0.5 ? 'V' : 'J']);
      break;
    case 7: flows(2); gates(); mix([pick2(R, ['Y', 'X', 'F'])].filter(k => !(pushMode && k === 'X'))); break;
    case 8: holes(); if (R() < 0.5) holes(); mix([pick2(R, ['O', 'L', 'flow'])]); break;
    case 9: {
      put('N', 2 + Math.floor(R() * 2));
      let keys = ['I', 'Z', 'J', 'Y', 'O', 'flow', 'V', 'L', 'F', 'H'];
      if (F.mixVF) keys = ['V', 'F'];
      else if (F.mixOBT) keys = ['O', 'flow', 'gate'];
      else if (F.mixYB) keys = ['Y', 'flow'];
      else if (F.mixAll) keys = ['I', 'Z', 'J', 'Y', 'O', 'flow', 'V', 'L', 'F', 'H'];
      else { const a = pick2(R, keys), b = pick2(R, keys.filter(k => k !== a)); keys = [a, b]; }
      mix(keys);
      break;
    }
  }
}
function pick2(R, a) { return a[Math.floor(R() * a.length)]; }

// 玩法物件：星星、木箱目标垫、笼子（放在 objs 里，不占地图字符）
function addModeObjects(m, L, R, reserved, objs) {
  const free = (c, r) => c >= 0 && r >= 1 && c < COLS && r <= 8 && !reserved(c, r) && m[r][c] === '.';
  const far = (c, r) => Math.abs(c - 7) + Math.abs(r - 10) >= 4;
  const spaced = (c, r, gap) => objs.every(o => Math.max(Math.abs(o.c - c), Math.abs(o.r - r)) >= gap);
  if (L.mode === 'collect') {
    for (let k = 0; k < 400 && objs.length < L.goal; k++) {
      const c = Math.floor(R() * COLS), r = 1 + Math.floor(R() * 8);
      const okCell = m[r][c] === '.' || m[r][c] === 'G' || m[r][c] === 'I' || m[r][c] === 'Z';
      if (okCell && !reserved(c, r) && far(c, r) && spaced(c, r, 2)) objs.push({ type: 'star', c, r });
    }
    if (objs.length < L.goal) return false;
    if (L.flags.starsIce) for (const o of objs) for (let r = o.r - 1; r <= o.r + 1; r++) for (let c = o.c - 1; c <= o.c + 1; c++) if (free(c, r) || (r === o.r && c === o.c)) m[r][c] = 'I';
  } else if (L.mode === 'rescue') {
    for (let k = 0; k < 400 && objs.length < L.goal; k++) {
      const c = Math.floor(R() * COLS), r = 1 + Math.floor(R() * 7);
      if (free(c, r) && far(c, r) && spaced(c, r, 3)) objs.push({ type: 'cage', c, r });
    }
    if (objs.length < L.goal) return false;
  } else if (L.mode === 'push') {
    let made = 0;
    for (let k = 0; k < 600 && made < L.goal; k++) {
      const c = 1 + Math.floor(R() * 13), r = 2 + Math.floor(R() * 6), d = Math.floor(R() * 4), len = 2 + Math.floor(R() * 2);
      const cells = [[c - DX[d], r - DY[d]], [c, r]];
      for (let i = 1; i <= len; i++) cells.push([c + DX[d] * i, r + DY[d] * i]);
      // 箱子路线两边也空出来，方便坦克转身
      if (!cells.every(([x, y]) => x >= 0 && y >= 1 && x < COLS && y <= 8 && !reserved(x, y))) continue;
      if (objs.some(o => cells.some(([x, y]) => Math.abs(o.c - x) <= 1 && Math.abs(o.r - y) <= 1))) continue;
      for (const [x, y] of cells) m[y][x] = '.';
      m[r][c] = 'X';
      const [pc, pr] = cells[cells.length - 1];
      objs.push({ type: 'pad', c: pc, r: pr, crate: [c, r], stand: cells[0] }, { type: 'path', c, r });
      made++;
    }
    if (made < L.goal) return false;
    // 推箱关只留目标箱子
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (m[r][c] === 'X' && !objs.some(o => o.type === 'pad' && o.crate[0] === c && o.crate[1] === r)) m[r][c] = '.';
    for (let i = objs.length - 1; i >= 0; i--) if (objs[i].type === 'path') objs.splice(i, 1);
  }
  return true;
}
function objsReachable(m, objs, cages) {
  if (!objs.length) return true;
  const { seen } = mapReach(m, cages);
  for (const o of objs) {
    if (o.type === 'star' && !seen.has(o.c + ',' + o.r)) return false;
    if (o.type === 'cage' && ![0, 1, 2, 3].some(d => seen.has(o.c + DX[d] + ',' + (o.r + DY[d])))) return false;
    if (o.type === 'pad' && !seen.has(o.stand[0] + ',' + o.stand[1])) return false;
  }
  return true;
}

const LEVEL_SPECS = LEVEL_TABLE.trim().split('\n').map(parseLevelRow);
const LEVELS = LEVEL_SPECS.map(s => {
  const li = s.n - 1, world = Math.floor(li / 10);
  const L = Object.assign({}, s, { li, world, theme: WORLDS[world].theme, boss: s.bosses ? s.bosses[0] : null });
  const R = mulberry32(777 + li * 131);
  L.enemies = s.pool ? expandEnemies(s.pool.split('').map(t => t + '3').join(''), R) : expandEnemies(s.enemyStr, R);
  const gm = genMap(L);
  L.map = gm.map; L.objs = gm.objs;
  return L;
});

// 开发自检（网址加 ?dev=1）
function checkLevels() {
  const errs = [];
  for (const L of LEVELS) {
    const n = L.n;
    const exp = n === 100 ? 'final' : n % 5 === 0 ? 'big' : n % 3 === 0 ? 'mini' : 'normal';
    if (L.type !== exp) errs.push(n + ' 类型应为 ' + exp);
    for (const ch of L.enemies + (L.pool || '')) if (!ENEMIES[ch]) errs.push(n + ' 没有敌人 ' + ch); else if (ENEMY_INTRO[ch] > n) errs.push(n + ' 敌人 ' + ch + ' 出现太早');
    if (L.bosses) for (const b of L.bosses) if (!BOSSES[b]) errs.push(n + ' 没有 Boss ' + b);
    const cages = new Set(L.objs.filter(o => o.type === 'cage').map(o => o.c + ',' + o.r));
    if (!mapConnected(L.map, cages)) errs.push(n + ' 地图不连通');
    if (L.goal && L.mode !== 'survive' && L.mode !== 'gold' && L.objs.filter(o => o.type !== 'path').length < L.goal) errs.push(n + ' 玩法物件不够');
  }
  return errs;
}
