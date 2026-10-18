import { Cube, parseMove, invertSeq } from './cube.js';
import { CubeView } from './view.js';
import { LEVELS, TRACKS, CUBES } from './levels.js';
import { STAGES, ORDERS, MACROS } from './stages.js';
import { sfx, speak, setMuted, isMuted } from './audio.js';

const $ = s => document.querySelector(s);
const wait = ms => new Promise(r => setTimeout(r, ms));

// ---- 进度存档（仅本机浏览器）----
const PROGRESS_KEY = 'cube-kids-progress-v1';
const loadProgress = () => { try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; } catch { return {}; } };
const saveProgress = () => { try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch { /* 隐私模式等 */ } };
let progress = loadProgress();
const totalStars = () => Object.values(progress).reduce((a, b) => a + b, 0);
const trackOf = level => level.track || 'beginner';
const trackOpen = t => !t.locked && (!t.requires || (progress[t.requires] || 0) > 0);
// 每门课的第一关跟着课程解锁，其余关卡要先过上一关
const isUnlocked = i => (i > 0 && trackOf(LEVELS[i - 1]) === trackOf(LEVELS[i])
  ? (progress[LEVELS[i - 1].id] || 0) > 0
  : trackOpen(TRACKS.find(t => t.id === trackOf(LEVELS[i]))));

const FACE_CN = { R: '右', L: '左', U: '上', D: '下', F: '前', B: '后', y: '整体' };
const FACE_LONG = { R: '右面', L: '左面', U: '上面', D: '下面', F: '前面', B: '后面', y: '整个魔方' };
// 从默认视角（前-右-上）看过去的箭头：[顺时针, 逆时针]
const ARROWS = { R: ['⬆', '⬇'], L: ['⬇', '⬆'], U: ['⬅', '➡'], D: ['➡', '⬅'], F: ['↻', '↺'], B: ['↺', '↻'], y: ['⬅', '➡'] };
const COLOR_CSS = { Y: '#ffd500', W: '#ffffff', G: '#00b050', B: '#1e6bff', O: '#ff7a00', R: '#e8283c' };
const PIECE_CN = { center: '中心块（1 种颜色）', edge: '棱块（2 种颜色）', corner: '角块（3 种颜色）' };
const PIECE_TIP = { center: '中心块在每一面的正中间', edge: '棱块在两个角中间，有 2 种颜色', corner: '角块在角落，有 3 种颜色' };
// 完整挑战里进入新的一步时，方方说的话（前面会加上「第 n 步：」）
const STAGE_INTRO = {
  daisyAny: '种小白花 🌼 把白色棱块都送到黄色中心旁边。',
  cross: '白色大十字 ✚ 对好颜色，转两下送到底部。',
  corners: '白角回家 ⬜ 用魔法咒语 R U R\' U\'。',
  middle: '中间第二层 🧱 找倒立的 T，往左放或往右放。',
  ycross: '黄色十字 ➕ 点 → 小拐角 → 横线 → 十字。',
  yface: '黄色顶面 🟨 鱼头放左前方，念小鱼咒语。',
  ycorners: '顶角归位 🔺 车灯放后面，念换角咒语。',
  yedges: '顶棱归位 🏁 拼好的一面放后面，念换棱咒语。',
  crossD: '直接做十字 ✚',
  f2l: 'F2L 🤝 把槽转到右前方，配对再入槽。',
  oll: 'OLL 🟨 认出顶面图案，念对应的公式。',
  pllc: 'PLL 角块 🔺 有车灯念相邻换角，没有念对角换角。',
  plle: 'PLL 棱块 🏁 看前面中间那块的颜色选公式。',
};

// ---- 屏幕切换 ----
const view = new CubeView($('#canvas-wrap'));
view.onPick = id => handlers.onPick?.(id);

function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  view.setActive(id === 'play');
  if (id === 'home') renderHome();
  if (id === 'course') renderCourse();
}

function renderHome() {
  $('#cube-list').innerHTML = CUBES.map(c => `
    <button class="cube-card ${c.ready ? '' : 'soon'}" data-cube="${c.id}">
      <span class="cube-icon">${c.icon}</span>
      <b>${c.name}</b>
      <small>${c.ready ? `已得 ${totalStars()} ⭐` : '即将开放'}</small>
    </button>`).join('');
}

function renderCourse() {
  $('#track-list').innerHTML = TRACKS.map(t => {
    if (!trackOpen(t)) {
      return `<section class="track locked" data-track="${t.id}"><h3>${t.emoji} ${t.name} <span class="lock">🔒</span></h3><p>${t.lockedDesc || t.desc}</p></section>`;
    }
    const mine = LEVELS.map((l, i) => ({ l, i })).filter(({ l }) => trackOf(l) === t.id);
    const nodes = mine.map(({ l, i }, k) => {
      const stars = progress[l.id] || 0;
      const open = isUnlocked(i);
      return `<button class="node ${open ? 'open' : 'locked'} ${stars ? 'done' : ''}" data-level="${i}" ${open ? '' : 'disabled'}>
        <span class="node-emoji">${open ? l.emoji : '🔒'}</span>
        <span class="node-title">${k + 1}. ${l.title}</span>
        <span class="node-stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>
      </button>`;
    });
    return `<section class="track"><h3>${t.emoji} ${t.name}</h3><p>${t.desc}</p><div class="nodes">${nodes.join('')}</div></section>`;
  }).join('');
}

$('#cube-list').addEventListener('click', e => {
  const b = e.target.closest('.cube-card');
  if (!b) return;
  sfx.tap();
  if (b.dataset.cube === '3x3') show('course');
  else toast('这个魔方还在路上，先把三阶学会吧！');
});
$('#track-list').addEventListener('click', e => {
  const b = e.target.closest('.node.open');
  if (b) { sfx.tap(); playLevel(Number(b.dataset.level)); return; }
  const locked = e.target.closest('.track.locked');
  if (locked) toast(TRACKS.find(t => t.id === locked.dataset.track).locked ? '这门课还在制作中，敬请期待！' : '先完成入门课程，就能解锁 CFOP 啦！');
});
$('#btn-course-back').onclick = () => { sfx.tap(); show('home'); };
$('#btn-play-back').onclick = () => { sfx.tap(); exitLevel(); };
$('#btn-reset-view').onclick = () => { sfx.tap(); view.resetView(); };
$('#btn-say-again').onclick = () => speak($('#bubble').textContent);
const soundBtn = $('#btn-sound');
soundBtn.onclick = () => { setMuted(!isMuted()); soundBtn.textContent = isMuted() ? '🔇' : '🔊'; };

let toastTimer;
function toast(text) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ---- 游戏界面小工具 ----
let handlers = {};
let cube = new Cube();
let session = 0;
let stats = { mistakes: 0, hints: 0 };

function say(text) {
  const b = $('#bubble');
  b.textContent = text;
  b.classList.remove('pop');
  void b.offsetWidth;
  b.classList.add('pop');
  speak(text);
}
function setTask(html) { $('#task').innerHTML = html; $('#task').hidden = !html; }
function setActions(list) {
  const el = $('#actions');
  el.innerHTML = '';
  for (const a of list) {
    const b = document.createElement('button');
    b.className = 'btn' + (a.primary ? ' primary' : '');
    b.textContent = a.label;
    if (a.id) b.dataset.act = a.id;
    b.onclick = () => { sfx.tap(); a.onClick(b); };
    el.appendChild(b);
  }
}
// 转动按钮：颜色跟着魔方当前的中心块走（整体转动后也对）
function setPad(faces) {
  const el = $('#pad');
  el.hidden = !faces;
  el.innerHTML = (faces || []).map(f => `
    <div class="face-group ${f === 'y' ? 'whole' : ''}" data-face="${f}">
      <span class="face-name"><i></i>${FACE_CN[f]} ${f}</span>
      <div class="face-btns">
        <button class="mv" data-move="${f}"><span class="arw">${ARROWS[f][0]}</span><span class="nt">${f}</span></button>
        <button class="mv" data-move="${f}'"><span class="arw">${ARROWS[f][1]}</span><span class="nt">${f}'</span></button>
      </div>
    </div>`).join('');
  refreshPadColors();
}
function refreshPadColors() {
  document.querySelectorAll('#pad .face-group:not(.whole)').forEach(g => {
    g.style.setProperty('--fc', COLOR_CSS[cube.center(g.dataset.face)]);
  });
}
function setMacros(ids) {
  const el = $('#macros');
  el.hidden = !ids?.length;
  el.innerHTML = (ids || []).map(id => `
    <button class="macro" data-macro="${id}"><b>${MACROS[id].label}</b><small>${MACROS[id].alg.join(' ')}</small></button>`).join('');
}
// F2 / y2 这种"转两下"，亮顺时针按钮
function padHighlight(move) {
  document.querySelectorAll('#pad .mv, #macros .macro').forEach(b => b.classList.remove('glow'));
  view.highlight(move ? move[0] : null);
  if (!move) return;
  const key = parseMove(move).amount === 2 ? move[0] : move;
  document.querySelector(`#pad .mv[data-move="${key}"]`)?.classList.add('glow');
}
function macroHighlight(id) {
  padHighlight(null);
  document.querySelector(`#macros .macro[data-macro="${id}"]`)?.classList.add('glow');
}
function shake(el) {
  if (!el) return;
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
}
$('#pad').addEventListener('click', e => {
  const b = e.target.closest('.mv');
  if (b) handlers.onMove?.(b.dataset.move, b);
});
$('#macros').addEventListener('click', e => {
  const b = e.target.closest('.macro');
  if (b) handlers.onMacro?.(b.dataset.macro, b);
});

async function turn(m) {
  cube.move(m);
  sfx.turn();
  await view.enqueue(m);
  refreshPadColors();
}
// 一串转动（咒语）：一次性排进动画队列，播完再返回
async function turnSeq(moves) {
  let last;
  for (const m of moves) { cube.move(m); last = view.enqueue(m); }
  sfx.turn();
  await last;
  refreshPadColors();
}

function chips(n, total) {
  return `<div class="chips">${Array.from({ length: total }, (_, i) => `<span class="chip ${i < n ? 'on' : ''}">${i < n ? '✓' : ''}</span>`).join('')}</div>`;
}
function stepDots(i, total) {
  $('#step-dots').innerHTML = Array.from({ length: total }, (_, k) => `<span class="${k < i ? 'done' : k === i ? 'cur' : ''}"></span>`).join('');
}
function clearControls() {
  handlers = {};
  setPad(null);
  setMacros(null);
  padHighlight(null);
}

// ---- 步骤引擎 ----
const STEPS = {
  say: step => new Promise(res => {
    clearControls();
    say(step.text);
    setTask('');
    setActions([{ label: '下一步 ▶', primary: true, onClick: res }]);
  }),

  show: (step, alive) => new Promise(res => {
    clearControls();
    setTask('');
    say(step.text);
    const [pre, gap] = step.fast ? [700, 120] : [900, 400];
    const play = async () => {
      cube = step.state();
      view.setState(cube);
      view.resetView();
      if (!step.play) return;
      setActions([]);
      if (step.fast) setTask(`<div class="spell">${step.play.map(m => `<span>${m}</span>`).join('')}</div>`);
      await wait(pre);
      for (let i = 0; i < step.play.length; i++) {
        if (!alive()) return;
        const m = step.play[i];
        document.querySelectorAll('#task .spell span').forEach((s, k) => { s.className = k < i ? 'done' : k === i ? 'cur' : ''; });
        view.highlight(m[0]);
        await wait(step.fast ? 250 : 500);
        await turn(m);
        view.highlight(null);
        await wait(gap);
      }
      document.querySelectorAll('#task .spell span').forEach(s => { s.className = 'done'; });
    };
    const showButtons = () => {
      if (!alive()) return;
      setActions([
        ...(step.play ? [{ label: '🔁 再看一次', onClick: () => play().then(showButtons) }] : []),
        { label: '下一步 ▶', primary: true, onClick: res },
      ]);
    };
    play().then(showButtons);
  }),

  find: step => new Promise(res => {
    const found = new Set();
    clearControls();
    cube = new Cube();
    view.setState(cube);
    view.clearMarks();
    say(step.text);
    setActions([]);
    setTask(chips(0, step.count));
    handlers = {
      onPick(id) {
        if (found.has(id)) return;
        const type = cube.typeOf(id);
        if (type === step.piece) {
          found.add(id);
          view.mark(id);
          sfx.good();
          setTask(chips(found.size, step.count));
          if (found.size === step.count) {
            handlers = {};
            say('找齐啦！你的眼睛真亮 👀');
            setTimeout(() => { view.clearMarks(); res(); }, 1200);
          }
        } else {
          stats.mistakes++;
          view.flash(id);
          sfx.bad();
          say(`这是${PIECE_CN[type]}哦。提示：${PIECE_TIP[step.piece]}`);
        }
      },
    };
  }),

  teach: step => new Promise(res => {
    clearControls();
    say(step.text);
    setTask(`<div class="big-move">${step.move}</div>`);
    setPad(step.pad);
    setActions([]);
    padHighlight(step.move);
    handlers = {
      async onMove(m, el) {
        if (m !== step.move) {
          stats.mistakes++;
          sfx.bad();
          shake(el);
          say('不是这个哦～ ' + step.text);
          return;
        }
        handlers = {};
        padHighlight(null);
        await turn(m);
        sfx.good();
        res();
      },
    };
  }),

  spell: (step, alive) => new Promise(res => {
    const { seq, rounds } = step;
    let round = 0;
    let idx = 0;
    clearControls();
    cube = new Cube();
    view.setState(cube);
    const render = () => setTask(`
      <div class="spell">${seq.map((m, i) => `<span class="${i < idx ? 'done' : i === idx ? 'cur' : ''}">${m}</span>`).join('')}</div>
      <div class="spell-count">第 ${Math.min(round + 1, rounds)} / ${rounds} 遍</div>`);
    const finish = () => {
      handlers = {};
      padHighlight(null);
      sfx.win();
      confetti();
      say(step.done);
      setActions([{ label: '下一步 ▶', primary: true, onClick: res }]);
    };
    const afterRound = () => {
      round++;
      idx = 0;
      render();
      if (round >= rounds) return finish();
      if (round < step.manualRounds) { padHighlight(seq[0]); return; }
      handlers = {};
      padHighlight(null);
      say(`魔方被打乱了！再念 ${rounds - round} 遍咒语，看看会发生什么？`);
      setActions([{ label: '✨ 念一遍咒语', primary: true, onClick: cast }]);
    };
    const cast = async btn => {
      btn.disabled = true;
      let last;
      for (const m of seq) { idx++; render(); cube.move(m); sfx.turn(); last = view.enqueue(m); await wait(180); }
      await last;
      if (!alive()) return;
      btn.disabled = false;
      afterRound();
    };
    say(step.text);
    setPad(step.pad);
    setActions([]);
    render();
    padHighlight(seq[0]);
    handlers = {
      async onMove(m, el) {
        if (m !== seq[idx]) { stats.mistakes++; sfx.bad(); shake(el); return; }
        idx++;
        render();
        const roundDone = idx === seq.length;
        padHighlight(roundDone ? null : seq[idx]);
        await turn(m);
        if (roundDone && alive()) afterRound();
      },
    };
  }),

  // 自由解题：提示根据魔方当前状态计算；咒语按钮一次转一整串
  goal: (step, alive) => new Promise(res => {
    const auto = step.stage === 'auto';
    const order = ORDERS[step.order || 'beginner'];
    const puzzle = step.puzzle();
    let history = [];
    let done = false;
    let busy = false;
    let shownStage = null;
    const stageKey = () => (auto ? order.current(cube) : step.stage);
    const finished = () => (auto ? cube.isSolved() : STAGES[step.stage].done(cube));

    const render = () => {
      const key = stageKey();
      const st = STAGES[key];
      const no = order.list.indexOf(key) + 1;
      const prefix = auto ? `<span class="stage-no">第 ${no}/${order.list.length} 步</span>` : '';
      setTask(`<div class="goal">${prefix}<span>${st.label}</span> ${chips(st.count(cube), 4)}</div>`);
      if (key !== shownStage) {
        const first = shownStage === null;
        shownStage = key;
        setPad(st.pad);
        setMacros(st.macros);
        if (auto && !first && !done) { sfx.good(); say(`第 ${no} 步：${STAGE_INTRO[key]}`); }
      }
    };
    const reset = () => {
      cube = puzzle.start.clone();
      view.setState(cube);
      history = [];
      shownStage = null;
      padHighlight(null);
      render();
    };
    const afterMove = () => {
      if (done || !alive()) return;
      if (finished()) {
        done = true;
        handlers = {};
        render();
        padHighlight(null);
        sfx.win();
        confetti();
        say(step.done);
        if (step.doneView === 'bottom') view.lookAt(0.6, 2.45);
        if (step.doneView === 'spin') view.lookAt(view.theta + Math.PI * 2, 0.95);
        setActions([{ label: '继续 ▶', primary: true, onClick: res }]);
        return;
      }
      render();
    };
    const run = async moves => {
      busy = true;
      padHighlight(null);
      history.push(moves);
      if (moves.length === 1) await turn(moves[0]); else await turnSeq(moves);
      busy = false;
      afterMove();
    };
    const hint = () => {
      if (busy || done) return;
      stats.hints++;
      const st = STAGES[stageKey()];
      const h = st.hint(cube);
      if (!h) { say('差一点点！试试点「🔁 重来」，再仔细看看。'); return; }
      if (h.macro) {
        say(`${st.tips.macro ? st.tips.macro + '：' : ''}点「${MACROS[h.macro].label}」`);
        macroHighlight(h.macro);
        return;
      }
      const f = h.move[0];
      const { amount } = parseMove(h.move);
      const how = amount === 2 ? '转两下' : amount === 3 ? `反着转（${h.move}）` : `转一下（${h.move}）`;
      const tip = st.tips[f] || (f !== 'U' && f !== 'y' && st.tips.side) || '';
      say(`${tip ? tip + '：' : ''}试试把${FACE_LONG[f]}${how}`);
      padHighlight(h.move);
    };
    const undo = async () => {
      if (busy || done || !history.length) return;
      busy = true;
      padHighlight(null);
      const back = invertSeq(history.pop());
      if (back.length === 1) await turn(back[0]); else await turnSeq(back);
      busy = false;
      afterMove();
    };

    clearControls();
    reset();
    say(step.text);
    setActions([
      { label: '💡 提示', onClick: hint },
      { label: '↩️ 撤销', id: 'undo', onClick: undo },
      { label: '🔁 重来', onClick: () => { if (!busy && !done) { reset(); say(step.text); } } },
    ]);
    handlers = {
      onMove(m) { if (!busy && !done) run([m]); },
      onMacro(id) { if (!busy && !done) run(MACROS[id].alg); },
    };
  }),
};

async function playLevel(index) {
  const level = LEVELS[index];
  const my = ++session;
  const alive = () => my === session;
  show('play');
  $('#play-title').textContent = `${level.emoji} ${level.title}`;
  stats = { mistakes: 0, hints: 0 };
  cube = new Cube();
  view.setState(cube);
  view.clearMarks();
  view.resetView();
  clearControls();
  for (let i = 0; i < level.steps.length; i++) {
    if (!alive()) return;
    stepDots(i, level.steps.length);
    await STEPS[level.steps[i].type](level.steps[i], alive);
  }
  if (!alive()) return;
  stepDots(level.steps.length, level.steps.length);
  finishLevel(index);
}

function exitLevel() {
  session++;
  clearControls();
  view.clearMarks();
  show('course');
}

function finishLevel(index) {
  const level = LEVELS[index];
  const cost = stats.hints + stats.mistakes * 0.5;
  const [three, two] = level.starCost || [1, 4];
  const stars = cost <= three ? 3 : cost <= two ? 2 : 1;
  progress[level.id] = Math.max(progress[level.id] || 0, stars);
  saveProgress();
  sfx.win();
  confetti();
  const hasNext = index + 1 < LEVELS.length && isUnlocked(index + 1);
  $('#modal-stars').innerHTML = [1, 2, 3].map(i => `<span class="${i <= stars ? 'on' : ''}" style="animation-delay:${i * 0.15}s">★</span>`).join('');
  $('#modal-title').textContent = `「${level.title}」通关！`;
  $('#modal-text').textContent = level.finale
    ? level.finale
    : stars === 3 ? '完美！你是魔方小天才！' : '做得很好！想拿 3 颗星可以再挑战一次哦。';
  $('#modal-next').hidden = !hasNext;
  $('#modal').classList.add('show');
  speak($('#modal-title').textContent + $('#modal-text').textContent);
  $('#modal-again').onclick = () => { sfx.tap(); $('#modal').classList.remove('show'); playLevel(index); };
  $('#modal-next').onclick = () => { sfx.tap(); $('#modal').classList.remove('show'); playLevel(index + 1); };
  $('#modal-map').onclick = () => { sfx.tap(); $('#modal').classList.remove('show'); exitLevel(); };
}

// ---- 彩带 ----
function confetti() {
  const cv = $('#confetti');
  const g = cv.getContext('2d');
  const w = (cv.width = innerWidth), h = (cv.height = innerHeight);
  const colors = Object.values(COLOR_CSS);
  const parts = Array.from({ length: 140 }, () => ({
    x: w / 2 + (Math.random() - 0.5) * w * 0.3, y: h * 0.35,
    vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4,
    s: 6 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
    c: colors[Math.floor(Math.random() * colors.length)],
  }));
  const start = performance.now();
  const frame = now => {
    g.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      g.save(); g.translate(p.x, p.y); g.rotate(p.r);
      g.fillStyle = p.c; g.strokeStyle = 'rgba(0,0,0,.15)';
      g.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66); g.strokeRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66);
      g.restore();
    }
    if (now - start < 2600) requestAnimationFrame(frame);
    else g.clearRect(0, 0, w, h);
  };
  requestAnimationFrame(frame);
}

show('home');
