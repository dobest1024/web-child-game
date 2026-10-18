'use strict';
// ===== 游戏逻辑 =====
let G = null;
const fails = [];

// L：关卡对象；opts：{ tanks: [每个玩家的坦克序号], diff: 难度序号 }
function buildGame(L, opts) {
  const li = L.li, diff = DIFFS[opts.diff != null ? opts.diff : 1];
  const a = L.custom || L.tutorial ? 0 : Math.min(3, fails[li] || 0);
  const k = (L.D || (L.custom ? 3 : 1)) - 1, arena = L.type === 'big' || L.type === 'final';
  const g = {
    li, L, theme: L.theme, diff, assist: a, grid: new Uint8Array(GW * GH),
    tanks: [], players: [], bullets: [], parts: [], flowers: [], texts: [], pups: [], pickFx: [], spawns: [], waves: [], beams: [],
    crates: [], springs: [], portals: [], coins: [], coinsGot: 0, reward: 0,
    egg: null, eggRing: [], ringSet: null, pSpawn: [], eSpawn: [[24, 24], [360, 24], [696, 24]], spawnIdx: 0,
    queue: [], spawnT: 1, total: 0, killed: 0, spawnCount: 0,
    freezeT: 0, wallT: 0, wallForever: false, shake: 0, flash: 0, t: 0, phase: 'intro', phaseT: 0, shown: false,
    lostLives: 0, eggHits: 0, boss: null, stars: 0, combo: 0, lastKillT: -9, tut: null,
    goldT: !L.boss && !L.tutorial && L.mode !== 'gold' && (L.flags && L.flags.goldSure || Math.random() < 0.6) ? rand(12, 25) : -1,
    eSpeedMul: (1 + 0.05 * k) * (1 - 0.12 * a) * diff.spd,
    eFireMul: ((1 + 0.3 * a) / (1 + 0.07 * k)) * diff.fire,
    eBulletSpd: (190 + 10 * k) * (1 - 0.1 * a) * diff.bullet,
    mode: L.mode || 'kill', world: L.world >= 0 ? L.world : 0, arena, preWave: L.type === 'mini', bossOn: false,
    bosses: [], bossKeys: L.bosses || (L.boss ? [L.boss] : []), bossTotal: 0,
    flow: new Int8Array(GW * GH).fill(-1), vents: [], switches: [], gates: [], gatesOpen: false, holes: [], blinks: [], regrow: [], noRegrow: new Set(),
    zones: [], lines: [], flames: [], slows: [], fires: [], turrets: [], orbs: [], blocks: [], gems: [], pads: [], cages: [], crateBack: [],
    lastProg: 0, hintSaid: false, lightT: 0, meteorT: L.meteor ? rand(8, 12) : -1, forcePup: L.introPup || null, newTips: [],
  };
  G = g;
  L.map.forEach((row, r) => {
    for (let c = 0; c < COLS; c++) {
      const ch = row[c] || '.', x = c * T + 24, y = r * T + 24;
      let v = EMPTY;
      if (ch === 'B') v = BRICK; else if (ch === 'S') v = STEEL; else if (ch === 'W') v = WATER; else if (ch === 'G') v = GRASS; else if (ch === 'I') v = ICE;
      else if (ch === 'Z') v = SAND; else if (ch === 'Y') v = JELLY; else if (ch === 'V') v = VINE; else if (ch === 'L') v = LAVA;
      else if (ch === '^' || ch === '>' || ch === 'v' || ch === '<') {
        v = FLOW;
        const d = '^>v<'.indexOf(ch);
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) g.flow[(r * 2 + dy) * GW + c * 2 + dx] = d;
      }
      else if (ch === 'F') { v = VENT; g.vents.push({ x, y, ph: ((c * 7 + r * 3) % 5) + 0.5, cyc: -1 }); }
      else if (ch === 'T') { v = SWITCH; g.switches.push({ x, y, on: false, cd: 0 }); }
      else if (ch === 'D') { v = GATE; g.gates.push({ x, y, cells: tileCells(c, r), open: false }); }
      else if (ch === 'H') { v = HOLE; g.holes.push({ x, y }); }
      else if (ch === 'N') { v = BLINK; g.blinks.push({ x, y, cells: tileCells(c, r), group: (c + r) % 2, solid: true }); }
      else if (ch === 'E') { v = EGG; g.egg = { x, y, hp: diff.egg, maxHp: diff.egg, hitT: 0, broken: false }; }
      else if (ch === 'P') g.pSpawn[0] = [x, y];
      else if (ch === 'Q') g.pSpawn[1] = [x, y];
      else if (ch === 'X') g.crates.push({ x, y, tx: x, ty: y, ox: x, oy: y, hp: 3, flashT: 0, moving: false });
      else if (ch === 'J') g.springs.push({ x, y, t: 0 });
      else if (ch === 'O') g.portals.push({ x, y, i: g.portals.length, pair: -1 });
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) g.grid[(r * 2 + dy) * GW + c * 2 + dx] = v;
    }
  });
  if (g.portals.length % 2) g.portals.pop();
  g.portals.forEach((P, i) => { P.pair = i ^ 1; P.color = ['#B57CFF', '#FF9A3D', '#3EC1F3', '#4CD964'][i >> 1] || '#B57CFF'; });
  if (!g.pSpawn[0]) g.pSpawn[0] = [4 * T + 24, 10 * T + 24];
  if (!g.pSpawn[1]) g.pSpawn[1] = [10 * T + 24, 10 * T + 24];
  const ec = Math.floor(g.egg.x / T), er = Math.floor(g.egg.y / T);
  for (let r = er - 1; r <= er + 1; r++) for (let c = ec - 1; c <= ec + 1; c++) {
    if (r < 0 || c < 0 || r >= ROWS || c >= COLS || (r === er && c === ec)) continue;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) g.eggRing.push((r * 2 + dy) * GW + c * 2 + dx);
  }
  g.ringSet = new Set(g.eggRing);
  modeInit(g);
  let q = L.enemies.split('');
  if (!arena && !L.tutorial && q.length && g.mode !== 'survive') {
    const n = Math.max(L.custom ? 1 : 4, Math.round(q.length * diff.count) - a * 2);
    q = Array.from({ length: n }, (_, i) => q[i % q.length]);
  }
  g.queue = q;
  g.total = q.length;
  opts.tanks.forEach((ti, i) => {
    const [px, py] = g.pSpawn[i];
    const p = makePlayer(i, ti, px, py, diff.lives);
    g.players.push(p); g.tanks.push(p);
  });
  if (L.boss) { setRing(STEEL); g.wallT = 9999; g.wallForever = true; }
  // 连续输 3 次：送护盾和小蜜蜂
  if (!L.custom && !L.tutorial && (fails[li] || 0) >= 3) for (const p of g.players) { p.shieldT = 10; p.helperT = 15; g.helped = true; }
  collectNewTips(g);
  return g;
}

function makePlayer(pid, tankIdx, x, y, lives) {
  const d = PLAYER_TANKS[tankIdx], up = save.up;
  const hp = d.hp + (up.hp || 0);
  return {
    kind: 'player', pid, tankIdx, x, y, sx: x, sy: y, size: 42, dir: 0,
    hp, maxHp: hp, atk: d.atk + (up.atk || 0), dfn: d.dfn, speed: d.speed * (1 + 0.08 * (up.spd || 0)), lives: lives || 3,
    energyRate: (1 + 0.25 * (up.energy || 0)) / 12, skin: Meta.skin(tankIdx),
    weapon: 'normal', weaponT: 0, energy: 0.4 + 0.1 * (up.energy || 0), fireCd: 0, recoil: 0, dist: 0, moving: false,
    hurtT: 0, invT: 0, shieldT: 3, speedT: 0, slowT: 0, helperT: 0, helperCd: 0,
    dead: false, respawnT: 0, blink: rand(0, 3), flashT: 0, dustT: 0,
    slideV: 0, jump: null, onSpring: null, onPortal: -1, pushT: 0,
    magnetT: 0, mirrorT: 0, cloneT: 0, rocketT: 0, trapT: 0, magnetCoins: 0,
  };
}
function makeEnemy(type, x, y, carrier) {
  const d = ENEMIES[type];
  return {
    kind: 'enemy', type, x, y, size: d.size, dir: 2, hp: d.hp, maxHp: d.hp, atk: d.atk, dfn: d.dfn, speed: d.speed, gun: d.gun,
    fireCd: rand(0.8, 2), recoil: 0, dist: 0, moving: false, aiT: rand(1, 2.5), blockT: 0, flashT: 0,
    frozenT: G.freezeT > 0 ? G.freezeT : 0, carrier, dead: false, blink: rand(0, 3), onPortal: -1,
    fly: !!d.fly, still: !!d.still, seenT: 1.5, digT: 0, healT: 3, flameWarn: 0, shieldOffT: 0, bubble: false,
  };
}
function tileCells(c, r) { return [0, 1, 2, 3].map(i => (r * 2 + (i >> 1)) * GW + c * 2 + (i & 1)); }
function makeBoss(key, x, y, hpMul) {
  const bd = BOSSES[key];
  const hp = Math.max(1, Math.round(bd.hp * (1 - 0.15 * G.assist) * G.diff.boss * (hpMul || 1)));
  return {
    guardT: 0, guardKind: '', weakT: 0, stunT: 0, flyT: 0, fly: null, ballT: 0, ballVX: 0, ballVY: 0, windT: 0, under: false, popWarn: 0, popAt: null,
    tractorT: 0, tractorWarn: 0, pullT: 0, clawWarn: 0, trailT: 0, shieldOffT: 0, sad: false, lost: 0, hpMul: hpMul || 1, dashMode: null, gensDone: false,
    kind: 'enemy', type: 'boss', key, bd, x, y, size: bd.size, dir: 3, hp, maxHp: hp, atk: bd.atk, dfn: 0, speed: bd.speed,
    fireCd: 0, recoil: 0, dist: 0, moving: false, aiT: 2, blockT: 0, flashT: 0, frozenT: 0, dead: false,
    aim: Math.PI / 2, skillT: 2, skillIdx: 0, phase: 0, angry: false, spiralT: 0, spiralCd: 0, spiralA: 0,
    dashT: 0, dashWarn: 0, teleT: 0, teleDone: true, invisT: 0, drops: [0.75, 0.5, 0.25],
  };
}

// ===== 碰撞 =====
function cellAt(cx, cy) {
  if (cx < 0 || cy < 0 || cx >= GW || cy >= GH) return -1;
  return G.grid[cy * GW + cx];
}
function solidForTank(v, fly) {
  return v === BRICK || v === STEEL || v === EGG || v === -1 || v === JELLY || v === VINE || v === GATE || v === HOLE || v === BLINK ||
    (!fly && (v === WATER || v === LAVA));
}
// 子弹会撞上的格子
function solidForBullet(v) { return v === BRICK || v === STEEL || v === EGG || v === -1 || v === JELLY || v === VINE || v === GATE || v === BLINK; }
const isSoft = v => v === BRICK || v === VINE;
// 打掉一个小格；藤蔓过一会儿会长回来
function breakCell(idx) {
  const g = G, v = g.grid[idx];
  g.grid[idx] = EMPTY;
  if (v === VINE && !g.noRegrow.has(idx)) g.regrow.push({ idx, t: 8 });
}
function boxHitsGrid(x, y, h, fly) {
  const x0 = Math.floor((x - h) / C), x1 = Math.floor((x + h - 0.01) / C);
  const y0 = Math.floor((y - h) / C), y1 = Math.floor((y + h - 0.01) / C);
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) if (solidForTank(cellAt(cx, cy), fly)) return true;
  for (const k of G.crates) if (Math.abs(k.x - x) < h + 23 && Math.abs(k.y - y) < h + 23) return true;
  for (const k of G.cages) if (!k.open && Math.abs(k.x - x) < h + 22 && Math.abs(k.y - y) < h + 22) return true;
  return false;
}
function boxHitsTank(t, x, y) {
  for (const o of G.tanks) {
    if (o === t || o.dead) continue;
    const r = t.size / 2 + o.size / 2;
    if (Math.abs(o.x - x) < r && Math.abs(o.y - y) < r) {
      const before = Math.abs(o.x - t.x) < r && Math.abs(o.y - t.y) < r;
      if (!before) return true;
      if (Math.hypot(o.x - x, o.y - y) < Math.hypot(o.x - t.x, o.y - t.y)) return true;
    }
  }
  return false;
}
const snapC = v => Math.round(v / C) * C;
// 移动；顺带把另一个方向慢慢对齐到格子，转弯不会卡墙角
function tryMove(t, dir, dist) {
  const h = t.size / 2, dx = DX[dir], dy = DY[dir];
  t.dir = dir;
  let moved = 0;
  while (moved < dist - 1e-6) {
    const s = Math.min(2, dist - moved);
    let aligned = false;
    if (dx !== 0) {
      const off = t.y - snapC(t.y);
      if (Math.abs(off) > 0.01) {
        const ny = t.y - Math.sign(off) * Math.min(s, Math.abs(off));
        if (!boxHitsGrid(t.x, ny, h, t.fly) && !boxHitsTank(t, t.x, ny)) { t.y = ny; aligned = true; }
      }
    } else {
      const off = t.x - snapC(t.x);
      if (Math.abs(off) > 0.01) {
        const nx = t.x - Math.sign(off) * Math.min(s, Math.abs(off));
        if (!boxHitsGrid(nx, t.y, h, t.fly) && !boxHitsTank(t, nx, t.y)) { t.x = nx; aligned = true; }
      }
    }
    const nx = t.x + dx * s, ny = t.y + dy * s;
    if (boxHitsGrid(nx, ny, h, t.fly) || boxHitsTank(t, nx, ny)) {
      if (aligned) { moved += s; continue; }
      break;
    }
    t.x = nx; t.y = ny; moved += s;
  }
  return moved;
}
function probeBlocked(t, d) { return boxHitsGrid(t.x + DX[d] * 6, t.y + DY[d] * 6, t.size / 2, t.fly); }
// 被水流、吸力推着走：不改变坦克的朝向
function pushTank(t, dx, dy) {
  const dir = t.dir;
  if (Math.abs(dx) > 0.01) tryMove(t, dx > 0 ? 1 : 3, Math.abs(dx));
  if (Math.abs(dy) > 0.01) tryMove(t, dy > 0 ? 2 : 0, Math.abs(dy));
  t.dir = dir;
}
// 坦克脚下的地形让它变慢
function terrainMul(t) {
  if (t.fly) return 1;
  const v = cellAt(Math.floor(t.x / C), Math.floor(t.y / C));
  return v === SAND ? 0.55 : 1;
}
function nearestPlayer(e) {
  let best = null, bd = 1e9;
  for (const p of G.players) {
    if (p.dead) continue;
    const d = Math.hypot(p.x - e.x, p.y - e.y);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}
function setRing(v) {
  const g = G;
  for (const idx of g.eggRing) {
    const cx = idx % GW, cy = Math.floor(idx / GW);
    const x0 = cx * C, y0 = cy * C;
    const blocked = g.tanks.some(t => !t.dead && Math.abs(t.x - (x0 + 12)) < t.size / 2 + 12 && Math.abs(t.y - (y0 + 12)) < t.size / 2 + 12);
    if (!blocked) g.grid[idx] = v;
  }
}

// ===== 特效 =====
function addPart(o) {
  G.parts.push(Object.assign({ x: 0, y: 0, vx: 0, vy: 0, life: 0.5, t: 0, size: 4, color: '#fff', type: 'circ', rot: 0, vr: 0, drag: 3, grow: 0 }, o));
}
function burstStars(x, y, n, colors, spd) {
  spd = spd || 180;
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2), s = rand(0.3, 1) * spd;
    addPart({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.4, 0.8), size: rand(4, 8), color: pick(colors), type: 'star', rot: rand(0, 6), vr: rand(-8, 8), drag: 4 });
  }
}
function poof(x, y, n, color) {
  for (let i = 0; i < (n || 5); i++) {
    const a = rand(0, Math.PI * 2), s = rand(20, 70);
    addPart({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.25, 0.45), size: rand(3, 6), grow: 14, color: color || '#FFFFFF' });
  }
}
function chunks(x, y, color, n) {
  for (let i = 0; i < (n || 4); i++) {
    const a = rand(0, Math.PI * 2), s = rand(60, 160);
    addPart({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.3, 0.6), size: rand(3, 6), color, type: 'sq', rot: rand(0, 6), vr: rand(-10, 10), drag: 5 });
  }
}
function sparks(x, y) { for (let i = 0; i < 5; i++) { const a = rand(0, Math.PI * 2), s = rand(80, 200); addPart({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.25, size: 2.5, color: '#FFE14D', drag: 6 }); } }
function confetti(n) {
  const cols = ['#FF6FAE', '#FFE14D', '#7FD6FF', '#8EF0A0', '#C59BFF', '#FF9A5C'];
  for (let i = 0; i < n; i++) addPart({ x: rand(0, MAP_W), y: -10, vx: rand(-60, 60), vy: rand(80, 200), life: 3, size: rand(6, 10), color: pick(cols), type: 'conf', rot: rand(0, 6), vr: rand(-6, 6), drag: 0.3 });
}
function addText(x, y, s, color, size) { G.texts.push({ x, y, s, color, size: size || 18, t: 0, life: 0.8 }); }

function stepFx(dt) {
  const g = G;
  for (const p of g.parts) {
    p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt;
    const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k;
    p.size += p.grow * dt; p.rot += p.vr * dt;
    if (p.type === 'conf') p.x += Math.sin(p.t * 5 + p.rot) * 0.6;
  }
  g.parts = g.parts.filter(p => p.t < p.life);
  for (const f of g.flowers) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; }
  g.flowers = g.flowers.filter(f => f.t < f.life);
  for (const t of g.texts) t.t += dt;
  g.texts = g.texts.filter(t => t.t < t.life);
  for (const f of g.pickFx) f.t += dt;
  g.pickFx = g.pickFx.filter(f => f.t < 1);
  for (const b of g.beams) b.t += dt;
  g.beams = g.beams.filter(b => b.t < 0.4);
  g.shake = Math.max(0, g.shake - dt * 40);
  g.flash = Math.max(0, g.flash - dt);
}

// ===== 主更新 =====
function updateGame(dt) {
  const g = G;
  g.t += dt; g.phaseT += dt;
  stepFx(dt);
  for (const t of g.tanks) { t.recoil = Math.max(0, t.recoil - dt * 6); t.flashT -= dt; }
  if (g.egg.hitT > 0) g.egg.hitT -= dt;
  const bossIntro = g.phase === 'bossIntro' || (g.phase === 'intro' && g.L.boss && !g.preWave);
  if (g.phase === 'intro' || g.phase === 'bossIntro') {
    if (bossIntro) {
      if (!g.sfx1) { g.sfx1 = true; Snd.play('warn'); }
      if (g.phaseT > 0.85 && !g.sfx2) { g.sfx2 = true; Snd.play('stomp'); g.shake = 8; }
    }
    if (g.phaseT >= (bossIntro ? 3.6 : 2)) {
      const first = g.phase === 'intro';
      g.phase = 'play'; g.phaseT = 0;
      Snd.play('start');
      if (bossIntro) spawnBosses(g);
      else if (g.L.tutorial) startTutorial();
      else say(g.helped ? '小蜜蜂来帮你啦！' : '出发！');
      if (first) showNewTips(g);
    }
    return;
  }
  updateCoins(dt);
  if (g.phase === 'won') {
    if (g.phaseT < 2.4 && Math.random() < 0.7) confetti(3);
    if (g.phaseT > 1.8 && !g.shown) { g.shown = true; UI.showWin(); }
    return;
  }
  if (g.phase === 'lost') {
    if (g.phaseT > 1.8 && !g.shown) { g.shown = true; UI.showLose(); }
    return;
  }
  if (g.freezeT > 0) g.freezeT -= dt;
  if (g.goldT > 0) {
    g.goldT -= dt;
    if (g.goldT <= 0) {
      const pt = chooseSpawnPoint();
      if (pt) { g.spawns.push({ x: pt[0], y: pt[1], t: 0, type: 'y', carrier: false, summoned: true, gold: true }); say('金宝宝出现啦！快抓住它！'); }
      else g.goldT = 1;
    }
  }
  updateCrates(dt);
  updateWorld(dt);
  for (const s of g.springs) s.t = Math.max(0, s.t - dt);
  if (g.wallT > 0 && !g.wallForever) { g.wallT -= dt; if (g.wallT <= 0) setRing(BRICK); }
  for (const p of g.players) updatePlayer(p, dt);
  for (const e of g.tanks) if (e.kind === 'enemy' && !e.dead) { if (e.type === 'boss') updateBoss(e, dt); else updateEnemy(e, dt); }
  updateSpawns(dt);
  updateBullets(dt);
  updateWaves(dt);
  for (const u of g.pups) { u.t += dt; if (u.t > u.life) u.dead = true; }
  g.pups = g.pups.filter(u => !u.dead);
  g.tanks = g.tanks.filter(t => !t.dead || t.kind === 'player');
  if (g.tut) updateTutorial(dt);
  else if (g.phase === 'play') modeCheck(g);
}
// Boss 出场（一个或两个）
function spawnBosses(g) {
  const keys = g.bossKeys, twin = keys.length > 1;
  keys.forEach((key, i) => {
    const bd = BOSSES[key];
    const x = twin ? (i ? 504 : 216) : 360;
    g.spawns.push({ x, y: bd.size > 100 ? 72 : 48, t: -0.4 - i * 0.3, boss: key, hpMul: twin ? 0.6 : 1 });
    g.bossTotal += bossTreeHp(key) * (twin ? 0.6 : 1) * (1 - 0.15 * g.assist) * g.diff.boss;
  });
  g.bossOn = true;
  for (const b of g.bullets) if (!b.player) b.dead = true;
  say(keys.map(k => BOSSES[k].name).join('和') + '来啦！');
}
// 连分裂出来的小家伙一起算的总血量
function bossTreeHp(key) {
  const bd = BOSSES[key];
  return bd.hp + (bd.split ? bd.split.n * bossTreeHp(bd.split.into) : 0);
}

// ===== 玩家 =====
function updatePlayer(p, dt) {
  const g = G;
  p.hurtT -= dt; p.invT -= dt; p.shieldT -= dt; p.speedT -= dt; p.slowT -= dt; p.fireCd -= dt; p.helperT -= dt;
  p.magnetT -= dt; p.mirrorT -= dt; p.cloneT -= dt;
  if (p.magnetT <= 0 && p.magnetCoins) { if (p.magnetCoins >= 20) Meta.unlock('magnet20'); p.magnetCoins = 0; }
  if (p.weaponT > 0) { p.weaponT -= dt; if (p.weaponT <= 0) { p.weapon = 'normal'; } }
  if (p.dead) { p.respawnT -= dt; if (p.respawnT <= 0 && p.lives > 0) respawnPlayer(p); return; }
  p.energy = Math.min(1, p.energy + dt * p.energyRate);
  if (p.jump) {
    const j = p.jump;
    j.t += dt;
    const k = Math.min(1, j.t / j.dur);
    p.x = j.fx + (j.tx - j.fx) * k; p.y = j.fy + (j.ty - j.fy) * k;
    if (k >= 1) { p.jump = null; poof(p.x, p.y + 10, 8); g.shake = Math.max(g.shake, 3); }
    return;
  }
  const inp = Input.get(p.pid);
  // 火箭冲刺：往前冲，撞到敌人扣血
  if (p.rocketT > 0) {
    p.rocketT -= dt;
    const m = tryMove(p, p.dir, 620 * dt);
    p.moving = true; p.dist += m;
    addPart({ x: p.x - DX[p.dir] * 24, y: p.y - DY[p.dir] * 24, size: rand(6, 10), grow: 14, life: 0.35, color: pick(['#FFE14D', '#FF9A3D', '#FFFFFF']) });
    for (const e of g.tanks) {
      if (e.kind !== 'enemy' || e.dead || (p.rocketHit && p.rocketHit.has(e))) continue;
      const r = (e.size + p.size) / 2 + 6;
      if (Math.abs(e.x - p.x) < r && Math.abs(e.y - p.y) < r) { (p.rocketHit = p.rocketHit || new Set()).add(e); damageEnemy(e, 3 + p.atk); g.shake = Math.max(g.shake, 6); }
    }
    if (m < 2) p.rocketT = 0;
    if (p.rocketT <= 0) p.rocketHit = null;
    return;
  }
  // 被大泡泡装住：连按开炮能早点出来
  if (p.trapT > 0) {
    p.trapT -= dt;
    if (inp.fire && !p.trapFire) p.trapT -= 0.25;
    p.trapFire = inp.fire;
    p.moving = false;
    if (p.trapT <= 0) { poof(p.x, p.y, 10, '#BDEBFF'); Snd.play('bubble'); }
    return;
  }
  let dir = -1, alt = -1;
  const ax = Math.abs(inp.x), ay = Math.abs(inp.y);
  if (ax > 0.3 || ay > 0.3) {
    if (ax >= ay) { dir = inp.x > 0 ? 1 : 3; if (ay > 0.35) alt = inp.y > 0 ? 2 : 0; }
    else { dir = inp.y > 0 ? 2 : 0; if (ax > 0.35) alt = inp.x > 0 ? 1 : 3; }
  }
  p.moving = false;
  const onIce = cellAt(Math.floor(p.x / C), Math.floor(p.y / C)) === ICE;
  if (dir < 0 && onIce && p.slideV > 8) {
    // 冰面上松开按键还会滑一段
    const m = tryMove(p, p.dir, p.slideV * dt);
    p.slideV = m < 0.1 ? 0 : p.slideV * Math.exp(-2 * dt);
    p.moving = m > 0.01; p.dist += m;
    if (Math.random() < 0.3) addPart({ type: 'snow', x: p.x + rand(-14, 14), y: p.y + rand(-14, 14), size: 4, life: 0.4, color: '#FFFFFF' });
  } else if (dir < 0) p.slideV = 0;
  if (dir >= 0) {
    const spd = p.speed * (p.speedT > 0 ? 1.45 : 1) * (p.slowT > 0 ? 0.55 : 1) * (onIce ? 1.2 : 1) * terrainMul(p) * dt;
    p.slideV = onIce ? spd / dt : 0;
    let m = tryMove(p, dir, spd);
    if (m < spd * 0.3) {
      p.pushT += dt;
      if (p.pushT > 0.12) { p.pushT = 0; tryPushCrate(p); }
    } else p.pushT = 0;
    if (m < spd * 0.3 && alt >= 0) {
      const sx = p.x, sy = p.y;
      const m2 = tryMove(p, alt, spd);
      if (m2 < 0.01) { p.x = sx; p.y = sy; p.dir = dir; } else m = m2;
    }
    p.moving = m > 0.01;
    p.dist += m;
    if (p.moving) {
      p.dustT -= dt;
      if (p.dustT <= 0) {
        p.dustT = p.speedT > 0 ? 0.05 : 0.12;
        addPart({ x: p.x - DX[p.dir] * 20 + rand(-6, 6), y: p.y - DY[p.dir] * 20 + rand(-6, 6), size: rand(3, 5), grow: 8, life: 0.4, color: p.speedT > 0 ? '#D9C7FF' : 'rgba(255,255,255,.8)' });
      }
    }
  }
  checkPortal(p);
  checkSpring(p);
  if (inp.fire && p.fireCd <= 0) playerShoot(p);
  if (inp.skill) useSkill(p);
  // 小蜜蜂帮手
  if (p.helperT > 0) {
    p.helperCd -= dt;
    if (p.helperCd <= 0) {
      let best = null, bd = 420;
      for (const e of g.tanks) if (e.kind === 'enemy' && !e.dead) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < bd) { bd = d; best = e; } }
      if (best) {
        const a0 = g.t * 3, bx = p.x + Math.cos(a0) * 36, by = p.y + Math.sin(a0) * 30 - 6;
        const a = Math.atan2(best.y - by, best.x - bx);
        g.bullets.push({ x: bx, y: by, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, r: 5, player: true, owner: p, helper: true, dmg: 1, kind: 'bee', color: '#FFD23F' });
        p.helperCd = 0.6;
      }
    }
  }
  // 捡道具
  for (const u of g.pups) {
    if (p.magnetT > 0 && !u.dead) { const d = Math.hypot(p.x - u.x, p.y - u.y), sp = Math.min(d, 420 * dt); if (d > 1) { u.x += ((p.x - u.x) / d) * sp; u.y += ((p.y - u.y) / d) * sp; } }
    if (!u.dead && Math.abs(u.x - p.x) < 36 && Math.abs(u.y - p.y) < 36) { u.dead = true; applyPup(p, u.type); }
  }
  // 撞到 Boss 会受伤
  for (const e of g.tanks) {
    if (e.type !== 'boss' || e.dead || e.teleT > 0 || e.under || e.bd.fake) continue;
    const r = (e.size + p.size) / 2 + 2;
    if (Math.abs(e.x - p.x) < r && Math.abs(e.y - p.y) < r) damagePlayer(p, e.atk);
  }
}
function respawnPlayer(p) {
  p.dead = false; p.x = p.sx; p.y = p.sy; p.dir = 0; p.hp = p.maxHp;
  p.shieldT = 3; p.invT = 0; p.hurtT = 0; p.slowT = 0;
  burstStars(p.x, p.y, 12, ['#FFE14D', '#FFFFFF', '#7FD6FF']);
  Snd.play('spawn');
}
function popPlayer(p) {
  const g = G;
  p.dead = true; p.lives--; g.lostLives++;
  burstStars(p.x, p.y, 18, ['#FFE14D', '#FFFFFF', PLAYER_TANKS[p.tankIdx].body], 220);
  poof(p.x, p.y, 10);
  Snd.play('pop'); g.shake = Math.max(g.shake, 8);
  if (p.lives > 0) { p.respawnT = 1.6; say('再来！'); }
  else if (g.players.every(q => q.dead && q.lives <= 0)) lose('lives');
}

function playerShoot(p) {
  const g = G, w = WEAPONS[p.weapon];
  const mine = g.bullets.filter(b => b.owner === p && !b.helper).length;
  if (mine >= w.max) return;
  const a = dirAngle(p.dir), off = p.size / 2 + 2;
  const bx = p.x + DX[p.dir] * off, by = p.y + DY[p.dir] * off;
  const dmg = Math.max(1, Math.round(p.atk * w.mul));
  const n = w.n || 1;
  const shots = [[bx, by, false]];
  if (w.twin) { const px = -DY[p.dir] * w.twin, py = DX[p.dir] * w.twin; shots[0] = [bx + px, by + py, false]; shots.push([bx - px, by - py, false]); }
  // 分身：在旁边一起开炮
  if (p.cloneT > 0) { const cx = p.x - DY[p.dir] * 44, cy = p.y + DX[p.dir] * 44; shots.push([cx + DX[p.dir] * off, cy + DY[p.dir] * off, true]); }
  for (const [sx, sy, helper] of shots) for (let i = 0; i < n; i++) {
    const ang = a + (i - (n - 1) / 2) * (w.gap || 0);
    g.bullets.push({
      x: sx, y: sy, vx: Math.cos(ang) * w.speed, vy: Math.sin(ang) * w.speed, r: w.r, player: true, owner: p, dmg, kind: p.weapon, helper,
      pierce: !!w.pierce, hitSet: w.pierce ? new Set() : null, freeze: w.freeze || 0, boom: w.boom || 0, depth: w.depth || 1, color: w.color, homing: w.homing || 0,
    });
  }
  p.fireCd = w.cd; p.recoil = 1;
  addPart({ x: bx, y: by, size: 6, grow: 40, life: 0.12, color: '#FFF3B0' });
  Snd.play({ big: 'shootBig', ice: 'shootIce', bomb: 'shootBomb', pierce: 'shootPierce', rainbow: 'shootPierce' }[p.weapon] || 'shoot');
}

// ===== 技能 =====
function useSkill(p) {
  const g = G;
  if (p.energy < 1 || p.dead) return;
  p.energy = 0;
  Meta.stat('skills');
  if (g.tut && g.tut.step === 4) g.tut.done = true;
  const d = PLAYER_TANKS[p.tankIdx], a = dirAngle(p.dir);
  const off = p.size / 2 + 4, bx = p.x + DX[p.dir] * off, by = p.y + DY[p.dir] * off;
  g.flash = 0.2; p.recoil = 1;
  Snd.play('skill'); say(d.skillName + '！');
  addText(p.x, p.y - 40, d.skillName + '！', '#FFE14D', 22);
  switch (d.skill) {
    case 'scatter':
      for (let i = 0; i < 11; i++) {
        const ang = a + (i - 5) * 0.17;
        g.bullets.push({ x: bx, y: by, vx: Math.cos(ang) * 460, vy: Math.sin(ang) * 460, r: 8, player: true, owner: p, helper: true, dmg: p.atk + 1, kind: 'scatter', depth: 1, color: `hsl(${i * 33},95%,62%)` });
      }
      break;
    case 'big':
      g.bullets.push({ x: bx, y: by, vx: DX[p.dir] * 380, vy: DY[p.dir] * 380, r: 18, player: true, owner: p, helper: true, dmg: p.atk * 3, kind: 'giant', pierce: true, hitSet: new Set(), band: 36, color: '#FF7043' });
      break;
    case 'ice':
      g.waves.push({ x: p.x, y: p.y, r: 20, max: 260, speed: 420, ice: true, player: true, dmg: p.atk, hit: new Set() });
      Snd.play('freeze');
      break;
    case 'pierce': laserBeam(p); break;
    case 'bomb':
      g.bullets.push({ x: bx, y: by, vx: DX[p.dir] * 330, vy: DY[p.dir] * 330, r: 15, player: true, owner: p, helper: true, dmg: p.atk * 3, kind: 'bomb', boom: 125, color: '#9C6BFF' });
      break;
    case 'missiles':
      for (let i = 0; i < 6; i++) {
        const ang = a + (i - 2.5) * 0.45;
        g.bullets.push({ x: bx, y: by, vx: Math.cos(ang) * 380, vy: Math.sin(ang) * 380, r: 8, player: true, owner: p, helper: true, dmg: p.atk * 2, kind: 'missile', homing: 4.5, homeAll: true, color: '#FF8A3D' });
      }
      break;
    case 'heal':
      for (const q of g.players) {
        if (q.dead) continue;
        q.hp = Math.min(q.maxHp, q.hp + 6); q.shieldT = Math.max(q.shieldT, 3);
        for (let i = 0; i < 8; i++) g.flowers.push({ x: q.x + rand(-30, 30), y: q.y + rand(-20, 10), vx: rand(-40, 40), vy: rand(-90, -40), t: 0, life: 1.4, color: '#FF7EB6', scale: 0.8, heart: true });
      }
      Snd.play('pup');
      break;
  }
  // 镜子怪看到你放大招会裂开
  for (const e of g.tanks) if (e.type === 'boss' && !e.dead && e.key === 'mirror') { e.weakT = 3; addText(e.x, e.y - e.size / 2 - 16, '裂开啦！', '#FFE14D', 20); }
}
function laserBeam(p) {
  const g = G, dx = DX[p.dir], dy = DY[p.dir];
  const x0 = p.x + dx * 22, y0 = p.y + dy * 22;
  let x = x0, y = y0;
  for (let i = 0; i < 80; i++) {
    const nx = x + dx * 12, ny = y + dy * 12;
    if (nx < 0 || ny < 0 || nx > MAP_W || ny > MAP_H) break;
    x = nx; y = ny;
    // 光束 2 格宽，打碎砖块，铁块挡住
    let steel = false;
    for (const o of [-12, 11.99]) {
      const cx = Math.floor((x + (dx === 0 ? o : 0)) / C), cy = Math.floor((y + (dy === 0 ? o : 0)) / C);
      const v = cellAt(cx, cy);
      if (isSoft(v)) { breakCell(cy * GW + cx); chunks(cx * C + 12, cy * C + 12, THEMES[g.theme].brick[1], 2); }
      else if (v === STEEL || v === GATE || v === BLINK || v === JELLY) steel = true;
    }
    if (steel) break;
  }
  g.beams.push({ x0, y0, x1: x, y1: y, t: 0, w: 26 });
  const minX = Math.min(x0, x) - 14, maxX = Math.max(x0, x) + 14, minY = Math.min(y0, y) - 14, maxY = Math.max(y0, y) + 14;
  for (const e of g.tanks) {
    if (e.kind !== 'enemy' || e.dead) continue;
    const h = e.size / 2;
    if (e.x + h > minX && e.x - h < maxX && e.y + h > minY && e.y - h < maxY) damageEnemy(e, p.atk * 3);
  }
  Snd.play('brick'); g.shake = Math.max(g.shake, 6);
}

// ===== 道具 =====
function randomPupType(p) {
  let list = PUP_WEIGHTS.filter(([t, , w]) => (w || 0) <= G.world && !(G.wallForever && t === 'wall') && !(p && t === p.weapon) && !(p && t === 'life' && p.lives >= 3));
  if (G.L.night) list = list.concat([['firefly', G.lightT > 0 ? 2 : 10]]);
  if (p && p.hp <= p.maxHp / 2) list = list.map(([t, w]) => [t, t === 'heart' ? w * 3 : w]);
  const sum = list.reduce((s, [, w]) => s + w, 0);
  let x = Math.random() * sum;
  for (const [t, w] of list) { x -= w; if (x <= 0) return t; }
  return 'shield';
}
function spawnPup(nearX, nearY, forceType) {
  const g = G, p = g.players.find(q => !q.dead) || g.players[0];
  const fx = nearX != null ? nearX : p.x, fy = nearY != null ? nearY : p.y;
  const cands = [];
  for (let r = 0; r < ROWS - 2; r++) for (let c = 0; c < COLS; c++) {
    let ok = true;
    for (let dy = 0; dy < 2 && ok; dy++) for (let dx = 0; dx < 2 && ok; dx++) {
      const v = g.grid[(r * 2 + dy) * GW + c * 2 + dx];
      if (v !== EMPTY && v !== GRASS) ok = false;
    }
    const x = c * T + 24, y = r * T + 24;
    if (ok && !g.crates.some(k => Math.abs(k.x - x) < 40 && Math.abs(k.y - y) < 40) && !g.springs.some(k => k.x === x && k.y === y) && !g.portals.some(k => k.x === x && k.y === y)) cands.push([x, y]);
  }
  if (!cands.length) return;
  cands.sort((a, b) => Math.hypot(a[0] - fx, a[1] - fy) - Math.hypot(b[0] - fx, b[1] - fy));
  const [x, y] = cands[Math.floor(Math.random() * Math.min(8, cands.length))];
  let type = forceType || (g.forcePup ? g.forcePup : randomPupType(p));
  if (!forceType && g.forcePup) g.forcePup = null;
  g.pups.push({ x, y, type, t: 0, life: 16 });
  burstStars(x, y, 8, ['#FFE14D', '#FFFFFF']);
}
function applyPup(p, type) {
  const g = G, P = PUPS[type];
  if (P.weapon) { p.weapon = type; p.weaponT = 20; }
  else switch (type) {
    case 'shield': p.shieldT = 10; break;
    case 'heart': p.hp = Math.min(p.maxHp, p.hp + 4); break;
    case 'speed': p.speedT = 12; break;
    case 'freeze':
      g.freezeT = 6;
      for (const e of g.tanks) if (e.kind === 'enemy' && !e.dead) e.frozenT = e.type === 'boss' ? 3 : 6;
      Snd.play('freeze'); break;
    case 'wall': setRing(STEEL); g.wallT = 15; break;
    case 'starbomb':
      g.flash = 0.35; g.shake = 10;
      for (const e of g.tanks) if (e.kind === 'enemy' && !e.dead) { burstStars(e.x, e.y, 10, ['#FFE14D', '#FFF59D', '#FFFFFF'], 220); damageEnemy(e, 8); }
      for (const b of g.bullets) if (!b.player) { b.dead = true; poof(b.x, b.y, 3); }
      Snd.play('boom'); break;
    case 'helper': p.helperT = 15; p.helperCd = 0.3; break;
    case 'energy': p.energy = 1; break;
    case 'life': p.lives = Math.min(5, p.lives + 1); break;
    case 'magnet': p.magnetT = 12; p.magnetCoins = 0; break;
    case 'mirror': p.mirrorT = 8; break;
    case 'bubble': {
      const list = g.tanks.filter(e => e.kind === 'enemy' && !e.dead && !e.under).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
      for (const e of list.slice(0, 3)) { e.frozenT = Math.max(e.frozenT, e.type === 'boss' ? 2 : 5); e.bubble = true; poof(e.x, e.y, 8, '#BDEBFF'); }
      Snd.play('bubble'); break;
    }
    case 'clone': p.cloneT = 12; break;
    case 'turret': g.turrets.push({ x: p.x - DX[p.dir] * 40, y: p.y - DY[p.dir] * 40, life: 15, cd: 0.5, kind: 'turret', owner: p, aim: dirAngle(p.dir) }); break;
    case 'rocket': p.rocketT = 0.42; p.rocketHit = null; Snd.play('jump'); break;
    case 'firefly': g.lightT = 8; break;
  }
  if (!save.seen.p[type]) { save.seen.p[type] = 1; if (PUPS[type].desc) toast('🎁', '新道具：' + P.name, PUPS[type].desc); }
  Meta.stat('pups');
  if (g.tut && g.tut.step === 2) g.tut.done = true;
  Snd.play('pup'); say(P.name);
  burstStars(p.x, p.y, 12, ['#FFE14D', '#FFFFFF', P.color]);
  g.pickFx.push({ type, x: p.x, y: p.y, t: 0 });
}

// ===== 伤害 =====
function damageEnemy(e, dmg, opts) {
  const g = G;
  if (e.dead || g.phase !== 'play') return;
  if (e.teleT > 0.2 || e.under) return;
  if (e.type === 'boss') {
    // 打不动的时候冒"叮"
    if (e.guardT > 0) { addText(e.x + rand(-10, 10), e.y - e.size / 2 - 6, '叮', '#C9D3FF', 18); Snd.play('steel'); return; }
    dmg *= bossDmgMul(e);
  }
  if (e.seenT !== undefined) e.seenT = 1.2;
  const real = Math.max(1, Math.round(dmg) - (e.dfn || 0));
  e.hp -= real; e.flashT = 0.12;
  addText(e.x + rand(-8, 8), e.y - e.size / 2 - 6, '-' + real, '#FFFFFF', e.type === 'boss' ? 22 : 18);
  if (opts && opts.freeze) e.frozenT = Math.max(e.frozenT, e.type === 'boss' ? opts.freeze * 0.4 : opts.freeze);
  if (e.type === 'boss') {
    if (!e.bd.child) while (e.drops.length && e.hp / e.maxHp < e.drops[0]) { e.drops.shift(); spawnPup(e.x, e.y + 80); }
    if (e.bd.rebuild) bossRebuild(e, real);
  }
  if (e.hp <= 0) killEnemy(e);
  else Snd.play('boing');
}
function killEnemy(e, chain) {
  const g = G;
  if (e.dead) return;
  e.dead = true;
  const big = e.type === 'boss';
  if (big && e.bd.fake) { poof(e.x, e.y, 14, '#C9A8FF'); burstStars(e.x, e.y, 10, ['#C9A8FF', '#FFFFFF']); addText(e.x, e.y - 40, '是假的！', '#FFE14D', 20); Snd.play('poof'); return; }
  if (!e.summoned && !big) g.killed++;
  if (!e.summoned) g.lastProg = g.t;
  // 泡泡鱼分成两只小泡泡
  if (!big && ENEMIES[e.type].split && !chain) {
    for (const sx of [-16, 16]) {
      const m = makeEnemy(ENEMIES[e.type].split, e.x + sx, e.y, false);
      m.dir = sx > 0 ? 1 : 3; m.summoned = e.summoned; g.tanks.push(m);
      if (!e.summoned) g.total++;
    }
    poof(e.x, e.y, 8, '#BDEBFF');
  }
  Meta.stat('kills');
  if (!chain) {
    g.combo = g.t - g.lastKillT < 0.25 ? g.combo + 1 : 1;
    g.lastKillT = g.t;
    if (g.combo === 3) { Meta.unlock('combo3'); addText(e.x, e.y - 40, '一炮三响！', '#FFE14D', 24); }
  }
  dropCoins(e.x, e.y, big ? (e.bd.child ? 5 : { mini: 20, big: 40, final: 80 }[e.bd.kind]) : e.gold ? 15 : { b: 2, p: 2, r: 2, h: 3, d: 2, k: 2, l: 2, z: 3, u: 2, q: 3 }[e.type] || 1);
  if (e.gold) {
    Meta.unlock('gold'); say('抓住金宝宝啦！');
    g.goldCaught = (g.goldCaught || 0) + 1;
    for (let i = 0; i < (g.mode === 'gold' ? 1 : 3); i++) spawnPup(e.x, e.y);
  }
  if (big && !e.bd.child) {
    Meta.unlock('boss1');
    if (e.bd.kind !== 'mini') Meta.unlock('bossBig');
    if (e.bd.kind === 'final') Meta.unlock('final');
    save.bossKills[e.key] = (save.bossKills[e.key] || 0) + 1;
    Meta.stat('bosses');
    if (BOSS_LIST.every(k => save.bossKills[k])) Meta.unlock('bossAll');
  }
  burstStars(e.x, e.y, big ? 50 : 14, ['#FFE14D', '#FF7AB6', '#7CF29A', '#7FD6FF', '#FFFFFF'], big ? 340 : 200);
  poof(e.x, e.y, big ? 16 : 6);
  addPart({ x: e.x, y: e.y, type: 'ring', size: 10, grow: big ? 400 : 160, life: 0.4, color: '#FFFFFF', drag: 0 });
  const nf = big ? 12 : 1;
  for (let i = 0; i < nf; i++) {
    g.flowers.push({ x: e.x + (big ? rand(-30, 30) : 0), y: e.y + (big ? rand(-30, 30) : 0), vx: rand(-60, 60), vy: rand(-60, 10), t: 0, life: 1.6, color: pick(FLOWER_COLS), scale: big ? 1.4 : 1 });
  }
  g.shake = Math.max(g.shake, big ? 16 : 4);
  for (const p of g.players) p.energy = Math.min(1, p.energy + (big ? 1 : 0.12));
  if (e.carrier) spawnPup(e.x, e.y);
  if (big) {
    g.orbs = g.orbs.filter(o => o.owner !== e); g.blocks = g.blocks.filter(o => o.owner !== e);
    if (e.bd.split) splitBoss(e);
    const left = g.tanks.filter(t => t.type === 'boss' && !t.dead && !t.bd.fake);
    if (!left.length && !g.spawns.some(s => s.boss)) {
      Snd.play('bossDie');
      g.boss = null;
      for (const o of g.tanks) if (o.kind === 'enemy' && !o.dead) killEnemy(o, true);
      g.queue.length = 0; g.spawns.length = 0;
      win();
    } else {
      Snd.play('pop');
      if (g.boss === e) g.boss = left[0] || null;
      // 双子：同伴伤心生气
      if (!e.bd.child) for (const o of left) if (!o.bd.child) { o.sad = true; addText(o.x, o.y - o.size / 2 - 20, '呜呜，我生气了！', '#FF3B3B', 18); }
    }
  } else Snd.play('pop');
}
// 软糖、陨石怪打倒后分成几个小的
function splitBoss(e) {
  const g = G, sp = e.bd.split, cd = BOSSES[sp.into];
  for (let i = 0; i < sp.n; i++) {
    const a = (i / sp.n) * Math.PI * 2 + 0.6;
    let x = e.x + Math.cos(a) * e.size * 0.45, y = e.y + Math.sin(a) * e.size * 0.45;
    for (let k = 0; k < 20 && boxHitsGrid(x, y, cd.size / 2); k++) { x = e.x + rand(-60, 60); y = e.y + rand(-60, 60); }
    x = clamp(x, cd.size / 2, MAP_W - cd.size / 2); y = clamp(y, cd.size / 2, MAP_H - cd.size / 2);
    const c = makeBoss(sp.into, x, y, e.hpMul);
    c.skillT = 1 + i * 0.4; c.angry = true;
    g.tanks.push(c); g.bosses.push(c);
    burstStars(x, y, 12, [e.bd.body, '#FFFFFF']);
  }
  addText(e.x, e.y - 30, '分裂啦！', '#FFE14D', 24);
  Snd.play('boing');
}
function damagePlayer(p, dmg, opts) {
  const g = G;
  if (p.dead || g.phase !== 'play' || p.jump) return false;
  if (g.tut && g.tut.step < 5) return false;
  if (p.shieldT > 0 || p.invT > 0) { if (p.shieldT > 0) Snd.play('bubble'); return false; }
  const real = Math.max(1, dmg + g.diff.dmg - p.dfn);
  p.hp -= real; p.invT = 1.4; p.hurtT = 0.8;
  if (opts && opts.slow) p.slowT = 2.5;
  addText(p.x, p.y - 30, '-' + real, '#FF4D6D', 20);
  g.shake = Math.max(g.shake, 6); Snd.play('hurt');
  burstStars(p.x, p.y, 8, ['#FFE14D', '#FFFFFF']);
  if (p.hp <= 0) popPlayer(p);
  return true;
}
function damageEgg() {
  const g = G, e = g.egg;
  if (e.broken || g.phase !== 'play' || e.hitT > 0) return;
  e.hp--; e.hitT = 1.5; g.eggHits++;
  g.shake = Math.max(g.shake, 9); Snd.play('egg');
  chunks(e.x, e.y - 6, '#FFF7E6', 6);
  if (e.hp <= 0) { e.broken = true; lose('egg'); }
  else say('小心宝宝蛋！');
}
function explode(x, y, rad, dmg, byPlayer) {
  const g = G;
  for (let i = 0; i < 14; i++) {
    const a = rand(0, Math.PI * 2), s = rand(20, rad * 1.6);
    addPart({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.3, 0.6), size: rand(6, 14), grow: 20, color: pick(['#FFE14D', '#FF9A3D', '#FF5A5F', '#FFFFFF']), drag: 5 });
  }
  for (let i = 0; i < 6; i++) addPart({ x: x + rand(-rad / 2, rad / 2), y: y + rand(-rad / 2, rad / 2), size: rand(8, 14), grow: 20, life: 0.8, color: 'rgba(90,90,110,.5)' });
  addPart({ x, y, type: 'ring', size: 8, grow: rad * 3.5, life: 0.3, color: '#FFE14D', drag: 0 });
  g.shake = Math.max(g.shake, Math.min(14, rad / 6)); Snd.play('boom');
  const c0 = Math.floor((x - rad) / C), c1 = Math.floor((x + rad) / C), r0 = Math.floor((y - rad) / C), r1 = Math.floor((y + rad) / C);
  for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
    if (!isSoft(cellAt(cx, cy))) continue;
    const idx = cy * GW + cx;
    if (byPlayer && g.ringSet.has(idx)) continue;
    if (Math.hypot(cx * C + 12 - x, cy * C + 12 - y) < rad) { breakCell(idx); if (Math.random() < 0.4) chunks(cx * C + 12, cy * C + 12, THEMES[g.theme].brick[1], 2); }
  }
  for (const k of g.crates) if (Math.hypot(k.x - x, k.y - y) - 24 < rad) hitCrate(k, 2, byPlayer);
  if (byPlayer) {
    for (const k of g.cages) if (!k.open && Math.hypot(k.x - x, k.y - y) - 24 < rad) hitCage(k, 2);
    for (const o of g.orbs) if (Math.hypot(o.x - x, o.y - y) - 14 < rad) hitOrb(o, 2);
    for (const o of g.blocks) if (Math.hypot(o.x - x, o.y - y) - 14 < rad) hitBlock(o, 2);
  }
  for (const t of g.tanks) {
    if (t.dead) continue;
    if (Math.hypot(t.x - x, t.y - y) - t.size / 2 >= rad) continue;
    if (byPlayer && t.kind === 'enemy') damageEnemy(t, dmg);
    else if (!byPlayer && t.kind === 'player') damagePlayer(t, dmg);
  }
}

// ===== 子弹 =====
function updateBullets(dt) {
  const g = G;
  for (const b of g.bullets) {
    if (b.dead) continue;
    if (b.homing) homeBullet(b, dt);
    if (b.life !== undefined) { b.life -= dt; if (b.life <= 0) { b.dead = true; poof(b.x, b.y, 4); continue; } }
    const n = Math.max(1, Math.ceil((Math.hypot(b.vx, b.vy) * dt) / 4));
    for (let i = 0; i < n && !b.dead; i++) {
      b.x += (b.vx * dt) / n; b.y += (b.vy * dt) / n;
      bulletHit(b);
    }
  }
  for (const a of g.bullets) {
    if (a.dead || !a.player) continue;
    for (const b of g.bullets) {
      if (b.dead || b.player) continue;
      if (Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r + 2) {
        // 大雪球要打好几下
        if (b.hp > 1) { b.hp--; a.dead = true; poof(a.x, a.y, 4, '#FFFFFF'); Snd.play('poof'); break; }
        b.dead = true;
        if (b.kind === 'snowball') iceBurst(b);
        if (!a.pierce) a.dead = true;
        poof((a.x + b.x) / 2, (a.y + b.y) / 2, 4); Snd.play('poof');
        if (a.dead) break;
      }
    }
  }
  g.bullets = g.bullets.filter(b => !b.dead);
}
function breakBand(b, hx, hy, ux, uy) {
  const g = G, band = b.band || 12, depth = b.depth || 1;
  const horiz = Math.abs(ux) >= Math.abs(uy);
  const sx = horiz ? Math.sign(ux) : 0, sy = horiz ? 0 : Math.sign(uy);
  let n = 0;
  for (let k = 0; k < depth; k++) {
    const cx0 = hx + sx * k, cy0 = hy + sy * k;
    if (horiz) {
      const r0 = Math.floor((b.y - band) / C), r1 = Math.floor((b.y + band - 0.01) / C);
      for (let r = r0; r <= r1; r++) if (isSoft(cellAt(cx0, r))) { breakCell(r * GW + cx0); chunks(cx0 * C + 12, r * C + 12, THEMES[g.theme].brick[1]); n++; }
    } else {
      const q0 = Math.floor((b.x - band) / C), q1 = Math.floor((b.x + band - 0.01) / C);
      for (let q = q0; q <= q1; q++) if (isSoft(cellAt(q, cy0))) { breakCell(cy0 * GW + q); chunks(q * C + 12, cy0 * C + 12, THEMES[g.theme].brick[1]); n++; }
    }
  }
  if (n) { Snd.play('brick'); g.shake = Math.max(g.shake, 2); }
}
function bulletHit(b) {
  const g = G;
  if (b.x < 0 || b.y < 0 || b.x > MAP_W || b.y > MAP_H) {
    b.dead = true; poof(clamp(b.x, 0, MAP_W), clamp(b.y, 0, MAP_H), 3);
    if (b.kind === 'bomb') explode(clamp(b.x, 0, MAP_W), clamp(b.y, 0, MAP_H), b.boom || 50, b.dmg, b.player);
    return;
  }
  if (b.portalSkip != null && Math.hypot(b.x - g.portals[b.portalSkip].x, b.y - g.portals[b.portalSkip].y) > 30) b.portalSkip = null;
  for (const P of g.portals) {
    if (P.i !== b.portalSkip && Math.hypot(b.x - P.x, b.y - P.y) < 12) {
      const D = g.portals[P.pair];
      poof(b.x, b.y, 3, P.color); b.x = D.x; b.y = D.y; b.portalSkip = D.i; poof(b.x, b.y, 3, P.color);
      break;
    }
  }
  const sp = Math.hypot(b.vx, b.vy), ux = b.vx / sp, uy = b.vy / sp;
  const fx = b.x + ux * b.r, fy = b.y + uy * b.r;
  const px = -uy * (b.r - 1), py = ux * (b.r - 1);
  let hitBrick = null, hitSteel = false, hitEgg = false, hitJelly = false;
  for (const [sx, sy] of [[fx, fy], [fx + px, fy + py], [fx - px, fy - py]]) {
    const cx = Math.floor(sx / C), cy = Math.floor(sy / C), v = cellAt(cx, cy);
    if (isSoft(v)) { if (!hitBrick) hitBrick = [cx, cy]; }
    else if (v === STEEL || v === GATE || v === BLINK) hitSteel = true;
    else if (v === JELLY) hitJelly = true;
    else if (v === EGG) hitEgg = true;
  }
  if (hitEgg) {
    b.dead = true;
    if (b.player) { poof(fx, fy, 4); }
    else { if (b.kind === 'bomb') explode(fx, fy, 40, b.dmg, false); damageEgg(); }
    return;
  }
  // 果冻墙：原路弹回去一次
  if (hitJelly) {
    if (b.kind === 'bomb') { b.dead = true; explode(fx, fy, b.boom || 50, b.dmg, b.player); return; }
    if (b.jellied || b.kind === 'giant') { b.dead = true; poof(fx, fy, 4, '#FFB3E6'); return; }
    b.jellied = true; reflectBullet(b);
    Snd.play('boing'); addPart({ x: fx, y: fy, type: 'ring', size: 6, grow: 80, life: 0.25, color: '#FF9AD5', drag: 0 });
    return;
  }
  if (hitBrick) {
    if (b.kind === 'bomb') { b.dead = true; explode(fx, fy, b.boom || 50, b.dmg, b.player); return; }
    breakBand(b, hitBrick[0], hitBrick[1], ux, uy);
    if (b.bounce > 0) { b.bounce--; reflectBullet(b); return; }
    if (b.boom && b.kind === 'rainbow') { b.dead = true; explode(fx, fy, b.boom, b.dmg, b.player); return; }
    if (!b.pierce) { b.dead = true; if (b.kind === 'snowball') iceBurst(b); return; }
  }
  if (hitSteel) {
    if (b.bounce > 0) { b.bounce--; reflectBullet(b); sparks(fx, fy); Snd.play('steel'); return; }
    b.dead = true;
    if (b.kind === 'bomb' || b.kind === 'rainbow') explode(fx, fy, b.boom || 50, b.dmg, b.player);
    else if (b.kind === 'snowball') iceBurst(b);
    else { sparks(fx, fy); Snd.play('steel'); }
    return;
  }
  for (const k of g.crates) {
    if (Math.abs(k.x - fx) < 24 && Math.abs(k.y - fy) < 24) {
      if (b.kind === 'bomb') { b.dead = true; explode(fx, fy, b.boom || 50, b.dmg, b.player); return; }
      if (b.hitSet) { if (b.hitSet.has(k)) continue; b.hitSet.add(k); hitCrate(k, 3, b.player); continue; }
      b.dead = true; hitCrate(k, 1, b.player); return;
    }
  }
  for (const k of g.cages) {
    if (k.open || Math.abs(k.x - fx) >= 23 || Math.abs(k.y - fy) >= 23) continue;
    b.dead = true;
    if (b.player) hitCage(k, b.kind === 'big' || b.kind === 'giant' || b.kind === 'bomb' ? 2 : 1);
    else poof(fx, fy, 3);
    return;
  }
  if (b.player) {
    for (const o of g.orbs) if (Math.hypot(o.x - b.x, o.y - b.y) < 14 + b.r) { if (b.hitSet) { if (b.hitSet.has(o)) continue; b.hitSet.add(o); } else b.dead = true; hitOrb(o, 1); if (b.dead) return; }
    for (const o of g.blocks) if (Math.hypot(o.x - b.x, o.y - b.y) < 14 + b.r) { b.dead = true; hitBlock(o, 1); return; }
  }
  for (const t of g.tanks) {
    if (t.dead || t.jump || t.under) continue;
    if (b.player ? t.kind !== 'enemy' : t.kind !== 'player') continue;
    if (t.teleT > 0.2) continue;
    const hh = t.size / 2 + b.r * 0.6;
    if (Math.abs(t.x - b.x) >= hh || Math.abs(t.y - b.y) >= hh) continue;
    if (b.player) {
      // 正面有盾：从正面打来的子弹挡掉
      if (shieldBlocks(t, b)) {
        if (b.kind === 'big' || b.kind === 'giant') { t.shieldOffT = 3; addText(t.x, t.y - t.size / 2 - 10, '盾掉啦！', '#FFE14D', 18); }
        else { b.dead = true; sparks(b.x, b.y); Snd.play('steel'); addText(t.x + rand(-6, 6), t.y - t.size / 2 - 6, '叮', '#C9D3FF', 16); return; }
      }
      if (b.hitSet) {
        if (b.hitSet.has(t)) continue;
        b.hitSet.add(t); damageEnemy(t, b.dmg, { freeze: b.freeze }); burstStars(b.x, b.y, 4, ['#FFE14D', '#FFFFFF']);
        continue;
      }
      b.dead = true;
      if (b.kind === 'bomb') { explode(b.x, b.y, b.boom, b.dmg, true); return; }
      damageEnemy(t, b.dmg, { freeze: b.freeze });
      burstStars(b.x, b.y, 4, b.kind === 'ice' ? ['#BFF3FF', '#FFFFFF'] : ['#FFE14D', '#FFFFFF']);
      return;
    }
    // 反弹护盾：把子弹弹回去
    if (t.mirrorT > 0 && b.kind !== 'bubbleT') {
      reflectBullet(b, true);
      b.player = true; b.owner = t; b.dmg = Math.max(b.dmg, t.atk); b.helper = true; b.color = '#80DEEA';
      Meta.stat('mirrored'); Snd.play('bubble');
      return;
    }
    b.dead = true;
    if (b.kind === 'bubbleT') { if (t.shieldT <= 0 && t.invT <= 0) { t.trapT = 1.5; Snd.play('bubble'); addText(t.x, t.y - 34, '被泡泡装住啦！', '#7FD6FF', 16); } return; }
    if (b.kind === 'bomb') explode(b.x, b.y, 50, b.dmg, false);
    else damagePlayer(t, b.dmg, { slow: b.kind === 'ice' || b.kind === 'snowball' });
    return;
  }
}
// 碰到墙往回弹：看是撞到了横的还是竖的那一边
function reflectBullet(b, both) {
  const sx = Math.sign(b.vx), sy = Math.sign(b.vy), r = b.r + 1;
  if (both) { b.vx = -b.vx; b.vy = -b.vy; return; }
  const hx = sx !== 0 && solidForBullet(cellAt(Math.floor((b.x + sx * r) / C), Math.floor(b.y / C)));
  const hy = sy !== 0 && solidForBullet(cellAt(Math.floor(b.x / C), Math.floor((b.y + sy * r) / C)));
  if (hx || !hy) b.vx = -b.vx;
  if (hy || !hx) b.vy = -b.vy;
  b.x += Math.sign(b.vx) * 3; b.y += Math.sign(b.vy) * 3;
}
function shieldBlocks(t, b) {
  let face = null;
  // 螃蟹的钳子一直朝下，骑士的盾朝着走路的方向
  if (t.type === 'boss') { if (t.bd.frontShield && t.shieldOffT <= 0 && t.clawWarn <= 0 && t.stunT <= 0) face = t.bd.sidestep ? Math.PI / 2 : dirAngle(t.dir); }
  else if (ENEMIES[t.type].shield && t.shieldOffT <= 0) face = dirAngle(t.dir);
  if (face === null || b.kind === 'bomb' || b.pierce || b.kind === 'missile') return false;
  const sp = Math.hypot(b.vx, b.vy);
  return (b.vx / sp) * Math.cos(face) + (b.vy / sp) * Math.sin(face) < -0.5;
}
// 追踪弹：慢慢拐向最近的敌人（玩家的）或玩家（敌人的鱼雷）
function homeBullet(b, dt) {
  const g = G, sp = Math.hypot(b.vx, b.vy);
  let best = null, bd = b.homeAll ? 600 : 260;
  const a0 = Math.atan2(b.vy, b.vx);
  for (const t of g.tanks) {
    if (t.dead || t.under || (b.player ? t.kind !== 'enemy' : t.kind !== 'player')) continue;
    const d = Math.hypot(t.x - b.x, t.y - b.y);
    if (d > bd) continue;
    let da = Math.atan2(t.y - b.y, t.x - b.x) - a0;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    if (!b.homeAll && Math.abs(da) > Math.PI / 3) continue;
    bd = d; best = da;
  }
  if (best === null) return;
  const a = a0 + clamp(best, -b.homing * dt, b.homing * dt);
  b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
}
function iceBurst(b) {
  const a = Math.atan2(-b.vy, -b.vx);
  for (let i = -1; i <= 1; i++) enemyBullet(b.owner, b.x - Math.cos(a + Math.PI) * 4, b.y - Math.sin(a + Math.PI) * 4, a + i * 0.5, 'ice');
  poof(b.x, b.y, 10, '#FFFFFF'); Snd.play('freeze');
}

function updateWaves(dt) {
  const g = G;
  for (const w of g.waves) {
    w.r += w.speed * dt;
    if (w.ice) {
      if (Math.random() < 0.6) { const a = rand(0, Math.PI * 2); addPart({ x: w.x + Math.cos(a) * w.r, y: w.y + Math.sin(a) * w.r, type: 'snow', size: 5, life: 0.5, color: '#FFFFFF' }); }
    }
    for (const t of g.tanks) {
      if (t.dead || w.hit.has(t)) continue;
      if (w.player ? t.kind !== 'enemy' : t.kind !== 'player') continue;
      if (Math.abs(Math.hypot(t.x - w.x, t.y - w.y) - w.r) > t.size / 2 + 10) continue;
      if (!w.player && Math.hypot(t.x - w.x, t.y - w.y) > w.r + t.size / 2) continue;
      w.hit.add(t);
      if (w.player) damageEnemy(t, w.dmg, { freeze: 4 });
      else damagePlayer(t, w.dmg);
    }
  }
  g.waves = g.waves.filter(w => w.r < w.max);
}

// ===== 出兵 =====
function freeSpot(x, y, size) {
  return !boxHitsGrid(x, y, size / 2) && !G.tanks.some(t => !t.dead && Math.abs(t.x - x) < (t.size + size) / 2 && Math.abs(t.y - y) < (t.size + size) / 2);
}
function chooseSpawnPoint() {
  const g = G;
  for (let k = 0; k < 3; k++) {
    const idx = (g.spawnIdx + k) % 3, pt = g.eSpawn[idx];
    if (freeSpot(pt[0], pt[1], 46)) { g.spawnIdx = idx + 1; return pt; }
  }
  return null;
}
function updateSpawns(dt) {
  const g = G, L = g.L;
  const alive = g.tanks.filter(t => t.kind === 'enemy' && !t.dead && t.type !== 'boss' && !t.summoned).length + g.spawns.filter(s => !s.boss && !s.summoned).length;
  g.spawnT -= dt;
  if (g.queue.length && alive < L.maxOn && g.spawnT <= 0) {
    const pt = chooseSpawnPoint();
    if (pt) {
      const type = g.queue.shift();
      const carrier = g.spawnCount % 3 === 1;
      g.spawnCount++;
      g.spawns.push({ x: pt[0], y: pt[1], t: 0, type, carrier });
      g.spawnT = (g.bossOn ? 7 : 2.2) * (1 + 0.2 * g.assist);
      Snd.play('spawn');
    }
  }
  for (const s of g.spawns) {
    s.t += dt;
    if (s.t < 0.9) continue;
    s.done = true;
    if (s.boss) {
      const e = makeBoss(s.boss, s.x, s.y, s.hpMul);
      g.tanks.push(e); g.bosses.push(e);
      if (!g.boss) g.boss = e;
      g.shake = 12; burstStars(s.x, s.y, 30, ['#FF4D6D', '#FFE14D', '#FFFFFF'], 300);
    } else {
      const e = makeEnemy(s.type, s.x, s.y, s.carrier);
      e.summoned = !!s.summoned;
      if (s.gold) { e.gold = true; e.life = 14; }
      if (s.dir !== undefined) e.dir = s.dir;
      g.tanks.push(e);
      poof(s.x, s.y, 6);
      meetEnemy(e);
    }
  }
  g.spawns = g.spawns.filter(s => !s.done);
}

// ===== 敌人 AI =====
function chooseDir(e, blocked) {
  const g = G, p = nearestPlayer(e);
  const w = [1, 1, 1, 1];
  if (e.type === 'boss') {
    w[0] = e.y > 200 ? 1.2 : 0.2; w[2] = e.y < 220 ? 1 : 0.15; w[1] = 2; w[3] = 2;
  } else {
    w[2] += 1.0;
    const tx = p && Math.random() < 0.7 ? p.x : g.egg.x;
    if (tx > e.x + 20) w[1] += 1.2; else if (tx < e.x - 20) w[3] += 1.2;
    if (p && p.y < e.y - 40) w[0] += 0.6;
  }
  if (blocked) w[e.dir] = 0.05;
  for (let d = 0; d < 4; d++) if (probeBlocked(e, d)) w[d] *= 0.15;
  const sum = w[0] + w[1] + w[2] + w[3];
  let x = Math.random() * sum;
  for (let d = 0; d < 4; d++) { x -= w[d]; if (x <= 0) { e.dir = d; return; } }
}
function inLine(e, o) {
  if (!o) return false;
  const fx = DX[e.dir], fy = DY[e.dir];
  if (fx === 0) return Math.abs(o.x - e.x) < 18 && (o.y - e.y) * fy > 0;
  return Math.abs(o.y - e.y) < 18 && (o.x - e.x) * fx > 0;
}
// 敌人子弹：速度倍数、半径、颜色
const EB = {
  normal: [1, 7, '#FF5EA8'], big: [0.85, 11, '#FF6B6B'], bomb: [0.75, 10, '#FF8A8A'], ice: [1, 8, '#7FE3FF'], bounce: [0.95, 7, '#5EE0C0'],
  snowball: [0.6, 18, '#FFFFFF'], torpedo: [0.55, 9, '#9AA5B8'], bubbleT: [0.45, 16, '#BDEBFF'], slow: [0.7, 7, '#C9A8FF'], spike: [1, 6, '#FFD23F'],
};
function enemyBullet(owner, x, y, ang, kind) {
  const g = G, e = EB[kind] || EB.normal;
  const sp = g.eBulletSpd * e[0];
  const atk = owner && owner.atk ? owner.atk : 2;
  const b = { x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: e[1], player: false, owner, dmg: Math.min(3, atk + (kind === 'big' ? 1 : 0)), kind, depth: kind === 'big' ? 2 : 1, color: e[2] };
  if (kind === 'bounce') b.bounce = 1;
  if (kind === 'snowball') { b.hp = 3; b.dmg = Math.min(3, atk); }
  if (kind === 'torpedo') { b.homing = 1.6; b.life = 6; }
  if (kind === 'bubbleT') { b.dmg = 0; b.life = 5; }
  g.bullets.push(b);
  return b;
}
function enemyShoot(e) {
  const a = dirAngle(e.dir), off = e.size / 2 + 2;
  const x = e.x + DX[e.dir] * off, y = e.y + DY[e.dir] * off;
  if (e.gun === 'scatter') for (let i = -1; i <= 1; i++) enemyBullet(e, x, y, a + i * 0.3, 'normal');
  else enemyBullet(e, x, y, a, e.gun === 'none' ? 'normal' : e.gun);
  e.recoil = 1; Snd.play('eshoot');
}
function updateEnemy(e, dt) {
  const g = G, d = ENEMIES[e.type];
  e.seenT -= dt; e.shieldOffT -= dt;
  if (e.frozenT > 0) { e.frozenT -= dt; e.moving = false; if (e.frozenT <= 0) e.bubble = false; return; }
  e.fireCd -= dt;
  if (d.healer) healerTick(e, dt);
  if (e.flameWarn > 0) {
    e.flameWarn -= dt; e.moving = false;
    if (Math.random() < 0.5) addPart({ x: e.x + DX[e.dir] * 24 + rand(-5, 5), y: e.y + DY[e.dir] * 24 + rand(-5, 5), size: 3, life: 0.3, color: pick(['#FFE14D', '#FF9A3D']), vx: DX[e.dir] * 60, vy: DY[e.dir] * 60 });
    if (e.flameWarn <= 0) addFlame(e, dirAngle(e.dir), 0, 125, 0.55, 0, 0.8, e.atk);
    return;
  }
  // 不会动的（护盾发生器、小石像）
  if (e.still) {
    e.moving = false;
    if (e.gun !== 'none' && e.fireCd <= 0) {
      const p = nearestPlayer(e);
      if (p) { const a = Math.atan2(p.y - e.y, p.x - e.x); enemyBullet(e, e.x + Math.cos(a) * 24, e.y + Math.sin(a) * 24, a, 'normal'); e.recoil = 1; Snd.play('eshoot'); }
      e.fireCd = rand(d.fire[0], d.fire[1]) * g.eFireMul;
    }
    return;
  }
  if (d.march) e.dir = 2;
  const spd = e.speed * g.eSpeedMul * terrainMul(e) * dt;
  const m = tryMove(e, e.dir, spd);
  e.moving = m > 0.01; e.dist += m;
  checkPortal(e);
  // 挖挖：顶着砖墙一会儿就挖掉
  if (d.dig && m < spd * 0.5) {
    e.digT += dt;
    if (e.digT > 0.6) {
      e.digT = 0;
      const fx = e.x + DX[e.dir] * (e.size / 2 + 10), fy = e.y + DY[e.dir] * (e.size / 2 + 10);
      for (const o of [-12, 0, 12]) {
        const cx = Math.floor((fx + (DX[e.dir] === 0 ? o : 0)) / C), cy = Math.floor((fy + (DY[e.dir] === 0 ? o : 0)) / C);
        if (isSoft(cellAt(cx, cy)) && !g.ringSet.has(cy * GW + cx)) { breakCell(cy * GW + cx); chunks(cx * C + 12, cy * C + 12, THEMES[g.theme].brick[1], 2); }
      }
      Snd.play('brick');
    }
  } else e.digT = 0;
  if (e.gold) {
    e.life -= dt;
    if (Math.random() < 0.3) addPart({ type: 'star', x: e.x + rand(-18, 18), y: e.y + rand(-18, 18), size: 4, life: 0.5, color: '#FFE14D', drag: 2 });
    if (e.life <= 0) { e.dead = true; poof(e.x, e.y, 10, '#FFE14D'); addText(e.x, e.y - 30, '溜走啦~', '#FFE14D', 20); return; }
  }
  if (m < spd * 0.5 && !d.march && !(d.dig && e.digT > 0)) {
    e.blockT += dt;
    if (e.blockT > 0.2) {
      e.blockT = 0;
      if (Math.random() < 0.45 && e.fireCd > 0.3) e.fireCd = 0.05; else chooseDir(e, true);
    }
  } else e.blockT = 0;
  if (d.march) { if (e.fireCd <= 0) { enemyShoot(e); e.fireCd = rand(d.fire[0], d.fire[1]) * g.eFireMul; } if (e.y > MAP_H - 40 || m < spd * 0.2 && e.fireCd > 1) e.dir = 2; return; }
  e.aiT -= dt;
  if (e.aiT <= 0) { e.aiT = rand(1.0, 3.0); chooseDir(e, false); }
  if (e.gun === 'none' || (g.tut && g.tut.step < 5)) return;
  const p = nearestPlayer(e);
  if (e.fireCd > 0 && e.fireCd < 1.2 && inLine(e, p)) e.fireCd = 0;
  if (e.fireCd <= 0) {
    const f = ENEMIES[e.type].fire;
    if (e.gun === 'flame') {
      // 火火：玩家在正前方 3 格内才喷火
      if (p && inLine(e, p) && Math.hypot(p.x - e.x, p.y - e.y) < 150) { e.flameWarn = 0.7; e.seenT = 1.2; e.fireCd = rand(f[0], f[1]) * g.eFireMul; }
      else e.fireCd = 0.4;
      return;
    }
    if (!g.bullets.some(b => b.owner === e)) { enemyShoot(e); e.seenT = 1.2; }
    e.fireCd = rand(f[0], f[1]) * g.eFireMul;
  }
}
// 修修：给附近的敌人修血，看到玩家就跑
function healerTick(e, dt) {
  const g = G;
  e.healT -= dt;
  if (e.healT <= 0) {
    e.healT = 3;
    let n = 0;
    for (const o of g.tanks) {
      if (o === e || o.dead || o.kind !== 'enemy' || o.type === 'boss' || o.hp >= o.maxHp) continue;
      if (Math.hypot(o.x - e.x, o.y - e.y) > 110) continue;
      o.hp++; n++; addText(o.x, o.y - o.size / 2 - 8, '+1', '#5BE37D', 16);
    }
    addPart({ x: e.x, y: e.y, type: 'ring', size: 10, grow: 220, life: 0.45, color: '#5BE37D', drag: 0 });
    if (n) Snd.play('bubble');
  }
  const p = nearestPlayer(e);
  if (p && Math.hypot(p.x - e.x, p.y - e.y) < 160 && e.aiT > 0.4) {
    const dx = e.x - p.x, dy = e.y - p.y;
    const want = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
    if (!probeBlocked(e, want)) { e.dir = want; e.aiT = 0.4; }
  }
}

// ===== 输赢 =====
function win() {
  const g = G;
  if (g.phase !== 'play') return;
  g.phase = 'won'; g.phaseT = 0;
  for (const b of g.bullets) poof(b.x, b.y, 3);
  g.bullets.length = 0; g.waves.length = 0;
  Snd.play('win'); say(g.L.boss ? '打败' + g.bossKeys.map(k => BOSSES[k].name).join('和') + '啦！太棒了！' : g.L.tutorial ? '教学完成！你真棒！' : '太棒了！');
  let st = 3;
  if (g.lostLives > 0) st--;
  if (g.eggHits > 0) st--;
  if (g.mode === 'gold') { const n = g.goldCaught || 0; st = n >= g.L.goal ? 3 : n >= Math.ceil(g.L.goal / 2) ? 2 : 1; }
  g.stars = Math.max(1, st);
  // 敌人冒烟逃跑
  for (const o of g.tanks) if (o.kind === 'enemy' && !o.dead) { o.dead = true; poof(o.x, o.y, 8, '#DDDDDD'); }
  const flying = g.coins.reduce((sum, c) => sum + c.v, 0);
  g.coins.forEach(c => { c.v = 0; });
  g.coinsGot += flying; Meta.addCoins(flying);
  const L = g.L;
  g.reward = L.custom || L.tutorial ? 5 : g.stars * 5 + (L.boss ? 10 : 0);
  if (g.mode === 'gold' && (g.goldCaught || 0) >= L.golds) { g.reward += 20; Meta.unlock('goldRush'); }
  g.trophy = null;
  const firstWin = !L.custom && !L.tutorial && !(save.stars[g.li] > 0);
  if (firstWin && (L.type === 'big' || L.type === 'final') && L.n % 10 === 0) {
    g.reward += 50;
    const hat = WORLDS[L.world].trophy;
    if (!save.owned.hat[hat]) { save.owned.hat[hat] = 1; g.trophy = hat; }
  }
  Meta.addCoins(g.reward);
  if (L.tutorial) { save.tutorialDone = true; Meta.unlock('tutorial'); }
  else if (!L.custom) {
    const before = PLAYER_TANKS.map((t, i) => tankUnlocked(i));
    save.stars[g.li] = Math.max(save.stars[g.li] || 0, g.stars);
    save.skipped[g.li] = false;
    save.lastLevel = g.li;
    fails[g.li] = 0;
    if (g.li === 0) Meta.unlock('win1');
    if (g.stars === 3) Meta.unlock('perfect');
    if (g.players.length > 1) Meta.unlock('duo');
    if (g.diff.id === 'hero') Meta.unlock('hero');
    if (g.bossKeys.length > 1) Meta.unlock('twin');
    if (L.n >= 50 && save.stars[49] > 0) Meta.unlock('world5');
    if (g.mode === 'survive') { Meta.stat('survived'); }
    if (g.mode === 'push') { save.pushWins[L.n] = 1; if (LEVELS.filter(x => x.mode === 'push').every(x => save.pushWins[x.n])) Meta.unlock('pushAll'); }
    if (L.night && g.lostLives === 0) Meta.unlock('nightOwl');
    for (const p of g.players) save.tankWins[PLAYER_TANKS[p.tankIdx].id] = 1;
    if (PLAYER_TANKS.every(t => save.tankWins[t.id])) Meta.unlock('allTanks');
    if (WORLDS.every(w => save.owned.hat[w.trophy])) Meta.unlock('trophy10');
    PLAYER_TANKS.forEach((t, i) => { if (!before[i] && tankUnlocked(i)) { g.newTank = i; Meta.unlock(t.id); } });
    Meta.checkStars();
  }
  persist();
}
function lose(reason) {
  const g = G;
  if (g.phase !== 'play') return;
  g.phase = 'lost'; g.phaseT = 0; g.loseReason = reason;
  Snd.play('lose');
  say(reason === 'egg' ? '哎呀，宝宝蛋破了' : '哎呀，坦克没电啦');
  if (!g.L.custom && !g.L.tutorial) fails[g.li] = (fails[g.li] || 0) + 1;
}
// 连续输 5 次可以先跳过
function skipLevel(li) {
  save.skipped[li] = true; fails[li] = 0;
  persist();
}

// ===== 金币 =====
function dropCoins(x, y, n) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2), s = rand(60, 160);
    G.coins.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: rand(0, 0.15), v: 1 });
  }
}
function updateCoins(dt) {
  const g = G;
  for (const c of g.coins) {
    c.t += dt;
    if (c.t < 0.4) { c.x += c.vx * dt; c.y += c.vy * dt; c.vx *= Math.exp(-4 * dt); c.vy *= Math.exp(-4 * dt); continue; }
    let p = null, bd = 1e9;
    for (const q of g.players) { if (q.dead) continue; const d = Math.hypot(q.x - c.x, q.y - c.y); if (d < bd) { bd = d; p = q; } }
    if (!p) { if (c.t > 6) c.dead = true; continue; }
    const sp = (250 + c.t * 500) * dt;
    if (bd < 14 || bd < sp) {
      c.dead = true; g.coinsGot += c.v; Meta.addCoins(c.v); Snd.play('coin');
    } else { c.x += ((p.x - c.x) / bd) * sp; c.y += ((p.y - c.y) / bd) * sp; }
  }
  g.coins = g.coins.filter(c => !c.dead);
}

// ===== 新地形 =====
function hitCrate(k, dmg, byPlayer) {
  const g = G;
  if (k.dead || k.locked || (g.mode === 'push' && !byPlayer)) return;
  k.hp -= dmg; k.flashT = 0.12;
  chunks(k.x, k.y, '#C98B4A', 3);
  Snd.play('brick');
  if (k.hp <= 0) {
    k.dead = true;
    chunks(k.x, k.y, '#A86A32', 10);
    if (byPlayer && g.mode !== 'push') dropCoins(k.x, k.y, 2);
    g.crates = g.crates.filter(q => !q.dead);
    // 推箱关：打碎的箱子会回到原来的地方
    if (g.mode === 'push') g.crateBack.push({ x: k.ox, y: k.oy, t: 3 });
  }
}
function tileFreeForCrate(x, y, self) {
  const g = G;
  if (x < 24 || y < 24 || x > MAP_W - 24 || y > MAP_H - 24) return false;
  const c0 = (x - 24) / C, r0 = (y - 24) / C;
  for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
    const v = cellAt(c0 + dx, r0 + dy);
    if (v !== EMPTY && v !== GRASS && v !== ICE && v !== WATER && v !== SAND && v !== FLOW && v !== LAVA && v !== GATE_OPEN && v !== BLINK_OFF) return false;
  }
  if (g.cages.some(k => !k.open && k.x === x && k.y === y)) return false;
  if (g.crates.some(k => k !== self && Math.abs(k.tx - x) < 40 && Math.abs(k.ty - y) < 40)) return false;
  if (g.springs.some(k => k.x === x && k.y === y) || g.portals.some(k => k.x === x && k.y === y)) return false;
  if (g.eSpawn.some(([sx, sy]) => sx === x && sy === y) || g.pSpawn.some(sp => sp && sp[0] === x && sp[1] === y)) return false;
  return !g.tanks.some(t => !t.dead && Math.abs(t.x - x) < t.size / 2 + 23 && Math.abs(t.y - y) < t.size / 2 + 23);
}
function tryPushCrate(p) {
  const g = G, fx = p.x + DX[p.dir] * (p.size / 2 + 14), fy = p.y + DY[p.dir] * (p.size / 2 + 14);
  const k = g.crates.find(q => !q.moving && Math.abs(q.x - fx) < 20 && Math.abs(q.y - fy) < 20);
  if (!k) return;
  const tx = k.x + DX[p.dir] * T, ty = k.y + DY[p.dir] * T;
  if (!tileFreeForCrate(tx, ty, k)) return;
  k.tx = tx; k.ty = ty; k.moving = true;
  Snd.play('push'); Meta.stat('pushes');
}
function updateCrates(dt) {
  const g = G;
  for (const k of g.crates) {
    k.flashT -= dt;
    if (!k.moving && !k.locked) {
      // 传送带 / 水流把箱子带走
      const d = g.flow[Math.floor(k.y / C) * GW + Math.floor(k.x / C)];
      if (d >= 0 && cellAt(Math.floor(k.x / C), Math.floor(k.y / C)) === FLOW) {
        const tx = k.x + DX[d] * T, ty = k.y + DY[d] * T;
        if (tileFreeForCrate(tx, ty, k)) { k.tx = tx; k.ty = ty; k.moving = true; k.slow = true; }
      }
    }
    if (!k.moving) continue;
    const dx = k.tx - k.x, dy = k.ty - k.y, d = Math.hypot(dx, dy), sp = (k.slow ? 100 : 170) * dt;
    if (d <= sp) {
      k.x = k.tx; k.y = k.ty; k.moving = false; k.slow = false;
      // 箱子掉进水里（或熔岩里）：把它填上
      const c0 = (k.x - 24) / C, r0 = (k.y - 24) / C;
      let water = false, lava = false;
      for (let yy = 0; yy < 2; yy++) for (let xx = 0; xx < 2; xx++) { const v = cellAt(c0 + xx, r0 + yy); if (v === WATER) water = true; if (v === LAVA) lava = true; }
      if (water || lava) {
        for (let yy = 0; yy < 2; yy++) for (let xx = 0; xx < 2; xx++) g.grid[(r0 + yy) * GW + c0 + xx] = EMPTY;
        k.dead = true; poof(k.x, k.y, 12, lava ? '#FFB37A' : '#BDEBFF'); Snd.play('splash');
        addText(k.x, k.y - 20, lava ? '滋——' : '扑通！', '#FFFFFF', 18);
        if (g.mode === 'push') g.crateBack.push({ x: k.ox, y: k.oy, t: 3 });
      }
      const pad = g.pads.find(q => !q.done && q.x === k.x && q.y === k.y);
      if (pad && !k.dead) {
        pad.done = true; k.locked = true; g.lastProg = g.t;
        burstStars(k.x, k.y, 16, ['#FFE14D', '#FFFFFF']); Snd.play('pup');
        addText(k.x, k.y - 30, '咔嚓！', '#FFE14D', 22);
      }
    } else {
      const nx = k.x + (dx / d) * sp, ny = k.y + (dy / d) * sp;
      const hit = (t, x, y) => Math.abs(t.x - x) < t.size / 2 + 23 && Math.abs(t.y - y) < t.size / 2 + 23;
      if (g.tanks.some(t => !t.dead && hit(t, nx, ny) && !hit(t, k.x, k.y))) continue;
      k.x = nx; k.y = ny;
    }
  }
  g.crates = g.crates.filter(k => !k.dead);
}
function checkPortal(t) {
  const g = G;
  if (!g.portals.length || t.type === 'boss') return;
  let on = -1;
  for (const P of g.portals) if (Math.abs(t.x - P.x) < 10 && Math.abs(t.y - P.y) < 10) on = P.i;
  if (on < 0) { t.onPortal = -1; return; }
  if (on === t.onPortal) return;
  const D = g.portals[g.portals[on].pair];
  const blocked = g.tanks.some(o => o !== t && !o.dead && Math.abs(o.x - D.x) < (o.size + t.size) / 2 && Math.abs(o.y - D.y) < (o.size + t.size) / 2);
  t.onPortal = on;
  if (blocked) return;
  burstStars(t.x, t.y, 8, [g.portals[on].color, '#FFFFFF']);
  t.x = D.x; t.y = D.y; t.onPortal = D.i;
  burstStars(t.x, t.y, 8, [D.color, '#FFFFFF']);
  Snd.play('portal');
  if (t.kind === 'player') Meta.stat('portals');
}
function checkSpring(p) {
  const g = G;
  if (p.jump || !g.springs.length) return;
  const on = g.springs.find(s => Math.abs(p.x - s.x) < 10 && Math.abs(p.y - s.y) < 10);
  if (!on) { p.onSpring = null; return; }
  if (on === p.onSpring || !p.moving) return;
  p.onSpring = on;
  for (const k of [3, 2]) {
    const tx = on.x + DX[p.dir] * T * k, ty = on.y + DY[p.dir] * T * k;
    if (tx < 24 || ty < 24 || tx > MAP_W - 24 || ty > MAP_H - 24) continue;
    if (!freeSpot(tx, ty, p.size)) continue;
    p.jump = { fx: p.x, fy: p.y, tx, ty, t: 0, dur: 0.6 };
    on.t = 0.4;
    Snd.play('jump'); Meta.stat('jumps');
    return;
  }
}
