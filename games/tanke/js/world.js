'use strict';
// ===== 100 关新增：玩法、地形机关、危险区域 =====

// ===== 玩法 =====
function modeInit(g) {
  const L = g.L;
  for (const o of L.objs || []) {
    const x = o.c * T + 24, y = o.r * T + 24;
    if (o.type === 'star') g.gems.push({ x, y, got: false });
    else if (o.type === 'pad') g.pads.push({ x, y, done: false });
    else if (o.type === 'cage') g.cages.push({ x, y, hp: 3, flashT: 0, open: false });
  }
  if (g.mode === 'collect' && !g.gems.length) g.mode = 'kill';
  if (g.mode === 'push' && !g.pads.length) g.mode = 'kill';
  if (g.mode === 'rescue' && !g.cages.length) g.mode = 'kill';
  g.pool = L.pool || L.enemies;
  g.surviveT = g.mode === 'survive' ? L.goal : 0;
  g.goldLeft = g.mode === 'gold' ? L.golds : 0;
  g.goldSpawnT = 2.5; g.goldCaught = 0; g.collected = 0; g.rescued = 0; g.beepS = -1;
}
function enemiesLeft(g) {
  return g.queue.length > 0 || g.spawns.some(s => !s.gold && !s.boss) || g.tanks.some(t => t.kind === 'enemy' && !t.dead && !t.gold && t.type !== 'boss');
}
function modeCheck(g) {
  switch (g.mode) {
    case 'collect': if (g.gems.every(s => s.got)) win(); break;
    case 'rescue': if (g.cages.every(k => k.open)) win(); break;
    case 'push': if (g.pads.every(p => p.done)) win(); break;
    case 'survive': if (g.surviveT <= 0) win(); break;
    case 'gold': if (g.goldLeft <= 0 && !g.spawns.some(s => s.gold) && !g.tanks.some(t => t.gold && !t.dead)) win(); break;
    default:
      if (g.L.boss) {
        // 小 Boss 关：前奏小兵打完，Boss 才登场
        if (g.preWave && !g.bossOn && !enemiesLeft(g)) { g.phase = 'bossIntro'; g.phaseT = 0; g.sfx1 = g.sfx2 = false; }
      } else if (!enemiesLeft(g)) win();
  }
}
function modeUpdate(g, dt) {
  // 收集 / 营救 / 坚持：敌人打完了再补
  const refill = g.mode === 'survive' ? g.queue.length === 0 : (g.mode === 'collect' || g.mode === 'rescue') && !enemiesLeft(g);
  if (refill && g.pool) {
    const add = g.pool.split('').sort(() => Math.random() - 0.5);
    g.queue.push(...add); g.total += add.length;
  }
  if (g.mode === 'survive') {
    g.surviveT -= dt;
    const s = Math.ceil(g.surviveT);
    if (s !== g.beepS && s <= 10 && s > 0) { g.beepS = s; Snd.play('click'); if (s <= 3) say(String(s)); }
  }
  if (g.mode === 'gold' && g.goldLeft > 0) {
    g.goldSpawnT -= dt;
    const alive = g.tanks.filter(t => t.gold && !t.dead).length + g.spawns.filter(s => s.gold).length;
    if (g.goldSpawnT <= 0 && alive < 2) {
      const pt = chooseSpawnPoint();
      if (pt) { g.spawns.push({ x: pt[0], y: pt[1], t: 0, type: 'y', carrier: false, summoned: true, gold: true }); g.goldLeft--; g.goldSpawnT = 3.2; if (g.goldLeft === g.L.golds - 1) say('抓金宝宝啦！'); }
      else g.goldSpawnT = 0.5;
    }
  }
  // 捡星星
  for (const s of g.gems) {
    if (s.got) continue;
    for (const p of g.players) {
      if (p.dead || p.jump || Math.abs(p.x - s.x) > 28 || Math.abs(p.y - s.y) > 28) continue;
      s.got = true; g.collected++; g.lastProg = g.t; Meta.stat('collected');
      burstStars(s.x, s.y, 14, ['#FFE14D', '#FFFFFF', '#FF7AB6']); Snd.play('pup');
      addText(s.x, s.y - 26, g.collected + ' / ' + g.gems.length, '#FFE14D', 22);
      break;
    }
  }
}

// ===== 每帧更新地形机关 =====
function updateWorld(dt) {
  const g = G;
  if (g.phase !== 'play') return;
  modeUpdate(g, dt);
  if (g.lightT > 0) g.lightT -= dt;
  // 水流 / 传送带推坦克
  if (g.flow) {
    const spd = (g.theme === 'factory' ? 110 : 70) * dt;
    for (const t of g.tanks) {
      if (t.dead || t.jump || t.type === 'boss' || t.fly || t.still || t.rocketT > 0) continue;
      const cx = Math.floor(t.x / C), cy = Math.floor(t.y / C);
      if (cellAt(cx, cy) !== FLOW) continue;
      const d = g.flow[cy * GW + cx];
      if (d >= 0) pushTank(t, DX[d] * spd, DY[d] * spd);
    }
  }
  // 喷火口：3 秒安静 → 1 秒发红光 → 1 秒喷火
  for (const v of g.vents) {
    const k = (g.t + v.ph) % 5, cyc = Math.floor((g.t + v.ph) / 5);
    v.state = k < 3 ? 0 : k < 4 ? 1 : 2;
    if (v.state === 1 && v.warned !== cyc) { v.warned = cyc; if (nearAnyPlayer(v.x, v.y, 260)) Snd.play('warn'); }
    if (v.state === 2) {
      if (Math.random() < 0.6) addPart({ x: v.x + rand(-10, 10), y: v.y + rand(-6, 6), vx: rand(-20, 20), vy: rand(-140, -60), size: rand(5, 9), grow: 6, life: 0.4, color: pick(['#FFE14D', '#FF9A3D', '#FF5A1F']) });
      for (const t of g.tanks) {
        if (t.dead || t.jump || t.under || (t.hitVent && t.hitVent === v.id + '_' + cyc)) continue;
        if (Math.abs(t.x - v.x) > 20 + t.size / 2 - 8 || Math.abs(t.y - v.y) > 20 + t.size / 2 - 8) continue;
        t.hitVent = (v.id = v.id || Math.random().toString(36).slice(2)) + '_' + cyc;
        if (t.kind === 'player') damagePlayer(t, 1); else if (t.type !== 'boss') damageEnemy(t, 1);
      }
    }
  }
  // 开关和大门
  for (const s of g.switches) {
    s.cd -= dt;
    const on = g.players.some(p => !p.dead && !p.jump && Math.abs(p.x - s.x) < 22 && Math.abs(p.y - s.y) < 22);
    if (on && !s.on && s.cd <= 0) {
      g.gatesOpen = !g.gatesOpen; s.cd = 1;
      Snd.play('portal'); addText(s.x, s.y - 30, g.gatesOpen ? '大门开啦！' : '大门关上啦', '#FFE14D', 18);
    }
    s.on = on;
  }
  for (const d of g.gates) {
    if (d.open === g.gatesOpen) continue;
    if (g.gatesOpen) { for (const i of d.cells) g.grid[i] = GATE_OPEN; d.open = true; poof(d.x, d.y, 4, '#FFE14D'); }
    else if (!tileOccupied(d.x, d.y)) { for (const i of d.cells) g.grid[i] = GATE; d.open = false; }
  }
  // 机关墙：A、B 两组轮流出现
  const ph = g.t % 8;
  for (const b of g.blinks) {
    const want = b.group === 0 ? ph < 4 : ph >= 4;
    if (want && !b.solid && !tileOccupied(b.x, b.y)) { for (const i of b.cells) g.grid[i] = BLINK; b.solid = true; }
    else if (!want && b.solid) { for (const i of b.cells) g.grid[i] = BLINK_OFF; b.solid = false; }
  }
  // 黑洞：吸子弹，轻轻吸坦克
  for (const h of g.holes) {
    for (const b of g.bullets) {
      const dx = h.x - b.x, dy = h.y - b.y, d = Math.hypot(dx, dy);
      if (d > 80) continue;
      if (d < 12) { b.dead = true; poof(b.x, b.y, 4, '#C9A8FF'); continue; }
      b.vx += (dx / d) * 700 * dt; b.vy += (dy / d) * 700 * dt;
    }
    for (const t of g.tanks) {
      if (t.dead || t.jump || t.type === 'boss' || t.still) continue;
      const dx = h.x - t.x, dy = h.y - t.y, d = Math.hypot(dx, dy);
      if (d < 110 && d > 30) pushTank(t, (dx / d) * 30 * dt, (dy / d) * 30 * dt);
    }
  }
  // 藤蔓长回来
  for (const v of g.regrow) {
    v.t -= dt;
    if (v.t > 0) continue;
    const cx = v.idx % GW, cy = Math.floor(v.idx / GW);
    if (g.grid[v.idx] !== EMPTY || cellOccupied(cx * C + 12, cy * C + 12, 12)) { v.t = 0.5; continue; }
    g.grid[v.idx] = VINE; v.done = true;
    poof(cx * C + 12, cy * C + 12, 3, '#69B852');
  }
  g.regrow = g.regrow.filter(v => !v.done);
  // 推箱关：打碎的箱子回到原处
  for (const k of g.crateBack) {
    k.t -= dt;
    if (k.t > 0) continue;
    if (!tileFreeForCrate(k.x, k.y, null)) { k.t = 0.5; continue; }
    g.crates.push({ x: k.x, y: k.y, tx: k.x, ty: k.y, ox: k.x, oy: k.y, hp: 3, flashT: 0.3, moving: false });
    poof(k.x, k.y, 10); k.done = true; Snd.play('spawn');
  }
  g.crateBack = g.crateBack.filter(k => !k.done);
  // 陨石雨
  if (g.meteorT > 0) {
    g.meteorT -= dt;
    if (g.meteorT <= 0) {
      g.meteorT = rand(12, 18);
      const n = 4 + Math.floor(Math.random() * 3);
      for (let i = 0, k = 0; i < n && k < 40; k++) {
        const p = Math.random() < 0.4 ? pick(g.players.filter(q => !q.dead)) : null;
        const x = p ? p.x + rand(-40, 40) : rand(30, MAP_W - 30), y = p ? p.y + rand(-40, 40) : rand(30, MAP_H - 90);
        if (Math.hypot(x - g.egg.x, y - g.egg.y) < 110) continue;
        if (g.pSpawn.some(s => s && Math.hypot(x - s[0], y - s[1]) < 60)) continue;
        addZone(x, y, 32, 1.3 + i * 0.15, 1, 'meteor', { bricks: true, enemies: true });
        i++;
      }
    }
  }
  updateHazards(dt);
  updateTurrets(dt);
}
function nearAnyPlayer(x, y, r) { return G.players.some(p => !p.dead && Math.hypot(p.x - x, p.y - y) < r); }
// 一个 48 格上有没有坦克或箱子
function tileOccupied(x, y) {
  const g = G;
  if (g.tanks.some(t => !t.dead && Math.abs(t.x - x) < t.size / 2 + 23 && Math.abs(t.y - y) < t.size / 2 + 23)) return true;
  return g.crates.some(k => Math.abs(k.x - x) < 40 && Math.abs(k.y - y) < 40);
}
function cellOccupied(x, y, h) {
  const g = G;
  if (g.tanks.some(t => !t.dead && Math.abs(t.x - x) < t.size / 2 + h && Math.abs(t.y - y) < t.size / 2 + h)) return true;
  if (g.crates.some(k => Math.abs(k.x - x) < 23 + h && Math.abs(k.y - y) < 23 + h)) return true;
  return g.bullets.some(b => Math.abs(b.x - x) < h + b.r && Math.abs(b.y - y) < h + b.r);
}

// ===== 危险区域：落点、光束、喷火、减速区、小火苗 =====
// opts：slow 落地后变减速区几秒、bricks 砸碎砖墙、enemies 也砸敌人、fire 留下小火苗
function addZone(x, y, r, delay, dmg, kind, opts) {
  G.zones.push(Object.assign({ x, y, r, t: 0, delay, dmg, kind }, opts || {}));
}
function addLine(owner, a, sweep, len, w, warn, dur, dmg, opts) {
  G.lines.push(Object.assign({ owner, x: owner.x, y: owner.y, a, sweep, len, w, warn, dur, dmg, t: 0, hit: new Set(), cur: a, reach: len }, opts || {}));
  Snd.play('warn');
}
function addFlame(owner, a, sweep, len, spread, warn, dur, dmg) {
  G.flames.push({ owner, x: owner.x, y: owner.y, a, sweep, len, spread, warn, dur, dmg, t: 0, hit: new Set(), cur: a });
}
function updateHazards(dt) {
  const g = G;
  for (const z of g.zones) {
    z.t += dt;
    if (z.t < z.delay || z.done) continue;
    z.done = true;
    landZone(z);
  }
  g.zones = g.zones.filter(z => !z.done);
  for (const L of g.lines) {
    L.t += dt;
    if (L.owner && !L.owner.dead) { L.x = L.owner.x; L.y = L.owner.y; }
    else if (L.owner && L.owner.dead) L.t = L.warn + L.dur;
    const k = clamp((L.t - L.warn) / L.dur, 0, 1);
    L.cur = L.sweep ? L.a - L.sweep / 2 + L.sweep * k : L.a;
    L.reach = rayReach(L.x, L.y, L.cur, L.len);
    if (L.t < L.warn || L.t > L.warn + L.dur) continue;
    for (const p of g.players) {
      if (p.dead || p.jump || L.hit.has(p)) continue;
      if (distToRay(p.x, p.y, L.x, L.y, L.cur, L.reach) < L.w / 2 + p.size * 0.35) {
        if (damagePlayer(p, L.dmg, { slow: L.freeze })) L.hit.add(p);
      }
    }
  }
  g.lines = g.lines.filter(L => L.t < L.warn + L.dur);
  for (const f of g.flames) {
    f.t += dt;
    const o = f.owner;
    if (o && !o.dead) { f.x = o.x; f.y = o.y; } else f.t = f.warn + f.dur;
    const k = clamp((f.t - f.warn) / f.dur, 0, 1);
    f.cur = f.sweep ? f.a - f.sweep / 2 + f.sweep * k : f.a;
    if (f.t < f.warn || f.t > f.warn + f.dur) continue;
    if (Math.random() < 0.9) {
      const a = f.cur + rand(-f.spread / 2, f.spread / 2), s = rand(0.3, 1) * f.len * 3;
      addPart({ x: f.x + Math.cos(f.cur) * (o ? o.size / 2 : 20), y: f.y + Math.sin(f.cur) * (o ? o.size / 2 : 20), vx: Math.cos(a) * s, vy: Math.sin(a) * s, size: rand(6, 11), grow: 18, life: 0.3, drag: 2, color: pick(['#FFE14D', '#FF9A3D', '#FF5A1F', '#FFFFFF']) });
    }
    for (const p of g.players) {
      if (p.dead || p.jump || f.hit.has(p)) continue;
      const dx = p.x - f.x, dy = p.y - f.y, d = Math.hypot(dx, dy);
      if (d > f.len + (o ? o.size / 2 : 0) + p.size / 2) continue;
      let da = Math.atan2(dy, dx) - f.cur;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      if (Math.abs(da) < f.spread / 2 + 0.25) { if (damagePlayer(p, f.dmg)) f.hit.add(p); }
    }
  }
  g.flames = g.flames.filter(f => f.t < f.warn + f.dur);
  for (const s of g.slows) {
    s.t += dt;
    for (const p of g.players) if (!p.dead && Math.hypot(p.x - s.x, p.y - s.y) < s.r + p.size * 0.3) p.slowT = Math.max(p.slowT, 0.3);
  }
  g.slows = g.slows.filter(s => s.t < s.life);
  for (const f of g.fires) {
    f.t += dt;
    for (const p of g.players) if (!p.dead && !p.jump && Math.abs(p.x - f.x) < 18 + p.size / 2 - 6 && Math.abs(p.y - f.y) < 18 + p.size / 2 - 6) damagePlayer(p, 1);
  }
  g.fires = g.fires.filter(f => f.t < f.life);
}
function landZone(z) {
  const g = G;
  g.shake = Math.max(g.shake, z.kind === 'meteor' ? 8 : 5);
  const cols = { meteor: ['#FF9A3D', '#8C7A6A', '#FFE14D'], cream: ['#FFFFFF', '#FFD1E8'], spore: ['#C9F59E', '#FFFFFF'], honey: ['#FFC93C', '#FFE88A'], magic: ['#C9A8FF', '#FFFFFF', '#FFE14D'] }[z.kind] || ['#FFE14D', '#FF9A3D', '#FFFFFF'];
  for (let i = 0; i < 12; i++) { const a = rand(0, Math.PI * 2), s = rand(40, 160); addPart({ x: z.x, y: z.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, size: rand(4, 8), grow: 8, life: rand(0.3, 0.5), color: pick(cols) }); }
  addPart({ x: z.x, y: z.y, type: 'ring', size: 6, grow: z.r * 4, life: 0.3, color: cols[0], drag: 0 });
  if (z.slow) { g.slows.push({ x: z.x, y: z.y, r: z.r, t: 0, life: z.slow, kind: z.kind }); Snd.play('splash'); }
  else Snd.play(z.kind === 'magic' ? 'tele' : 'boom');
  if (z.bricks) explodeBricksOnly(z.x, z.y, z.r);
  if (z.fire) g.fires.push({ x: z.x, y: z.y, t: 0, life: 3 });
  if (!z.dmg) return;
  for (const t of g.tanks) {
    if (t.dead || t.jump || t.under) continue;
    if (Math.hypot(t.x - z.x, t.y - z.y) > z.r + t.size * 0.35) continue;
    if (t.kind === 'player') damagePlayer(t, z.dmg);
    else if (z.enemies && t.type !== 'boss') damageEnemy(t, z.dmg);
  }
}
// 光束一直照到墙为止
function rayReach(x, y, a, len) {
  const dx = Math.cos(a), dy = Math.sin(a);
  for (let d = 30; d < len; d += 10) {
    const v = cellAt(Math.floor((x + dx * d) / C), Math.floor((y + dy * d) / C));
    if (v === -1 || v === STEEL || isSoft(v) || v === JELLY || v === GATE || v === BLINK || v === EGG) return d;
  }
  return len;
}
function distToRay(px, py, x, y, a, len) {
  const dx = Math.cos(a), dy = Math.sin(a);
  const t = clamp((px - x) * dx + (py - y) * dy, 0, len);
  return Math.hypot(px - (x + dx * t), py - (y + dy * t));
}

// ===== 炮台和小伙伴 =====
function updateTurrets(dt) {
  const g = G;
  for (const u of g.turrets) {
    u.life -= dt; u.cd -= dt; u.bob = (u.bob || 0) + dt;
    let best = null, bd = 400;
    for (const e of g.tanks) if (e.kind === 'enemy' && !e.dead && !e.under) { const d = Math.hypot(e.x - u.x, e.y - u.y); if (d < bd) { bd = d; best = e; } }
    if (!best) continue;
    const a = Math.atan2(best.y - u.y, best.x - u.x);
    u.aim = a;
    if (u.cd > 0) continue;
    u.cd = u.kind === 'friend' ? 1.2 : 0.7;
    const owner = u.owner || g.players[0];
    g.bullets.push({ x: u.x + Math.cos(a) * 18, y: u.y + Math.sin(a) * 18, vx: Math.cos(a) * 400, vy: Math.sin(a) * 400, r: 6, player: true, owner, helper: true, dmg: u.kind === 'friend' ? 1 : 2, kind: 'normal', color: u.kind === 'friend' ? '#FFB3D9' : '#FFE14D' });
    Snd.play('shoot');
  }
  g.turrets = g.turrets.filter(u => u.life > 0);
}
function hitCage(k, dmg) {
  const g = G;
  k.hp -= dmg; k.flashT = 0.15; g.lastProg = g.t;
  chunks(k.x, k.y, '#B0BEC5', 3); Snd.play('steel');
  if (k.hp > 0) return;
  k.open = true; g.rescued++;
  Meta.stat('rescued');
  burstStars(k.x, k.y, 24, ['#FFE14D', '#FF7AB6', '#7FD6FF', '#FFFFFF'], 240);
  Snd.play('pup');
  const name = WORLDS[g.world].friend;
  say(name + '得救啦！');
  addText(k.x, k.y - 34, name + '：谢谢你！', '#FFFFFF', 18);
  g.turrets.push({ x: k.x, y: k.y, life: 1e9, cd: 1, kind: 'friend', world: g.world, aim: -Math.PI / 2 });
}
function hitOrb(o, dmg) {
  o.hp -= dmg; o.flashT = 0.12; Snd.play('boing');
  if (o.hp <= 0) { o.dead = true; poof(o.x, o.y, 8, '#FF6B6B'); G.orbs = G.orbs.filter(q => !q.dead); }
}
function hitBlock(o, dmg) {
  o.hp -= dmg; o.flashT = 0.12; Snd.play('brick');
  if (o.hp <= 0) { o.dead = true; chunks(o.x, o.y, o.color, 8); addText(o.x, o.y - 20, '回不去啦！', '#FFE14D', 16); G.blocks = G.blocks.filter(q => !q.dead); }
}

// ===== 新东西第一次出现时的提示 =====
function collectNewTips(g) {
  const has = new Set();
  for (let i = 0; i < g.grid.length; i++) {
    const v = g.grid[i];
    if (v === ICE) has.add('ice'); else if (v === SAND) has.add('sand'); else if (v === JELLY) has.add('jelly');
    else if (v === FLOW) has.add(g.theme === 'factory' ? 'belt' : 'flow'); else if (v === VINE) has.add('vine');
    else if (v === LAVA) has.add('lava'); else if (v === VENT) has.add('vent'); else if (v === SWITCH) has.add('gate');
    else if (v === HOLE) has.add('hole'); else if (v === BLINK) has.add('blink');
  }
  if (g.springs.length) has.add('spring');
  if (g.portals.length) has.add('portal');
  if (g.L.meteor) has.add('meteor');
  if (g.L.night) has.add('night');
  g.newTips = [...has].filter(k => TERRAIN_TIPS[k] && !save.seen.t[k]);
}
function showNewTips(g) {
  g.newTips.forEach((k, i) => {
    const [name, tip] = TERRAIN_TIPS[k];
    save.seen.t[k] = 1;
    toast('🆕', '新地形：' + name, tip);
    if (i === 0) setTimeout(() => say(tip), 900);
  });
  if (g.mode !== 'kill' && !save.seen.t['mode_' + g.mode]) {
    save.seen.t['mode_' + g.mode] = 1;
    const tip = { collect: '把星星都捡起来就过关', survive: '坚持到时间结束就过关', push: '把箱子推到发光的垫子上', rescue: '打开笼子，救出小伙伴', gold: '抓住金宝宝，跑掉也没关系' }[g.mode];
    if (tip) { toast('🎯', '新玩法', tip); setTimeout(() => say(tip), 300); }
  }
  persist();
}
function meetEnemy(e) {
  const d = ENEMIES[e.type];
  if (!d.tip || save.seen.e[e.type]) return;
  save.seen.e[e.type] = 1; persist();
  toast('🤖', '新敌人：' + d.name, d.tip);
  say('新敌人' + d.name + '，' + d.tip);
  G.texts.push({ x: e.x, y: e.y - 40, s: d.name, color: '#FFE14D', size: 20, t: 0, life: 2.5 });
}
