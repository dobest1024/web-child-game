'use strict';
// ===== 游戏引擎：自动奔跑 + 跳起顶砖答题 =====
// 坐标：逻辑高度 H=540，宽度随屏幕比例；世界坐标 x 减去 dist 再加 PX 就是屏幕坐标

const H = 540;
const GROUND = 440;
const BLOCK = 78;
const BLOCK_TOP = GROUND - 214; // 砖块底边离地 136，轻点一下就能顶到
const BLOCK_GAP = 170;
const RIVER_W = 460;
const CLOUD_TOP = GROUND - 96;
const GRAVITY = 1750;
const HOLD_GRAVITY = 980;
const JUMP_V = 640;
const BOSS_Y = 150;
const PRAISES = { 3: '好耳朵！', 5: '拼音小达人！', 8: '太厉害啦！', 12: '无敌小耳朵！' };

function createGame(canvas, level, world, opts) {
  const ctx = canvas.getContext('2d');
  const assist = Math.min(3, opts.fails || 0);
  const G = {
    L: level, world, assist,
    W: 960, PX: 230,
    speed: level.speed * (1 - assist * 0.08),
    dist: 0, time: 0,
    player: { y: GROUND, vy: 0, onGround: true, holding: false, inv: 0, hearts: 3, squash: 0, platform: 'ground' },
    ents: [], nextX: 0, gateCount: 0,
    progress: 0, wrong: 0, lostHeart: false, combo: 0, coins: 0,
    popups: [], particles: [], bubble: 0,
    bags: {}, retry: [], misses: {},
    boss: level.boss ? { hp: level.boss.hp, max: level.boss.hp, attack: 3.5, warn: 0, hurt: 0, dead: 0 } : null,
    state: 'play', endTimer: 0, paused: false, flagX: null,
    lastPrompt: null,
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

  const options = Math.max(2, level.options - (assist >= 1 ? 1 : 0));

  // ---------- 出题 ----------
  function nextItem(kind) {
    const due = G.retry.findIndex((r) => r.kind === kind && r.due <= G.gateCount);
    if (due >= 0) return G.retry.splice(due, 1)[0].item;
    let bag = G.bags[kind];
    if (!bag || !bag.length) {
      bag = G.bags[kind] = [...level.pools[kind]].sort(() => Math.random() - 0.5);
      if (bag.length > 1 && bag[0] === G.lastPrompt) bag.push(bag.shift());
    }
    return bag.shift();
  }
  function requeue(kind, item) {
    if (!G.retry.some((r) => r.item === item)) G.retry.push({ kind, item, due: G.gateCount + 2 });
    G.misses[item.audio] = (G.misses[item.audio] || 0) + 1;
  }
  // 终点旗是按"还没答的题都能答对"提前放的；又漏了一题就收回旗子，先把漏掉的题补上
  function reopenTrack() {
    if (G.flagX === null) return;
    G.ents = G.ents.filter((e) => e.type !== 'flag');
    G.flagX = null;
    G.retry.forEach((r) => (r.due = 0));
    G.nextX = Math.max(G.nextX, G.dist + G.W - G.PX + 40); // 补的题从屏幕右边外面出来
  }
  const labelOf = (item) => (level.display === 'mark' ? TONE_SYMBOLS[item.tone] : item.show);

  // ---------- 铺路 ----------
  function spawn() {
    if (G.gateCount === 0 && G.nextX === 0) G.nextX = G.dist + G.W * 0.8;
    while (G.nextX < G.dist + G.W * 2 && G.flagX === null) {
      if (!G.boss && G.progress + pendingGates() >= level.goal) {
        G.flagX = G.nextX + 200;
        G.ents.push({ type: 'flag', x: G.flagX });
        return;
      }
      const kind = level.gates[G.gateCount % level.gates.length];
      const item = nextItem(kind);
      G.lastPrompt = item;
      if (kind === 'stone') {
        const [a, b] = makeOptions(item, level.pools.stone, 2);
        G.ents.push({ type: 'river', kind, x: G.nextX, item, cloud: { item: a, gone: false, wrong: false }, log: { item: b, gone: false, wrong: false }, said: 0, done: false, sink: null, sinkT: 0 });
        G.nextX += RIVER_W + 420;
      } else {
        const tutorialFirst = level.tutorial && G.gateCount === 0;
        const list = tutorialFirst ? [item] : makeOptions(item, level.pools[kind], options);
        const blocks = list.map((it, i) => ({ item: it, x: G.nextX + i * BLOCK_GAP, state: 'idle', bump: 0 }));
        G.ents.push({ type: 'gate', kind, x: G.nextX, item, blocks, said: 0, done: false, hint: tutorialFirst });
        const width = (list.length - 1) * BLOCK_GAP + BLOCK;
        G.nextX += width;
        const gap = G.boss ? 380 : 480;
        const hogs = Math.max(0, level.hedgehogs - (assist >= 1 ? 1 : 0));
        if (hogs && Math.random() < 0.45 * hogs) G.ents.push({ type: 'hog', x: G.nextX + gap * 0.55, vx: -35 });
        G.nextX += gap;
      }
      G.gateCount++;
    }
  }
  // 已经铺在路上、还没答完的题
  const pendingGates = () => G.ents.filter((e) => (e.type === 'gate' || e.type === 'river') && !e.done).length;

  // ---------- 输入 ----------
  G.press = () => {
    if (G.paused || G.state !== 'play') return;
    const p = G.player;
    p.holding = true;
    if (p.onGround) {
      p.vy = -JUMP_V;
      p.onGround = false;
      p.platform = null;
      Sound.jump();
    }
  };
  G.release = () => { G.player.holding = false; };
  G.replay = () => {
    const gate = G.ents.find((e) => (e.type === 'gate' || e.type === 'river') && !e.done && e.said);
    if (gate) say(gate.item);
  };

  // 只有路上最前面那道没答完的题才出声，避免几道题的读音挤在一起
  const activeQuestion = () => G.ents.find((x) => (x.type === 'gate' || x.type === 'river') && !x.done);
  function prompt(e, near, close) {
    if (e.done || activeQuestion() !== e) return;
    if (e.said === 0 && near) { say(e.item); e.said = 1; e.saidAt = G.time; }
    else if (e.said === 1 && close && G.time - e.saidAt > 1.6) { say(e.item); e.said = 2; }
  }
  function say(item) {
    Sound.say(item.audio);
    G.bubble = 1.4;
  }
  function popup(text, x, y, color = '#ff7a45', size = 34) {
    G.popups.push({ text, x, y, t: 1.2, color, size });
  }
  function burst(x, y, color, n = 12) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 220;
      G.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, t: 0.8, color });
    }
  }
  const sx = (x) => x - G.dist + G.PX;

  function correct(item, x, y) {
    G.combo++;
    G.coins += 2;
    Sound.right();
    laterVoice(() => Sound.say(item.audio), 260);
    opts.onLearn(item.show);
    burst(x, y, '#ffd84d', 16);
    if (PRAISES[G.combo]) popup(PRAISES[G.combo], G.W / 2, 150, '#ff6fa5', 44);
    if (G.boss) {
      G.ents.push({ type: 'shot', x0: x, y0: y, t: 0, label: labelOf(item) });
    } else {
      G.progress++;
      popup('+⭐', x, y - 40, '#f5a623');
    }
  }
  function wrong(kind, item) {
    G.wrong++;
    G.combo = 0;
    Sound.wrong();
    requeue(kind, item);
  }

  // ---------- 更新 ----------
  function update(dt) {
    G.time += dt;
    const p = G.player;
    if (G.state !== 'play') {
      G.endTimer -= dt;
      updateFx(dt);
      if (G.boss && G.boss.dead) G.boss.dead += dt;
      if (G.endTimer <= 0 && !G.ended) {
        G.ended = true;
        opts.onEnd(result());
      }
      return;
    }
    const river = G.ents.find((e) => e.type === 'river' && G.dist > e.x - 40 && G.dist < e.x + RIVER_W + 40);
    const stopped = river && river.sink && river.sinkT <= 0 && p.platform === null;
    if (!stopped) G.dist += G.speed * dt;
    spawn();

    // 跳跃物理：按住时重力小，跳得高
    const prevHead = p.y - 62;
    const prevY = p.y;
    if (!p.onGround) {
      p.vy += (p.holding && p.vy < 0 ? HOLD_GRAVITY : GRAVITY) * dt;
      p.y += p.vy * dt;
    }
    p.inv = Math.max(0, p.inv - dt);
    p.squash = Math.max(0, p.squash - dt * 4);

    // 落地：地面（河里没有地面）、木头桥、云朵桥
    const inRiver = river && G.dist > river.x && G.dist < river.x + RIVER_W;
    if (!p.onGround && p.vy > 0) {
      if (river && !river.cloud.gone && G.dist > river.x - 70 && G.dist < river.x + RIVER_W + 40 && prevY <= CLOUD_TOP && p.y >= CLOUD_TOP) {
        land(CLOUD_TOP, 'cloud');
      } else if (p.y >= GROUND && prevY <= GROUND + 4 && !(inRiver && river.log.gone)) {
        land(GROUND, inRiver ? 'log' : 'ground');
      }
    }
    // 走出平台边缘就往下掉
    if (p.onGround) {
      const offCloud = p.platform === 'cloud' && (!river || river.cloud.gone || G.dist > river.x + RIVER_W + 40);
      const offLog = (p.platform === 'log' || p.platform === 'ground') && inRiver && river.log.gone;
      if (offCloud || offLog) { p.onGround = false; p.platform = null; p.vy = 30; }
      else if (p.platform === 'ground' && inRiver) p.platform = 'log';
      else if (p.platform === 'log' && !inRiver) p.platform = 'ground';
    }
    // 掉进河里：溅水花，回到岸边重来，不扣心
    if (river && p.y > GROUND + 70) {
      Sound.splash();
      burst(G.PX, GROUND, '#7cc8f4', 18);
      popup('扑通！再听一次', G.PX + 60, GROUND - 120, '#3a8fd8', 30);
      G.dist = river.x - 380;
      p.y = GROUND; p.vy = 0; p.onGround = true; p.platform = 'ground';
      river.sink = null;
      river.cloud.gone = river.log.gone = false;
      river.said = 0;
    }

    for (const e of G.ents) updateEnt(e, dt, prevHead);
    G.ents = G.ents.filter((e) => !e.dead && (e.type === 'shot' || sx(e.x) > -900));

    if (G.boss) updateBoss(dt);
    if (!G.boss && G.flagX !== null && G.dist >= G.flagX) finish(true);
    updateFx(dt);
  }

  function land(y, platform) {
    const p = G.player;
    p.y = y; p.vy = 0; p.onGround = true; p.platform = platform; p.squash = 1;
  }

  function hurt() {
    const p = G.player;
    if (p.inv > 0 || G.state !== 'play') return;
    p.hearts--;
    p.inv = 1.6;
    G.lostHeart = true;
    G.combo = 0;
    Sound.hurt();
    popup('哎哟！', G.PX, p.y - 100, '#e8505b');
    if (p.hearts <= 0) finish(false);
  }

  function updateEnt(e, dt, prevHead) {
    const p = G.player;
    if (e.type === 'gate') {
      const first = sx(e.blocks[0].x);
      prompt(e, first < G.W + 60, first - G.PX < 360);
      const head = p.y - 62;
      for (const b of e.blocks) {
        b.bump = Math.max(0, b.bump - dt * 5);
        if (b.state === 'right') b.rise = (b.rise || 0) + dt;
        // 还没轮到的题（后面排队的砖）顶不到
        if (e.done || b.state !== 'idle' || p.vy >= 0 || activeQuestion() !== e) continue;
        const bottom = BLOCK_TOP + BLOCK;
        if (Math.abs(b.x + BLOCK / 2 - G.dist) < BLOCK / 2 + 16 && prevHead >= bottom - 2 && head <= bottom) {
          p.vy = 140;
          b.bump = 1;
          if (b.item === e.item) {
            b.state = 'right';
            e.done = true;
            correct(e.item, sx(b.x + BLOCK / 2), BLOCK_TOP);
          } else {
            b.state = 'wrong';
            wrong(e.kind, e.item);
          }
        }
      }
      // 整组跑过去了还没顶对：这题稍后再来
      if (!e.done && sx(e.blocks[e.blocks.length - 1].x + BLOCK) < G.PX - 40) {
        e.done = true;
        e.missed = true;
        G.combo = 0;
        requeue(e.kind, e.item);
        reopenTrack();
      }
    } else if (e.type === 'river') {
      const start = sx(e.x);
      prompt(e, start < G.W + 100, start - G.PX < 420);
      // 到河中间时看小兔站在哪座桥上
      if (!e.done && !e.sink && p.onGround && G.dist > e.x + 60 && G.dist < e.x + RIVER_W) {
        const choice = p.platform === 'cloud' ? e.cloud : e.log;
        if (choice.item === e.item) {
          e.done = true;
          correct(e.item, G.PX, p.y - 80);
        } else {
          e.sink = p.platform === 'cloud' ? 'cloud' : 'log';
          e.sinkT = 0.8;
          choice.wrong = true;
          wrong(e.kind, e.item);
        }
      }
      if (e.sink) {
        e.sinkT -= dt;
        if (e.sinkT <= 0 && !e[e.sink].gone) {
          e[e.sink].gone = true;
          // 云朵桥没了会掉到木头桥上，木头桥那条路重新判一次
          if (e.sink === 'cloud') e.sink = null;
        }
      }
      // 整条河跑过去了还没判出来（兜底）：这题稍后再来
      if (!e.done && G.dist > e.x + RIVER_W + 60) {
        e.done = true;
        requeue(e.kind, e.item);
        reopenTrack();
      }
    } else if (e.type === 'hog') {
      e.x += e.vx * dt;
      if (Math.abs(e.x - G.dist) < 34 && p.y > GROUND - 44) hurt();
    } else if (e.type === 'rock') {
      e.x += e.vx * dt;
      e.spin = (e.spin || 0) + dt * 8;
      if (Math.abs(e.x - G.dist) < 30 && p.y > GROUND - 46) hurt();
    } else if (e.type === 'shot') {
      e.t += dt / 0.4;
      if (e.t >= 1 && !e.dead) {
        e.dead = true;
        const B = G.boss;
        B.hp--;
        B.hurt = 0.5;
        G.progress = B.max - B.hp;
        Sound.boss();
        burst(G.W - 160, BOSS_Y, '#b98cff', 20);
        popup(B.hp > 0 ? '打中啦！' : '没电啦～', G.W - 160, BOSS_Y + 120, '#8a5cf6', 38);
        if (B.hp <= 0) { B.dead = 0.01; finish(true); }
      }
    }
  }

  function updateBoss(dt) {
    const B = G.boss;
    B.hurt = Math.max(0, B.hurt - dt);
    if (B.dead || G.state !== 'play') return;
    B.attack -= dt;
    if (B.attack <= 0 && !B.warn) B.warn = 0.9;
    if (B.warn) {
      B.warn -= dt;
      if (B.warn <= 0) {
        B.warn = 0;
        B.attack = 5.4 + assist * 1.4;
        G.ents.push({ type: 'rock', x: G.dist + (G.W - 160 - G.PX), vx: -140 });
      }
    }
  }

  function updateFx(dt) {
    G.bubble = Math.max(0, G.bubble - dt);
    for (const q of G.popups) { q.t -= dt; q.y -= 40 * dt; }
    G.popups = G.popups.filter((q) => q.t > 0);
    for (const q of G.particles) { q.t -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 500 * dt; }
    G.particles = G.particles.filter((q) => q.t > 0);
  }

  function finish(win) {
    if (G.state !== 'play') return;
    G.state = win ? 'win' : 'fail';
    G.endTimer = win ? (G.boss ? 1.8 : 0.9) : 1.2;
    if (win) Sound.win();
  }

  function result() {
    const stars = Math.max(1, 3 - (G.lostHeart ? 1 : 0) - (G.wrong > 2 ? 1 : 0));
    const hardest = Object.entries(G.misses).sort((a, b) => b[1] - a[1])[0];
    return {
      win: G.state === 'win', stars,
      coins: G.coins + (G.state === 'win' ? stars * 5 + (G.boss ? 10 : 0) : 0),
      wrong: G.wrong, hardest: hardest && hardest[0],
    };
  }

  // ---------- 绘制 ----------
  function draw() {
    const W = G.W;
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, world.sky[0]);
    sky.addColorStop(1, world.sky[1]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    // 太阳和云
    ctx.fillStyle = '#ffe58a';
    circle(W - 120, 90, 46);
    ctx.fillStyle = '#ffffffcc';
    for (let i = 0; i < 5; i++) {
      const x = ((i * 320 - G.dist * 0.15) % (W + 300) + W + 300) % (W + 300) - 150;
      cloud(x, 70 + (i % 3) * 40, 0.8 + (i % 2) * 0.4);
    }
    // 远山、树
    hills(0.25, GROUND - 90, 70, '#cdeac4', 0.004);
    hills(0.45, GROUND - 40, 50, world.hill, 0.007);
    for (let i = 0; i < 12; i++) {
      const x = ((i * 260 - G.dist * 0.7) % (W + 260) + W + 260) % (W + 260) - 130;
      tree(x, GROUND, 0.8 + (i % 3) * 0.2);
    }
    ground();
    if (G.boss) drawBoss();
    for (const e of G.ents) drawEnt(e);
    drawBunny();
    drawFx();
    drawHud();
  }

  function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  function cloud(x, y, s) {
    circle(x, y, 26 * s); circle(x + 28 * s, y - 10 * s, 30 * s); circle(x + 58 * s, y, 24 * s);
    ctx.fillRect(x, y, 58 * s, 22 * s);
  }
  function hills(par, base, amp, color, freq) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, GROUND);
    for (let x = 0; x <= G.W; x += 20) ctx.lineTo(x, base - Math.sin((x + G.dist * par) * freq) * amp - amp);
    ctx.lineTo(G.W, GROUND);
    ctx.fill();
  }
  function tree(x, y, s) {
    ctx.fillStyle = '#9b6b43';
    ctx.fillRect(x - 6 * s, y - 50 * s, 12 * s, 50 * s);
    ctx.fillStyle = '#6dbb6a';
    circle(x, y - 70 * s, 32 * s);
    circle(x - 22 * s, y - 52 * s, 22 * s);
    circle(x + 22 * s, y - 52 * s, 22 * s);
  }
  function ground() {
    ctx.fillStyle = '#d4a46b';
    ctx.fillRect(0, GROUND, G.W, H - GROUND);
    ctx.fillStyle = '#7cc56b';
    ctx.fillRect(0, GROUND, G.W, 16);
    ctx.fillStyle = '#c08f58';
    for (let x = -((G.dist * 1) % 80); x < G.W; x += 80) { circle(x + 20, GROUND + 50, 5); circle(x + 60, GROUND + 78, 4); }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  // 声调的样子：平、上坡、拐弯、下坡
  function toneLine(x, y, w, h, tone) {
    const pts = [[], [[0, 0.2], [1, 0.2]], [[0, 0.9], [1, 0.1]], [[0, 0.45], [0.45, 0.95], [1, 0.1]], [[0, 0.1], [1, 0.9]]][tone];
    if (!pts || !pts.length) return;
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(x + px * w, y + py * h) : ctx.moveTo(x + px * w, y + py * h)));
    ctx.stroke();
  }

  function drawBlock(b, gate) {
    const x = sx(b.x);
    if (x < -BLOCK || x > G.W + BLOCK) return;
    const lift = b.bump * 14 + (b.rise ? Math.min(60, b.rise * 200) : 0);
    const y = BLOCK_TOP - lift;
    const waiting = !gate.done && activeQuestion() !== gate;
    const alpha = b.state === 'right' ? Math.max(0, 1 - (b.rise || 0) * 1.6) : (gate.done && b.state === 'idle') || waiting ? 0.35 : 1;
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    const isAnswer = b.item === gate.item;
    const glow = !gate.done && isAnswer && gate.blocks.some((o) => o.state === 'wrong');
    if (glow) {
      ctx.fillStyle = `rgba(255,236,120,${0.45 + Math.sin(G.time * 8) * 0.25})`;
      roundRect(x - 10, y - 10, BLOCK + 20, BLOCK + 20, 20);
      ctx.fill();
    }
    ctx.fillStyle = b.state === 'wrong' ? '#d7d7d7' : b.state === 'right' ? '#8fe08f' : '#ffd65a';
    ctx.strokeStyle = b.state === 'wrong' ? '#a9a9a9' : '#c98a24';
    ctx.lineWidth = 5;
    roundRect(x, y, BLOCK, BLOCK, 14);
    ctx.fill();
    ctx.stroke();
    const label = labelOf(b.item);
    ctx.fillStyle = b.state === 'wrong' ? '#8d8d8d' : '#4a3214';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (level.display === 'mark') {
      ctx.font = 'bold 24px "Arial Rounded MT Bold", sans-serif';
      ctx.fillText(b.item.group, x + BLOCK / 2, y + 20);
      ctx.strokeStyle = b.state === 'wrong' ? '#9a9a9a' : '#d9582b';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      toneLine(x + 16, y + 36, BLOCK - 32, 30, b.item.tone);
      ctx.globalAlpha = 1;
      return;
    }
    ctx.font = `bold ${label.length > 2 ? 30 : 38}px "Arial Rounded MT Bold", "PingFang SC", sans-serif`;
    ctx.fillText(label, x + BLOCK / 2, y + BLOCK / 2 - (gate.kind === 'tone' ? 8 : 0));
    if (gate.kind === 'tone') {
      ctx.strokeStyle = '#e8743b';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      toneLine(x + 18, y + BLOCK - 26, BLOCK - 36, 16, b.item.tone);
    }
    ctx.globalAlpha = 1;
  }

  function drawEnt(e) {
    if (e.type === 'gate') {
      e.blocks.forEach((b) => drawBlock(b, e));
      if (e.hint && !e.done) {
        const x = sx(e.blocks[0].x) + BLOCK / 2;
        if (x < G.W && x > G.PX - 40) {
          ctx.fillStyle = '#ff6f61';
          ctx.font = 'bold 30px "PingFang SC", sans-serif';
          ctx.textAlign = 'center';
          const bob = Math.sin(G.time * 6) * 6;
          ctx.fillText('👆 点一下，跳起来顶它！', Math.max(G.PX + 120, x - 40), BLOCK_TOP - 50 + bob);
        }
      }
    } else if (e.type === 'river') drawRiver(e);
    else if (e.type === 'hog') drawHog(sx(e.x), GROUND);
    else if (e.type === 'rock') drawRock(sx(e.x), GROUND, e.spin || 0);
    else if (e.type === 'shot') {
      const t = Math.min(1, e.t);
      const tx = G.W - 160, ty = BOSS_Y;
      const x = e.x0 + (tx - e.x0) * t, y = e.y0 + (ty - e.y0) * t - Math.sin(t * Math.PI) * 120;
      ctx.fillStyle = '#ffef8a';
      circle(x, y, 30);
      ctx.fillStyle = '#5a3d0c';
      ctx.font = 'bold 32px "Arial Rounded MT Bold", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(e.label, x, y + 2);
    } else if (e.type === 'flag') {
      const x = sx(e.x);
      ctx.fillStyle = '#8a6a4a';
      ctx.fillRect(x - 4, GROUND - 180, 8, 180);
      ctx.fillStyle = '#ff6f61';
      ctx.beginPath();
      ctx.moveTo(x + 4, GROUND - 180);
      ctx.lineTo(x + 84, GROUND - 155 + Math.sin(G.time * 6) * 4);
      ctx.lineTo(x + 4, GROUND - 130);
      ctx.fill();
      ctx.font = '28px sans-serif';
      ctx.fillText('🏁', x + 30, GROUND - 200);
    }
  }

  function drawRiver(e) {
    const x = sx(e.x);
    if (x > G.W + 300 || x + RIVER_W < -100) return;
    // 河水
    ctx.fillStyle = '#6cc3ef';
    ctx.fillRect(x, GROUND, RIVER_W, H - GROUND);
    ctx.strokeStyle = '#ffffff99';
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const wx = x + 30 + i * 72 + Math.sin(G.time * 3 + i) * 8;
      ctx.beginPath(); ctx.arc(wx, GROUND + 50 + (i % 2) * 30, 12, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    }
    const wobble = (which) => (e.sink === which ? Math.sin(G.time * 40) * 4 : 0);
    const sinkY = (which) => (e[which].gone ? 400 : 0);
    // 木头桥
    if (!e.log.gone) {
      const y = GROUND + sinkY('log');
      ctx.fillStyle = e.log.wrong ? '#b9b1a8' : '#b07a45';
      roundRect(x + wobble('log'), y, RIVER_W, 22, 8); ctx.fill();
      ctx.fillStyle = '#8b5a2b';
      for (let i = 0; i < 9; i++) ctx.fillRect(x + 20 + i * 50 + wobble('log'), y + 4, 4, 14);
    }
    // 云朵桥
    if (!e.cloud.gone) {
      const y = CLOUD_TOP + wobble('cloud');
      ctx.fillStyle = e.cloud.wrong ? '#d8d8d8' : '#ffffff';
      for (let cx = x - 60; cx < x + RIVER_W + 40; cx += 48) circle(cx + 24, y + 14, 24);
      ctx.fillRect(x - 60, y + 2, RIVER_W + 100, 24);
    }
    // 两块路牌
    const sign = (label, y, color, wrongPicked, icon) => {
      ctx.fillStyle = wrongPicked ? '#c9c9c9' : color;
      roundRect(x - 210, y, 120, 64, 14); ctx.fill();
      ctx.fillStyle = '#8a6a4a';
      ctx.fillRect(x - 154, y + 64, 8, 22);
      ctx.fillStyle = wrongPicked ? '#888' : '#3d2a10';
      ctx.font = 'bold 36px "Arial Rounded MT Bold", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`${icon}${e[label].item.show}`, x - 150, y + 33);
    };
    sign('cloud', CLOUD_TOP - 90, '#e3f3ff', e.cloud.wrong, '☁️');
    sign('log', GROUND - 86, '#ffe2b8', e.log.wrong, '🪵');
    // 桥上也写一遍
    ctx.font = 'bold 40px "Arial Rounded MT Bold", sans-serif';
    ctx.fillStyle = '#2f6d9b';
    if (!e.cloud.gone) ctx.fillText(e.cloud.item.show, x + RIVER_W / 2, CLOUD_TOP - 24);
    ctx.fillStyle = '#6b4220';
    if (!e.log.gone) ctx.fillText(e.log.item.show, x + RIVER_W / 2, GROUND + 50);
  }

  function drawHog(x, y) {
    if (x < -60 || x > G.W + 60) return;
    ctx.fillStyle = '#7a5134';
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 9 - 8, y - 18);
      ctx.lineTo(x + i * 9, y - 46 + Math.abs(i) * 4);
      ctx.lineTo(x + i * 9 + 8, y - 18);
      ctx.fill();
    }
    ctx.fillStyle = '#a5754e';
    ctx.beginPath(); ctx.ellipse(x, y - 18, 34, 20, 0, Math.PI, 0); ctx.fill();
    ctx.fillRect(x - 34, y - 18, 68, 14);
    ctx.fillStyle = '#f2d2b0';
    ctx.beginPath(); ctx.ellipse(x - 30, y - 12, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a1c12';
    circle(x - 34, y - 15, 3); circle(x - 44, y - 11, 3.5);
    // 头上的感叹号：先提醒
    if (x - G.PX < 300 && x > G.PX) {
      ctx.fillStyle = '#ff5a5a';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', x, y - 62);
    }
  }
  function drawRock(x, y, spin) {
    ctx.save();
    ctx.translate(x, y - 24);
    ctx.rotate(-spin);
    ctx.fillStyle = '#9a8cc9';
    circle(0, 0, 24);
    ctx.fillStyle = '#7a6cad';
    circle(-8, -6, 6); circle(9, 7, 5);
    ctx.restore();
  }

  function drawBoss() {
    const B = G.boss;
    const x = G.W - 160;
    const fall = B.dead ? Math.min(320, B.dead * 240) : 0;
    const y = BOSS_Y + Math.sin(G.time * 2.4) * 10 + fall;
    const shake = B.hurt ? Math.sin(G.time * 60) * 8 : 0;
    ctx.save();
    ctx.translate(x + shake, y);
    ctx.globalAlpha = B.dead ? Math.max(0, 1 - B.dead * 0.6) : 1;
    if (level.boss.kind === 'tone') {
      ctx.fillStyle = B.hurt ? '#ffffff' : '#b394f2';
      circle(-50, 10, 46); circle(0, -20, 60); circle(52, 8, 48); circle(0, 34, 48);
      ctx.fillStyle = '#5a3d9a';
      ['ˉ', 'ˊ', 'ˇ', 'ˋ'].forEach((m, i) => {
        const a = G.time * 1.5 + i * Math.PI / 2;
        ctx.font = 'bold 56px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(m, Math.cos(a) * 112, Math.sin(a) * 60 + 10);
      });
    } else {
      ctx.fillStyle = B.hurt ? '#ffffff' : '#7fb2e5';
      circle(0, 0, 70);
      ctx.fillStyle = '#2d3a4a';
      ctx.fillRect(-62, -26, 124, 30);
      ctx.fillStyle = '#c69a5a';
      circle(70, 40, 34);
      ctx.fillStyle = '#8d6a3a';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('b p m', 70, 48);
    }
    // 眼睛
    ctx.fillStyle = '#fff';
    circle(-22, -12, 13); circle(22, -12, 13);
    ctx.fillStyle = '#1f1f2e';
    if (B.dead) {
      ctx.font = 'bold 22px sans-serif'; ctx.fillText('×', -22, -4); ctx.fillText('×', 22, -4);
    } else {
      circle(-20, -10, 6); circle(24, -10, 6);
    }
    ctx.strokeStyle = '#1f1f2e'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 22, 16, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    if (B.warn) {
      ctx.fillStyle = '#ff4d4d';
      ctx.font = 'bold 54px sans-serif';
      ctx.fillText('!', 0, -100 + Math.sin(G.time * 30) * 4);
    }
    ctx.restore();
    // 血条
    const bw = 260, bx = G.W / 2 - bw / 2 + 40;
    ctx.fillStyle = '#ffffffcc';
    roundRect(bx, 22, bw, 30, 15); ctx.fill();
    ctx.fillStyle = '#a678f5';
    roundRect(bx + 4, 26, (bw - 8) * (B.hp / B.max), 22, 11); ctx.fill();
    ctx.fillStyle = '#3a2470';
    ctx.font = 'bold 18px "PingFang SC", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`${level.boss.name} ${B.hp}/${B.max}`, bx + bw / 2, 38);
  }

  function drawBunny() {
    const p = G.player;
    if (p.inv > 0 && Math.floor(G.time * 12) % 2) return;
    const x = G.PX, y = p.y;
    const run = p.onGround ? Math.sin(G.time * 18) : 0;
    const sq = p.squash * 0.18;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1 + sq, 1 - sq);
    // 耳朵
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#3b3b52';
    ctx.lineWidth = 3;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(s * 12, -74 + (p.onGround ? 0 : -4), 9, 24, s * 0.18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffb3c6';
      ctx.beginPath(); ctx.ellipse(s * 12, -72, 4, 15, s * 0.18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
    }
    // 身体和脚
    ctx.beginPath(); ctx.ellipse(0, -28, 26, 28, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-12 + run * 6, -2, 11, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(12 - run * 6, -2, 11, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // 脸
    ctx.fillStyle = '#2a2a3a';
    circle(-8, -36, 3.6); circle(10, -36, 3.6);
    ctx.fillStyle = '#ff9fb2';
    circle(-16, -26, 5); circle(18, -26, 5);
    ctx.fillStyle = '#ff7a95';
    circle(1, -29, 3);
    // 红围巾
    ctx.fillStyle = '#ff6f61';
    ctx.fillRect(-20, -16, 40, 7);
    ctx.restore();
    if (G.bubble > 0) {
      ctx.fillStyle = '#ffffff';
      roundRect(x + 20, y - 150, 74, 52, 18); ctx.fill();
      ctx.font = '32px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🔊', x + 57, y - 124);
    }
  }

  function drawFx() {
    const active = activeQuestion();
    if (active?.item.context) {
      ctx.fillStyle = '#fffbe8';
      roundRect(G.W / 2 - 190, 64, 380, 44, 12); ctx.fill();
      ctx.font = 'bold 24px "PingFang SC", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#3b2a1a';
      ctx.fillText(active.item.context, G.W / 2, 86, 360);
    }
    for (const q of G.particles) {
      ctx.globalAlpha = Math.min(1, q.t * 1.5);
      ctx.fillStyle = q.color;
      circle(q.x, q.y, 5);
    }
    ctx.globalAlpha = 1;
    for (const q of G.popups) {
      ctx.globalAlpha = Math.min(1, q.t * 2);
      ctx.fillStyle = q.color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.font = `bold ${q.size}px "PingFang SC", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeText(q.text, q.x, q.y);
      ctx.fillText(q.text, q.x, q.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawHud() {
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = '30px sans-serif';
    for (let i = 0; i < 3; i++) ctx.fillText(i < G.player.hearts ? '❤️' : '🤍', 20 + i * 40, 36);
    ctx.fillStyle = '#ffffffcc';
    roundRect(150, 16, G.boss ? 110 : 220, 42, 21); ctx.fill();
    ctx.fillStyle = '#5b4210';
    ctx.font = 'bold 24px "PingFang SC", sans-serif';
    ctx.fillText(G.boss ? `🪙 ${G.coins}` : `⭐ ${G.progress}/${level.goal}  🪙 ${G.coins}`, 164, 38);
  }

  // ---------- 循环 ----------
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    G.W = Math.max(640, Math.min(1400, (rect.width / rect.height) * H));
    G.PX = Math.round(G.W * 0.24);
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
  window.addEventListener('resize', resize);
  raf = requestAnimationFrame(frame);
  G.stop = () => { stopped = true; stopVoices(); cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  return G;
}
