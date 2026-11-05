'use strict';
// ===== 游戏引擎：部件方块慢慢往下掉，放到好朋友旁边（或上面）拼成字 =====
// 坐标都用 CSS 像素；棋盘格子大小随屏幕算（竖屏把目标卡放上面，横屏放右边）

const HANZI_FONT = '"Kaiti SC", "STKaiti", "KaiTi", "BiauKai", "PingFang SC", "Microsoft YaHei", serif';
const UI_FONT = '"PingFang SC", "Microsoft YaHei", sans-serif';
const FAST = 16;     // 按下后快速下落：每秒格数
const DELIVER = 12;  // 送底座、Boss 丢方块的下落速度
const PRAISES = { 3: '连对 3 个！', 5: '拼字小能手！', 8: '太厉害啦！', 12: '汉字小博士！' };

function createGame(canvas, level, world, opts) {
  const ctx = canvas.getContext('2d');
  const random = opts.random || Math.random;
  const assist = Math.min(3, opts.fails || 0);
  const board = createBoard();
  fillStart(board, level.parts, Math.max(0, level.start - assist * 2), random);
  const G = {
    L: level, world, assist, board, known: knownChars(world, level.n),
    calm: !!opts.calm, // 系统设置了减少动态效果：箭头不晃、Boss 不抖不转、不放彩屑
    speed: level.speed * (1 - assist * 0.15),
    time: 0, state: 'play', paused: false, ended: false, endTimer: 0, why: '',
    progress: 0, wrong: 0, misses: 0, combo: 0, coins: 0, sayAt: 0,
    q: null, qCount: 0, bag: [], retry: [], missCount: {}, lastTarget: null,
    anim: null, junk: null, popups: [], particles: [], shots: [],
    broomCool: 0, danger: false,
    boss: level.boss ? { hp: level.boss.hp, max: level.boss.hp, timer: level.boss.every + assist * 3, warn: 0, col: -1, hurt: 0, dead: 0 } : null,
    view: null,
  };

  // ---------- 出题 ----------
  function nextTarget() {
    const due = G.retry.findIndex((r) => r.due <= G.qCount);
    if (due >= 0) return G.retry.splice(due, 1)[0].target;
    if (!G.bag.length) {
      G.bag = level.chars.map((c) => [random(), c]).sort((a, b) => a[0] - b[0]).map((v) => v[1]);
      if (G.bag.length > 1 && G.bag[0] === G.lastTarget) G.bag.push(G.bag.shift());
    }
    return G.bag.shift();
  }
  function newQuestion() {
    if (G.state !== 'play') return;
    const target = nextTarget();
    G.lastTarget = target;
    G.qCount++;
    G.q = { target, ...splitTarget(target, random), near: 0, phase: 'fall', col: 0, x: 0, y: -1, dropping: false, t: 0,
      hint: Boolean(level.tutorial && G.qCount <= 2) };
    if (G.sayAt <= G.time) say(target); // 刚拼对一个字时，等它和组词念完再报新字（update 里补上）
    prepare();
  }
  // 有能用的底座就直接出方块，没有就先送一块底座下来
  function prepare() {
    const q = G.q;
    if (answerColumns(board, q.target, q.piece).length) return spawnPiece();
    const col = deliveryColumn(board, q, random);
    if (col < 0) return finish(false, '方块堆满啦');
    q.phase = 'deliver';
    q.deliver = { col, y: -1, part: q.base };
  }
  function spawnPiece() {
    const q = G.q;
    const col = spawnColumn(board, q.target, q.piece, random);
    if (col < 0) return finish(false, '方块堆满啦');
    Object.assign(q, { phase: 'fall', col, x: col, y: -1, dropping: false, t: 0 });
  }
  function requeue(target) {
    if (!G.retry.some((r) => r.target === target)) G.retry.push({ target, due: G.qCount + 2 });
    G.missCount[target] = (G.missCount[target] || 0) + 1;
  }

  // ---------- 输入 ----------
  const landRow = (c) => board.rows - 1 - height(board, c);
  const canEnter = (c) => G.q && hasRoom(board, c) && G.q.y <= landRow(c) + 0.01;
  const playing = () => !G.paused && G.state === 'play' && G.q && G.q.phase === 'fall';
  G.moveTo = (c) => {
    if (!playing() || c < 0 || c >= board.cols || c === G.q.col) return false;
    if (!canEnter(c)) { G.blocked = { col: c, t: 0.4 }; Sound.wrong(); return false; }
    G.q.col = c;
    return true;
  };
  G.move = (dir) => G.moveTo(G.q ? G.q.col + dir : -1);
  G.drop = () => { if (playing()) G.q.dropping = true; };
  G.replay = () => { G.sayAt = 0; if (G.q) say(G.q.target); };
  // 屏幕坐标（CSS 像素）→ 第几列；不在棋盘上返回 -1
  G.columnAt = (x, y) => {
    const v = G.view;
    if (!v || x < v.bx || x >= v.bx + v.cell * board.cols || y < v.by - v.cell * 1.5 || y > v.by + v.cell * board.rows) return -1;
    return Math.floor((x - v.bx) / v.cell);
  };

  function say(target) {
    Sound.say(charAudio(target));
  }
  function popup(text, x, y, color = '#ff7a45', size = 26, t = 1.3) {
    G.popups.push({ text, x, y, t, color, size });
  }
  function burst(x, y, color, n = 14) {
    if (G.calm) return;
    for (let i = 0; i < n; i++) {
      const a = random() * Math.PI * 2, v = 80 + random() * 200;
      G.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 100, t: 0.8, color });
    }
  }

  // ---------- 落地判定 ----------
  function land() {
    const q = G.q;
    const c = q.col;
    const res = judge(board, c, q.piece, q.target, G.known);
    // 兜底：同一题最多弹回两次，第三次就先放下，题目稍后再来，永远不会卡住
    if (res.kind === 'near' && q.near >= 2) res.kind = 'stack';
    const from = { col: c, row: landRow(c) };
    if (res.kind === 'right' || res.kind === 'bonus') {
      const baseRow = board.rows - height(board, res.baseCol);
      const to = res.layout === 'tb' ? { col: res.baseCol, row: baseRow - 1 } : { col: res.baseCol + (res.baseCol < c ? 1 : -1), row: baseRow };
      q.phase = 'anim';
      G.anim = { type: res.kind, t: 0, dur: 0.45, from, to, res, part: q.piece };
      Sound.pop();
    } else if (res.kind === 'near') {
      q.near++;
      q.hint = true;
      G.wrong++;
      G.combo = 0;
      q.phase = 'anim';
      G.anim = { type: 'bounce', t: 0, dur: 0.5, from, part: q.piece };
      Sound.wrong();
      const ch = CHARS[q.target];
      const where = ch.layout === 'tb' ? '上面' : ch.parts[0] === q.piece && ch.parts[1] !== q.piece ? '左边' : '右边';
      const tip = ch.layout === 'tb' ? `「${q.target}」是上下结构，${q.piece} 要叠在 ${q.base} 的${where}` : `「${q.target}」是左右结构，${q.piece} 在${where}`;
      const p = cellCenter(c, from.row);
      popup(tip, G.view ? G.view.w / 2 : p.x, p.y - 30, '#e0663b', 20, 2.2);
    } else {
      push(board, c, q.piece);
      G.wrong++;
      G.misses++;
      G.combo = 0;
      requeue(q.target);
      q.phase = 'anim';
      G.anim = { type: 'stack', t: 0, dur: 0.35 };
      Sound.thud();
      const p = cellCenter(c, from.row);
      popup(`先放这儿，等会儿再拼「${q.target}」`, G.view ? G.view.w / 2 : p.x, p.y - 30, '#8a7a6a', 18, 1.6);
    }
  }

  function finishAnim() {
    const a = G.anim;
    G.anim = null;
    const q = G.q;
    if (a.type === 'bounce') return Object.assign(q, { phase: 'fall', y: -1, dropping: false, t: 0 });
    if (a.type === 'stack') return newQuestion();
    const { res } = a;
    pop(board, res.baseCol);
    const ch = CHARS[res.char];
    const p = cellCenter(a.to.col, a.to.row);
    burst(p.x, p.y, '#ffd84d', 18);
    opts.onLearn(res.char);
    const ids = [charAudio(res.char)];
    if (WORD_AUDIO.includes(ch.word)) ids.push(wordAudio(ch.word));
    G.sayAt = G.time + Sound.sequence(ids, 0.12);
    if (a.type === 'bonus') {
      G.coins += 1;
      popup(`也拼出了「${res.char}」！`, p.x, p.y - 40, '#3aa776', 24);
      return prepare(); // 同一题再来一块
    }
    G.combo++;
    G.coins += 2;
    Sound.right();
    G.big = { char: res.char, ch, t: 1.5 };
    if (PRAISES[G.combo]) popup(PRAISES[G.combo], G.view ? G.view.w / 2 : p.x, p.y - 80, '#ff6fa5', 32);
    if (G.combo % 3 === 0) broom('连对 3 个，小扫帚来帮忙！');
    if (G.boss) {
      G.shots.push({ char: res.char, x0: p.x, y0: p.y, t: 0 });
    } else {
      G.progress++;
      popup('+⭐', p.x, p.y - 30, '#f5a623', 30);
      if (G.progress >= level.goal) return finish(true);
    }
    newQuestion();
  }

  // 扫掉一块：从最高的列拿，但不拿当前要用的底座
  function broom(text) {
    const order = [...board.stacks.keys()].filter((c) => height(board, c) > 0).sort((a, b) => height(board, b) - height(board, a));
    for (const c of order) {
      const block = pop(board, c);
      const q = G.q;
      const stillOk = !q || q.phase !== 'fall' || answerColumns(board, q.target, q.piece).length > 0;
      if (stillOk) {
        const p = cellCenter(c, board.rows - height(board, c) - 1);
        burst(p.x, p.y, '#9fd6ff', 12);
        G.sweep = { col: c, t: 0.6, part: block.part };
        if (text) popup(text, G.view ? G.view.w / 2 : p.x, p.y - 20, '#2f7fc1', 22);
        Sound.broom();
        return true;
      }
      push(board, c, block.part);
    }
    return false;
  }

  function finish(win, why = '') {
    if (G.state !== 'play') return;
    G.state = win ? 'win' : 'fail';
    G.why = why;
    G.endTimer = win ? (G.boss ? 1.6 : 0.9) : 1.2;
    if (win) Sound.win();
  }
  function result() {
    const stars = G.wrong <= 1 ? 3 : G.wrong <= 4 ? 2 : 1;
    const hardest = Object.entries(G.missCount).sort((a, b) => b[1] - a[1])[0];
    return {
      win: G.state === 'win', stars, why: G.why, wrong: G.wrong, misses: G.misses,
      coins: G.coins + (G.state === 'win' ? stars * 5 + (G.boss ? 10 : 0) : 0),
      hardest: hardest && hardest[0],
    };
  }

  // ---------- 更新 ----------
  function update(dt) {
    G.time += dt;
    updateFx(dt);
    if (G.state !== 'play') {
      if (G.boss && G.boss.dead) G.boss.dead += dt;
      G.endTimer -= dt;
      if (G.endTimer <= 0 && !G.ended) {
        G.ended = true;
        opts.onEnd(result());
      }
      return;
    }
    if (!G.q) newQuestion();
    if (G.sayAt && G.time >= G.sayAt) G.replay();
    const q = G.q;
    if (!q || G.state !== 'play') return;
    if (G.anim) {
      G.anim.t += dt;
      if (G.anim.t >= G.anim.dur) finishAnim();
    } else if (q.phase === 'deliver') {
      q.deliver.y += DELIVER * dt;
      if (q.deliver.y >= landRow(q.deliver.col)) {
        push(board, q.deliver.col, q.deliver.part);
        Sound.thud();
        q.deliver = null;
        spawnPiece();
      }
    } else if (q.phase === 'fall') {
      q.t += dt;
      q.x += (q.col - q.x) * Math.min(1, dt * 18);
      q.y += (q.dropping ? FAST : G.speed) * dt;
      if (!q.hint && assist >= 1 && q.t > 5) q.hint = true;
      if (q.y >= landRow(q.col)) {
        q.y = landRow(q.col);
        land();
      }
    }
    updateJunk(dt);
    if (G.boss) updateBoss(dt);
    G.danger = maxHeight(board) >= board.rows - 2;
    G.broomCool = Math.max(0, G.broomCool - dt);
    if (G.danger && assist >= 1 && G.broomCool <= 0 && G.q && G.q.phase === 'fall') {
      if (broom('快满啦，小扫帚来帮忙！')) G.broomCool = 6;
    }
  }

  // ---------- Boss：先预警，再往一列丢一块乱七八糟的方块 ----------
  function updateBoss(dt) {
    const B = G.boss;
    B.hurt = Math.max(0, B.hurt - dt);
    for (const s of G.shots) {
      s.t += dt / 0.45;
      if (s.t >= 1 && !s.done) {
        s.done = true;
        B.hp--;
        B.hurt = 0.5;
        G.progress = B.max - B.hp;
        Sound.boss();
        const p = bossCenter();
        burst(p.x, p.y, '#b98cff', 20);
        popup(B.hp > 0 ? '打中啦！' : '没电啦～', p.x, p.y + 60, '#8a5cf6', 26);
        if (B.hp <= 0) { B.dead = 0.01; finish(true); }
      }
    }
    G.shots = G.shots.filter((s) => !s.done);
    const q = G.q;
    if (B.dead || !q || q.phase !== 'fall' || G.junk) return;
    if (B.warn > 0) {
      B.warn -= dt;
      if (B.warn <= 0) {
        if (hasRoom(board, B.col)) G.junk = { col: B.col, y: -1, part: level.parts[Math.floor(random() * level.parts.length)] };
        B.col = -1;
        B.timer = level.boss.every + assist * 3;
      }
      return;
    }
    B.timer -= dt;
    if (B.timer > 0) return;
    // 不丢在方块正在落的列、答案列和底座列，也不在快满的时候丢
    const keep = new Set([q.col]);
    for (const c of answerColumns(board, q.target, q.piece)) {
      keep.add(c);
      judgeBases(c).forEach((b) => keep.add(b));
    }
    const open = [...board.stacks.keys()].filter((c) => !keep.has(c) && hasRoom(board, c, 2));
    if (!open.length || maxHeight(board) >= board.rows - 3) { B.timer = 3; return; }
    open.sort((a, b) => height(board, a) - height(board, b));
    B.col = open[0];
    B.warn = 1.4;
    Sound.warn();
    popup('嘿嘿，乱丢一块！', bossCenter().x, bossCenter().y + 70, '#8a5cf6', 20);
  }
  function judgeBases(c) {
    const r = judge(board, c, G.q.piece, G.q.target);
    return r.kind === 'right' ? [r.baseCol] : [];
  }
  function updateJunk(dt) {
    const j = G.junk;
    if (!j) return;
    j.y += DELIVER * dt;
    if (j.y >= landRow(j.col)) {
      push(board, j.col, j.part);
      G.junk = null;
      Sound.thud();
      const q = G.q;
      // 方块刚好挪到这一列：让它停在新顶上
      if (q && q.phase === 'fall' && q.col === j.col && q.y > landRow(q.col)) q.y = landRow(q.col);
      if (q && q.phase === 'fall' && !answerColumns(board, q.target, q.piece).length) prepare();
    }
  }

  function updateFx(dt) {
    for (const p of G.popups) { p.t -= dt; p.y -= 30 * dt; }
    G.popups = G.popups.filter((p) => p.t > 0);
    for (const p of G.particles) { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; }
    G.particles = G.particles.filter((p) => p.t > 0);
    if (G.big) { G.big.t -= dt; if (G.big.t <= 0) G.big = null; }
    if (G.sweep) { G.sweep.t -= dt; if (G.sweep.t <= 0) G.sweep = null; }
    if (G.blocked) { G.blocked.t -= dt; if (G.blocked.t <= 0) G.blocked = null; }
  }

  // ---------- 布局 ----------
  // 棋盘上面留 HEAD 格：刚出现的方块（第 -1 行）和提示箭头在这里，不出屏、不压目标卡
  const HEAD = 0.9;
  function computeView(w, h) {
    const hud = 60;
    const portrait = h > w * 1.05;
    let cell, bx, by, card, boss, hudX;
    if (portrait) {
      const cardH = Math.max(118, Math.min(160, h * 0.2));
      const availH = h - hud - cardH - 26;
      cell = Math.floor(Math.min(availH / (board.rows + HEAD), (w - 28) / board.cols));
      bx = (w - cell * board.cols) / 2;
      by = hud + cardH + 16 + cell * HEAD + Math.max(0, availH - cell * (board.rows + HEAD)) / 2;
      const cardW = w - 24;
      card = { x: 12, y: hud + 4, w: G.boss ? cardW * 0.64 : cardW, h: cardH };
      if (G.boss) boss = { x: 12 + cardW * 0.66, y: hud + 4, w: cardW * 0.34, h: cardH };
      hudX = 12;
    } else {
      // 横屏：棋盘从最上面开始，分数牌挪到右边一栏的上面
      const availH = h - hud - 18;
      const boardH = h - 30;
      cell = Math.floor(Math.min(boardH / (board.rows + HEAD), (w * 0.52) / board.cols));
      const sideW = Math.min(360, w - cell * board.cols - 60);
      bx = Math.max(16, (w - cell * board.cols - sideW - 30) / 2);
      by = 12 + cell * HEAD + (boardH - cell * (board.rows + HEAD)) / 2;
      const sx = bx + cell * board.cols + 30;
      const bossH = G.boss ? Math.min(170, availH * 0.38) : 0;
      if (G.boss) boss = { x: sx, y: hud, w: sideW, h: bossH };
      card = { x: sx, y: hud + bossH + (G.boss ? 12 : 0), w: sideW, h: Math.min(260, availH - bossH - 12) };
      hudX = sx;
    }
    return { w, h, portrait, cell, bx, by, card, boss, hudX };
  }
  function cellCenter(col, row) {
    const v = G.view || { bx: 0, by: 0, cell: 60 };
    return { x: v.bx + (col + 0.5) * v.cell, y: v.by + (row + 0.5) * v.cell };
  }
  function bossCenter() {
    const b = G.view && G.view.boss;
    return b ? { x: b.x + b.w / 2, y: b.y + b.h * 0.5 } : { x: 0, y: 0 };
  }

  // ---------- 绘制 ----------
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  function text(str, x, y, size, color, font = UI_FONT, weight = 'bold', align = 'center') {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }
  // 一块部件方块：偏旁是薄荷绿，独立的字是暖黄
  function drawBlock(part, x, y, s, style = {}) {
    const radical = RADICAL_NAMES[part];
    ctx.globalAlpha = style.alpha ?? 1;
    if (style.glow) {
      ctx.fillStyle = `rgba(255,220,90,${0.45 + Math.sin(G.time * 8) * 0.25})`;
      rr(x - 5, y - 5, s + 10, s + 10, s * 0.24);
      ctx.fill();
    }
    ctx.fillStyle = style.fill || (radical ? '#c6eedb' : '#ffe7a8');
    ctx.strokeStyle = style.stroke || (radical ? '#4ea783' : '#d39a2c');
    ctx.lineWidth = Math.max(2, s * 0.05);
    rr(x + 2, y + 2, s - 4, s - 4, s * 0.2);
    ctx.fill();
    ctx.stroke();
    text(part, x + s / 2, y + s * (radical ? 0.44 : 0.52), s * 0.62, style.ink || '#3d2a10', HANZI_FONT);
    if (radical) text(radical, x + s / 2, y + s * 0.84, Math.max(9, s * 0.16), '#3c7a60', UI_FONT, 'normal');
    ctx.globalAlpha = 1;
  }

  function draw() {
    const v = G.view;
    const sky = ctx.createLinearGradient(0, 0, 0, v.h);
    sky.addColorStop(0, world.sky[0]);
    sky.addColorStop(1, world.sky[1]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, v.w, v.h);
    drawBoard();
    drawCard();
    if (G.boss) drawBoss();
    drawShots();
    drawFx();
    drawHud();
  }

  function drawBoard() {
    const v = G.view, s = v.cell, q = G.q;
    const W = s * board.cols, Hh = s * board.rows;
    ctx.fillStyle = '#fffdf4';
    rr(v.bx - 8, v.by - 8, W + 16, Hh + 16, 18);
    ctx.fill();
    ctx.strokeStyle = '#e8dcc0';
    ctx.lineWidth = 3;
    ctx.stroke();
    // 快满的提示：顶上两行变成粉红色
    if (G.danger) {
      ctx.fillStyle = `rgba(255,120,120,${0.16 + Math.sin(G.time * 6) * 0.08})`;
      ctx.fillRect(v.bx, v.by, W, s * 2);
    }
    ctx.strokeStyle = '#f1e8d2';
    ctx.lineWidth = 1;
    for (let c = 1; c < board.cols; c++) { ctx.beginPath(); ctx.moveTo(v.bx + c * s, v.by); ctx.lineTo(v.bx + c * s, v.by + Hh); ctx.stroke(); }
    // 提示：答案列亮起来，上面有箭头
    const answers = q && q.phase === 'fall' && q.hint ? answerColumns(board, q.target, q.piece) : [];
    for (const c of answers) {
      ctx.fillStyle = 'rgba(120,210,140,0.18)';
      ctx.fillRect(v.bx + c * s, v.by, s, Hh);
      const bob = G.calm ? 0 : Math.sin(G.time * 6) * 5;
      text('⬇', v.bx + (c + 0.5) * s, v.by - s * 0.55 + bob, s * 0.5, '#3aa776');
    }
    if (G.blocked) {
      ctx.fillStyle = 'rgba(255,110,110,0.2)';
      ctx.fillRect(v.bx + G.blocked.col * s, v.by, s, Hh);
    }
    // Boss 预警：红箭头 + 落点虚线框
    if (G.boss && G.boss.warn > 0 && G.boss.col >= 0) {
      const c = G.boss.col, r = landRow(c);
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = '#e8505b';
      ctx.lineWidth = 3;
      rr(v.bx + c * s + 4, v.by + r * s + 4, s - 8, s - 8, s * 0.18);
      ctx.stroke();
      ctx.setLineDash([]);
      text('⬇', v.bx + (c + 0.5) * s, v.by - s * 0.55 + (G.calm ? 0 : Math.sin(G.time * 20) * 3), s * 0.55, '#e8505b');
    }
    // 方块
    const glowBase = q && q.phase === 'fall' && (q.near > 0 || q.hint);
    const baseCols = glowBase ? new Set(answerColumns(board, q.target, q.piece).flatMap(judgeBases)) : new Set();
    board.stacks.forEach((stack, c) => stack.forEach((block, i) => {
      const r = board.rows - 1 - i;
      const isTop = i === stack.length - 1;
      const hiding = G.anim && G.anim.res && G.anim.res.baseCol === c && isTop && G.anim.t > G.anim.dur * 0.7;
      if (hiding) return;
      drawBlock(block.part, v.bx + c * s, v.by + r * s, s, { glow: isTop && baseCols.has(c) });
    }));
    if (G.sweep) {
      ctx.globalAlpha = Math.max(0, G.sweep.t / 0.6);
      text('🧹', v.bx + (G.sweep.col + 0.5) * s, v.by + (landRow(G.sweep.col) + 0.3) * s, s * 0.7, '#000');
      ctx.globalAlpha = 1;
    }
    // 送来的底座
    if (q && q.phase === 'deliver' && q.deliver) {
      const d = q.deliver;
      drawBlock(d.part, v.bx + d.col * s, v.by + d.y * s, s, { fill: '#fff1c9' });
      text('送来啦', v.bx + (d.col + 0.5) * s, v.by + d.y * s - 12, 14, '#8a6a2a');
    }
    if (G.junk) drawBlock(G.junk.part, v.bx + G.junk.col * s, v.by + G.junk.y * s, s, { fill: '#e3d6ff', stroke: '#8a5cf6' });
    // 正在落的方块和它的影子
    if (q && q.phase === 'fall') {
      const r = landRow(q.col);
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = '#c49a4c';
      ctx.lineWidth = 2;
      rr(v.bx + q.col * s + 6, v.by + r * s + 6, s - 12, s - 12, s * 0.16);
      ctx.stroke();
      ctx.setLineDash([]);
      drawBlock(q.piece, v.bx + q.x * s, v.by + q.y * s, s, { fill: '#ffd35e', stroke: '#c9822a' });
    }
    if (G.anim && G.anim.part) {
      const a = G.anim, k = Math.min(1, a.t / a.dur);
      if (a.type === 'bounce') {
        const y = a.from.row + (-1 - a.from.row) * k - Math.sin(k * Math.PI) * 1.2;
        drawBlock(a.part, v.bx + a.from.col * s, v.by + y * s, s, { fill: '#ffd35e', stroke: '#c9822a' });
      } else {
        const x = a.from.col + (a.to.col - a.from.col) * k, y = a.from.row + (a.to.row - a.from.row) * k;
        drawBlock(a.part, v.bx + x * s, v.by + y * s, s, { fill: '#ffd35e', stroke: '#c9822a', alpha: 1 - Math.max(0, k - 0.7) * 3 });
        if (k > 0.6) text(a.res.char, v.bx + (a.to.col + 0.5) * s, v.by + (a.to.row + 0.5) * s, s * (0.7 + k * 0.5), '#e0663b', HANZI_FONT);
      }
    }
    // 拼对后的大字：字、拼音、组词
    if (G.big) {
      const b = G.big, k = Math.min(1, (1.5 - b.t) * 4);
      ctx.globalAlpha = Math.min(1, b.t * 2);
      const cx = v.bx + W / 2, cy = v.by + Hh * 0.38;
      ctx.fillStyle = '#fffaf0ee';
      rr(cx - s * 1.6, cy - s * 1.25, s * 3.2, s * 2.6, 22);
      ctx.fill();
      text(b.ch.py, cx, cy - s * 0.85, s * 0.32, '#e0663b');
      text(b.char, cx, cy, s * 1.2 * (0.6 + 0.4 * k), '#3d2a10', HANZI_FONT);
      text(`${b.ch.word} ${b.ch.emoji}`, cx, cy + s * 0.9, s * 0.3, '#4f6e57');
      ctx.globalAlpha = 1;
    }
  }

  // 目标卡：要拼的字 + 拼音 + 结构图（一半已经给了，另一半等你放）
  function drawCard() {
    const v = G.view, c = v.card, q = G.q;
    ctx.fillStyle = '#ffffffdd';
    rr(c.x, c.y, c.w, c.h, 18);
    ctx.fill();
    if (!q) return;
    const ch = CHARS[q.target];
    const big = Math.min(c.h * 0.5, c.w * 0.3);
    const left = c.x + Math.max(big * 0.75, c.w * 0.2);
    text(ch.py, left, c.y + c.h * 0.17, Math.max(14, big * 0.3), '#e0663b');
    text(q.target, left, c.y + c.h * 0.5, big, '#3d2a10', HANZI_FONT);
    text(`${ch.word} ${ch.emoji}`, left, c.y + c.h * 0.84, Math.max(13, big * 0.24), '#4f6e57');
    // 结构图
    const slot = Math.min((c.w - (left - c.x) - big * 0.6 - 20) / 2.4, c.h * 0.36);
    const gx = left + big * 0.6 + 10;
    const gy = c.y + c.h * 0.5;
    const showPiece = level.formula || assist >= 3;
    const pieceSlot = (x, y) => {
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = '#d39a2c';
      ctx.lineWidth = 2;
      rr(x + 3, y + 3, slot - 6, slot - 6, slot * 0.18);
      ctx.stroke();
      ctx.setLineDash([]);
      if (showPiece) drawBlock(q.piece, x, y, slot, { alpha: 0.45 });
      else text('?', x + slot / 2, y + slot / 2, slot * 0.5, '#d39a2c');
    };
    const slots = ch.layout === 'lr'
      ? [[gx, gy - slot / 2], [gx + slot, gy - slot / 2]]
      : [[gx + slot / 2, gy - slot], [gx + slot / 2, gy]];
    const pieceIndex = ch.layout === 'tb' ? 0 : q.side === 'left' ? 0 : 1;
    slots.forEach(([x, y], i) => (i === pieceIndex ? pieceSlot(x, y) : drawBlock(q.base, x, y, slot)));
    text(ch.layout === 'lr' ? '左右结构' : '上下结构', gx + slot, c.y + c.h * 0.12, Math.max(12, slot * 0.22), '#8a7a6a', UI_FONT, 'normal');
    if (level.tutorial && G.qCount <= 2 && q.phase === 'fall') {
      // 竖屏卡片下面紧挨着棋盘，提示写在卡片右下角
      if (v.portrait) text('👆 点一下亮起来的那一列！', c.x + c.w * 0.64, c.y + c.h - 13, 14, '#e0663b');
      else text('👆 点一下亮起来的那一列！', c.x + c.w / 2, c.y + c.h + 16, 16, '#e0663b');
    }
  }

  function drawBoss() {
    const B = G.boss, box = G.view.boss;
    if (!box) return;
    ctx.fillStyle = '#f3ecffdd';
    rr(box.x, box.y, box.w, box.h, 18);
    ctx.fill();
    const fall = B.dead ? Math.min(60, B.dead * 80) : 0;
    const r = Math.min(box.w, box.h) * 0.26;
    const wob = G.calm ? 0 : 1;
    const cx = box.x + box.w / 2 + (B.hurt ? Math.sin(G.time * 60) * 5 * wob : 0);
    const cy = box.y + box.h * 0.5 + Math.sin(G.time * 2.4) * 4 * wob + fall;
    ctx.globalAlpha = B.dead ? Math.max(0, 1 - B.dead) : 1;
    ctx.fillStyle = B.hurt ? '#ffffff' : level.n === 10 ? '#8f7ae6' : '#b394f2';
    circle(cx - r * 0.7, cy + r * 0.1, r * 0.7); circle(cx, cy - r * 0.25, r * 0.85); circle(cx + r * 0.7, cy + r * 0.1, r * 0.7); circle(cx, cy + r * 0.35, r * 0.75);
    // 身边转圈的乱部件
    level.parts.slice(0, 4).forEach((p, i) => {
      const a = G.time * 1.4 * wob + (i * Math.PI) / 2;
      text(p, cx + Math.cos(a) * r * 1.5, cy + Math.sin(a) * r * 0.9, r * 0.45, '#5a3d9a', HANZI_FONT);
    });
    ctx.fillStyle = '#fff';
    circle(cx - r * 0.32, cy - r * 0.25, r * 0.22); circle(cx + r * 0.32, cy - r * 0.25, r * 0.22);
    ctx.fillStyle = '#1f1f2e';
    circle(cx - r * 0.29, cy - r * 0.22, r * 0.1); circle(cx + r * 0.35, cy - r * 0.22, r * 0.1);
    ctx.strokeStyle = '#1f1f2e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.12, r * 0.28, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // 血条（写在 Boss 框里，不压目标卡）
    const bw = box.w - 24;
    ctx.fillStyle = '#ffffff';
    rr(box.x + 12, box.y + 10, bw, 22, 11);
    ctx.fill();
    ctx.fillStyle = '#a678f5';
    rr(box.x + 14, box.y + 12, (bw - 4) * (B.hp / B.max), 18, 9);
    ctx.fill();
    text(`${level.boss.name} ${B.hp}/${B.max}`, box.x + box.w / 2, box.y + 21, 13, '#3a2470');
    // 预警的"！"：头顶紧挨着血条，画在头的右上角，最后画免得被血条盖住
    if (B.warn > 0 && !B.dead) text('!', cx + r * 1.2, cy - r * 0.75, r * 0.95, '#ff4d4d');
  }

  function drawShots() {
    const p = bossCenter();
    for (const s of G.shots) {
      const t = Math.min(1, s.t);
      const x = s.x0 + (p.x - s.x0) * t, y = s.y0 + (p.y - s.y0) * t - Math.sin(t * Math.PI) * 60;
      ctx.fillStyle = '#ffef8a';
      circle(x, y, 22);
      text(s.char, x, y + 1, 26, '#5a3d0c', HANZI_FONT);
    }
  }

  function drawFx() {
    for (const p of G.particles) {
      ctx.globalAlpha = Math.min(1, p.t * 1.5);
      ctx.fillStyle = p.color;
      circle(p.x, p.y, 4);
    }
    ctx.globalAlpha = 1;
    for (const p of G.popups) {
      ctx.globalAlpha = Math.min(1, p.t * 2);
      ctx.font = `bold ${p.size}px ${UI_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#ffffff';
      const maxW = G.view.w - 20;
      ctx.strokeText(p.text, p.x, p.y, maxW);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y, maxW);
    }
    ctx.globalAlpha = 1;
  }

  function drawHud() {
    const x = G.view.hudX, pillW = G.boss ? 120 : 150;
    ctx.fillStyle = '#ffffffcc';
    rr(x, 12, pillW, 38, 19);
    ctx.fill();
    text(G.boss ? `🪙 ${G.coins}` : `⭐ ${G.progress}/${level.goal}  🪙 ${G.coins}`, x + 14, 31, 19, '#5b4210', UI_FONT, 'bold', 'left');
    if (G.combo >= 2) text(`连对 ×${G.combo}`, x + pillW + 10, 31, 16, '#ff6fa5', UI_FONT, 'bold', 'left');
  }

  // ---------- 循环 ----------
  function resize() {
    const dpr = Math.min(2, (typeof window === 'object' && window.devicePixelRatio) || 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    G.view = computeView(rect.width, rect.height);
    G.dpr = dpr;
  }
  let last = 0, raf = 0;
  function frame(t) {
    const dt = Math.min(0.033, (t - last) / 1000 || 0);
    last = t;
    if (!G.paused) update(dt);
    ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    draw();
    raf = requestAnimationFrame(frame);
  }
  resize();
  window.addEventListener('resize', resize);
  raf = requestAnimationFrame(frame);
  G.stop = () => { Sound.stopVoice(); cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  G.answerColumns = () => (G.q && G.q.phase === 'fall' ? answerColumns(board, G.q.target, G.q.piece) : []);
  return G;
}
