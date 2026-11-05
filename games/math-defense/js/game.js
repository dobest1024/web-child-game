'use strict';
// ===== 游戏引擎：捣蛋怪举着算式走向糖果城堡，点对答案的炮台把它打跑 =====
// 坐标：逻辑高度 H=540，宽度随屏幕比例（640–1400）
// 只有离城堡最近的那只怪物（Boss 关是 Boss 手里当前那道题）能被作答，后面排队的画淡

const H = 540;
const GROUND = 318;        // 怪物脚下
const CASTLE_DOOR = 150;   // 怪物走到这里就咬城堡
const DANGER = 170;        // 离城堡门口这么近就开始预警
const ROW_Y = 392;         // 炮台一排的上沿
const ROW_H = 128;
const ENERGY_MAX = 6;      // 连着答对几题充满彩虹大招
const CASTLE_HP = 5;
const SHOT_TIME = 0.22;
const FONT = '"Arial Rounded MT Bold", "PingFang SC", "Microsoft YaHei", sans-serif';
const PRAISES = { 3: '连对 3 题！', 5: '口算小能手！', 8: '算得飞快！', 12: '数学小天才！' };
const TURRET_COLORS = ['#ff8fab', '#6cc3ef', '#ffc93c', '#7fd6a4'];

// 答完的样子：7 + 5 = 12、3 + 7 = 10、5 > 3
function solved(q) {
  return q.prompt.replace('?', q.answer).replace('□', q.answer).replace('○', q.answer);
}

function createGame(canvas, level, world, opts) {
  const ctx = canvas.getContext('2d');
  const random = opts.random || Math.random;
  const calm = !!opts.calm; // 系统设置了减少动态效果：云不飘、不抖屏
  const assist = Math.min(3, opts.fails || 0);
  const G = {
    L: level, world, assist,
    W: 960, view: [1, 0, 0],
    time: 0, state: 'play', paused: false, endTimer: 0, ended: false,
    castle: { hp: CASTLE_HP, hurt: 0 },
    mons: [], shots: [], popups: [], particles: [],
    progress: 0, goal: level.goal, correctCount: 0,
    wrong: 0, combo: 0, coins: 0, energy: 0, castleHit: false,
    spawnT: 0.8, spawned: 0, retry: [], misses: {}, recent: [],
    kick: [0, 0, 0, 0], rainbowT: 0, hint: !!level.tutorial, typed: '',
    wave: 1, waves: level.boss ? 1 : 3, waveT: 0,
    boss: null,
  };
  const optionCount = Math.max(2, level.options - (assist >= 1 ? 1 : 0));
  const maxOn = Math.max(1, (level.maxOn || 1) - (assist >= 2 ? 1 : 0));
  const gap = (level.gap || 5) * (1 + 0.2 * assist);
  const walkTime = level.walk * (1 + 0.18 * assist);

  // ---------- 出题 ----------
  const pickKind = () => level.kinds[Math.floor(random() * level.kinds.length)];
  const fresh = (q) => ({ ...q, choices: makeChoices(q, optionCount, random), tried: [] });
  function newQuestion(avoid = []) {
    let q;
    for (let i = 0; i < 10; i++) {
      q = makeQuestion(pickKind(), random);
      if (!G.recent.includes(q.prompt) && !avoid.includes(q.prompt)) break;
    }
    G.recent = [q.prompt, ...G.recent].slice(0, 5);
    return q;
  }
  function nextQuestion() {
    const due = G.retry.findIndex((r) => r.due <= G.spawned);
    if (due >= 0) return fresh(G.retry.splice(due, 1)[0].q);
    return fresh(newQuestion());
  }
  // 错过、答错的题过一会儿再考一次（同一道题只排一次队）
  function requeue(q, delay) {
    if (G.boss || G.retry.some((r) => r.q.prompt === q.prompt)) return;
    const { choices, tried, ...base } = q;
    G.retry.push({ q: base, due: G.spawned + delay });
  }
  function miss(q) {
    const m = G.misses[q.prompt] || (G.misses[q.prompt] = { q, n: 0 });
    m.n++;
  }
  function makeChain() {
    const list = [];
    while (list.length < level.boss.chain) list.push(fresh(newQuestion(list.map((q) => q.prompt))));
    return list;
  }

  // ---------- Boss ----------
  const bossStart = () => G.W - 170;
  const bossReach = CASTLE_DOOR + 70;
  if (level.boss) {
    G.boss = {
      kind: level.boss.kind, type: MONSTERS[level.boss.kind], x: 0, hp: level.boss.hp, max: level.boss.hp,
      chain: [], idx: 0, stun: 0, hurt: 0, dead: 0, rageT: 0, raged: false, warned: false, laugh: 0, placed: false,
    };
    G.boss.chain = makeChain();
  }

  // ---------- 当前题 ----------
  function target() {
    if (G.boss) return G.boss.dead ? null : G.boss;
    let best = null;
    for (const m of G.mons) if (m.state === 'walk' && (!best || m.x < best.x)) best = m;
    return best;
  }
  function currentQ() {
    const t = target();
    if (!t) return null;
    return t === G.boss ? t.chain[t.idx] : t.q;
  }
  G.currentQ = currentQ;
  G.target = target;

  // ---------- 炮台布局 ----------
  function rowLayout(n) {
    const rainbowW = 112, gapX = 16, left = 18;
    const right = G.W - 18 - rainbowW - gapX;
    const w = Math.min(170, (right - left - gapX * (n - 1)) / n);
    const total = w * n + gapX * (n - 1);
    const x0 = left + (right - left - total) / 2;
    return {
      turrets: Array.from({ length: n }, (_, i) => ({ x: x0 + i * (w + gapX), y: ROW_Y, w, h: ROW_H })),
      rainbow: { x: G.W - 18 - rainbowW, y: ROW_Y + 8, w: rainbowW, h: ROW_H - 16 },
    };
  }

  // ---------- 输入 ----------
  G.answer = (i) => {
    if (G.paused || G.state !== 'play') return false;
    const tgt = target();
    const q = currentQ();
    if (!q || i < 0 || i >= q.choices.length) return false;
    const choice = q.choices[i];
    if (q.tried.includes(choice)) return false;
    const t = rowLayout(q.choices.length).turrets[i];
    const from = [t.x + t.w / 2, t.y + 6];
    G.kick[i] = 1;
    Sound.shoot();
    if (choice === q.answer) right(tgt, q, from);
    else wrong(tgt, q, choice, from);
    return true;
  };
  G.answerValue = (v) => {
    const q = currentQ();
    if (!q) return false;
    const i = q.choices.findIndex((c) => String(c) === String(v));
    return i >= 0 && G.answer(i);
  };
  G.choiceLabels = () => {
    const q = currentQ();
    return q ? q.choices.map(String) : [];
  };
  G.rainbow = () => {
    if (G.paused || G.state !== 'play' || G.energy < ENERGY_MAX) return false;
    G.energy = 0;
    G.rainbowT = 1.4;
    Sound.rainbow();
    if (G.boss) {
      G.boss.x = bossStart();
      G.boss.stun = 3;
      G.boss.warned = false;
      popup(`${G.boss.type.name}被彩虹吹晕啦！`, G.W / 2, 200, '#8a5cf6', 38);
    } else {
      // 彩虹把屏幕上的怪物全吹跑，变成金币；它们的题以后还会再来（不算答对，也不算错）
      for (const m of G.mons) {
        if (m.state !== 'walk') continue;
        m.state = 'flee';
        m.t = 0;
        G.coins += 1;
        burst(m.x, GROUND - 40, '#ffd84d', 10);
        if (!G.retry.some((r) => r.q.prompt === m.q.prompt)) {
          const { choices, tried, ...base } = m.q;
          G.retry.push({ q: base, due: G.spawned });
        }
      }
      popup('🌈 彩虹大招！', G.W / 2, 200, '#ff6fa5', 44);
    }
    return true;
  };
  // 屏幕坐标 → 逻辑坐标，点到炮台就开炮
  G.tap = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    const [scale, ox, oy] = G.view;
    const x = ((clientX - rect.left) * (canvas.width / rect.width) - ox) / scale;
    const y = ((clientY - rect.top) * (canvas.height / rect.height) - oy) / scale;
    const q = currentQ();
    const L = rowLayout(q ? q.choices.length : optionCount);
    const inside = (r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    if (inside(L.rainbow)) return G.rainbow();
    const i = L.turrets.findIndex(inside);
    return i >= 0 ? G.answer(i) : false;
  };

  function right(tgt, q, from) {
    G.combo++;
    G.correctCount++;
    G.coins += 2;
    G.energy = Math.min(ENERGY_MAX, G.energy + 1);
    G.hint = false;
    if (PRAISES[G.combo]) popup(PRAISES[G.combo], G.W / 2, 160, '#ff6fa5', 44);
    if (G.energy === ENERGY_MAX) popup('🌈 大招充满啦！', G.W - 140, ROW_Y - 30, '#ff6fa5', 26);
    if (tgt === G.boss) {
      const B = G.boss;
      G.shots.push({ x0: from[0], y0: from[1], tx: B.x, ty: GROUND - 150, t: 0, good: true, label: q.answer, combo: G.combo });
      B.idx++;
      B.x = Math.min(bossStart(), B.x + 26);
      if (B.idx >= B.chain.length) {
        B.hp--;
        G.progress = B.max - B.hp;
        B.hurt = 0.8;
        B.x = Math.min(bossStart(), B.x + 90);
        B.warned = false;
        // 别贴着右边：会超出画面，还会压在 HTML 的暂停按钮下；高度留在题目气泡上方
        popup(B.hp > 0 ? '三连击！打中啦！' : '没电啦～', Math.min(B.x, G.W - 270), GROUND - 260, '#8a5cf6', 40);
        Sound.boss();
        if (B.hp <= 0) {
          B.dead = 0.01;
          opts.onDefeat(B.kind);
          finish(true);
        } else {
          B.chain = makeChain();
          B.idx = 0;
        }
      }
    } else {
      tgt.state = 'dying';
      tgt.t = 0;
      G.progress++;
      opts.onDefeat(tgt.q.kind);
      G.shots.push({ x0: from[0], y0: from[1], tx: tgt.x, ty: GROUND - 45, t: 0, good: true, label: q.answer, combo: G.combo });
      if (G.progress >= G.goal) finish(true);
      else if (G.progress >= Math.ceil((G.goal * G.wave) / G.waves)) {
        // 一波打完：歇 2.5 秒，送一个糖果箱，下一波再来
        G.wave++;
        G.waveT = 2.5;
        G.coins += 3;
        popup(`第 ${G.wave} 波来啦！糖果箱 +3🪙`, G.W / 2, 170, '#ff6fa5', 38);
        Sound.coin();
      }
    }
  }
  function wrong(tgt, q, choice, from) {
    q.tried.push(choice);
    G.wrong++;
    G.combo = 0;
    miss(q);
    requeue(q, 3);
    Sound.wrong();
    tgt.laugh = 0.8;
    const ty = tgt === G.boss ? GROUND - 150 : GROUND - 45;
    G.shots.push({ x0: from[0], y0: from[1], tx: tgt.x, ty, t: 0, good: false, label: choice });
  }

  // ---------- 更新 ----------
  function update(dt) {
    G.time += dt;
    G.kick = G.kick.map((k) => Math.max(0, k - dt * 5));
    G.castle.hurt = Math.max(0, G.castle.hurt - dt);
    G.rainbowT = Math.max(0, G.rainbowT - dt);
    updateFx(dt);
    for (const m of G.mons) updateLeaving(m, dt);
    G.mons = G.mons.filter((m) => !m.gone);
    if (G.boss) {
      G.boss.hurt = Math.max(0, G.boss.hurt - dt);
      G.boss.laugh = Math.max(0, G.boss.laugh - dt);
      if (G.boss.dead) G.boss.dead += dt;
    }
    if (G.state !== 'play') {
      G.endTimer -= dt;
      if (G.endTimer <= 0 && !G.ended) {
        G.ended = true;
        opts.onEnd(result());
      }
      return;
    }
    if (G.boss) updateBoss(dt);
    else updateMonsters(dt);
  }

  const monsterSpeed = () => (G.W + 60 - CASTLE_DOOR) / walkTime;

  function updateMonsters(dt) {
    const walking = G.mons.filter((m) => m.state === 'walk');
    const room = Math.min(maxOn, G.goal - G.progress);
    G.waveT = Math.max(0, G.waveT - dt);
    G.spawnT -= dt;
    if (!walking.length) G.spawnT = Math.min(G.spawnT, 0.5); // 屏幕空了马上来下一只，不干等
    if (walking.length < room && G.spawnT <= 0 && G.waveT <= 0) {
      const q = nextQuestion();
      G.mons.push({ q, kind: q.kind, type: MONSTERS[q.kind], x: G.W + 60, state: 'walk', t: 0, laugh: 0, seed: random() * 6, warned: false });
      G.spawned++;
      G.spawnT = gap;
    }
    // 最前面那只（当前题）全速走，排队的慢慢挪；后面的不会超过前面的
    // 这样每道题轮到时离城堡都还有一段路，慢一点的孩子也来得及
    walking.sort((a, b) => a.x - b.x);
    const slow = G.hint ? 0.45 : 1; // 教学关第一题之前大家都走得慢
    let ahead = null;
    for (const m of walking) {
      m.laugh = Math.max(0, m.laugh - dt);
      m.x -= monsterSpeed() * slow * (ahead ? 0.4 : 1) * dt;
      if (ahead) m.x = Math.max(m.x, ahead.x + 120);
      ahead = m;
    }
    const front = walking[0];
    if (front && front.x - CASTLE_DOOR < DANGER && !front.warned) {
      front.warned = true;
      Sound.warn();
    }
    if (front && front.x <= CASTLE_DOOR) bite(front);
  }

  function bite(m) {
    if (G.state !== 'play') return;
    m.state = 'bite';
    m.t = 0;
    G.castle.hp--;
    G.castle.hurt = 0.7;
    G.castleHit = true;
    G.combo = 0;
    miss(m.q);
    requeue(m.q, 2);
    Sound.bite();
    popup('城堡被咬了一口！', CASTLE_DOOR + 40, GROUND - 150, '#e8505b', 30);
    if (G.castle.hp <= 0) finish(false);
  }

  function updateLeaving(m, dt) {
    if (m.state === 'walk') return;
    m.t += dt;
    if (m.state === 'flee') m.x += 260 * dt;
    if ((m.state === 'dying' && m.t > 0.75) || (m.state === 'flee' && m.t > 1.6) || (m.state === 'bite' && m.t > 0.6)) m.gone = true;
  }

  function updateBoss(dt) {
    const B = G.boss;
    if (!B.placed) { B.x = bossStart(); B.placed = true; }
    if (B.dead) return;
    if (B.stun > 0) { B.stun -= dt; return; }
    if (B.rageT > 0) { B.rageT -= dt; return; } // 生气鼓起来的时候不动，先提醒
    if (level.boss.rage && !B.raged && B.hp <= Math.ceil(B.max / 2)) {
      B.raged = true;
      B.rageT = 1.6;
      Sound.warn();
      popup('糖果魔王生气啦！要走快了！', G.W / 2, 220, '#e8505b', 34);
      return;
    }
    const speed = ((bossStart() - bossReach) / walkTime) * (B.raged ? 1.35 : 1);
    B.x -= speed * dt;
    if (B.x - bossReach < DANGER && !B.warned) {
      B.warned = true;
      Sound.warn();
    }
    if (B.x <= bossReach) {
      G.castle.hp--;
      G.castle.hurt = 0.7;
      G.castleHit = true;
      G.combo = 0;
      miss(B.chain[B.idx]);
      Sound.bite();
      popup('嗷呜！城堡被咬了一口！', CASTLE_DOOR + 60, GROUND - 170, '#e8505b', 30);
      B.x = bossStart();
      B.warned = false;
      if (G.castle.hp <= 0) finish(false);
    }
  }

  function updateFx(dt) {
    for (const s of G.shots) {
      s.t += dt / SHOT_TIME;
      if (s.t >= 1 && !s.done) {
        s.done = true;
        if (s.good) {
          Sound.pop(s.combo);
          burst(s.tx, s.ty, '#ffd84d', 14);
          burst(s.tx, s.ty, '#ff8fab', 8);
          popup('+2🪙', s.tx, s.ty - 50, '#f5a623', 26);
        } else {
          burst(s.tx, s.ty, '#bbbbbb', 6);
          popup('不对哦', s.tx, s.ty - 60, '#8d8d8d', 26);
        }
      }
    }
    G.shots = G.shots.filter((s) => s.t < 1.6);
    for (const q of G.popups) { q.t -= dt; q.y -= 36 * dt; }
    G.popups = G.popups.filter((q) => q.t > 0);
    for (const q of G.particles) { q.t -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 500 * dt; }
    G.particles = G.particles.filter((q) => q.t > 0);
  }

  function popup(text, x, y, color = '#ff7a45', size = 32) {
    G.popups.push({ text, x, y, t: 1.3, color, size });
  }
  function burst(x, y, color, n = 12) {
    for (let i = 0; i < n; i++) {
      const a = random() * Math.PI * 2, v = 120 + random() * 220;
      G.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, t: 0.8, color });
    }
  }

  function finish(win) {
    if (G.state !== 'play') return;
    G.state = win ? 'win' : 'fail';
    G.endTimer = win ? (G.boss ? 2 : 1.2) : 1.4;
    if (win) {
      Sound.win();
      for (const m of G.mons) if (m.state === 'walk') { m.state = 'flee'; m.t = 0; }
    }
  }

  function result() {
    const win = G.state === 'win';
    const stars = Math.max(1, 3 - (G.castleHit ? 1 : 0) - (G.wrong > 2 ? 1 : 0));
    const hardest = Object.values(G.misses).sort((a, b) => b.n - a.n)[0];
    return {
      win, stars, wrong: G.wrong, correct: G.correctCount,
      coins: G.coins + (win ? stars * 5 + (G.boss ? 10 : 0) : 0),
      hardest: hardest ? solved(hardest.q) : null,
    };
  }

  // ---------- 绘制 ----------
  const circle = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function text(str, x, y, size, color, align = 'center', stroke = null) {
    ctx.font = `bold ${size}px ${FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 6; ctx.strokeText(str, x, y); }
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  function draw() {
    const W = G.W;
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, world.sky[0]);
    sky.addColorStop(1, world.sky[1]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffe58a';
    circle(W - 90, 70, 38);
    ctx.fillStyle = '#ffffffcc';
    for (let i = 0; i < 5; i++) {
      const x = ((i * 300 - (calm ? 0 : G.time * 12)) % (W + 300) + W + 300) % (W + 300) - 150;
      const y = 60 + (i % 3) * 34, s = 0.7 + (i % 2) * 0.3;
      circle(x, y, 22 * s); circle(x + 24 * s, y - 9 * s, 26 * s); circle(x + 50 * s, y, 20 * s);
    }
    // 糖果山和棒棒糖树
    ctx.fillStyle = world.hill;
    ctx.beginPath();
    ctx.moveTo(0, GROUND);
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, GROUND - 60 - Math.sin(x * 0.008) * 34);
    ctx.lineTo(W, GROUND);
    ctx.fill();
    for (let i = 0; i < 8; i++) lollipop(220 + i * ((W - 260) / 7), GROUND - 4, i);
    if (G.rainbowT > 0) drawRainbow();
    // 小路
    ctx.fillStyle = '#f6d7a7';
    ctx.fillRect(0, GROUND - 6, W, ROW_Y - GROUND);
    ctx.fillStyle = '#ecc28a';
    for (let x = 0; x < W; x += 46) { roundRect(x + 6, GROUND + 18, 30, 14, 6); ctx.fill(); }
    // 炮台区：巧克力色底板
    const choc = ctx.createLinearGradient(0, ROW_Y - 14, 0, H);
    choc.addColorStop(0, '#8d5b3e');
    choc.addColorStop(1, '#6b4029');
    ctx.fillStyle = choc;
    ctx.fillRect(0, ROW_Y - 14, W, H - ROW_Y + 14);
    drawCastle();
    if (G.boss) drawBossUnit();
    // 先画排队的，再画最前面那只，让当前题在最上层
    const front = target();
    for (const m of G.mons) if (m !== front) drawMon(m, false);
    if (front && front !== G.boss) drawMon(front, true);
    drawShots();
    drawRow();
    drawFx();
    drawHud();
  }

  function lollipop(x, y, i) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 3, y - 70, 6, 70);
    ctx.fillStyle = ['#ff8fab', '#7fd6a4', '#ffc93c', '#c792ea'][i % 4];
    circle(x, y - 84, 22);
    ctx.strokeStyle = '#ffffffaa';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y - 84, 12, 0, Math.PI * 1.5);
    ctx.stroke();
  }

  function drawRainbow() {
    const p = 1 - G.rainbowT / 1.4;
    const colors = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa'];
    ctx.save();
    ctx.globalAlpha = Math.min(1, G.rainbowT * 2);
    ctx.lineWidth = 16;
    colors.forEach((c, i) => {
      ctx.strokeStyle = c;
      ctx.beginPath();
      ctx.arc(G.W * (0.15 + p * 0.7), GROUND + 40, 300 - i * 16, Math.PI, Math.PI * 2);
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawCastle() {
    const shake = G.castle.hurt && !calm ? Math.sin(G.time * 70) * 5 : 0;
    ctx.save();
    ctx.translate(shake, 0);
    const base = GROUND;
    ctx.fillStyle = '#ffc2d6';
    ctx.fillRect(18, base - 120, 116, 120);
    ctx.fillStyle = '#ffe0ea';
    ctx.fillRect(8, base - 160, 40, 160);
    ctx.fillRect(104, base - 160, 40, 160);
    ctx.fillStyle = '#ff8fab';
    for (const x of [8, 104]) {
      ctx.beginPath(); ctx.moveTo(x - 6, base - 160); ctx.lineTo(x + 20, base - 205); ctx.lineTo(x + 46, base - 160); ctx.fill();
    }
    ctx.fillStyle = '#b2557a';
    roundRect(58, base - 64, 36, 64, 16); ctx.fill();
    ctx.fillStyle = '#ffd84d';
    for (const [x, y] of [[28, base - 130], [124, base - 130], [76, base - 100]]) circle(x, y, 7);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('糖果城堡', 76, base - 140);
    ctx.restore();
    // 危险预警：最前面的怪物快到门口了
    const t = target();
    const near = t && t.x - (t === G.boss ? bossReach : CASTLE_DOOR) < DANGER;
    if (near && G.state === 'play') {
      text('!', 172, base - 150 + Math.sin(G.time * 18) * 4, 54, '#ff4d4d', 'center', '#ffffff');
    }
  }

  function bubble(str, x, y, active, alpha = 1, big = 30) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const size = active ? big : 20;
    ctx.font = `bold ${size}px ${FONT}`;
    const w = Math.max(70, (ctx.measureText(str).width || str.length * size * 0.6) + 28);
    const h = size + 22;
    x = Math.min(G.W - w / 2 - 6, Math.max(w / 2 + 6, x)); // 刚走进来时气泡别出屏幕
    ctx.fillStyle = active ? '#ffffff' : '#ffffffcc';
    roundRect(x - w / 2, y - h, w, h, 16); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 10, y - 1); ctx.lineTo(x, y + 12); ctx.lineTo(x + 10, y - 1); ctx.fill();
    if (active) { ctx.strokeStyle = '#ff8fab'; ctx.lineWidth = 4; roundRect(x - w / 2, y - h, w, h, 16); ctx.stroke(); }
    text(str, x, y - h / 2, size, '#4a3214');
    ctx.restore();
  }

  function drawMon(m, active) {
    let alpha = active ? 1 : 0.5;
    let s = active ? 1.08 : 0.9;
    let y = GROUND;
    let spin = 0;
    if (m.state === 'dying') {
      if (m.t > SHOT_TIME) { const k = (m.t - SHOT_TIME) / 0.5; s *= Math.max(0.05, 1 - k); spin = k * 6; alpha = Math.max(0, 1 - k); }
    } else if (m.state === 'flee') { y -= m.t * 140; spin = m.t * 4; alpha = Math.max(0, 1 - m.t / 1.6); }
    else if (m.state === 'bite') { s *= 1 + m.t; alpha = Math.max(0, 1 - m.t / 0.6); }
    if (alpha <= 0) return;
    const mood = m.state === 'dying' && m.t > SHOT_TIME ? 'hurt' : m.laugh > 0 ? 'laugh' : 'happy';
    drawMonster(ctx, m.type, m.x, y, s, { t: G.time + m.seed, alpha, mood, spin, walking: m.state === 'walk' });
    if (m.state === 'walk') bubble(m.q.prompt, m.x, GROUND - 92 * s, active, active ? 1 : 0.45);
  }

  function drawBossUnit() {
    const B = G.boss;
    if (!B.placed) return;
    const fall = B.dead ? Math.min(1, B.dead) : 0;
    const shake = B.hurt && !calm ? Math.sin(G.time * 60) * 8 : 0;
    const puff = B.rageT > 0 ? 1 + Math.sin(G.time * 30) * 0.06 + 0.12 : 1;
    const mood = B.dead ? 'hurt' : B.hurt ? 'hurt' : B.laugh ? 'laugh' : B.raged ? 'angry' : 'happy';
    drawMonster(ctx, B.type, B.x + shake, GROUND + fall * 60, 1.75 * puff, { t: G.time, alpha: 1 - fall * 0.8, mood, walking: !B.stun && !B.dead });
    if (B.stun > 0) text('💫', B.x, GROUND - 175 + Math.sin(G.time * 8) * 6, 34, '#ffffff');
    if (B.dead) return;
    // 一串三道题：当前那道亮着，后面的画淡；整串挂在 Boss 头顶，不挡住炮台
    const n = B.chain.length;
    const mid = Math.min(G.W - 250, Math.max(250, B.x));
    B.chain.forEach((q, i) => {
      const bx = mid + (i - (n - 1) / 2) * 165;
      if (i < B.idx) text('✔', bx, GROUND - 222, 34, '#3fae6e', 'center', '#ffffff');
      else bubble(q.prompt, bx, GROUND - 196, i === B.idx, i === B.idx ? 1 : 0.45, 32);
    });
    if (B.rageT > 0 || (B.x - bossReach < DANGER && G.state === 'play')) {
      text('!', B.x - 92, GROUND - 120 + Math.sin(G.time * 24) * 4, 56, '#ff4d4d', 'center', '#ffffff');
    }
  }

  function drawShots() {
    for (const s of G.shots) {
      const t = Math.min(1, s.t);
      let x = s.x0 + (s.tx - s.x0) * t;
      let y = s.y0 + (s.ty - s.y0) * t - Math.sin(t * Math.PI) * 60;
      if (s.t > 1) {
        if (s.good) continue;
        // 答错的炮弹被弹回来，落在地上
        const k = s.t - 1;
        x = s.tx + k * 160;
        y = s.ty - Math.sin(Math.min(1, k * 2) * Math.PI) * 50 + k * 120;
      }
      ctx.fillStyle = s.good ? '#ffef8a' : '#d0d0d0';
      circle(x, y, 22);
      text(String(s.label), x, y + 1, 22, s.good ? '#5a3d0c' : '#777777');
    }
  }

  function drawRow() {
    const q = G.state === 'play' ? currentQ() : null;
    const n = q ? q.choices.length : optionCount;
    const L = rowLayout(n);
    L.turrets.forEach((r, i) => {
      const label = q ? String(q.choices[i]) : '';
      const tried = q && q.tried.includes(q.choices[i]);
      const isAnswer = q && q.choices[i] === q.answer;
      const glow = isAnswer && (q.tried.length > 0 || G.hint);
      const lift = G.kick[i] * 8;
      if (glow) {
        ctx.fillStyle = `rgba(255,236,120,${0.5 + Math.sin(G.time * 8) * 0.3})`;
        roundRect(r.x - 8, r.y - 8 - lift, r.w + 16, r.h + 10, 26); ctx.fill();
      }
      // 炮管
      ctx.save();
      ctx.translate(r.x + r.w / 2, r.y + 18 - lift);
      ctx.rotate(-0.5);
      ctx.fillStyle = tried || !q ? '#9a8f88' : '#4a3a5e';
      roundRect(-12, -46 + G.kick[i] * 10, 24, 52, 10); ctx.fill();
      ctx.restore();
      ctx.fillStyle = tried || !q ? '#bdb5ae' : TURRET_COLORS[i % TURRET_COLORS.length];
      roundRect(r.x, r.y + 10 - lift, r.w, r.h - 18, 22); ctx.fill();
      ctx.fillStyle = '#00000022';
      roundRect(r.x, r.y + r.h - 22 - lift, r.w, 14, 8); ctx.fill();
      if (label) {
        const baseSize = label.length > 1 ? 50 : 56;
        ctx.font = `bold ${baseSize}px ${FONT}`;
        const width = ctx.measureText(label).width || label.length * baseSize * 0.65;
        const size = Math.min(baseSize, baseSize * (r.w - 20) / width);
        text(label, r.x + r.w / 2, r.y + r.h / 2 - lift, size, tried ? '#8d8d8d' : '#3b2f2a', 'center', '#ffffff');
      }
    });
    if (G.hint && q && G.state === 'play') {
      const i = q.choices.indexOf(q.answer);
      const r = L.turrets[i];
      text('👆 点这个！', r.x + r.w / 2, r.y - 34 + Math.sin(G.time * 6) * 6, 26, '#ff6f61', 'center', '#ffffff');
    }
    // 彩虹大招按钮：外圈是能量
    const R = L.rainbow;
    const cx = R.x + R.w / 2, cy = R.y + R.h / 2, rad = Math.min(R.w, R.h) / 2 - 4;
    const full = G.energy >= ENERGY_MAX;
    ctx.fillStyle = full ? `rgba(255,236,120,${0.6 + Math.sin(G.time * 8) * 0.3})` : '#5a3a28';
    circle(cx, cy, rad + 4);
    ctx.fillStyle = full ? '#fff6fb' : '#7a5240';
    circle(cx, cy, rad - 6);
    ctx.strokeStyle = '#ff8fab';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, rad - 1, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * G.energy) / ENERGY_MAX);
    ctx.stroke();
    ctx.globalAlpha = full ? 1 : 0.5;
    text('🌈', cx, cy - 6, 38, '#ffffff');
    ctx.globalAlpha = 1;
    text(full ? '大招！' : `${G.energy}/${ENERGY_MAX}`, cx, cy + 30, 16, full ? '#e8505b' : '#f6d7a7');
    if (G.typed) text(`按了 ${G.typed}…`, cx, R.y - 18, 20, '#ffffff', 'center', '#6b4029');
  }

  function drawFx() {
    for (const q of G.particles) {
      ctx.globalAlpha = Math.min(1, q.t * 1.5);
      ctx.fillStyle = q.color;
      circle(q.x, q.y, 5);
    }
    ctx.globalAlpha = 1;
    for (const q of G.popups) {
      ctx.globalAlpha = Math.min(1, q.t * 2);
      text(q.text, q.x, q.y, q.size, q.color, 'center', '#ffffff');
    }
    ctx.globalAlpha = 1;
  }

  function drawHud() {
    ctx.font = `26px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏰', 16, 32);
    for (let i = 0; i < CASTLE_HP; i++) ctx.fillText(i < G.castle.hp ? '❤️' : '🤍', 52 + i * 28, 32);
    ctx.fillStyle = '#ffffffcc';
    roundRect(14, 54, 236, 38, 19); ctx.fill();
    text(G.boss ? `🪙 ${G.coins}` : `第${G.wave}波 ⭐${G.progress}/${G.goal} 🪙${G.coins}`, 26, 73, 19, '#5b4210', 'left');
    const bw = 300, cx = Math.max(G.W / 2, 262 + bw / 2);
    if (G.boss) {
      // Boss 关：题目在 Boss 头顶一串气泡里，顶上只放血条
      const B = G.boss, w = 300;
      ctx.fillStyle = '#ffffffcc';
      roundRect(cx - w / 2, 14, w, 34, 17); ctx.fill();
      ctx.fillStyle = '#c9b2f0';
      if (B.hp > 0) { roundRect(cx - w / 2 + 4, 18, Math.max(26, (w - 8) * (B.hp / B.max)), 26, 13); ctx.fill(); }
      text(`${B.type.name} ${B.hp}/${B.max} · 第 ${Math.min(B.idx + 1, B.chain.length)}/${B.chain.length} 题`, cx, 31, 17, '#3a2470');
      return;
    }
    // 当前题放大挂在顶上
    const q = G.state === 'play' ? currentQ() : null;
    if (q) {
      ctx.fillStyle = '#ffffffee';
      roundRect(cx - bw / 2, 12, bw, 64, 22); ctx.fill();
      text(q.prompt, cx, 45, 40, '#4a3214');
    }
  }

  // ---------- 循环 ----------
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    G.W = Math.max(640, Math.min(1400, (rect.width / rect.height) * H));
    // 竖屏时整张画面等比缩小、上下居中，不裁掉左右
    const scale = Math.min(canvas.width / G.W, canvas.height / H);
    G.view = [scale, (canvas.width - G.W * scale) / 2, (canvas.height - H * scale) / 2];
  }
  let last = 0, raf = 0;
  function frame(t) {
    const dt = Math.min(0.033, (t - last) / 1000 || 0);
    last = t;
    if (!G.paused) update(dt);
    const [scale, ox, oy] = G.view;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = world.sky[1];
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, G.W, H);
    ctx.clip();
    draw();
    ctx.restore();
    raf = requestAnimationFrame(frame);
  }
  resize();
  if (G.boss) { G.boss.x = bossStart(); G.boss.placed = true; }
  window.addEventListener('resize', resize);
  raf = requestAnimationFrame(frame);
  G.stop = () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  return G;
}

// ===== 怪物画法：游戏和图鉴共用。y 是脚下，s 是缩放（1 ≈ 70px 高）=====
function drawMonster(ctx, type, x, y, s, o = {}) {
  const t = o.t || 0;
  ctx.save();
  ctx.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (o.spin) ctx.rotate(o.spin);
  const bob = o.walking ? Math.abs(Math.sin(t * 7)) * -5 : 0;
  const dark = o.silhouette;
  const fill = (c) => { ctx.fillStyle = dark ? '#b9aeb3' : c; };
  const circle = (cx, cy, r) => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); };
  ctx.strokeStyle = dark ? '#9d9196' : '#3b2f4a';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  // 小脚
  if (!['dragon', 'king'].includes(type.shape)) {
    fill('#3b2f4a');
    const step = o.walking ? Math.sin(t * 14) * 5 : 0;
    ctx.beginPath(); ctx.ellipse(-12 + step, -3, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(12 - step, -3, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.translate(0, bob);
  let eyeY = -40, eyeGap = 11, mouthY = -26;
  fill(type.color);
  switch (type.shape) {
    case 'bean':
      ctx.beginPath(); ctx.ellipse(0, -36, 30, 33, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      break;
    case 'jelly': {
      const w = 1 + Math.sin(t * 5) * 0.06;
      ctx.beginPath();
      ctx.moveTo(-32 * w, -6);
      ctx.bezierCurveTo(-36 * w, -70 / w, 36 * w, -70 / w, 32 * w, -6);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      fill('#ffffff88'); circle(-12, -46, 6);
      break;
    }
    case 'cloud':
      for (const [cx, cy, r] of [[-20, -30, 18], [0, -44, 22], [20, -30, 18], [0, -22, 20]]) { circle(cx, cy, r); }
      ctx.beginPath(); ctx.arc(0, -44, 22, Math.PI, 0); ctx.stroke();
      break;
    case 'seesaw':
      circle(0, -34, 30); ctx.beginPath(); ctx.arc(0, -34, 30, 0, Math.PI * 2); ctx.stroke();
      ctx.save(); ctx.rotate(Math.sin(t * 3) * 0.25);
      fill('#ff8fab'); ctx.fillRect(-34, -76, 68, 7);
      ctx.restore();
      fill('#ff8fab'); ctx.beginPath(); ctx.moveTo(-8, -64); ctx.lineTo(0, -74); ctx.lineTo(8, -64); ctx.fill();
      break;
    case 'cookie':
      ctx.beginPath(); ctx.rect(-32, -66, 64, 60); ctx.fill(); ctx.stroke();
      fill('#8d5b3e');
      // 饼干上是十格：两排各五个
      for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) circle(-24 + c * 12, -60 + r * 10, 3);
      eyeY = -34; mouthY = -20;
      break;
    case 'pop':
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2, r = i % 2 ? 24 : 34;
        ctx.lineTo(Math.cos(a) * r, -36 + Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    case 'donut':
      ctx.lineWidth = 22;
      ctx.strokeStyle = dark ? '#b9aeb3' : type.color;
      ctx.beginPath(); ctx.arc(0, -36, 22, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = dark ? '#9d9196' : '#3b2f4a';
      ctx.beginPath(); ctx.arc(0, -36, 33, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -36, 11, 0, Math.PI * 2); ctx.stroke();
      if (!dark) for (const [cx, cy, c] of [[-20, -50, '#ffd166'], [18, -54, '#7fd6a4'], [24, -24, '#6cc3ef'], [-24, -22, '#ffffff']]) { fill(c); circle(cx, cy, 3); }
      eyeY = -58; eyeGap = 9; mouthY = -14;
      break;
    case 'stack':
      fill('#c9a07a'); ctx.fillRect(-2, -100, 4, 96);
      fill(type.color);
      for (const cy of [-18, -46, -74]) { circle(0, cy, 15); ctx.beginPath(); ctx.arc(0, cy, 15, 0, Math.PI * 2); ctx.stroke(); }
      fill('#ffffff99'); circle(-5, -80, 4);
      eyeY = -48; eyeGap = 7; mouthY = -38;
      break;
    case 'dragon':
      fill(type.color);
      ctx.beginPath(); ctx.ellipse(26, -30, 30, 14, 0.5, 0, Math.PI * 2); ctx.fill(); // 尾巴
      ctx.beginPath(); ctx.ellipse(0, -34, 38, 32, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      fill('#d9ccff'); ctx.beginPath(); ctx.ellipse(-4, -28, 22, 20, 0, 0, Math.PI * 2); ctx.fill();
      fill('#b9a5f5'); // 翅膀
      ctx.beginPath(); ctx.moveTo(10, -60); ctx.lineTo(44, -86); ctx.lineTo(36, -52); ctx.fill();
      fill(type.color);
      circle(-22, -72, 22); ctx.beginPath(); ctx.arc(-22, -72, 22, 0, Math.PI * 2); ctx.stroke();
      fill('#ffd166');
      ctx.beginPath(); ctx.moveTo(-36, -88); ctx.lineTo(-40, -104); ctx.lineTo(-28, -92); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-14, -92); ctx.lineTo(-10, -108); ctx.lineTo(-4, -90); ctx.fill();
      eyeY = -76; eyeGap = 9; mouthY = -62;
      ctx.translate(-22, 0);
      break;
    case 'king':
      fill('#ffd166');
      ctx.beginPath(); ctx.moveTo(-40, -44); ctx.lineTo(-62, -60); ctx.lineTo(-62, -28); ctx.fill();
      ctx.beginPath(); ctx.moveTo(40, -44); ctx.lineTo(62, -60); ctx.lineTo(62, -28); ctx.fill();
      fill(type.color);
      circle(0, -44, 40); ctx.beginPath(); ctx.arc(0, -44, 40, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = dark ? '#9d9196' : '#ffffffaa'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(0, -44, 26, 0.3, 2.4); ctx.stroke();
      ctx.strokeStyle = dark ? '#9d9196' : '#3b2f4a'; ctx.lineWidth = 3;
      fill('#ffd84d');
      ctx.beginPath(); ctx.moveTo(-22, -82); ctx.lineTo(-22, -104); ctx.lineTo(-11, -92); ctx.lineTo(0, -108); ctx.lineTo(11, -92); ctx.lineTo(22, -104); ctx.lineTo(22, -82); ctx.closePath(); ctx.fill(); ctx.stroke();
      eyeY = -50; eyeGap = 14; mouthY = -32;
      break;
    default:
      circle(0, -36, 30);
  }
  // 脸
  if (!dark) {
    const mood = o.mood || 'happy';
    if (mood === 'hurt') {
      ctx.strokeStyle = '#3b2f4a'; ctx.lineWidth = 3;
      for (const sx of [-eyeGap, eyeGap]) {
        ctx.beginPath(); ctx.moveTo(sx - 4, eyeY - 4); ctx.lineTo(sx + 4, eyeY + 4); ctx.moveTo(sx + 4, eyeY - 4); ctx.lineTo(sx - 4, eyeY + 4); ctx.stroke();
      }
    } else {
      fill('#ffffff'); circle(-eyeGap, eyeY, 6); circle(eyeGap, eyeY, 6);
      fill('#2a2a3a'); circle(-eyeGap - 1, eyeY + 1, 3); circle(eyeGap - 1, eyeY + 1, 3);
      if (mood === 'angry') {
        ctx.strokeStyle = '#3b2f4a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-eyeGap - 6, eyeY - 10); ctx.lineTo(-eyeGap + 5, eyeY - 6); ctx.moveTo(eyeGap + 6, eyeY - 10); ctx.lineTo(eyeGap - 5, eyeY - 6); ctx.stroke();
      }
    }
    ctx.strokeStyle = '#3b2f4a'; ctx.lineWidth = 3;
    if (mood === 'laugh') {
      fill('#ff6f8a'); ctx.beginPath(); ctx.arc(0, mouthY, 7, 0, Math.PI); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(0, mouthY - 3, 6, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    }
    fill('#ff9fb2aa'); circle(-eyeGap - 9, eyeY + 9, 4); circle(eyeGap + 9, eyeY + 9, 4);
  }
  ctx.restore();
}
