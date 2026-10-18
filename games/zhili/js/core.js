'use strict';
// 聪聪智力岛 core: state, sound, speech, screens, shared game helpers.
const Z = (() => {
  const $ = (s, r = document) => r.querySelector(s);

  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') {
        for (const [sk, sv] of Object.entries(v)) {
          if (sk.startsWith('--')) el.style.setProperty(sk, sv); else el.style[sk] = sv;
        }
      } else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(Infinity)) {
      if (c == null || c === false) continue;
      el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  }

  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = arr => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const range = n => Array.from({ length: n }, (_, i) => i);
  const reduceMotion = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- saved progress ----------
  const KEY = 'zhili-island-v1';
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  const state = Object.assign({ age: 1, sound: true, stars: 0, best: {}, plays: {}, badges: [], records: {} }, load());
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage blocked */ } }

  // ---------- sound effects (synthesised, no files) ----------
  let actx = null;
  function ac() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  function tone(f, t0, dur, type = 'sine', vol = 0.12) {
    if (!state.sound) return;
    const a = ac(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    const s = a.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(f, s);
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(vol, s + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
    o.connect(g).connect(a.destination);
    o.start(s); o.stop(s + dur + 0.05);
  }
  const sfx = {
    tap: () => tone(660, 0, 0.08, 'triangle', 0.08),
    pop: () => { tone(520, 0, 0.07, 'sine', 0.1); tone(880, 0.05, 0.09, 'sine', 0.1); },
    move: () => tone(380, 0, 0.06, 'square', 0.035),
    good: () => [523, 659, 784].forEach((f, i) => tone(f, i * 0.08, 0.18, 'triangle', 0.12)),
    bad: () => { tone(240, 0, 0.16, 'sawtooth', 0.045); tone(185, 0.12, 0.22, 'sawtooth', 0.045); },
    win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.24, 'triangle', 0.13)),
    flip: () => tone(900, 0, 0.05, 'sine', 0.06),
  };

  // ---------- voice (browser speech synthesis) ----------
  let voice = null;
  function pickVoice() {
    try {
      const vs = speechSynthesis.getVoices();
      voice = vs.find(v => /zh[-_]CN/i.test(v.lang) && /Ting|Xiaoxiao|Xiaoyi|婷|晓/i.test(v.name))
        || vs.find(v => /zh[-_]CN/i.test(v.lang)) || vs.find(v => /^zh/i.test(v.lang)) || null;
    } catch (e) { voice = null; }
  }
  if ('speechSynthesis' in window) { pickVoice(); try { speechSynthesis.onvoiceschanged = pickVoice; } catch (e) {} }
  function speak(text) {
    if (!state.sound || !('speechSynthesis' in window) || !text) return;
    try {
      speechSynthesis.cancel();
      const clean = String(text).replace(/[\u{1F000}-\u{1FFFF}☀-➿⬀-⯿️‍]/gu, '');
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = 'zh-CN'; if (voice) u.voice = voice;
      u.rate = 1.02; u.pitch = 1.3;
      speechSynthesis.speak(u);
    } catch (e) {}
  }
  function hush() { try { speechSynthesis.cancel(); } catch (e) {} }

  // ---------- islands, games, badges ----------
  const islands = [
    { id: 'logic', name: '逻辑岛', icon: '🧩', color: '#7B5CFA', tip: '动动脑筋，推理找答案' },
    { id: 'math', name: '数学岛', icon: '🔢', color: '#FF8A2B', tip: '和数字做好朋友' },
    { id: 'memory', name: '记忆岛', icon: '👀', color: '#13A3C7', tip: '看得仔细，记得牢' },
    { id: 'space', name: '空间岛', icon: '🧱', color: '#3DB65E', tip: '拼一拼，转一转' },
    { id: 'code', name: '编程岛', icon: '🤖', color: '#F2507B', tip: '给机器人下指令' },
  ];
  const games = [];
  function register(g) { games.push(g); }

  const badgeDefs = () => [
    { id: 'star1', icon: '🌟', name: '第一颗星', desc: '拿到第一颗星星', test: s => s.stars >= 1 },
    { id: 'star30', icon: '🥉', name: '星星收集者', desc: '累计 30 颗星', test: s => s.stars >= 30 },
    { id: 'star100', icon: '🥈', name: '星星大王', desc: '累计 100 颗星', test: s => s.stars >= 100 },
    { id: 'star300', icon: '🥇', name: '银河之星', desc: '累计 300 颗星', test: s => s.stars >= 300 },
    { id: 'explorer', icon: '🗺️', name: '全岛探险家', desc: '每个游戏都玩过', test: s => games.every(g => s.plays[g.id]) },
    ...islands.map(is => ({
      id: 'master-' + is.id, icon: is.icon, name: is.name.replace('岛', '') + '小达人',
      desc: `${is.name}每个游戏都拿到三星`,
      test: s => games.filter(g => g.island === is.id).every(g => (s.best[g.id] || 0) >= 3),
    })),
  ];
  function checkBadges() {
    const fresh = [];
    for (const b of badgeDefs()) {
      if (!state.badges.includes(b.id) && b.test(state)) { state.badges.push(b.id); fresh.push(b); }
    }
    return fresh;
  }

  const PRAISE = ['太棒了！', '真聪明！', '答对啦！', '好厉害！', '完全正确！', '你是小天才！', '漂亮！'];
  const CHEER = ['再想想哦～', '差一点点！', '没关系，再试一次！', '仔细看看哦～', '加油，你可以的！'];

  // ---------- run-scoped lifecycle ----------
  let current = null;
  function cleanup() {
    if (current) {
      current.alive = false;
      current.timers.forEach(clearTimeout);
      current.intervals.forEach(clearInterval);
      current.cleanups.forEach(f => { try { f(); } catch (e) {} });
      current = null;
    }
    hush();
    const fx = $('#fx'); if (fx) fx.innerHTML = '';
  }

  function confetti() {
    if (reduceMotion()) return;
    const fx = $('#fx');
    const colors = ['#FF5C8A', '#FFC83D', '#3DB65E', '#13A3C7', '#7B5CFA', '#FF8A2B'];
    for (let i = 0; i < 70; i++) {
      const p = h('i', {
        class: 'confetti',
        style: {
          left: Math.random() * 100 + 'vw', background: pick(colors),
          animationDelay: Math.random() * 0.5 + 's', animationDuration: 1.8 + Math.random() * 1.4 + 's',
          width: rand(6, 12) + 'px', height: rand(8, 16) + 'px',
        },
      });
      fx.append(p);
      setTimeout(() => p.remove(), 3800);
    }
  }

  function starsText(n, max = 3) { return '★'.repeat(n) + '☆'.repeat(max - n); }

  // ---------- home screen ----------
  function home() {
    cleanup();
    const app = $('#app');
    app.innerHTML = ''; app.className = 'home'; app.style.removeProperty('--c');
    window.scrollTo(0, 0);

    const soundBtn = h('button', {
      class: 'icon-btn', 'aria-label': '声音开关', title: '声音',
      onclick: () => { state.sound = !state.sound; save(); soundBtn.textContent = state.sound ? '🔊' : '🔇'; if (state.sound) sfx.pop(); },
    }, state.sound ? '🔊' : '🔇');

    const ageBtn = (age, label, sub) => h('button', {
      class: 'age-btn' + (state.age === age ? ' on' : ''), 'aria-pressed': state.age === age ? 'true' : 'false',
      onclick: () => { state.age = age; save(); sfx.tap(); home(); speak(age === 1 ? '小探险家模式' : '大探险家模式'); },
    }, h('b', {}, label), h('small', {}, sub));

    const greet = state.stars === 0 ? '你好呀！我是猫头鹰聪聪。选一个小岛，开始探险吧！'
      : `欢迎回来！你已经收集了 ${state.stars} 颗星星，继续加油！`;

    app.append(
      h('header', { class: 'topbar' },
        h('div', { class: 'brand' },
          h('div', { class: 'brand-owl', 'aria-hidden': 'true' }, '🦉'),
          h('div', {}, h('h1', {}, '聪聪智力岛'), h('p', {}, '动脑筋的小游戏 · 6–10 岁'))),
        h('div', { class: 'top-actions' },
          h('div', { class: 'pill star-pill', title: '星星总数' }, '⭐ ', h('b', {}, state.stars)),
          h('button', { class: 'icon-btn', 'aria-label': '我的徽章', title: '徽章', onclick: showBadges }, '🏅'),
          soundBtn)),
      h('section', { class: 'hello' },
        h('div', { class: 'bubble big' }, greet),
        h('div', { class: 'age-switch', role: 'group', 'aria-label': '选择难度' },
          ageBtn(1, '🐣 小探险家', '6–7 岁'), ageBtn(2, '🦅 大探险家', '8–10 岁'))),
    );

    islands.forEach((is, n) => {
      const list = games.filter(g => g.island === is.id);
      if (!list.length) return;
      app.append(h('section', { class: 'island', style: { '--c': is.color, animationDelay: n * 70 + 'ms' } },
        h('div', { class: 'island-head' },
          h('div', { class: 'island-icon' }, is.icon),
          h('div', {}, h('h2', {}, is.name), h('p', {}, is.tip))),
        h('div', { class: 'game-grid' }, list.map(g => {
          const best = state.best[g.id] || 0;
          return h('button', { class: 'game-card', onclick: () => { sfx.tap(); startGame(g); } },
            h('span', { class: 'gc-icon' }, g.icon),
            h('span', { class: 'gc-name' }, g.name),
            h('span', { class: 'gc-desc' }, g.desc),
            h('span', { class: 'gc-stars' + (best ? '' : ' none') }, starsText(best)));
        }))));
    });
    app.append(h('footer', { class: 'foot' }, '星星和徽章保存在这台设备的浏览器里。'));
    speakSoon(greet);
  }

  let speakTimer = null;
  function speakSoon(t) { clearTimeout(speakTimer); speakTimer = setTimeout(() => speak(t), 250); }

  function showBadges() {
    sfx.tap();
    const defs = badgeDefs();
    const ov = h('div', { class: 'overlay', onclick: e => { if (e.target === ov) ov.remove(); } },
      h('div', { class: 'result badges-card' },
        h('h2', {}, '🏅 我的徽章'),
        h('p', { class: 'muted' }, `已获得 ${state.badges.length} / ${defs.length}`),
        h('div', { class: 'badge-grid' }, defs.map(b => {
          const got = state.badges.includes(b.id);
          return h('div', { class: 'badge' + (got ? ' got' : '') },
            h('div', { class: 'badge-icon' }, got ? b.icon : '🔒'),
            h('b', {}, b.name), h('small', {}, b.desc));
        })),
        h('button', { class: 'btn primary', onclick: () => ov.remove() }, '好的')));
    $('#app').append(ov);
  }

  // ---------- game screen ----------
  function startGame(g) {
    cleanup();
    const island = islands.find(i => i.id === g.island);
    const app = $('#app');
    app.innerHTML = ''; app.className = 'play';
    app.style.setProperty('--c', island.color);
    window.scrollTo(0, 0);

    const run = { alive: true, timers: [], intervals: [], cleanups: [], mistakes: 0, lastSay: g.how };
    current = run;

    const dots = h('div', { class: 'dots', 'aria-label': '进度' });
    const bubbleText = h('span', {}, '');
    const bubble = h('div', { class: 'bubble' }, bubbleText);
    const owl = h('button', { class: 'helper-owl', 'aria-label': '再说一遍', title: '再说一遍', onclick: () => speak(run.lastSay) }, '🦉');
    const stage = h('main', { class: 'stage' });

    app.append(
      h('header', { class: 'playbar' },
        h('button', { class: 'icon-btn', 'aria-label': '回到小岛', title: '回到小岛', onclick: () => { sfx.tap(); home(); } }, '🏠'),
        h('div', { class: 'play-title' }, h('span', { class: 'pt-icon' }, g.icon), h('b', {}, g.name),
          h('small', {}, state.age === 1 ? '小探险家' : '大探险家')),
        dots,
        h('button', { class: 'icon-btn', 'aria-label': '玩法说明', title: '玩法', onclick: () => ctx.say(g.how) }, '❓')),
      h('div', { class: 'helper' }, owl, bubble),
      stage,
    );

    const ctx = {
      level: state.age, stage, game: g,
      get alive() { return run.alive; },
      get mistakes() { return run.mistakes; },
      say(text, voiced = true) {
        bubbleText.textContent = text; run.lastSay = text;
        bubble.classList.remove('pulse'); void bubble.offsetWidth; bubble.classList.add('pulse');
        if (voiced) speak(text);
      },
      good(text, voiced = true) {
        sfx.good(); ctx.say(text || pick(PRAISE), voiced);
        owl.classList.remove('hop'); void owl.offsetWidth; owl.classList.add('hop');
      },
      bad(text, voiced = true) { run.mistakes++; sfx.bad(); ctx.say(text || pick(CHEER), voiced); },
      miss(n = 1) { run.mistakes += n; },
      after(ms, fn) { const id = setTimeout(() => { if (run.alive) fn(); }, ms); run.timers.push(id); return id; },
      every(ms, fn) { const id = setInterval(() => { if (run.alive) fn(); }, ms); run.intervals.push(id); return id; },
      stop(id) { clearInterval(id); clearTimeout(id); },
      onExit(fn) { run.cleanups.push(fn); },
      onKey(fn) { const f = e => { if (run.alive) fn(e); }; window.addEventListener('keydown', f); run.cleanups.push(() => window.removeEventListener('keydown', f)); },
      rounds(n) { dots.innerHTML = ''; range(n).forEach(() => dots.append(h('span'))); },
      setRound(i) { [...dots.children].forEach((d, j) => { d.className = j < i ? 'done' : j === i ? 'now' : ''; }); },
      clear() { stage.innerHTML = ''; },
      finishByMistakes(a, b) { ctx.finish(run.mistakes <= a ? 3 : run.mistakes <= b ? 2 : 1); },
      finish(stars, note) {
        if (!run.alive || run.finished) return;
        run.finished = true;
        [...dots.children].forEach(d => { d.className = 'done'; });
        sfx.win(); confetti();
        state.stars += stars;
        state.plays[g.id] = (state.plays[g.id] || 0) + 1;
        state.best[g.id] = Math.max(state.best[g.id] || 0, stars);
        const fresh = checkBadges();
        save();
        const title = stars === 3 ? '太厉害了！' : stars === 2 ? '真棒！' : '完成啦！';
        const ov = h('div', { class: 'overlay' },
          h('div', { class: 'result' },
            h('div', { class: 'result-owl' }, '🦉'),
            h('h2', {}, title),
            h('div', { class: 'result-stars' }, range(3).map(i =>
              h('span', { class: i < stars ? 'on' : '', style: { animationDelay: 0.25 + i * 0.25 + 's' } }, '★'))),
            note ? h('p', { class: 'note' }, note) : null,
            h('p', { class: 'muted' }, `这次获得 ${stars} 颗星 · 一共 ⭐ ${state.stars}`),
            fresh.length ? h('div', { class: 'new-badges' },
              h('b', {}, '🎉 新徽章！'),
              fresh.map(b => h('div', { class: 'badge got mini' }, h('div', { class: 'badge-icon' }, b.icon), h('b', {}, b.name)))) : null,
            h('div', { class: 'result-actions' },
              h('button', { class: 'btn primary', onclick: () => { sfx.tap(); startGame(g); } }, '🔁 再玩一次'),
              h('button', { class: 'btn', onclick: () => { sfx.tap(); home(); } }, '🏝️ 回到小岛'))));
        app.append(ov);
        speak(title + (stars === 3 ? '你拿到了三颗星！' : `你拿到了${stars}颗星！`) + (fresh.length ? '还得到了新徽章！' : ''));
      },
    };

    ctx.say(g.how);
    g.play(ctx);
  }

  // Multiple-choice buttons. items: [{label, value}]
  function options(ctx, items, { correct, now, then, cls = '', wrong } = {}) {
    let done = false;
    const wrap = h('div', { class: 'options ' + cls });
    items.forEach(it => {
      const b = h('button', {
        class: 'opt', onclick: () => {
          if (done || b.disabled) return;
          if (it.value === correct) {
            done = true; b.classList.add('right');
            [...wrap.children].forEach(x => { if (x !== b) x.classList.add('fade'); });
            ctx.good();
            if (now) now(b);
            ctx.after(1100, () => then && then(b));
          } else {
            b.classList.add('wrong'); b.disabled = true;
            ctx.bad(typeof wrong === 'function' ? wrong(it.value) : wrong);
          }
        },
      }, it.label);
      wrap.append(b);
    });
    return wrap;
  }

  // Unique numeric distractors around an answer.
  function numberChoices(answer, count, spread = [1, -1, 2, -2, 10, -10, 3, -3], min = 0) {
    const set = new Set([answer]);
    for (const d of shuffle(spread)) {
      if (set.size >= count) break;
      const v = answer + d;
      if (v >= min && !set.has(v)) set.add(v);
    }
    let k = 4;
    while (set.size < count) { const v = answer + k++; if (!set.has(v)) set.add(v); }
    return shuffle([...set]);
  }

  // Swipe detection on an element: fn('up'|'down'|'left'|'right')
  function swipe(el, fn) {
    let sx = 0, sy = 0, on = false;
    el.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; on = true; });
    el.addEventListener('pointerup', e => {
      if (!on) return; on = false;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      fn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    });
  }

  function unlockAudio() { ac(); window.removeEventListener('pointerdown', unlockAudio); }
  window.addEventListener('pointerdown', unlockAudio);

  return { $, h, rand, pick, shuffle, range, state, save, sfx, speak, register, games, home, startGame, options, numberChoices, swipe, reduceMotion };
})();
