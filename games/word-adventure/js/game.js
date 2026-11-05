'use strict';
// ===== 游戏核心：循环、出题、得分、Boss 血条、特效、HUD =====
// 逻辑画面固定 960×540，等比缩放放进画布（竖屏上下留白，不裁切）。
// 具体玩法在 mode-bubble.js / mode-snake.js / mode-match.js 里，通过 api 回调核心。

const VW = 960;
const VH = 540;
const PRAISES = { 3: 'Good job!', 5: 'Great!', 8: 'Super!', 12: 'Amazing!' };
const MODES = {};

function createGame(canvas, level, world, opts) {
  const ctx = canvas.getContext('2d');
  const assist = Math.min(3, opts.fails || 0);
  const random = opts.random || Math.random;
  const G = {
    L: level, world, assist, time: 0,
    calm: !!opts.calm, // 系统设置了减少动态效果：云不飘、不抖屏、恐龙挨打不晃
    progress: 0, goal: level.goal, wrong: 0, combo: 0, coins: 0,
    hearts: 3, inv: 0, lostHeart: false, shake: 0,
    boss: level.boss ? { hp: level.boss.hp, max: level.boss.hp, hurt: 0, dead: 0 } : null,
    popups: [], particles: [], shots: [], misses: {},
    state: 'play', endTimer: 0, ended: false, paused: false,
    bag: [], retry: [], asked: 0, lastItem: null,
    view: [1, 0, 0],
  };

  // ---------- 出题：错过/答错的题两道之后再出 ----------
  function next() {
    G.asked++;
    const due = G.retry.findIndex((r) => r.due <= G.asked);
    if (due >= 0) return (G.lastItem = G.retry.splice(due, 1)[0].item);
    if (!G.bag.length) {
      G.bag = level.pool.map((v) => [random(), v]).sort((a, b) => a[0] - b[0]).map((v) => v[1]);
      if (G.bag.length > 1 && G.bag[0] === G.lastItem) G.bag.push(G.bag.shift());
    }
    return (G.lastItem = G.bag.shift());
  }
  // missed = false：只是这次放不下（比如翻翻乐同一轮抽重了），不算孩子答错
  function requeue(item, missed = true) {
    if (!G.retry.some((r) => r.item === item)) G.retry.push({ item, due: G.asked + 2 });
    if (missed) G.misses[item.id] = (G.misses[item.id] || 0) + 1;
  }

  // ---------- 反馈 ----------
  let pendingVoice = null;
  function popup(str, x, y, color = '#ff7a45', size = 34) {
    G.popups.push({ str, x, y, t: 1.2, color, size });
  }
  function burst(x, y, color, n = 14) {
    for (let i = 0; i < n; i++) {
      const a = random() * Math.PI * 2, v = 120 + random() * 220;
      G.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 100, t: 0.8, color });
    }
  }
  function say(item) {
    pendingVoice = null;
    if (item) Sound.say(item.audio);
  }
  function sayLater(item, delay) {
    pendingVoice = { item, left: delay };
  }
  // 答对一题（或拼完一个词）：有 Boss 就打 Boss，没有就加一颗星
  function correct(item, x, y) {
    G.combo++;
    G.coins += 2;
    Sound.right();
    opts.onLearn(item.id);
    burst(x, y, '#ffd84d', 16);
    if (PRAISES[G.combo]) popup(PRAISES[G.combo], VW / 2, 170, '#ff6fa5', 46);
    if (G.boss) {
      const [bx, by] = mode.bossPos();
      G.shots.push({ x0: x, y0: y, x1: bx, y1: by, t: 0, item });
    } else {
      G.progress++;
      popup('+⭐', x, y - 50, '#f5a623');
      if (G.progress >= G.goal) finish(true);
    }
  }
  function wrong(item) {
    G.wrong++;
    G.combo = 0;
    Sound.wrong();
    requeue(item);
  }
  function hurt(x, y) {
    if (G.inv > 0 || G.state !== 'play') return false;
    G.hearts--;
    G.inv = 1.6;
    G.shake = 0.4;
    G.lostHeart = true;
    G.combo = 0;
    Sound.hurt();
    popup('哎哟！', x, y - 60, '#e8505b');
    if (G.hearts <= 0) finish(false);
    return true;
  }
  function finish(win) {
    if (G.state !== 'play') return;
    G.state = win ? 'win' : 'fail';
    G.endTimer = win ? (G.boss ? 1.8 : 1) : 1.3;
    if (win) Sound.win();
  }
  function result() {
    const stars = Math.max(1, 3 - (G.lostHeart ? 1 : 0) - (G.wrong > 2 ? 1 : 0));
    const hardest = Object.entries(G.misses).sort((a, b) => b[1] - a[1])[0];
    return {
      win: G.state === 'win', stars, wrong: G.wrong,
      coins: G.coins + (G.state === 'win' ? stars * 5 + (G.boss ? 10 : 0) : 0),
      hardest: hardest ? level.pool.find((i) => i.id === hardest[0]) : null,
    };
  }

  const api = { next, requeue, popup, burst, say, sayLater, correct, wrong, hurt, random, assist };
  const mode = MODES[level.mode](G, api);

  // ---------- 输入（坐标换成逻辑画面坐标）----------
  function toView(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / (rect.width || 1);
    const [scale, ox, oy] = G.view;
    return [((clientX - rect.left) * dpr - ox) / scale, ((clientY - rect.top) * dpr - oy) / scale];
  }
  const playing = () => !G.paused && G.state === 'play';
  G.tapAt = (x, y) => { if (playing()) mode.tap(x, y); };
  G.tapClient = (cx, cy) => G.tapAt(...toView(cx, cy));
  G.swipe = (dx, dy) => { if (playing() && mode.swipe) mode.swipe(dx, dy); };
  G.key = (code) => (playing() ? mode.key(code) : false);
  G.replay = () => mode.replay();
  G.mode = mode;

  // ---------- 更新 ----------
  function update(dt) {
    G.time += dt;
    if (pendingVoice) {
      pendingVoice.left -= dt;
      if (pendingVoice.left <= 0) say(pendingVoice.item);
    }
    G.inv = Math.max(0, G.inv - dt);
    G.shake = Math.max(0, G.shake - dt);
    if (G.boss) {
      G.boss.hurt = Math.max(0, G.boss.hurt - dt);
      if (G.boss.dead) G.boss.dead += dt;
    }
    for (const s of G.shots) {
      s.t += dt / 0.45;
      if (s.t >= 1 && !s.done) {
        s.done = true;
        const B = G.boss;
        if (B.hp <= 0) continue; // 已经打败了，后面飞来的不算
        B.hp--;
        B.hurt = 0.5;
        G.progress = B.max - B.hp;
        Sound.boss();
        burst(s.x1, s.y1, '#b98cff', 20);
        popup(B.hp > 0 ? '打中啦！' : '没电啦～', s.x1, s.y1 + 90, '#8a5cf6', 36);
        if (mode.onBossHit) mode.onBossHit();
        if (B.hp <= 0) { B.dead = 0.01; finish(true); }
      }
    }
    G.shots = G.shots.filter((s) => !s.done);
    if (G.state === 'play') mode.update(dt);
    else {
      G.endTimer -= dt;
      if (G.endTimer <= 0 && !G.ended) {
        G.ended = true;
        opts.onEnd(result());
      }
    }
    for (const q of G.popups) { q.t -= dt; q.y -= 40 * dt; }
    G.popups = G.popups.filter((q) => q.t > 0);
    for (const q of G.particles) { q.t -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 500 * dt; }
    G.particles = G.particles.filter((q) => q.t > 0);
  }

  // ---------- 绘制 ----------
  function draw() {
    ctx.save();
    if (G.shake && !G.calm) ctx.translate(Math.sin(G.time * 70) * 8 * G.shake, 0);
    mode.draw(ctx);
    for (const s of G.shots) {
      const t = Math.min(1, s.t);
      const x = s.x0 + (s.x1 - s.x0) * t, y = s.y0 + (s.y1 - s.y0) * t - Math.sin(t * Math.PI) * 110;
      ctx.fillStyle = '#fff4a8';
      circle(ctx, x, y, 34);
      drawPic(ctx, s.item.pic, x, y, 54);
    }
    for (const q of G.particles) {
      ctx.globalAlpha = Math.min(1, q.t * 1.5);
      ctx.fillStyle = q.color;
      circle(ctx, q.x, q.y, 5);
    }
    ctx.globalAlpha = 1;
    for (const q of G.popups) {
      ctx.globalAlpha = Math.min(1, q.t * 2);
      ctx.font = `bold ${q.size}px ${ROUND_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#fff';
      ctx.strokeText(q.str, q.x, q.y);
      ctx.fillStyle = q.color;
      ctx.fillText(q.str, q.x, q.y);
    }
    ctx.globalAlpha = 1;
    drawHud();
    ctx.restore();
  }

  function drawHud() {
    let x = 18;
    if (mode.usesHearts) {
      ctx.font = `30px ${EMOJI_FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < 3; i++) {
        if (G.inv > 0 && i === G.hearts && Math.floor(G.time * 10) % 2) continue;
        ctx.fillText(i < G.hearts ? '❤️' : '🤍', x + i * 38, 34);
      }
      x += 124;
    }
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    roundRect(ctx, x, 14, G.boss ? 110 : 210, 42, 21);
    ctx.fill();
    ctx.font = `bold 24px ${ROUND_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#5b4210';
    ctx.fillText(G.boss ? `🪙 ${G.coins}` : `⭐ ${G.progress}/${G.goal}  🪙 ${G.coins}`, x + 14, 36);
    if (G.boss) {
      const B = G.boss, bw = 260, bx = VW / 2 - bw / 2 + 20;
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      roundRect(ctx, bx, 18, bw, 32, 16); ctx.fill();
      ctx.fillStyle = '#a678f5';
      if (B.hp > 0) { roundRect(ctx, bx + 4, 22, Math.max(24, (bw - 8) * (B.hp / B.max)), 24, 12); ctx.fill(); }
      text(ctx, `${level.boss.name} ${B.hp}/${B.max}`, bx + bw / 2, 35, 18, '#3a2470');
    }
  }

  // ---------- 循环 ----------
  function resize() {
    const dpr = Math.min(2, (typeof window === 'object' && window.devicePixelRatio) || 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round((rect.width || VW) * dpr);
    canvas.height = Math.round((rect.height || VH) * dpr);
    const scale = Math.min(canvas.width / VW, canvas.height / VH);
    G.view = [scale, (canvas.width - VW * scale) / 2, (canvas.height - VH * scale) / 2];
  }
  let last = 0, raf = 0;
  function frame(t) {
    const dt = Math.min(0.033, (t - last) / 1000 || 0);
    last = t;
    if (!G.paused) update(dt);
    const [scale, ox, oy] = G.view;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = world.bg[1];
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, VW, VH);
    ctx.clip();
    draw();
    ctx.restore();
    raf = requestAnimationFrame(frame);
  }
  resize();
  window.addEventListener('resize', resize);
  raf = requestAnimationFrame(frame);
  G.stop = () => { pendingVoice = null; Sound.stopVoice(); cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  return G;
}
