'use strict';
// ===== Boss AI =====
function fireAngle(e, a, kind) {
  const off = e.size / 2 + 4;
  return enemyBullet(e, e.x + Math.cos(a) * off, e.y + Math.sin(a) * off, a, e.bd && e.bd.fake && kind === 'normal' ? 'slow' : kind);
}
function fan(e, a, n, gap, kind) { for (let i = 0; i < n; i++) fireAngle(e, a + (i - (n - 1) / 2) * gap, kind); }
function summon(e) {
  const g = G;
  const n = g.tanks.filter(t => t.kind === 'enemy' && !t.dead && t.summoned && !t.still).length + g.spawns.filter(s => s.summoned && !s.gold).length;
  if (n >= 3) { fan(e, e.aim, 3, 0.3, 'normal'); return; }
  const types = e.bd.minions;
  let made = 0;
  for (let k = 0; k < 30 && made < 2; k++) {
    const c = Math.floor(rand(0, COLS)), r = Math.floor(rand(0, 6));
    const x = c * T + 24, y = r * T + 24;
    if (Math.hypot(x - e.x, y - e.y) < e.size / 2 + 40 || !freeSpot(x, y, 46)) continue;
    g.spawns.push({ x, y, t: 0, type: types[(e.skillIdx + made) % types.length], carrier: Math.random() < 0.4, summoned: true });
    made++;
  }
  Snd.play('spawn');
  addText(e.x, e.y - e.size / 2 - 20, '小兵们，上！', '#FFE14D', 16);
}
// 打 Boss 的伤害倍数：喘气时更疼，有护盾发生器时很难打疼
function bossDmgMul(e) {
  let m = e.bd.armored ? (e.weakT > 0 ? 1.5 : 0.2) : e.weakT > 0 ? 1.5 : 1;
  if (G.tanks.some(t => t.type === 'gen' && !t.dead && t.genOf === e)) m *= 0.2;
  return m;
}
// 积木人：每掉 10 血掉一块积木，3 秒后飞回去回血
function bossRebuild(e, real) {
  e.lost += real;
  while (e.lost >= 10 && e.hp > 0) {
    e.lost -= 10;
    const a = rand(0, Math.PI * 2), d = e.size / 2 + rand(20, 50);
    G.blocks.push({ x: clamp(e.x + Math.cos(a) * d, 20, MAP_W - 20), y: clamp(e.y + Math.sin(a) * d, 20, MAP_H - 20), hp: 2, t: 3, owner: e, color: pick(['#FF5D5D', '#FFC93C', '#4CD964', '#3EC1F3']), flashT: 0 });
  }
}
// 找一个 Boss 站得下的地方：离 (nx, ny) 不远，离玩家不太近
function findSpot(e, nx, ny, minD, maxD) {
  for (let k = 0; k < 80; k++) {
    const a = rand(0, Math.PI * 2), d = rand(minD, maxD);
    const x = snapC(clamp(nx + Math.cos(a) * d, e.size / 2, MAP_W - e.size / 2)), y = snapC(clamp(ny + Math.sin(a) * d, e.size / 2, MAP_H - e.size / 2 - 40));
    if (!freeSpotFor(e, x, y)) continue;
    if (G.players.some(p => !p.dead && Math.hypot(p.x - x, p.y - y) < minD * 0.8)) continue;
    return [x, y];
  }
  for (let k = 0; k < 60; k++) {
    const x = snapC(rand(e.size / 2, MAP_W - e.size / 2)), y = snapC(rand(e.size / 2, MAP_H * 0.55));
    if (freeSpotFor(e, x, y)) return [x, y];
  }
  return [e.x, e.y];
}
function freeSpotFor(e, x, y) {
  return !boxHitsGrid(x, y, e.size / 2) && !G.tanks.some(t => t !== e && !t.dead && Math.abs(t.x - x) < (t.size + e.size) / 2 + 30 && Math.abs(t.y - y) < (t.size + e.size) / 2 + 30);
}
function explodeBricksOnly(x, y, rad) {
  const g = G;
  const c0 = Math.floor((x - rad) / C), c1 = Math.floor((x + rad) / C), r0 = Math.floor((y - rad) / C), r1 = Math.floor((y + rad) / C);
  for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
    if (isSoft(cellAt(cx, cy)) && Math.hypot(cx * C + 12 - x, cy * C + 12 - y) < rad) { breakCell(cy * GW + cx); chunks(cx * C + 12, cy * C + 12, THEMES[g.theme].brick[1], 2); }
  }
}
// 在 Boss 和玩家中间造一排墙
function bossWall(e, tgt, v) {
  const g = G;
  const mc = Math.floor(((e.x + tgt.x) / 2) / T), mr = Math.floor(((e.y + tgt.y) / 2) / T);
  const vertical = Math.abs(tgt.x - e.x) > Math.abs(tgt.y - e.y);
  let made = 0;
  for (let i = -2; i <= 2; i++) {
    const c = vertical ? mc : mc + i, r = vertical ? mr + i : mr;
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS - 2) continue;
    const x = c * T + 24, y = r * T + 24;
    const cells = tileCells(c, r);
    if (!cells.every(idx => g.grid[idx] === EMPTY || g.grid[idx] === GRASS) || cells.some(idx => g.ringSet.has(idx))) continue;
    if (g.eSpawn.some(([sx, sy]) => sx === x && sy === y) || tileOccupied(x, y)) continue;
    for (const idx of cells) { g.grid[idx] = v; if (v === VINE) g.noRegrow.add(idx); }
    poof(x, y, 6, v === VINE ? '#69B852' : '#FFF0F6');
    made++;
  }
  if (made) { Snd.play('brick'); addText(e.x, e.y - e.size / 2 - 20, v === VINE ? '藤蔓长出来！' : '奶油墙！', '#FFE14D', 18); }
}
function startDash(e, tgt, mode) {
  const dx = tgt.x - e.x, dy = tgt.y - e.y;
  e.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
  e.dashMode = mode || null;
  e.dashWarn = mode && mode.warn || 0.7; Snd.play('warn');
}
function zonesAround(tgts, n, spread, r, delay, dmg, kind, opts) {
  const g = G;
  for (let i = 0; i < n; i++) {
    const t = tgts[i % tgts.length];
    const x = clamp(t.x + (i < tgts.length ? rand(-12, 12) : rand(-spread, spread)), 24, MAP_W - 24);
    const y = clamp(t.y + (i < tgts.length ? rand(-12, 12) : rand(-spread, spread)), 24, MAP_H - 24);
    if (Math.hypot(x - g.egg.x, y - g.egg.y) < 70) continue;
    addZone(x, y, r, delay + i * 0.1, dmg, kind, opts);
  }
}
function livePlayers() { const l = G.players.filter(p => !p.dead); return l.length ? l : [G.egg]; }

function doSkill(e, sk) {
  const g = G, tgt = nearestPlayer(e) || g.egg;
  const a = Math.atan2(tgt.y - e.y, tgt.x - e.x);
  e.aim = a;
  const shot = () => { e.recoil = 1; Snd.play('eshoot'); g.shake = Math.max(g.shake, 2); };
  const say2 = (s, col) => addText(e.x, e.y - e.size / 2 - 22, s, col || '#FFE14D', 20);
  switch (sk) {
    case 'spread': fan(e, a, 3, 0.3, 'normal'); shot(); break;
    case 'spread5': fan(e, a, 5, 0.24, 'normal'); shot(); break;
    case 'big3': fan(e, a, 3, 0.35, 'big'); shot(); break;
    case 'iceSpread': fan(e, a, 5, 0.26, 'ice'); shot(); break;
    case 'bomb3': fan(e, a, 3, 0.4, 'bomb'); shot(); break;
    case 'bounce5': fan(e, a, 5, 0.26, 'bounce'); shot(); break;
    case 'torpedo': fan(e, a, 3, 0.5, 'torpedo'); shot(); say2('鱼雷！'); break;
    case 'bubbleTrap': fireAngle(e, a, 'bubbleT'); shot(); break;
    case 'snowball': fireAngle(e, a, 'snowball'); shot(); say2('大雪球！', '#BFF3FF'); break;
    case 'ring': { const n = e.bd.kind === 'final' ? 16 : 12; for (let i = 0; i < n; i++) fireAngle(e, (i * Math.PI * 2) / n + g.t, 'normal'); shot(); break; }
    case 'spiral': e.spiralT = 2.4; e.spiralCd = 0; e.spiralA = a; break;
    case 'summon': summon(e); break;
    case 'dash': startDash(e, tgt); break;
    case 'slide': startDash(e, tgt, { warn: 0.8, spd: 4.5, dur: 3, stun: 1.5 }); say2('滑——！', '#BFF3FF'); break;
    case 'peck': startDash(e, tgt, { warn: 0.8, spd: 3.6, dur: 3, breakAll: true }); say2('笃笃笃！'); break;
    case 'lance': startDash(e, tgt, { warn: 0.7, spd: 4.2, dur: 3, stun: 1.5, back: true }); say2('冲锋！'); break;
    case 'stomp':
      g.waves.push({ x: e.x, y: e.y, r: e.size / 2, max: e.size / 2 + 190, speed: 240, player: false, dmg: e.atk, hit: new Set() });
      g.shake = 12; Snd.play('stomp'); break;
    case 'teleport': e.teleT = 0.8; e.teleDone = false; Snd.play('tele'); break;
    case 'invis': e.invisT = 3.5; Snd.play('tele'); break;
    case 'shellHide': e.guardT = 2.5; e.guardKind = 'shell'; say2('缩进壳里！'); Snd.play('boing'); break;
    case 'shellSpin': {
      e.guardT = 3; e.guardKind = 'shell'; e.ballT = 3;
      const ang = Math.PI / 4 + Math.floor(Math.random() * 4) * Math.PI / 2;
      e.ballVX = Math.cos(ang); e.ballVY = Math.sin(ang); e.ballSpd = 3.2; say2('转转转！'); break;
    }
    case 'bounceBall': {
      e.ballT = 3.5;
      const ang = Math.PI / 4 + Math.floor(Math.random() * 4) * Math.PI / 2;
      e.ballVX = Math.cos(ang); e.ballVY = Math.sin(ang); e.ballSpd = 3.2; Snd.play('jump'); break;
    }
    case 'windup': e.windT = 1; say2('上发条……'); Snd.play('warn'); break;
    case 'puff': e.guardT = 2; e.guardKind = 'puff'; say2('鼓起来！'); Snd.play('bubble'); break;
    case 'burrow': e.guardT = 2.2; e.guardKind = 'burrow'; e.under = true; poof(e.x, e.y, 14, '#E8C78A'); Snd.play('brick'); break;
    case 'dive': e.guardT = 2.2; e.guardKind = 'dive'; e.under = true; poof(e.x, e.y, 14, '#BDEBFF'); Snd.play('splash'); break;
    case 'fly': case 'jump': {
      const dur = sk === 'fly' ? 1.4 : 0.9;
      const [tx, ty] = findSpot(e, tgt.x, tgt.y, 100, 190);
      e.fly = { fx: e.x, fy: e.y, tx, ty, t: 0, dur, big: sk === 'fly' }; e.under = true;
      addZone(tx, ty, e.size / 2, dur, 0, 'land');
      Snd.play('jump'); break;
    }
    case 'claw':
      if (Math.hypot(tgt.x - e.x, tgt.y - e.y) < e.size / 2 + 90) { e.clawWarn = 0.6; Snd.play('warn'); }
      else { fan(e, a, 3, 0.3, 'normal'); shot(); }
      break;
    case 'iceBreath': addLine(e, a, 0, 760, 34, 0.9, 1.0, 1, { freeze: true, color: '#9EE6FF' }); say2('呼——', '#BFF3FF'); break;
    case 'sunLaser': addLine(e, a, Math.PI, 760, 22, 0.8, 3.0, 2, { color: '#FFE14D' }); break;
    case 'laserSweep': addLine(e, a, 2.1, 760, 24, 0.8, 2.2, 2, { color: '#FF6FD8' }); break;
    case 'flame': addFlame(e, a, 0, 190, 0.7, 0.8, 0.9, 2); Snd.play('warn'); break;
    case 'flameSweep': addFlame(e, a, 1.8, 170, 0.45, 0.8, 1.4, 2); Snd.play('warn'); break;
    case 'meteor': zonesAround(livePlayers(), 6, 200, 34, 1.3, 2, 'meteor', { bricks: true }); say2('陨石来啦！'); break;
    case 'acorn': zonesAround(livePlayers(), 5, 150, 32, 1.2, 2, 'acorn', { bricks: true }); say2('掉橡果啦！'); break;
    case 'juggle': zonesAround([tgt], 3, 90, 32, 1.0, 2, 'ball'); say2('看我抛球！'); break;
    case 'magicCircle': zonesAround(livePlayers().concat([{ x: rand(80, MAP_W - 80), y: rand(80, MAP_H - 120) }]), 3, 60, 56, 1.0, 2, 'magic'); say2('魔法阵！', '#C9A8FF'); break;
    case 'cream': addZone(tgt.x, tgt.y, 56, 1.0, 0, 'cream', { slow: 4 }); say2('奶油来啦！'); break;
    case 'spore': addZone(tgt.x, tgt.y, 60, 1.0, 0, 'spore', { slow: 5 }); break;
    case 'honey': addZone(tgt.x, tgt.y, 64, 1.0, 0, 'honey', { slow: 5 }); say2('蜂蜜！'); break;
    case 'roots': {
      const d = Math.hypot(tgt.x - e.x, tgt.y - e.y), n = Math.min(10, Math.ceil(d / 48) + 1);
      for (let i = 1; i <= n; i++) addZone(e.x + Math.cos(a) * 48 * i, e.y + Math.sin(a) * 48 * i, 26, 0.8 + i * 0.12, 2, 'root');
      break;
    }
    case 'erupt':
      if (g.vents.length) for (const v of g.vents) v.ph = (((3 - g.t) % 5) + 5) % 5;
      zonesAround(livePlayers(), 4, 160, 30, 1.0, 2, 'fire', { fire: true });
      say2('火山爆发！', '#FF5A1F'); break;
    case 'roar':
      for (const b of g.bullets) { b.dead = true; poof(b.x, b.y, 3); }
      for (const p of g.players) {
        if (p.dead) continue;
        const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
        if (d < 260) pushTank(p, (dx / d) * 48, (dy / d) * 48);
      }
      addPart({ x: e.x, y: e.y, type: 'ring', size: e.size / 2, grow: 600, life: 0.4, color: '#FFFFFF', drag: 0 });
      g.shake = 12; Snd.play('stomp'); say2('吼——！', '#FF3B3B'); break;
    case 'vineWall': bossWall(e, tgt, VINE); break;
    case 'cakeWall': bossWall(e, tgt, BRICK); break;
    case 'guards':
      for (const sx of [-80, 80]) {
        const x = snapC(clamp(e.x + sx, 30, MAP_W - 30)), y = snapC(clamp(e.y + e.size / 2 + 30, 30, MAP_H - 120));
        if (freeSpot(x, y, 44)) g.spawns.push({ x, y, t: 0, type: 'statue', carrier: false, summoned: true });
      }
      say2('卫兵出来！'); break;
    case 'mushShield':
      if (!g.orbs.some(o => o.owner === e)) for (let i = 0; i < 3; i++) g.orbs.push({ owner: e, a: (i * Math.PI * 2) / 3, x: e.x, y: e.y, hp: 2, flashT: 0 });
      else fan(e, a, 3, 0.3, 'normal');
      break;
    case 'march': {
      let made = 0;
      for (const c of [2, 5, 7, 9, 12]) {
        const x = c * T + 24, y = 24;
        if (freeSpot(x, y, 40)) { g.spawns.push({ x, y, t: 0, type: 't', carrier: false, summoned: true, dir: 2 }); made++; }
      }
      if (made) say2('齐步走！一二一！');
      break;
    }
    case 'volley': {
      const px = -Math.sin(a), py = Math.cos(a), gap = Math.floor(Math.random() * 6) + 1;
      for (let i = 0; i < 8; i++) {
        if (i === gap) continue;
        const o = (i - 3.5) * 44;
        enemyBullet(e, e.x + px * o + Math.cos(a) * e.size / 2, e.y + py * o + Math.sin(a) * e.size / 2, a, 'normal');
      }
      shot(); say2('排枪！'); break;
    }
    case 'tractor': e.tractorWarn = 0.8; Snd.play('warn'); break;
    case 'pull': e.pullT = 2.5; e.weakT = 2.5; say2('吸——！', '#C77BFF'); Snd.play('tele'); break;
    case 'grabCrate': {
      let k = null, bd = 1e9;
      for (const q of g.crates) if (!q.locked) { const d = Math.hypot(q.x - e.x, q.y - e.y); if (d < bd) { bd = d; k = q; } }
      if (k) { k.dead = true; g.crates = g.crates.filter(q => !q.dead); poof(k.x, k.y, 8); }
      addZone(tgt.x, tgt.y, 40, 1.1, 2, 'crate', { bricks: true, fx: k ? k.x : e.x, fy: k ? k.y : e.y });
      say2('抓住你啦！'); break;
    }
    case 'conveyorFlip': {
      let n = 0;
      for (let i = 0; i < g.flow.length; i++) if (g.flow[i] >= 0) { g.flow[i] = (g.flow[i] + 2) % 4; n++; }
      if (n) { say2('传送带反过来！'); Snd.play('portal'); } else { fan(e, a, 5, 0.24, 'normal'); shot(); }
      break;
    }
    case 'clone': {
      const fakes = g.tanks.filter(t => t.type === 'boss' && !t.dead && t.bd.fake).length;
      for (let i = fakes; i < 2; i++) {
        const [x, y] = findSpot(e, e.x, e.y, 120, 320);
        const f = makeBoss('wizardFake', x, y); f.skillT = 1.5 + i * 0.6;
        g.tanks.push(f); burstStars(x, y, 12, ['#C9A8FF', '#FFFFFF']);
      }
      say2('变变变！', '#C9A8FF'); Snd.play('tele'); break;
    }
    case 'copyWeapon': {
      const w = tgt.weapon || 'normal';
      const m = { big: 'big3', scatter: 'spread5', ice: 'iceSpread', bomb: 'bomb3', homing: 'torpedo', rainbow: 'ring', double: 'spread' }[w];
      say2('学你的！', '#FF4DD2');
      if (w === 'pierce') { fan(e, a, 3, 0.15, 'normal'); shot(); } else doSkill(e, m || 'spread');
      break;
    }
    case 'gens2': spawnGens(e, 2); break;
  }
  if (e.bd.armored) { e.weakT = 3; }
}
// 护盾发生器
function spawnGens(e, n) {
  const g = G, spots = n === 4 ? [[1, 1], [13, 1], [1, 7], [13, 7]] : [[3, 4], [11, 4]];
  for (const [c, r] of spots) {
    let x = c * T + 24, y = r * T + 24;
    for (let k = 0; k < 20 && !freeSpot(x, y, 40); k++) { x = (Math.floor(rand(0, COLS))) * T + 24; y = (1 + Math.floor(rand(0, 7))) * T + 24; }
    const gen = makeEnemy('gen', x, y, false);
    gen.summoned = true; gen.genOf = e;
    g.tanks.push(gen); burstStars(x, y, 10, ['#9AA5FF', '#FFFFFF']);
  }
  addText(e.x, e.y - e.size / 2 - 22, '护盾打开！先打掉发生器', '#9AA5FF', 18);
  say('先打掉护盾发生器！');
}

function updateBoss(e, dt) {
  const g = G, bd = e.bd;
  if (bd.phases) {
    const n = bd.phases.length, k = e.hp / e.maxHp;
    const ph = Math.min(n - 1, Math.floor((1 - k) * n));
    if (ph > e.phase) {
      e.phase = ph; e.skillIdx = 0; e.skillT = 2.2; e.stunT = 2; e.talk = 2;
      g.shake = 14; g.flash = 0.25;
      for (const b of g.bullets) if (!b.player) { b.dead = true; poof(b.x, b.y, 3); }
      burstStars(e.x, e.y, 30, ['#FF3B3B', '#FFE14D', '#FFFFFF'], 300);
      const line = bd.lines ? bd.lines[ph] : ph === 1 ? '我生气啦！' : '我要使出全力了！';
      say(line); addText(e.x, e.y - e.size / 2 - 20, line, '#FF3B3B', 22);
      spawnPup(e.x, e.y + 90, 'heart');
    }
    e.angry = e.phase >= 1;
  } else e.angry = e.hp <= e.maxHp / 2;
  e.weakT -= dt; e.shieldOffT -= dt; e.talk = (e.talk || 0) - dt;
  if (bd.gens && !e.gensDone) { e.gensDone = true; spawnGens(e, bd.gens); }
  // 蘑菇盾、积木块
  for (const o of g.orbs) if (o.owner === e) { o.a += dt * 2.2; o.x = e.x + Math.cos(o.a) * (e.size / 2 + 22); o.y = e.y + Math.sin(o.a) * (e.size / 2 + 22); o.flashT -= dt; }
  for (const o of g.blocks) {
    if (o.owner !== e) continue;
    o.t -= dt; o.flashT -= dt;
    if (o.t <= 0) { o.dead = true; e.hp = Math.min(e.maxHp, e.hp + 3); addText(e.x, e.y - e.size / 2 - 10, '+3', '#5BE37D', 20); Snd.play('pup'); }
  }
  g.blocks = g.blocks.filter(o => !o.dead);
  if (e.invisT > 0) e.invisT -= dt;
  if (e.frozenT > 0) { e.frozenT -= dt; e.moving = false; if (e.frozenT <= 0) e.bubble = false; return; }
  const tgt = nearestPlayer(e) || g.egg;
  const want = Math.atan2(tgt.y - e.y, tgt.x - e.x);
  let d = want - e.aim;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  e.aim += d * Math.min(1, dt * 3);
  if (bd.trail && e.moving) {
    e.trailT -= dt;
    if (e.trailT <= 0) { e.trailT = 0.3; g.fires.push({ x: e.x - DX[e.dir] * e.size * 0.4, y: e.y - DY[e.dir] * e.size * 0.4, t: 0, life: 3 }); }
  }
  if (e.stunT > 0) { e.stunT -= dt; e.moving = false; return; }
  if (e.teleT > 0) {
    e.teleT -= dt;
    if (e.teleT <= 0.4 && !e.teleDone) {
      e.teleDone = true;
      for (let k = 0; k < 40; k++) {
        const x = snapC(rand(e.size / 2, MAP_W - e.size / 2)), y = snapC(rand(e.size / 2, MAP_H * 0.55));
        if (freeSpotFor(e, x, y)) { e.x = x; e.y = y; break; }
      }
    }
    return;
  }
  // 飞起来 / 跳起来：变成影子落到玩家旁边
  if (e.fly) {
    const f = e.fly;
    f.t += dt;
    const k = Math.min(1, f.t / f.dur);
    e.x = f.fx + (f.tx - f.fx) * k; e.y = f.fy + (f.ty - f.fy) * k;
    e.moving = true;
    if (k >= 1) {
      e.fly = null; e.under = false;
      g.waves.push({ x: e.x, y: e.y, r: e.size / 2, max: e.size / 2 + (f.big ? 140 : 90), speed: 260, player: false, dmg: e.atk, hit: new Set() });
      g.shake = 10; Snd.play('stomp'); poof(e.x, e.y + 20, 12);
    }
    return;
  }
  // 冒出来前地面抖一抖
  if (e.popWarn > 0) {
    e.popWarn -= dt;
    if (Math.random() < 0.4) addPart({ x: e.popAt[0] + rand(-20, 20), y: e.popAt[1] + rand(-20, 20), size: 4, life: 0.4, color: e.guardKind === 'dive' ? '#BDEBFF' : '#E8C78A', vy: -40 });
    if (e.popWarn <= 0) {
      e.x = e.popAt[0]; e.y = e.popAt[1]; e.under = false; e.popAt = null;
      const n = e.guardKind === 'dive' ? 10 : 8;
      for (let i = 0; i < n; i++) fireAngle(e, (i * Math.PI * 2) / n + g.t, 'normal');
      poof(e.x, e.y, 16, e.guardKind === 'dive' ? '#BDEBFF' : '#E8C78A'); g.shake = 8; Snd.play('stomp');
      e.guardKind = '';
    }
    return;
  }
  if (e.guardT > 0) {
    e.guardT -= dt; e.moving = false;
    const kind = e.guardKind;
    if (kind === 'burrow' || kind === 'dive') {
      // 在地下 / 水下往玩家那边钻
      const dx = tgt.x - e.x, dy = tgt.y - e.y, dd = Math.hypot(dx, dy) || 1;
      if (dd > 120) { e.x = clamp(e.x + (dx / dd) * e.speed * 1.6 * dt, e.size / 2, MAP_W - e.size / 2); e.y = clamp(e.y + (dy / dd) * e.speed * 1.6 * dt, e.size / 2, MAP_H - e.size / 2 - 40); }
      if (Math.random() < 0.3) addPart({ x: e.x + rand(-20, 20), y: e.y + rand(-10, 10), size: rand(3, 6), life: 0.4, color: kind === 'dive' ? '#BDEBFF' : '#E8C78A' });
      if (e.guardT <= 0) { e.guardT = 0; e.popAt = findSpot(e, e.x, e.y, 0, 120); e.popWarn = 0.8; }
      return;
    }
    if (kind === 'shell' && e.ballT > 0) bossBall(e, dt);
    if (e.guardT <= 0) {
      e.guardKind = ''; e.ballT = 0;
      if (kind === 'shell') { e.weakT = 2; addText(e.x, e.y - e.size / 2 - 16, '喘口气……', '#FFFFFF', 18); }
      if (kind === 'puff') {
        for (let i = 0; i < 12; i++) fireAngle(e, (i * Math.PI * 2) / 12, 'spike');
        e.stunT = 1.5; e.weakT = 1.5; Snd.play('pop');
      }
    }
    return;
  }
  if (e.windT > 0) {
    e.windT -= dt; e.moving = false;
    if (e.windT <= 0) { const dd = Math.floor(Math.random() * 4); e.ballT = 3; e.ballVX = DX[dd]; e.ballVY = DY[dd]; e.ballSpd = 3.6; e.ballAxis = true; }
    return;
  }
  if (e.ballT > 0) {
    bossBall(e, dt);
    e.ballT -= dt;
    if (e.ballT <= 0 && e.ballAxis) { e.ballAxis = false; e.stunT = 2; e.weakT = 2; addText(e.x, e.y - e.size / 2 - 16, '头好晕……', '#FFFFFF', 18); }
    return;
  }
  if (e.clawWarn > 0) {
    e.clawWarn -= dt; e.moving = false;
    if (e.clawWarn <= 0) {
      for (const p of g.players) if (!p.dead && Math.hypot(p.x - e.x, p.y - e.y) < e.size / 2 + p.size / 2 + 34) damagePlayer(p, 2);
      g.shake = 6; Snd.play('stomp');
    }
    return;
  }
  if (e.tractorWarn > 0) { e.tractorWarn -= dt; if (e.tractorWarn <= 0) e.tractorT = 2; }
  if (e.tractorT > 0) {
    e.tractorT -= dt;
    const p = nearestPlayer(e);
    if (p) {
      const dx = e.x - p.x, dy = e.y - p.y, dd = Math.hypot(dx, dy) || 1;
      if (dd > e.size / 2 + p.size / 2 + 20) pushTank(p, (dx / dd) * 75 * dt, (dy / dd) * 75 * dt);
      e.tractorTo = p;
    }
  }
  if (e.pullT > 0) {
    e.pullT -= dt;
    for (const p of g.players) {
      if (p.dead) continue;
      const dx = e.x - p.x, dy = e.y - p.y, dd = Math.hypot(dx, dy) || 1;
      if (dd > e.size / 2 + p.size / 2 + 20) pushTank(p, (dx / dd) * 60 * dt, (dy / dd) * 60 * dt);
    }
    for (const b of g.bullets) {
      const dx = e.x - b.x, dy = e.y - b.y, dd = Math.hypot(dx, dy) || 1;
      if (dd < 320) { b.vx += (dx / dd) * 500 * dt; b.vy += (dy / dd) * 500 * dt; }
    }
    if (Math.random() < 0.6) { const ang = rand(0, Math.PI * 2); addPart({ x: e.x + Math.cos(ang) * 160, y: e.y + Math.sin(ang) * 160, vx: -Math.cos(ang) * 300, vy: -Math.sin(ang) * 300, size: 3, life: 0.5, color: '#C77BFF', drag: 0 }); }
  }
  if (e.dashWarn > 0) {
    e.dashWarn -= dt; e.moving = false;
    // 骑士冲锋前先往后退一点蓄力
    if (e.dashMode && e.dashMode.back) { const dir = e.dir; tryMove(e, (dir + 2) % 4, e.speed * 0.6 * dt); e.dir = dir; }
    if (e.dashWarn <= 0) e.dashT = e.dashMode ? e.dashMode.dur : 1.0;
  } else if (e.dashT > 0) {
    e.dashT -= dt;
    const mode = e.dashMode || {};
    const spd = e.speed * (mode.spd || 3.4) * g.eSpeedMul * dt;
    if (mode.breakAll) explodeBricksOnly(e.x + DX[e.dir] * (e.size / 2 + 8), e.y + DY[e.dir] * (e.size / 2 + 8), e.size * 0.45);
    const m = tryMove(e, e.dir, spd);
    e.moving = true; e.dist += m;
    if (Math.random() < 0.5) addPart({ x: e.x - DX[e.dir] * e.size / 2, y: e.y - DY[e.dir] * e.size / 2, size: rand(5, 9), grow: 12, life: 0.4, color: 'rgba(255,255,255,.8)' });
    if (m < spd * 0.3) {
      e.dashT = 0; g.shake = Math.max(g.shake, 9); Snd.play('stomp');
      // 撞墙把砖块撞碎
      const fx = e.x + DX[e.dir] * (e.size / 2 + 12), fy = e.y + DY[e.dir] * (e.size / 2 + 12);
      explodeBricksOnly(fx, fy, 40);
      if (mode.stun) { e.stunT = mode.stun; e.weakT = mode.stun + 0.3; addText(e.x, e.y - e.size / 2 - 16, '撞晕啦！', '#FFE14D', 20); }
      e.dashMode = null;
    }
  } else if (!bd.still) {
    const spd = e.speed * g.eSpeedMul * (e.angry ? 1.4 : 1) * dt;
    const m = tryMove(e, e.dir, spd);
    e.moving = m > 0.01; e.dist += m;
    if (m < spd * 0.5) { e.blockT += dt; if (e.blockT > 0.3) { e.blockT = 0; chooseDir(e, true); } } else e.blockT = 0;
    e.aiT -= dt;
    if (e.aiT <= 0) { e.aiT = rand(1.5, 3); chooseDir(e, false); }
    if (bd.sidestep && (e.dir === 0 || e.dir === 2)) e.dir = tgt.x > e.x ? 1 : 3;
  }
  if (e.spiralT > 0) {
    e.spiralT -= dt; e.spiralCd -= dt;
    if (e.spiralCd <= 0) {
      e.spiralCd = 0.1; e.spiralA += 0.38;
      const arms = e.bd.kind === 'final' && e.phase >= 2 ? 3 : 2;
      for (let k = 0; k < arms; k++) fireAngle(e, e.spiralA + (k * Math.PI * 2) / arms, 'normal');
      if (Math.random() < 0.3) Snd.play('eshoot');
    }
  }
  e.skillT -= dt;
  const busy = e.dashT > 0 || e.dashWarn > 0 || e.spiralT > 0 || e.tractorT > 0 || e.tractorWarn > 0 || e.pullT > 0;
  if (e.skillT <= 0 && !busy) {
    const list = bd.phases ? bd.phases[e.phase] : bd.skills;
    const sk = list[e.skillIdx % list.length];
    e.skillIdx++;
    doSkill(e, sk);
    e.skillT = (bd.kind === 'mini' ? 2.0 : 1.7) * (e.angry ? 0.72 : 1) * (e.sad ? 0.8 : 1) * (1 + 0.25 * g.assist);
  }
}
// 在场地里弹来弹去（熔岩球球、发条兔、蜗牛转壳）
function bossBall(e, dt) {
  const g = G, h = e.size / 2, sp = e.speed * e.ballSpd * g.eSpeedMul * dt;
  e.moving = true; e.dist += sp;
  const nx = e.x + e.ballVX * sp;
  if (boxHitsGrid(nx, e.y, h) || nx < h || nx > MAP_W - h) {
    if (e.ballAxis) { const dd = Math.random() < 0.5 ? 0 : 2; e.ballVX = 0; e.ballVY = DY[dd]; } else e.ballVX = -e.ballVX;
    g.shake = Math.max(g.shake, 4); Snd.play('boing');
  } else e.x = nx;
  const ny = e.y + e.ballVY * sp;
  if (boxHitsGrid(e.x, ny, h) || ny < h || ny > MAP_H - h) {
    if (e.ballAxis) { const dd = Math.random() < 0.5 ? 1 : 3; e.ballVY = 0; e.ballVX = DX[dd]; } else e.ballVY = -e.ballVY;
    g.shake = Math.max(g.shake, 4); Snd.play('boing');
  } else e.y = ny;
  if (Math.abs(e.ballVX) > Math.abs(e.ballVY)) e.dir = e.ballVX > 0 ? 1 : 3; else e.dir = e.ballVY > 0 ? 2 : 0;
}
