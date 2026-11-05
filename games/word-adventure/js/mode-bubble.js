'use strict';
// ===== 吹泡泡：一组泡泡往上飘，听音戳对画着那个东西的泡泡 =====
// 同一时间只有一组泡泡（就是当前这道题）；飘出屏幕还没戳对，就算错过，稍后再出。
// Boss 关：恐龙每隔几秒跺一次脚（先冒感叹号），答对就能打断它；跺到了掉一颗心。

const BUBBLE_R = 66;

MODES.bubble = (G, api) => {
  const L = G.L;
  const left = 80, right = G.boss ? 620 : 880;
  const options = Math.max(2, L.options - (api.assist >= 1 ? 1 : 0));
  const rise = L.rise * (1 - api.assist * 0.12);
  const every = L.boss ? L.boss.every + api.assist * 2 : 0;
  let group = null;
  let leaving = []; // 上一题剩下的泡泡：继续飘走，但不能再戳
  let wait = 0.8;
  let repeat = null;
  let cursor = 0, keyboard = false;
  const boss = G.boss;
  if (boss) Object.assign(boss, { timer: every, warned: false });

  function spawn() {
    if (group) leaving.push(...group.bubbles.filter((b) => b.state !== 'popped'));
    const item = api.next();
    const tutorial = L.tutorial && G.asked === 1;
    const list = tutorial ? [item] : makeOptions(item, L.pool, options, api.random);
    const gap = (right - left) / list.length;
    const bubbles = list.map((it, i) => ({
      item: it, x: left + gap * (i + 0.5), y: 540 + BUBBLE_R + api.random() * 50,
      phase: api.random() * 6, state: 'idle', pop: 0, wob: 0,
    }));
    group = { item, bubbles, said: 0, saidAt: 0, done: false, tutorial };
    cursor = 0;
    api.say(item);
    group.said = 1;
    group.saidAt = G.time;
  }
  const answer = () => group && group.bubbles.find((b) => b.item === group.item);
  const live = () => (group && !group.done ? group.bubbles.filter((b) => b.state === 'idle').sort((a, b) => a.x - b.x) : []);

  function pick(b) {
    if (!group || group.done || b.state !== 'idle') return;
    repeat = null;
    Sound.pop();
    if (b.item === group.item) {
      b.state = 'popped';
      group.done = true;
      wait = Math.max(0.9, Sound.duration(b.item.audio) + 0.1);
      api.correct(group.item, b.x, b.y);
      api.popup(group.item.show, b.x, b.y + 10, '#2f6fd1', 40);
      api.say(b.item);
      if (boss) { boss.timer = every; boss.warned = false; }
    } else {
      b.state = 'wrong';
      b.wob = 1;
      api.wrong(group.item);
      // 先读出戳到的是什么，再把要找的读一遍，听听不一样在哪
      api.say(b.item);
      repeat = { group, left: Sound.duration(b.item.audio) + 0.1 };
    }
  }

  function update(dt) {
    if (repeat) {
      repeat.left -= dt;
      if (repeat.left <= 0) {
        if (repeat.group === group && !group.done) api.say(group.item);
        repeat = null;
      }
    }
    if (!group || group.done) {
      wait -= dt;
      if (wait <= 0) spawn();
    }
    for (const b of leaving) b.y -= rise * 1.6 * dt;
    leaving = leaving.filter((b) => b.y > -BUBBLE_R * 2);
    if (group) {
      for (const b of group.bubbles) {
        b.y -= rise * dt * (b.state === 'popped' ? 0 : 1);
        b.wob = Math.max(0, b.wob - dt * 2);
        if (b.state === 'popped') b.pop += dt;
      }
      const a = answer();
      // 飘到一半还没戳：再读一遍
      if (!group.done && group.said === 1 && a.y < 300 && G.time - group.saidAt > 2) {
        api.say(group.item);
        group.said = 2;
      }
      // 正确的泡泡飘出屏幕：这题错过了，稍后再来
      if (!group.done && a.y < -BUBBLE_R) {
        api.requeue(group.item);
        G.combo = 0;
        group.done = true;
        group.missed = true;
        wait = 0.3;
      }
    }
    if (boss && !boss.dead) {
      boss.timer -= dt;
      if (boss.timer < 1.5 && !boss.warned) { boss.warned = true; Sound.warn(); }
      if (boss.timer <= 0) {
        Sound.stomp();
        G.shake = 0.5;
        api.hurt(240, 420);
        boss.timer = every;
        boss.warned = false;
      }
    }
  }

  function draw(ctx) {
    drawBackground(ctx, G.world, 960, 540, G.calm ? 0 : G.time, 500);
    if (boss) {
      const mood = boss.dead ? 'dead' : boss.hurt ? 'hurt' : boss.warned ? 'warn' : 'idle';
      const fall = boss.dead ? Math.min(260, boss.dead * 220) : 0;
      drawDino(ctx, 790, 330 + fall, 1.05, { mood, t: G.time, calm: G.calm });
      if (!boss.dead) {
        // 跺脚倒计时条：绿 → 红
        const k = Math.max(0, boss.timer / every);
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        roundRect(ctx, 700, 476, 190, 22, 11); ctx.fill();
        ctx.fillStyle = k < 0.25 ? '#ff5a5a' : k < 0.5 ? '#ffb347' : '#6cc26c';
        roundRect(ctx, 703, 479, 184 * k, 16, 8); ctx.fill();
        text(ctx, '🦶', 688, 487, 22);
      }
    }
    if (!group) return;
    const a = answer();
    const glow = !group.done && group.bubbles.some((b) => b.state === 'wrong');
    const order = live();
    for (const b of [...leaving, ...group.bubbles]) {
      const x = b.x + Math.sin(G.time * 1.6 + b.phase) * 10 + Math.sin(b.wob * 30) * b.wob * 10;
      const y = b.y;
      if (b.state === 'popped') {
        const k = Math.min(1, b.pop * 3);
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = '#7fd3ff';
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(x, y, BUBBLE_R * (1 + k), 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
        continue;
      }
      if (y < -BUBBLE_R * 2 || y > 540 + BUBBLE_R * 2) continue;
      const faded = (group.done && b.state === 'idle') || leaving.includes(b);
      ctx.globalAlpha = faded ? 0.35 : 1;
      if (glow && b === a) {
        ctx.fillStyle = `rgba(255,236,120,${0.5 + Math.sin(G.time * 8) * 0.25})`;
        circle(ctx, x, y, BUBBLE_R + 14);
      }
      ctx.fillStyle = b.state === 'wrong' ? 'rgba(200,200,200,.75)' : 'rgba(186,232,255,.75)';
      circle(ctx, x, y, BUBBLE_R);
      ctx.fillStyle = b.state === 'wrong' ? '#e6e6e6' : '#ffffff';
      circle(ctx, x, y, BUBBLE_R - 10);
      ctx.strokeStyle = b.state === 'wrong' ? '#b0b0b0' : '#6cc4f0';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, y, BUBBLE_R, 0, Math.PI * 2); ctx.stroke();
      if (b.state === 'wrong') ctx.globalAlpha = 0.45;
      drawPic(ctx, b.item.pic, x, y, 92);
      ctx.globalAlpha = faded ? 0.35 : 1;
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      circle(ctx, x - 30, y - 34, 9);
      if (keyboard && order[cursor] === b) {
        ctx.strokeStyle = '#ff9f1c';
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(x, y, BUBBLE_R + 10, 0, Math.PI * 2); ctx.stroke();
        text(ctx, String(order.indexOf(b) + 1), x, y + BUBBLE_R + 22, 22, '#ff9f1c');
      }
      ctx.globalAlpha = 1;
    }
    if (group.tutorial && !group.done && a.y < 520) {
      const bob = Math.sin(G.time * 6) * 6;
      text(ctx, '👆 戳一下这个泡泡！', a.x + 170, a.y + bob, 28, '#ff6f61', `${ROUND_FONT}`);
    }
  }

  function tap(x, y) {
    keyboard = false;
    for (const b of live()) {
      const bx = b.x + Math.sin(G.time * 1.6 + b.phase) * 10;
      if (Math.hypot(x - bx, y - b.y) < BUBBLE_R + 8) return pick(b);
    }
  }

  function key(code) {
    const order = live();
    if (!order.length) return false;
    const digit = /^Digit([1-4])$/.exec(code) || /^Numpad([1-4])$/.exec(code);
    if (digit) { keyboard = true; const b = order[digit[1] - 1]; if (b) pick(b); return true; }
    if (code === 'ArrowLeft' || code === 'KeyA') { keyboard = true; cursor = (cursor + order.length - 1) % order.length; return true; }
    if (code === 'ArrowRight' || code === 'KeyD') { keyboard = true; cursor = (cursor + 1) % order.length; return true; }
    if (code === 'Space' || code === 'Enter') { keyboard = true; pick(order[Math.min(cursor, order.length - 1)]); return true; }
    return false;
  }

  return {
    usesHearts: !!boss,
    update, draw, tap, key,
    replay: () => group && !group.done && api.say(group.item),
    bossPos: () => [790, 280],
    current: () => group,
  };
};
