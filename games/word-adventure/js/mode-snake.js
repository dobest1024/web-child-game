'use strict';
// ===== 字母小蛇：小蛇一直往前爬，点屏幕 / 方向键 / 滑动 转弯 =====
// task 'letter'：听字母，吃对的字母卡；task 'word'：看图和单词，按顺序吃字母拼出来（不是考拼写）。
// 边缘穿过去从另一边出来，撞到自己不算；只有石头和 Boss 跺脚会掉心，而且都提前看得见。

const SN_COLS = 15, SN_ROWS = 7, SN_CELL = 56;
const SN_X = (960 - SN_COLS * SN_CELL) / 2, SN_Y = 128;
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const KEY_DIRS = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
const ABC = 'abcdefghijklmnopqrstuvwxyz';

MODES.snake = (G, api) => {
  const L = G.L;
  const step = L.step + api.assist * 0.05;
  const options = Math.max(L.task === 'word' ? 0 : 2, L.options - (api.assist >= 1 ? 1 : 0));
  const every = L.boss ? L.boss.every + api.assist * 1.5 : 0;
  const boss = G.boss;
  if (boss) Object.assign(boss, { timer: every, zone: null, warn: 0 });
  let body = [[4, 3], [3, 3], [2, 3]], prev = body.map((c) => [...c]);
  let dir = 'right', queue = [], acc = 0, grow = 0;
  let q = null, wait = 0.8;
  const rocks = [];
  const cellCenter = ([c, r]) => [SN_X + c * SN_CELL + SN_CELL / 2, SN_Y + r * SN_CELL + SN_CELL / 2];
  const same = (a, b) => a[0] === b[0] && a[1] === b[1];
  const occupied = (cell) => body.some((b) => same(b, cell)) || rocks.some((r) => same(r, cell)) || (q && q.tiles.some((t) => !t.gone && t.cell && same(t.cell, cell)));

  function freeCell(minDist) {
    const head = body[0];
    for (let tries = 0; tries < 400; tries++) {
      const cell = [Math.floor(api.random() * SN_COLS), Math.floor(api.random() * SN_ROWS)];
      const d = Math.abs(cell[0] - head[0]) + Math.abs(cell[1] - head[1]);
      if (!occupied(cell) && d >= (tries < 300 ? minDist : 1)) return cell;
    }
    return null;
  }
  // 石头不放在出发那一行，免得一开局就撞上
  for (let i = 0; i < Math.max(0, L.rocks - api.assist); i++) {
    for (let tries = 0; tries < 200; tries++) {
      const cell = [2 + Math.floor(api.random() * (SN_COLS - 4)), Math.floor(api.random() * SN_ROWS)];
      if (cell[1] !== 3 && !occupied(cell) && !rocks.some((r) => Math.abs(r[0] - cell[0]) + Math.abs(r[1] - cell[1]) < 3)) { rocks.push(cell); break; }
    }
  }

  function spawn() {
    const item = api.next();
    q = { item, tiles: [], next: 0, start: G.time, said: 1, done: false };
    if (L.task === 'word') {
      const letters = item.show.split('');
      const extra = ABC.split('').filter((c) => !letters.includes(c)).sort(() => api.random() - 0.5).slice(0, options);
      letters.forEach((c, i) => q.tiles.push({ letter: c, index: i, cell: null }));
      extra.forEach((c) => q.tiles.push({ letter: c, index: -1, cell: null }));
    } else {
      for (const it of makeOptions(item, L.pool, options, api.random)) q.tiles.push({ letter: it.letter, item: it, cell: null });
    }
    for (const t of q.tiles) t.cell = freeCell(3);
    q.tiles = q.tiles.filter((t) => t.cell);
    api.say(item);
  }
  const timeLimit = () => (L.task === 'word' ? 40 + api.assist * 8 : 20 + api.assist * 4);
  const target = () => (q && !q.done ? (L.task === 'word' ? q.tiles.find((t) => t.index === q.next) : q.tiles.find((t) => t.item === q.item)) : null);

  function eat(tile) {
    const [x, y] = cellCenter(tile.cell);
    if (L.task === 'word') {
      if (tile.index === q.next) {
        tile.gone = true;
        q.next++;
        grow++;
        Sound.eat();
        api.say(LETTERS[tile.letter]);
        api.burst(x, y, '#ffd84d', 8);
        if (q.next >= q.item.show.length) {
          q.done = true;
          const delay = Sound.duration(LETTERS[tile.letter].audio) + 0.1;
          wait = delay + Sound.duration(q.item.audio) + 0.1;
          api.correct(q.item, x, y);
          api.popup(q.item.show, x, y - 10, '#2f6fd1', 42);
          api.sayLater(q.item, delay);
        }
        return;
      }
      wrongEat(tile, x, y, tile.index > q.next);
      return;
    }
    if (tile.item === q.item) {
      tile.gone = true;
      q.done = true;
      wait = Math.max(0.8, Sound.duration(tile.item.audio) + 0.1);
      grow++;
      Sound.eat();
      api.correct(q.item, x, y);
      api.say(tile.item);
      return;
    }
    wrongEat(tile, x, y, false);
  }
  // 吃错：扣一节尾巴（最短 3 节）；拼词还要用到的字母换个地方，不会拼不完
  function wrongEat(tile, x, y, stillNeeded) {
    api.wrong(q.item);
    api.burst(x, y, '#c9c9c9', 8);
    if (tile.letter) api.say(LETTERS[tile.letter]);
    api.sayLater(q.item, Sound.duration(LETTERS[tile.letter].audio) + 0.1);
    if (body.length > 3) { body.pop(); prev.pop(); }
    if (stillNeeded) {
      tile.cell = null;
      tile.cell = freeCell(3) || tile.cell;
    } else tile.gone = true;
    q.glow = true;
  }

  function move() {
    if (queue.length) dir = queue.shift();
    const [dx, dy] = DIRS[dir];
    const head = body[0];
    const cell = [(head[0] + dx + SN_COLS) % SN_COLS, (head[1] + dy + SN_ROWS) % SN_ROWS];
    if (rocks.some((r) => same(r, cell))) {
      const [x, y] = cellCenter(cell);
      api.hurt(x, y);
      // 撞到石头不往前走，自己拐个弯（往空的那边）
      const turns = dx ? ['up', 'down'] : ['left', 'right'];
      const free = turns.filter((t) => {
        const [tx, ty] = DIRS[t];
        const c = [(head[0] + tx + SN_COLS) % SN_COLS, (head[1] + ty + SN_ROWS) % SN_ROWS];
        return !rocks.some((r) => same(r, c));
      });
      dir = free.length ? free[Math.floor(api.random() * free.length)] : turns[0];
      prev = body.map((c) => [...c]);
      return;
    }
    prev = body.map((c) => [...c]);
    body.unshift(cell);
    if (grow > 0) { grow--; prev.push(prev[prev.length - 1]); } else body.pop();
    if (q && !q.done) {
      const tile = q.tiles.find((t) => !t.gone && t.cell && same(t.cell, cell));
      if (tile) eat(tile);
    }
  }

  function update(dt) {
    if (!q || q.done) {
      wait -= dt;
      if (wait <= 0) spawn();
    }
    acc += dt;
    while (acc >= step) { acc -= step; move(); }
    if (q && !q.done) {
      if (q.said === 1 && G.time - q.start > 5) { api.say(q.item); q.said = 2; }
      if (G.time - q.start > timeLimit()) {
        // 超时：这题错过，稍后再出
        api.requeue(q.item);
        G.combo = 0;
        q.done = true;
        q.missed = true;
        wait = 0.4;
        api.popup('换一个～', 480, 300, '#8a8a8a', 30);
      }
    }
    if (boss && !boss.dead) {
      if (boss.zone) {
        boss.warn -= dt;
        if (boss.warn <= 0) {
          const [zc, zr] = boss.zone;
          const h = body[0];
          Sound.stomp();
          G.shake = 0.5;
          if (Math.abs(h[0] - zc) <= 1 && Math.abs(h[1] - zr) <= 1) api.hurt(...cellCenter(h));
          boss.zone = null;
          boss.timer = every;
        }
      } else {
        boss.timer -= dt;
        if (boss.timer <= 0) {
          // 跺脚之前先画红圈（1.6 秒），小蛇爬出去就没事
          const h = body[0];
          const pickNear = (v, max) => Math.min(max - 2, Math.max(1, v + Math.floor(api.random() * 5) - 2));
          boss.zone = [pickNear(h[0], SN_COLS), pickNear(h[1], SN_ROWS)];
          boss.warn = 1.6;
          Sound.warn();
        }
      }
    }
  }

  function draw(ctx) {
    drawBackground(ctx, G.world, 960, 540, G.calm ? 0 : G.time, 540);
    // 草地格子
    for (let c = 0; c < SN_COLS; c++) for (let r = 0; r < SN_ROWS; r++) {
      ctx.fillStyle = (c + r) % 2 ? '#bfe6a8' : '#b3df99';
      ctx.fillRect(SN_X + c * SN_CELL, SN_Y + r * SN_CELL, SN_CELL, SN_CELL);
    }
    ctx.strokeStyle = '#8cc56f';
    ctx.lineWidth = 4;
    roundRect(ctx, SN_X - 2, SN_Y - 2, SN_COLS * SN_CELL + 4, SN_ROWS * SN_CELL + 4, 10);
    ctx.stroke();
    if (boss && boss.zone) {
      const [zc, zr] = boss.zone;
      ctx.fillStyle = `rgba(255,70,70,${0.28 + Math.sin(G.time * 16) * 0.12})`;
      ctx.fillRect(SN_X + (zc - 1) * SN_CELL, SN_Y + (zr - 1) * SN_CELL, SN_CELL * 3, SN_CELL * 3);
      const [x, y] = cellCenter(boss.zone);
      text(ctx, '!', x, y, 60, '#d62828');
    }
    for (const r of rocks) {
      const [x, y] = cellCenter(r);
      ctx.fillStyle = '#9a9aa6';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(x, y + 4, 23, 19, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c3c3cc';
      circle(ctx, x - 7, y - 3, 6);
    }
    if (q) {
      const t = target();
      for (const tile of q.tiles) {
        if (tile.gone || !tile.cell) continue;
        const [x, y] = cellCenter(tile.cell);
        const dim = q.done;
        ctx.globalAlpha = dim ? 0.35 : 1;
        if (!dim && q.glow && tile === t) {
          ctx.fillStyle = `rgba(255,236,120,${0.55 + Math.sin(G.time * 8) * 0.25})`;
          roundRect(ctx, x - 30, y - 30, 60, 60, 14); ctx.fill();
        }
        ctx.fillStyle = '#fff8e1';
        ctx.strokeStyle = '#e0a63a';
        ctx.lineWidth = 3;
        roundRect(ctx, x - 25, y - 25, 50, 50, 11); ctx.fill(); ctx.stroke();
        if (L.task === 'word') text(ctx, tile.letter, x, y - 2, 36, '#3b6fd1');
        else drawPic(ctx, { letter: tile.letter }, x, y, 56);
        ctx.globalAlpha = 1;
      }
    }
    drawSnake(ctx);
    // 上方提示：拼词显示图和整个单词（下一个要吃的字母放大），听字母显示小喇叭
    if (q && L.task === 'word') {
      const word = q.item.show;
      ctx.fillStyle = 'rgba(255,255,255,.92)';
      roundRect(ctx, 330, 66, 300, 56, 20); ctx.fill();
      drawPic(ctx, q.item.pic, 372, 94, 50);
      word.split('').forEach((c, i) => {
        const done = i < q.next || q.done, now = i === q.next && !q.done;
        text(ctx, c, 440 + i * 52, 94, now ? 44 : 38, done ? '#43a047' : now ? '#ff6f00' : '#9aa3b5');
        if (now) { ctx.fillStyle = '#ff6f00'; ctx.fillRect(424 + i * 52, 116, 32, 4); }
      });
    } else if (q && !q.done) {
      ctx.fillStyle = 'rgba(255,255,255,.92)';
      roundRect(ctx, 400, 70, 160, 48, 20); ctx.fill();
      text(ctx, '🔊 听一听', 480, 94, 24, '#3a5a8c');
    }
    if (boss) {
      const mood = boss.dead ? 'dead' : boss.hurt ? 'hurt' : boss.zone ? 'warn' : 'idle';
      drawDino(ctx, 760, 82 + (boss.dead ? Math.min(400, boss.dead * 300) : 0), 0.42, { mood, king: true, t: G.time, calm: G.calm });
    }
  }

  function drawSnake(ctx) {
    const k = Math.min(1, acc / step);
    const pts = body.map((c, i) => {
      const p = prev[i] || c;
      const far = Math.abs(p[0] - c[0]) > 1 || Math.abs(p[1] - c[1]) > 1; // 穿墙那一下不插值
      const [x0, y0] = cellCenter(p), [x1, y1] = cellCenter(c);
      return far ? [x1, y1] : [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k];
    });
    const blink = G.inv > 0 && Math.floor(G.time * 12) % 2;
    if (blink) return;
    for (let i = pts.length - 1; i >= 0; i--) {
      const [x, y] = pts[i];
      ctx.fillStyle = i === 0 ? '#5ccf6f' : i % 2 ? '#7bdc85' : '#69d277';
      ctx.strokeStyle = '#2f7a3d';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, i === 0 ? 25 : 21, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    const [hx, hy] = pts[0];
    const [dx, dy] = DIRS[dir];
    const ex = -dy * 9, ey = dx * 9;
    ctx.fillStyle = '#fff';
    circle(ctx, hx + dx * 8 + ex, hy + dy * 8 + ey, 7); circle(ctx, hx + dx * 8 - ex, hy + dy * 8 - ey, 7);
    ctx.fillStyle = INK;
    circle(ctx, hx + dx * 10 + ex, hy + dy * 10 + ey, 3.5); circle(ctx, hx + dx * 10 - ex, hy + dy * 10 - ey, 3.5);
    ctx.fillStyle = '#ff9fb2';
    circle(ctx, hx - dx * 4 + ex * 1.5, hy - dy * 4 + ey * 1.5, 4); circle(ctx, hx - dx * 4 - ex * 1.5, hy - dy * 4 - ey * 1.5, 4);
  }

  function turn(to) {
    const last = queue.length ? queue[queue.length - 1] : dir;
    const [lx, ly] = DIRS[last], [tx, ty] = DIRS[to];
    if (to === last || (lx === -tx && ly === -ty) || queue.length >= 2) return;
    queue.push(to);
    Sound.turn();
  }
  function steer(dx, dy) {
    if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
    const horizontal = Math.abs(dx) > Math.abs(dy);
    const main = horizontal ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    const other = horizontal ? (dy > 0 ? 'down' : 'up') : (dx > 0 ? 'right' : 'left');
    const [mx, my] = DIRS[main], [cx, cy] = DIRS[queue.length ? queue[queue.length - 1] : dir];
    // 点在正后方：改成往点的那一侧拐
    turn(mx === -cx && my === -cy ? other : main);
  }

  return {
    usesHearts: true,
    update, draw,
    tap(x, y) {
      const [hx, hy] = cellCenter(body[0]);
      steer(x - hx, y - hy);
    },
    swipe: steer,
    key(code) {
      if (KEY_DIRS[code]) { turn(KEY_DIRS[code]); return true; }
      return false;
    },
    replay: () => q && !q.done && api.say(q.item),
    bossPos: () => [760, 70], // 别放最右上角：HTML 的 🔊⏸ 按钮在那里
    // 给自测用
    state: () => ({ body, dir, queue, rocks, q, target: target(), step, cellCenter }),
  };
};
