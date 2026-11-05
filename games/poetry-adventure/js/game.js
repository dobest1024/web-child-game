'use strict';
// ===== 游戏引擎：一关是一串任务（接字雨 / 诗句拼桥 / 飞花令 Boss）=====
// 坐标：逻辑高度 H=540，宽度随屏幕比例（最少 860）；竖屏时整张画面等比缩小居中

const H = 540;
const RAIN_TOP = 150;
const BASKET_Y = 444;
const RAIN_GROUND = 486;
const BANK_Y = 300;
const PRAISES = { 3: '好记性！', 5: '诗词小能手！', 8: '太厉害啦！', 12: '背诗小达人！' };
const FONT = '"Kaiti SC", "STKaiti", "KaiTi", "PingFang SC", serif';
const UI_FONT = '"PingFang SC", "Microsoft YaHei", sans-serif';

function createGame(canvas, level, world, opts) {
  const ctx = canvas.getContext('2d');
  const assist = Math.min(3, opts.fails || 0);
  const hint = level.tutorial || assist >= 1;
  const G = {
    L: level, assist, W: 960, view: [1, 0, 0], time: 0,
    hearts: 3, inv: 0, wrong: 0, lostHeart: false, coins: 0, combo: 0,
    popups: [], particles: [], misses: {},
    taskIndex: -1, task: null, taskWait: 0, card: null,
    state: 'play', endTimer: 0, paused: false, ended: false,
    keys: { left: false, right: false }, pointerX: null,
  };

  const voiceTimers = new Set();
  let stopped = false;
  function laterVoice(callback, delay) {
    const timer = setTimeout(() => {
      voiceTimers.delete(timer);
      if (!stopped && !G.paused && G.state === 'play') callback();
    }, delay);
    voiceTimers.add(timer);
  }
  function stopVoices() {
    voiceTimers.forEach(clearTimeout);
    voiceTimers.clear();
    Sound.stopVoice();
  }
  G.stopVoice = stopVoices;

  const say = (poem, i) => Sound.say(lineAudio(poem, i));
  const sayLength = (poem, i) => Sound.length(lineAudio(poem, i), bare(poem.lines[i]));
  function popup(text, x, y, color = '#ff7a45', size = 32) {
    G.popups.push({ text, x, y, t: 1.3, color, size });
  }
  function burst(x, y, color, n = 12) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 100 + Math.random() * 200;
      G.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 100, t: 0.8, color });
    }
  }
  function praise() {
    G.combo++;
    if (PRAISES[G.combo]) popup(PRAISES[G.combo], G.W / 2, 250, '#ff6fa5', 44);
  }
  function miss(poem) {
    G.wrong++;
    G.combo = 0;
    G.misses[poem.id] = (G.misses[poem.id] || 0) + 1;
    Sound.wrong();
  }
  function hurt() {
    if (G.inv > 0 || G.state !== 'play') return;
    G.hearts--;
    G.inv = 1.2;
    G.lostHeart = true;
    G.combo = 0;
    Sound.hurt();
    if (G.hearts <= 0) finish(false);
  }

  // ---------- 任务切换 ----------
  function nextTask() {
    G.taskIndex++;
    const spec = level.tasks[G.taskIndex];
    if (!spec) return finish(true);
    if (spec.type === 'rain') G.task = startRain(poemById(spec.poem));
    else if (spec.type === 'bridge') G.task = startBridge(poemById(spec.poem));
    else G.task = startBoss(spec);
  }
  // 一首诗完成：得到诗卡，停一下再进下一个任务
  function poemDone(poem) {
    opts.onLearn(poem.id);
    G.coins += 3;
    Sound.win();
    G.card = { poem, t: 2.2 };
    G.taskWait = 2.2;
    G.task.finished = true;
  }

  // ---------- 接字雨 ----------
  const dropCount = Math.max(2, (level.drops || 3) - (assist >= 1 ? 1 : 0));
  const fallSpeed = (level.speed || 120) * (1 - assist * 0.12);
  function startRain(poem) {
    const T = { type: 'rain', poem, queue: poem.lines.map((_, i) => i), line: -1, chars: [], pos: 0, drops: [],
      wait: 0, shadow: 0, glow: 0, mistakes: new Map(), redone: false, lineDone: 0, basketX: G.W / 2, caught: [] };
    rainNextLine(T);
    return T;
  }
  function rainNextLine(T) {
    if (!T.queue.length) {
      // 错得最多的两句，最后再接一次（只重来一轮，不会没完没了）
      if (T.mistakes.size && !T.redone) {
        T.queue = [...T.mistakes].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 2).map((m) => m[0]).sort((a, b) => a - b);
        T.mistakes.clear();
        T.redone = true;
        T.redoTotal = T.queue.length;
        popup('再接一次刚才的句子', G.W / 2, 260, '#3a8fd8', 34);
      } else {
        return poemDone(T.poem);
      }
    }
    T.line = T.queue.shift();
    T.chars = [...bare(T.poem.lines[T.line])];
    T.pos = 0;
    T.drops = [];
    T.caught = [];
    T.shadow = hint ? Infinity : 0.6 + sayLength(T.poem, T.line);
    T.wait = 1.0 + Math.min(1.6, sayLength(T.poem, T.line) * 0.5);
    say(T.poem, T.line);
  }
  function spawnWave(T) {
    const needed = T.chars[T.pos];
    const letters = shuffle([needed, ...rainDistractors(T.poem, needed, dropCount - 1)]);
    const seg = (G.W - 180) / letters.length;
    T.drops = letters.map((c, i) => ({
      c, right: c === needed, state: 'fall', t: 0, v: 0.85 + Math.random() * 0.3,
      x: 90 + seg * i + seg / 2 + (Math.random() - 0.5) * Math.max(0, seg - 140),
      y: RAIN_TOP + 4 + Math.random() * 36,
    }));
  }
  function updateRain(T, dt) {
    if (G.keys.left || G.keys.right) T.basketX += (G.keys.right ? 1 : -1) * 560 * dt;
    else if (G.pointerX !== null) {
      const d = G.pointerX - T.basketX;
      T.basketX += Math.sign(d) * Math.min(Math.abs(d), 1000 * dt);
    }
    T.basketX = Math.max(60, Math.min(G.W - 60, T.basketX));
    T.shadow -= dt;
    T.glow -= dt;
    for (const d of T.drops) d.t += dt;
    T.drops = T.drops.filter((d) => d.state === 'fall' || d.t < 0.4);
    if (T.finished) return;
    if (T.lineDone > 0) {
      T.lineDone -= dt;
      if (T.lineDone <= 0) rainNextLine(T);
      return;
    }
    if (T.wait > 0) {
      T.wait -= dt;
      if (T.wait <= 0) spawnWave(T);
      return;
    }
    // 兜底：场上没有该接的字了，就再下一波
    if (!T.drops.some((d) => d.state === 'fall' && d.right)) { T.wait = 0.5; return; }
    for (const d of T.drops) {
      if (d.state !== 'fall') continue;
      d.y += fallSpeed * d.v * dt;
      // 对的字篮子边上碰到也算接住；错的字要正落进篮子中间才算（路过不罚）
      const reach = d.right ? 70 : 40;
      if (d.y >= BASKET_Y - 38 && d.y <= BASKET_Y + 14 && Math.abs(d.x - T.basketX) < reach) {
        if (d.right) catchRight(T, d);
        else {
          d.state = 'bad'; d.t = 0;
          burst(d.x, d.y, '#b9b2a6', 10);
          popup('不是这个字哦', d.x, d.y - 60, '#e8505b', 28);
          miss(T.poem);
          T.mistakes.set(T.line, (T.mistakes.get(T.line) || 0) + 1);
          T.glow = 1.8;
          if (!level.tutorial) hurt(); // 教学关接错不扣心
        }
      } else if (d.y >= RAIN_GROUND) {
        d.state = 'gone'; d.t = 0;
        if (d.right) {
          // 没接住不扣心：提示一下，再下一波
          popup('没接住，再来！', d.x, RAIN_GROUND - 70, '#3a8fd8', 28);
          T.mistakes.set(T.line, (T.mistakes.get(T.line) || 0) + 1);
          T.glow = 1.8;
          G.combo = 0;
          for (const o of T.drops) if (o.state === 'fall') { o.state = 'poof'; o.t = 0; }
          T.wait = 0.7;
        }
      }
    }
  }
  function catchRight(T, d) {
    d.state = 'got'; d.t = 0;
    for (const o of T.drops) if (o.state === 'fall') { o.state = 'poof'; o.t = 0; }
    T.caught.push({ c: d.c, x: d.x, y: d.y, t: 0 });
    T.pos++;
    G.coins++;
    Sound.right();
    burst(d.x, d.y, '#ffd84d', 14);
    praise();
    if (T.pos >= T.chars.length) {
      Sound.line();
      // 接完一句回一颗心：乱接会输，偶尔失手扛得住
      if (G.hearts < 3) { G.hearts++; popup('❤️ +1', 110, 70, '#e8505b', 30); }
      laterVoice(() => say(T.poem, T.line), 250);
      T.lineDone = Math.max(1.2, sayLength(T.poem, T.line) + 0.6);
    } else {
      T.wait = 0.35;
    }
  }

  // ---------- 诗句拼桥 ----------
  function startBridge(poem) {
    let order = shuffle(poem.lines.map((_, i) => i));
    if (order.every((v, i) => v === i)) order = [...order.slice(1), order[0]];
    const T = { type: 'bridge', poem, order, placed: 0, cards: order.map((line) => ({ line, placed: false, shake: 0, fly: 1 })),
      walkerX: G.W * 0.16 - 50, idle: 0, glow: 0, crossing: false };
    laterVoice(() => say(poem, 0), 400);
    return T;
  }
  const bankL = () => G.W * 0.16;
  const bankR = () => G.W * 0.84;
  const slotW = (T) => (bankR() - bankL()) / T.poem.lines.length;
  const slotX = (T, i) => bankL() + slotW(T) * (i + 0.5);
  function cardRects(T) {
    const rects = [];
    const maxW = G.W - 80;
    // 最多排两行，七句的《江南》在竖屏也能完整显示。
    const columns = Math.ceil(T.cards.length / 2);
    const cardMaxW = (maxW - (columns - 1) * 14) / columns;
    let row = [], rowW = 0;
    const rows = [];
    for (const c of T.cards) {
      const w = Math.min(bare(T.poem.lines[c.line]).length * 30 + 44, cardMaxW);
      if (row.length && rowW + w + 14 > maxW) { rows.push([row, rowW]); row = []; rowW = 0; }
      row.push([c, w]);
      rowW += w + (row.length > 1 ? 14 : 0);
    }
    rows.push([row, rowW]);
    const top = rows.length > 1 ? 396 : 430;
    rows.forEach(([items, width], r) => {
      let x = (G.W - width) / 2;
      for (const [c, w] of items) {
        rects.push({ c, x, y: top + r * 68, w, h: 56 });
        x += w + 14;
      }
    });
    return rects;
  }
  function chooseCard(T, c) {
    if (c.placed || T.crossing || T.finished) return;
    T.idle = 0;
    if (c.line === T.placed) {
      c.placed = true;
      c.fly = 0;
      c.from = cardRects(T).find((r) => r.c === c);
      T.placed++;
      G.coins++;
      Sound.plank();
      say(T.poem, c.line);
      praise();
      if (T.placed === T.poem.lines.length) {
        T.crossing = true;
        Sound.line();
      }
    } else {
      c.shake = 0.45;
      miss(T.poem);
      T.glow = 2.4;
      popup('不对哦，听一听下一句', G.W / 2, 380, '#e8505b', 26);
      say(T.poem, T.placed);
    }
  }
  function updateBridge(T, dt) {
    for (const c of T.cards) { c.shake = Math.max(0, c.shake - dt); c.fly = Math.min(1, c.fly + dt / 0.35); }
    T.glow -= dt;
    if (T.finished) return;
    T.idle += dt;
    if (T.idle > (assist >= 1 ? 4 : 8)) { T.glow = 2; T.idle = 0; }
    const target = T.crossing ? bankR() + 60 : T.placed ? slotX(T, T.placed - 1) : bankL() - 50;
    const d = target - T.walkerX;
    T.walkerX += Math.sign(d) * Math.min(Math.abs(d), 170 * dt);
    if (T.crossing && Math.abs(d) < 1) poemDone(T.poem);
  }

  // ---------- 飞花令 Boss ----------
  function startBoss(spec) {
    const pairs = linePairs(spec.poems.map(poemById));
    return { type: 'boss', poems: spec.poems.map(poemById), pairs, bag: [], retry: [], asked: 0, q: null, wait: 1.4,
      hp: level.boss.hp, max: level.boss.hp, hurt: 0, dead: 0, shot: null, attack: null };
  }
  function nextQuestion(B) {
    const due = B.retry.findIndex((r) => r.due <= B.asked);
    let pair;
    if (due >= 0) pair = B.retry.splice(due, 1)[0].pair;
    else {
      if (!B.bag.length) B.bag = shuffle(B.pairs);
      pair = B.bag.shift();
    }
    B.asked++;
    B.q = { pair, options: bossOptions(pair, 3, Math.random, B.poems).map((text) => ({ text, state: 'idle' })), t: 0, T: level.boss.time + assist * 4, done: false, warned: false };
    say(pair.poem, pair.i);
  }
  function requeue(B, pair) {
    if (!B.retry.some((r) => r.pair === pair)) B.retry.push({ pair, due: B.asked + 2 });
  }
  function optionRects() {
    const w = Math.min(300, (G.W - 120) / 3), gap = 24;
    const x0 = (G.W - (w * 3 + gap * 2)) / 2;
    return [0, 1, 2].map((i) => ({ x: x0 + i * (w + gap), y: 420, w, h: 80 }));
  }
  function chooseOption(B, i) {
    const q = B.q;
    if (!q || q.done || B.dead || !q.options[i] || q.options[i].state !== 'idle') return;
    const o = q.options[i];
    if (o.text === bare(q.pair.down)) {
      o.state = 'right';
      q.done = true;
      G.coins += 2;
      Sound.right();
      say(q.pair.poem, q.pair.i + 1);
      praise();
      const r = optionRects()[i];
      B.shot = { x0: r.x + r.w / 2, y0: r.y, t: 0 };
    } else {
      o.state = 'wrong';
      miss(q.pair.poem);
      requeue(B, q.pair);
      popup('嘿嘿，不对～', G.W - 200, 110, '#8a5cf6', 30);
    }
  }
  function updateBoss(B, dt) {
    B.hurt = Math.max(0, B.hurt - dt);
    if (B.dead) { B.dead += dt; return; }
    if (G.state !== 'play') return; // 输了就不再出题
    if (B.shot) {
      B.shot.t += dt / 0.45;
      if (B.shot.t >= 1) {
        B.shot = null;
        B.hp--;
        B.hurt = 0.5;
        Sound.boss();
        burst(G.W - 200, 230, '#b98cff', 20);
        popup(B.hp > 0 ? '打中啦！' : '认输啦～', G.W - 200, 120, '#8a5cf6', 38);
        if (B.hp <= 0) { B.dead = 0.01; finish(true); return; }
        B.q = null;
        B.wait = 1.0;
      }
      return;
    }
    if (B.attack) {
      B.attack.t += dt / 0.55;
      if (B.attack.t >= 1) {
        B.attack = null;
        B.q = null;
        hurt();
        popup('被打中了！下一题加油', 200, 260, '#e8505b', 28);
        B.wait = 1.2;
      }
      return;
    }
    if (B.wait > 0) {
      B.wait -= dt;
      if (B.wait <= 0) nextQuestion(B);
      return;
    }
    const q = B.q;
    if (!q || q.done) return;
    q.t += dt;
    if (!q.warned && q.T - q.t < 2.2) { q.warned = true; Sound.warn(); }
    // 蓄力满了：Boss 出招，这题稍后再来
    if (q.t >= q.T) {
      q.done = true;
      G.combo = 0;
      requeue(B, q.pair);
      B.attack = { t: 0 };
    }
  }

  // ---------- 输入 ----------
  G.toLogical = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / rect.width;
    const [scale, ox, oy] = G.view;
    return [((clientX - rect.left) * dpr - ox) / scale, ((clientY - rect.top) * dpr - oy) / scale];
  };
  const inside = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  G.pointerDown = (x, y) => {
    if (G.paused || G.state !== 'play' || !G.task) return;
    const T = G.task;
    if (T.type === 'rain') G.pointerX = x;
    else if (T.type === 'bridge') {
      const hit = cardRects(T).find((r) => !r.c.placed && inside(x, y, r));
      if (hit) chooseCard(T, hit.c);
    } else {
      const i = optionRects().findIndex((r) => inside(x, y, r));
      if (i >= 0) chooseOption(T, i);
    }
  };
  G.pointerMove = (x) => { if (G.task && G.task.type === 'rain' && G.pointerX !== null) G.pointerX = x; };
  G.pointerUp = () => { G.pointerX = null; };
  G.key = (code, down) => {
    if (code === 'ArrowLeft' || code === 'KeyA') G.keys.left = down;
    else if (code === 'ArrowRight' || code === 'KeyD') G.keys.right = down;
    else if (down && /^Digit[1-9]$/.test(code) && G.task && !G.paused && G.state === 'play') {
      const i = Number(code.slice(5)) - 1;
      if (G.task.type === 'bridge') {
        const c = G.task.cards[i];
        if (c) chooseCard(G.task, c);
      } else if (G.task.type === 'boss') chooseOption(G.task, i);
    }
  };
  G.releaseAll = () => { G.keys.left = G.keys.right = false; G.pointerX = null; };
  G.replay = () => {
    const T = G.task;
    if (!T) return;
    if (T.type === 'rain' && T.line >= 0) { say(T.poem, T.line); T.shadow = Math.max(T.shadow, 2); }
    else if (T.type === 'bridge') say(T.poem, Math.min(T.placed, T.poem.lines.length - 1));
    else if (T.q) say(T.q.pair.poem, T.q.pair.i);
  };

  // ---------- 更新 ----------
  function update(dt) {
    G.time += dt;
    G.inv = Math.max(0, G.inv - dt);
    updateFx(dt);
    if (G.card) { G.card.t -= dt; if (G.card.t <= 0) G.card = null; }
    if (G.state !== 'play') {
      if (G.task && G.task.type === 'boss') updateBoss(G.task, dt);
      G.endTimer -= dt;
      if (G.endTimer <= 0 && !G.ended) {
        G.ended = true;
        opts.onEnd(result());
      }
      return;
    }
    if (G.taskWait > 0) {
      G.taskWait -= dt;
      if (G.taskWait <= 0) nextTask();
    }
    if (!G.task) return;
    if (G.task.type === 'rain') updateRain(G.task, dt);
    else if (G.task.type === 'bridge') updateBridge(G.task, dt);
    else updateBoss(G.task, dt);
  }
  function updateFx(dt) {
    for (const q of G.popups) { q.t -= dt; q.y -= 36 * dt; }
    G.popups = G.popups.filter((q) => q.t > 0);
    for (const q of G.particles) { q.t -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 480 * dt; }
    G.particles = G.particles.filter((q) => q.t > 0);
  }
  function finish(win) {
    if (G.state !== 'play') return;
    G.state = win ? 'win' : 'fail';
    G.endTimer = win ? (level.boss ? 1.8 : 1.0) : 1.3;
    if (win) Sound.win();
    G.releaseAll();
  }
  function result() {
    const stars = Math.max(1, 3 - (G.lostHeart ? 1 : 0) - (G.wrong > 2 ? 1 : 0));
    const hardest = Object.entries(G.misses).sort((a, b) => b[1] - a[1])[0];
    return {
      win: G.state === 'win', stars,
      coins: G.coins + (G.state === 'win' ? stars * 5 + (level.boss ? 10 : 0) : 0),
      wrong: G.wrong, hardest: hardest && hardest[0],
    };
  }

  // ---------- 绘制工具 ----------
  function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function text(str, x, y, size, color, font = FONT, align = 'center') {
    ctx.font = `bold ${size}px ${font}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }
  function cloud(x, y, s) {
    circle(x, y, 24 * s); circle(x + 26 * s, y - 10 * s, 28 * s); circle(x + 54 * s, y, 22 * s);
    ctx.fillRect(x, y, 54 * s, 20 * s);
  }
  function sky(top, bottom) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, G.W, H);
    ctx.fillStyle = '#ffffffb0';
    for (let i = 0; i < 5; i++) {
      const x = ((i * 260 + G.time * 12) % (G.W + 200)) - 100;
      cloud(x, 60 + (i % 3) * 34, 0.7 + (i % 2) * 0.3);
    }
  }
  function grass(y) {
    ctx.fillStyle = '#93d27f';
    ctx.fillRect(0, y, G.W, H - y);
    ctx.fillStyle = '#7cc56b';
    for (let x = 0; x < G.W; x += 34) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 8, y - 12); ctx.lineTo(x + 16, y); ctx.fill();
    }
  }
  // 小鸡：接字雨里提着篮子，拼桥和 Boss 关里当主角
  function chick(x, y, s = 1, flip = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flip ? -s : s, s);
    ctx.fillStyle = '#ffd84d';
    ctx.strokeStyle = '#8a5a1a';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, -30, 30, 28, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -66, 20, 19, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2a2a3a';
    circle(-7, -70, 3.2); circle(7, -70, 3.2);
    ctx.fillStyle = '#ff9a3c';
    ctx.beginPath(); ctx.moveTo(-5, -63); ctx.lineTo(5, -63); ctx.lineTo(0, -56); ctx.fill();
    ctx.fillStyle = '#ffb3a7';
    circle(-13, -62, 4); circle(13, -62, 4);
    ctx.fillStyle = '#ff7a45';
    ctx.beginPath(); ctx.moveTo(-4, -86); ctx.lineTo(0, -96); ctx.lineTo(4, -86); ctx.fill();
    ctx.restore();
  }
  function duck(x, y) {
    const bob = Math.sin(G.time * 10) * 2;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.fillStyle = '#fff3b0';
    ctx.strokeStyle = '#8a6a2a';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, -20, 26, 18, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(16, -44, 14, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2a2a3a';
    circle(20, -47, 2.8);
    ctx.fillStyle = '#ff9a3c';
    ctx.beginPath(); ctx.ellipse(32, -42, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ---------- 各玩法绘制 ----------
  function drawLinePanel(poem, lineText, filled, opts2) {
    const chars = [...bare(lineText)];
    const size = chars.length > 5 ? 52 : 58;
    const box = size + 10;
    const w = chars.length * box;
    const x0 = (G.W - w) / 2;
    ctx.fillStyle = '#fffaf0e8';
    roundRect(x0 - 24, 64, w + 48, box + 36, 22); ctx.fill();
    text(`《${poem.title}》 ${poem.author}`, G.W / 2, 50, 22, '#7a5a3a', UI_FONT);
    chars.forEach((c, i) => {
      const x = x0 + i * box + box / 2, y = 82 + box / 2;
      const next = i === filled;
      ctx.strokeStyle = next ? '#ff9f1c' : '#e2cfa8';
      ctx.lineWidth = next ? 4 : 2;
      roundRect(x - box / 2 + 4, y - box / 2 + 4, box - 8, box - 8, 10); ctx.stroke();
      if (i < filled) text(c, x, y + 2, size, '#3b2a1a');
      else if (opts2.shadow || (next && opts2.glow)) text(c, x, y + 2, size, next && opts2.glow ? '#ffb347aa' : '#c9b89a66');
    });
  }
  function drawRain(T) {
    sky(world.sky[0], world.sky[1]);
    grass(RAIN_GROUND);
    if (T.line >= 0) drawLinePanel(T.poem, T.poem.lines[T.line], T.pos, { shadow: T.shadow > 0, glow: T.glow > 0 });
    const progress = T.redone ? `复习 ${T.redoTotal - T.queue.length}/${T.redoTotal}` : `第 ${T.poem.lines.length - T.queue.length}/${T.poem.lines.length} 句`;
    if (T.line >= 0) text(`${T.poem.icon} ${progress}`, G.W - 24, 160, 20, '#6b5a40', UI_FONT, 'right');
    // 篮子和小鸡
    const bx = T.basketX;
    chick(bx, BASKET_Y + 4, 0.9);
    ctx.fillStyle = '#c98a4a';
    ctx.strokeStyle = '#7a4f24';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx - 58, BASKET_Y - 26); ctx.lineTo(bx + 58, BASKET_Y - 26); ctx.lineTo(bx + 44, BASKET_Y + 10); ctx.lineTo(bx - 44, BASKET_Y + 10);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#a8703a';
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(bx + i * 20, BASKET_Y - 24); ctx.lineTo(bx + i * 16, BASKET_Y + 8); ctx.stroke(); }
    for (const d of T.drops) {
      const fade = d.state === 'fall' ? 1 : Math.max(0, 1 - d.t / 0.4);
      if (fade <= 0) continue;
      ctx.globalAlpha = fade;
      const s = d.state === 'got' ? 1 + d.t : 1;
      ctx.fillStyle = d.state === 'bad' ? '#d0cbc2' : '#ffffff';
      ctx.strokeStyle = d.state === 'bad' ? '#a8a39a' : '#f3a6b8';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(d.x, d.y, 38 * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffd6e0';
      circle(d.x - 24 * s, d.y - 24 * s, 8 * s);
      text(d.c, d.x, d.y + 2, 46 * s, '#3b2a1a');
      ctx.globalAlpha = 1;
    }
    if (hint && T.line >= 0 && G.time < 6 && level.tutorial) text('👈 拖动小鸡，或按 ← → 移动篮子 👉', G.W / 2, 514, 24, '#2f6b2a', UI_FONT);
  }

  function drawBridge(T) {
    sky('#bfe3ff', '#e6f6ff');
    // 河和两岸
    ctx.fillStyle = '#6cc3ef';
    ctx.fillRect(0, BANK_Y + 10, G.W, 90);
    ctx.strokeStyle = '#ffffff88';
    ctx.lineWidth = 3;
    for (let i = 0; i < 9; i++) {
      const wx = 60 + i * 110 + Math.sin(G.time * 2 + i) * 10;
      ctx.beginPath(); ctx.arc(wx, BANK_Y + 50 + (i % 2) * 22, 12, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    }
    ctx.fillStyle = '#93d27f';
    ctx.fillRect(0, BANK_Y, bankL(), 100);
    ctx.fillRect(bankR(), BANK_Y, G.W - bankR(), 100);
    ctx.fillStyle = '#d4a46b';
    ctx.fillRect(0, BANK_Y + 100, G.W, H - BANK_Y - 100);
    // 已经铺好的木板
    const sw = slotW(T);
    for (let i = 0; i < T.poem.lines.length; i++) {
      const c = T.cards.find((k) => k.placed && k.line === i);
      const x = bankL() + sw * i;
      if (!c) {
        ctx.strokeStyle = '#ffffff99';
        ctx.setLineDash([6, 6]);
        ctx.strokeRect(x + 3, BANK_Y + 2, sw - 6, 22);
        ctx.setLineDash([]);
        continue;
      }
      const t = c.fly;
      const fx = c.from ? c.from.x + c.from.w / 2 : x + sw / 2, fy = c.from ? c.from.y : BANK_Y;
      const cx = fx + (x + sw / 2 - fx) * t, cy = fy + (BANK_Y + 12 - fy) * t - Math.sin(t * Math.PI) * 80;
      ctx.fillStyle = '#c98a4a';
      roundRect(cx - sw / 2 + 2, cy - 12, sw - 4, 26, 6); ctx.fill();
      text(bare(T.poem.lines[i]), cx, cy + 1, Math.min(20, (sw - 8) / bare(T.poem.lines[i]).length), '#fff6e0');
    }
    duck(T.walkerX, BANK_Y + 4);
    // 天上的诗：铺好的句子显示出来，没铺的是空格
    const n = T.poem.lines.length;
    const size = n > 7 ? 18 : n > 4 ? 22 : 28;
    ctx.fillStyle = '#fffaf0e0';
    roundRect(G.W / 2 - 230, 26, 460, 50 + n * (size + 10), 20); ctx.fill();
    text(`《${T.poem.title}》 ${T.poem.author}`, G.W / 2, 50, 22, '#7a5a3a', UI_FONT);
    T.poem.lines.forEach((l, i) => {
      const shown = i < T.placed ? l : '＿'.repeat(bare(l).length) + l.slice(-1);
      text(shown, G.W / 2, 82 + i * (size + 10), size, i < T.placed ? '#3b2a1a' : '#c9b89a');
    });
    // 下面的木板卡片
    cardRects(T).forEach((r, k) => {
      const c = r.c;
      if (c.placed) return;
      const shake = c.shake ? Math.sin(G.time * 60) * 6 : 0;
      const isNext = c.line === T.placed;
      if (T.glow > 0 && isNext) {
        ctx.fillStyle = `rgba(255,220,90,${0.45 + Math.sin(G.time * 8) * 0.25})`;
        roundRect(r.x - 8, r.y - 8, r.w + 16, r.h + 16, 16); ctx.fill();
      }
      ctx.fillStyle = c.shake ? '#f3c7c7' : '#e9b77a';
      ctx.strokeStyle = '#8a5a2a';
      ctx.lineWidth = 3;
      roundRect(r.x + shake, r.y, r.w, r.h, 12); ctx.fill(); ctx.stroke();
      text(bare(T.poem.lines[c.line]), r.x + r.w / 2 + shake + 8, r.y + r.h / 2 + 1, Math.min(28, (r.w - 40) / bare(T.poem.lines[c.line]).length), '#3b2410');
      ctx.fillStyle = '#fff6e0';
      circle(r.x + 16 + shake, r.y + 16, 11);
      text(String(k + 1), r.x + 16 + shake, r.y + 17, 14, '#8a5a2a', UI_FONT);
    });
  }

  function drawBoss(B) {
    sky('#d9c8ff', '#fde8f3');
    grass(380);
    const bx = G.W - 200;
    const fall = B.dead ? Math.min(260, B.dead * 220) : 0;
    const by = 230 + Math.sin(G.time * 2.2) * 8 + fall;
    const shake = B.hurt ? Math.sin(G.time * 60) * 8 : 0;
    const q = B.q;
    const warn = q && !q.done && q.warned;
    ctx.save();
    ctx.translate(bx + shake, by);
    ctx.globalAlpha = B.dead ? Math.max(0, 1 - B.dead * 0.6) : 1;
    if (level.boss.kind === 'owl') {
      ctx.fillStyle = B.hurt ? '#fff' : warn ? '#e9a0a0' : '#b88a5a';
      ctx.beginPath(); ctx.ellipse(0, 0, 76, 90, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f3dcb6';
      ctx.beginPath(); ctx.ellipse(0, 30, 48, 52, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b88a5a';
      ctx.beginPath(); ctx.moveTo(-60, -60); ctx.lineTo(-44, -108); ctx.lineTo(-24, -72); ctx.fill();
      ctx.beginPath(); ctx.moveTo(60, -60); ctx.lineTo(44, -108); ctx.lineTo(24, -72); ctx.fill();
      ctx.fillStyle = '#2d2d3a';
      ctx.fillRect(-56, -66, 112, 6); // 博士帽沿
      ctx.fillRect(-30, -96, 60, 30);
    } else {
      ctx.fillStyle = B.hurt ? '#fff' : warn ? '#f0a0a0' : '#6fc2a0';
      ctx.beginPath(); ctx.ellipse(0, 10, 84, 80, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fbe7a8';
      ctx.beginPath(); ctx.ellipse(0, 40, 50, 42, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f39a5b';
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 26 - 12, -60); ctx.lineTo(i * 26, -92); ctx.lineTo(i * 26 + 12, -60); ctx.fill(); }
      ctx.fillStyle = '#3e8a6c';
      circle(-14, 18, 5); circle(14, 18, 5);
    }
    ctx.fillStyle = '#fff';
    circle(-26, -26, 20); circle(26, -26, 20);
    ctx.fillStyle = '#1f1f2e';
    if (B.dead) { text('×', -26, -24, 30, '#1f1f2e', UI_FONT); text('×', 26, -24, 30, '#1f1f2e', UI_FONT); }
    else { circle(-22, -24, 8); circle(30, -24, 8); }
    if (warn && !B.dead) text('!', 0, -140 + Math.sin(G.time * 30) * 4, 64, '#ff3b3b', UI_FONT);
    ctx.restore();
    chick(170, 380, 1.2, false);
    // Boss 出招的球、小鸡打出去的诗句星
    if (B.attack) {
      const t = B.attack.t;
      ctx.fillStyle = '#8a5cf6';
      circle(bx + (170 - bx) * t, by + (320 - by) * t - Math.sin(t * Math.PI) * 60, 22);
    }
    if (B.shot) {
      const t = B.shot.t;
      ctx.fillStyle = '#ffe25a';
      circle(B.shot.x0 + (bx - B.shot.x0) * t, B.shot.y0 + (by - B.shot.y0) * t - Math.sin(t * Math.PI) * 120, 26);
      text('⭐', B.shot.x0 + (bx - B.shot.x0) * t, B.shot.y0 + (by - B.shot.y0) * t - Math.sin(t * Math.PI) * 120, 30, '#000', UI_FONT);
    }
    // 血条
    const bw = 280, hx = G.W / 2 - bw / 2 + 60;
    ctx.fillStyle = '#ffffffcc';
    roundRect(hx, 20, bw, 30, 15); ctx.fill();
    ctx.fillStyle = '#a678f5';
    roundRect(hx + 4, 24, (bw - 8) * (B.hp / B.max), 22, 11); ctx.fill();
    text(`${level.boss.name} ${B.hp}/${B.max}`, hx + bw / 2, 36, 17, '#3a2470', UI_FONT);
    if (!q) return;
    // 上句气泡 + 蓄力条（放在 Boss 左边，不挡它）
    const qx = Math.max(60, G.W / 2 - 380), qw = Math.min(560, G.W - 300 - qx), qc = qx + qw / 2;
    ctx.fillStyle = '#fffaf0f0';
    roundRect(qx, 70, qw, 120, 24); ctx.fill();
    text(`${level.boss.name}：`, qx + 20, 96, 20, '#7a5a8a', UI_FONT, 'left');
    text(q.pair.up, qc, 128, 44, '#3b2a1a');
    text(`下一句是？（《${q.pair.poem.title}》）`, qc, 170, 18, '#9a7a5a', UI_FONT);
    const left = Math.max(0, 1 - q.t / q.T);
    ctx.fillStyle = '#ffffffaa';
    roundRect(qx, 200, qw, 16, 8); ctx.fill();
    ctx.fillStyle = q.warned ? '#ff5a5a' : '#ffb347';
    roundRect(qx, 200, qw * (q.done ? 0 : 1 - left), 16, 8); ctx.fill();
    text('蓄力', qx - 10, 208, 15, '#9a7a5a', UI_FONT, 'right');
    optionRects().forEach((r, i) => {
      const o = q.options[i];
      if (!o) return;
      ctx.fillStyle = o.state === 'right' ? '#a8e6a1' : o.state === 'wrong' ? '#ddd6cc' : '#ffffff';
      ctx.strokeStyle = o.state === 'wrong' ? '#b0a89c' : '#c98a4a';
      ctx.lineWidth = 4;
      roundRect(r.x, r.y, r.w, r.h, 18); ctx.fill(); ctx.stroke();
      const size = Math.min(34, (r.w - 40) / o.text.length);
      text(o.text, r.x + r.w / 2 + 10, r.y + r.h / 2 + 2, size, o.state === 'wrong' ? '#9a948a' : '#3b2a1a');
      text(String(i + 1), r.x + 18, r.y + 18, 15, '#c98a4a', UI_FONT);
    });
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
      ctx.font = `bold ${q.size}px ${UI_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 6;
      ctx.strokeText(q.text, q.x, q.y);
      ctx.fillStyle = q.color;
      ctx.fillText(q.text, q.x, q.y);
    }
    ctx.globalAlpha = 1;
    // 得到诗卡
    if (G.card) {
      const p = G.card.poem;
      const s = Math.min(1, (2.2 - G.card.t) * 4);
      ctx.save();
      ctx.translate(G.W / 2, 280);
      ctx.scale(s, s);
      ctx.fillStyle = '#fff3d6';
      ctx.strokeStyle = '#e0a84a';
      ctx.lineWidth = 6;
      roundRect(-170, -120, 340, 230, 24); ctx.fill(); ctx.stroke();
      text(p.icon, 0, -60, 64, '#000', UI_FONT);
      text(`《${p.title}》`, 0, 10, 36, '#5a3a1a');
      text(`${p.dynasty} · ${p.author}`, 0, 52, 22, '#8a6a4a', UI_FONT);
      text('得到诗卡！', 0, 88, 24, '#ff6f61', UI_FONT);
      ctx.restore();
    }
  }
  function drawHud() {
    for (let i = 0; i < 3; i++) text(i < G.hearts ? '❤️' : '🤍', 30 + i * 40, 30, 28, '#000', UI_FONT);
    ctx.fillStyle = '#ffffffcc';
    roundRect(150, 12, 120, 38, 19); ctx.fill();
    text(`🪙 ${G.coins}`, 210, 32, 22, '#5b4210', UI_FONT);
    if (!level.boss) text(`任务 ${Math.min(level.tasks.length, G.taskIndex + 1)}/${level.tasks.length}`, 24, 72, 20, '#5b4210', UI_FONT, 'left');
  }
  function draw() {
    const T = G.task;
    if (!T || T.type === 'rain') drawRain(T || { line: -1, drops: [], basketX: G.W / 2, queue: [], poem: { lines: [] } });
    else if (T.type === 'bridge') drawBridge(T);
    else drawBoss(T);
    drawFx();
    drawHud();
  }

  // ---------- 循环 ----------
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    G.W = Math.max(860, Math.min(1400, (rect.width / rect.height) * H));
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
  window.addEventListener('resize', resize);
  nextTask();
  raf = requestAnimationFrame(frame);
  G.stop = () => { stopped = true; stopVoices(); cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  return G;
}
