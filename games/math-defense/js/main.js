'use strict';
// ===== 界面流程：标题 → 选年级 → 地图 → 关卡 → 结算 =====

const $ = (s) => document.querySelector(s);
const GRADE_NAMES = '一二三四五六';
const calm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
let save = loadSave();
let game = null;
let current = null; // { world, level, lastWin }

function show(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
}
function toast(text) {
  const t = $('#toast');
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), 2600);
}
const worldOf = (grade) => WORLDS.find((w) => w.grade === grade);
const stopGame = () => { resetTyped(); if (game) { game.stop(); game = null; } };

// ---------- 标题页 ----------
function renderGrades() {
  $('#grades').innerHTML = '';
  for (const w of WORLDS) {
    const b = document.createElement('button');
    b.className = 'grade' + (w.grade === save.grade ? ' active' : '') + (w.locked ? ' locked' : '');
    b.textContent = `${GRADE_NAMES[w.grade - 1]}年级${w.locked ? ' 🔒' : ''}`;
    b.setAttribute('aria-pressed', String(w.grade === save.grade));
    b.addEventListener('click', () => {
      save.grade = w.grade;
      writeSave(save);
      renderGrades();
      if (w.locked) toast(`${GRADE_NAMES[w.grade - 1]}年级的「${w.name}」正在建设中，先去一年级玩玩吧！`);
    });
    $('#grades').append(b);
  }
}
$('#start').addEventListener('click', () => {
  Sound.unlock();
  const w = worldOf(save.grade);
  if (w.locked) {
    toast(`「${w.name}」正在建设中，先带你去一年级的糖果城堡！`);
    save.grade = 1;
    writeSave(save);
    renderGrades();
  }
  renderMap();
  show('map');
});

// ---------- 地图 ----------
function renderMap() {
  const w = worldOf(save.grade);
  $('#world-title').textContent = `${GRADE_NAMES[w.grade - 1]}年级 · ${w.name}`;
  $('#map-coins').textContent = save.coins;
  const box = $('#levels');
  box.innerHTML = '';
  const firstOpen = w.levels.find((L) => levelRecord(save, w.grade, L.n).stars === 0 && isUnlocked(save, w.grade, L.n));
  for (const L of w.levels) {
    const rec = levelRecord(save, w.grade, L.n);
    const open = isUnlocked(save, w.grade, L.n);
    const b = document.createElement('button');
    b.className = 'level-node' + (L.boss ? ' boss' : '') + (open ? '' : ' locked') + (L === firstOpen ? ' current' : '');
    const stars = rec.skipped && !rec.stars ? '☆☆☆' : '⭐'.repeat(rec.stars) + '☆'.repeat(3 - rec.stars);
    b.innerHTML = `<span class="n">${L.boss ? '👾' : L.n}</span><span class="name"></span><span class="kind"></span><span class="st">${open ? stars : '🔒'}</span>`;
    b.querySelector('.name').textContent = `${L.n}. ${L.name}`;
    b.querySelector('.kind').textContent = L.boss ? '综合挑战' : KIND_NAMES[L.kinds[0]];
    b.setAttribute('aria-label', `第${L.n}关 ${L.name}${open ? '' : '，还没解锁'}`);
    b.addEventListener('click', () => (open ? openLevel(w, L) : toast('先通过前一关就能解锁啦！')));
    box.append(b);
  }
}

// ---------- 关卡 ----------
function openLevel(world, level) {
  stopGame();
  current = { world, level, lastWin: false };
  show('play');
  $('#result').hidden = true;
  $('#paused').hidden = true;
  $('#intro').hidden = false;
  $('#intro-no').textContent = level.boss ? `第 ${level.n} 关 · Boss 关` : `第 ${level.n} 关 · ${KIND_NAMES[level.kinds[0]]}`;
  $('#intro-name').textContent = level.name;
  $('#intro-text').textContent = level.intro;
  const canvas = $('#canvas');
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  $('#go').focus();
}
$('#go').addEventListener('click', () => {
  // 连点"开炮"只开一局：这一关已经开打就不再开
  if (game && game.run === current) return;
  Sound.unlock();
  const { world, level } = current;
  $('#intro').hidden = true;
  stopGame();
  game = createGame($('#canvas'), level, world, {
    fails: levelRecord(save, world.grade, level.n).fails,
    calm,
    // 打跑一只就马上记进图鉴，中途关掉网页也不丢
    onDefeat(kind) {
      save.monsters[kind] = (save.monsters[kind] || 0) + 1;
      writeSave(save);
    },
    onEnd: finishLevel,
  });
  game.run = current;
  $('#canvas').focus();
});

function finishLevel(res) {
  const { world, level } = current;
  const key = `${world.grade}-${level.n}`;
  const rec = { ...levelRecord(save, world.grade, level.n) };
  save.coins += res.coins; // 输了金币也照样存好
  if (res.win) {
    rec.stars = Math.max(rec.stars, res.stars);
    rec.fails = 0;
  } else {
    rec.fails++;
  }
  save.levels[key] = rec;
  writeSave(save);
  current.lastWin = res.win;

  $('#result').hidden = false;
  const last = level.n === world.levels.length;
  $('#result-stars').hidden = !res.win;
  $('#result-skip').hidden = res.win || rec.fails < 5;
  // 输了大按钮就是"再试一次"、打完最后一关大按钮就是"回地图"，别再重复一个
  $('#result-again').hidden = !res.win;
  $('#result [data-go="map"]').hidden = res.win && last;
  if (res.win) {
    $('#result-title').textContent = level.boss ? `打败了${MONSTERS[level.boss.kind].name}！` : '城堡守住啦！';
    $('#result-stars').textContent = '⭐'.repeat(res.stars) + '☆'.repeat(3 - res.stars);
    $('#result-text').textContent = `答对 ${res.correct} 题，获得 🪙 ${res.coins}` + (res.stars < 3 ? '　别让怪物咬到城堡、少打错，就能拿 3 颗星！' : '　满分！太棒啦！');
    $('#result-next').textContent = last ? '回地图' : '下一关 ▶';
  } else {
    $('#result-title').textContent = '城堡的糖果被偷光啦';
    // 最多帮 3 次（game.js 里 assist = min(3, fails)），帮满了就不再说会变简单
    $('#result-text').textContent = rec.fails <= 3 ? '没关系，下一次怪物会走慢一点，再来试试！' : '没关系，再来试试！';
    $('#result-next').textContent = '再试一次';
  }
  // 算式里用不换行空格，免得「6 + 7 =」和「13」被拆到两行
  if (res.hardest) $('#result-text').textContent += `　记一记：${res.hardest.replace(/ /g, '\u00a0')}`;
  $('#result-next').focus();
}
$('#result-next').addEventListener('click', () => {
  const { world, level } = current;
  // 按这一局的输赢走，不看以前拿过几颗星
  if (!current.lastWin) return openLevel(world, level);
  const next = world.levels[level.n];
  if (next) openLevel(world, next);
  else { stopGame(); renderMap(); show('map'); }
});
$('#result-again').addEventListener('click', () => openLevel(current.world, current.level));
$('#result-skip').addEventListener('click', () => {
  const { world, level } = current;
  save.levels[`${world.grade}-${level.n}`] = { ...levelRecord(save, world.grade, level.n), skipped: true };
  writeSave(save);
  stopGame();
  renderMap();
  show('map');
});

// ---------- 暂停 ----------
function pause() {
  if (!game || game.state !== 'play' || !$('#intro').hidden) return;
  resetTyped();
  game.paused = true;
  $('#paused').hidden = false;
  $('#resume').focus();
}
$('#pause').addEventListener('click', (e) => { e.currentTarget.blur(); pause(); });
$('#resume').addEventListener('click', () => {
  Sound.unlock(); // 切到后台回来，iOS / 微信会把声音挂起
  $('#paused').hidden = true;
  if (game) game.paused = false;
});
$('#restart').addEventListener('click', () => openLevel(current.world, current.level));
document.addEventListener('visibilitychange', () => document.hidden && pause());

// ---------- 操作：点炮台 / 打数字 / 空格放大招 ----------
const canvas = $('#canvas');
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  Sound.unlock();
  if (game) game.tap(e.clientX, e.clientY);
});
// 键盘打数字：两位数先等一下第二位（比如有 1 和 12 时）
let typedTimer = 0;
let typedQuestion = null;
function resetTyped() {
  clearTimeout(typedTimer);
  typedQuestion = null;
  if (game) game.typed = '';
}
function typeKey(ch) {
  const question = game.currentQ();
  if (typedQuestion !== question) resetTyped();
  typedQuestion = question;
  const labels = game.choiceLabels();
  const typed = game.typed + ch;
  const exact = labels.includes(typed);
  const longer = labels.some((l) => l !== typed && l.startsWith(typed));
  clearTimeout(typedTimer);
  if (exact && !longer) {
    game.typed = '';
    game.answerValue(typed);
  } else if (longer) {
    game.typed = typed;
    const g = game;
    typedTimer = setTimeout(() => {
      if (game === g && !g.paused && g.currentQ() === question && g.typed && g.choiceLabels().includes(g.typed)) g.answerValue(g.typed);
      g.typed = '';
    }, 800);
  } else {
    game.typed = '';
  }
}
const SYMBOL_KEYS = { '<': '<', ',': '<', '>': '>', '.': '>', '=': '=' };
const overlayOpen = () => !$('#intro').hidden || !$('#paused').hidden || !$('#result').hidden;
document.addEventListener('keydown', (e) => {
  // 弹窗打开时键盘留给弹窗里的按钮
  if (!$('#play').classList.contains('active') || !game || overlayOpen()) return;
  const numberSeparator = (e.key === '.' || e.key === '/') && game.choiceLabels().some((label) => label.includes(e.key));
  if (/^[0-9]$/.test(e.key) || numberSeparator) { e.preventDefault(); typeKey(e.key); }
  else if (SYMBOL_KEYS[e.key]) { e.preventDefault(); game.typed = ''; game.answerValue(SYMBOL_KEYS[e.key]); }
  else if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) game.rainbow(); }
  else if (e.code === 'Escape' || e.code === 'KeyP') pause();
});

// ---------- 通用跳转 ----------
document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => {
  stopGame();
  $('#paused').hidden = true;
  $('#result').hidden = true;
  if (b.dataset.go === 'map') renderMap();
  if (b.dataset.go === 'title') renderGrades();
  show(b.dataset.go);
}));

// ---------- 怪物图鉴 ----------
function renderBook() {
  const box = $('#cards');
  box.innerHTML = '';
  let met = 0;
  const keys = Object.keys(MONSTERS);
  for (const key of keys) {
    const type = MONSTERS[key];
    const count = save.monsters[key] || 0;
    if (count) met++;
    const card = document.createElement('button');
    card.className = 'card' + (count ? ' met' : '') + (type.boss ? ' boss' : '');
    const pic = document.createElement('canvas');
    pic.width = 240;
    pic.height = 200;
    const name = document.createElement('b');
    const info = document.createElement('span');
    name.textContent = count ? type.name : '？？？';
    info.textContent = type.boss ? (count ? '打败啦！' : 'Boss') : `${KIND_NAMES[key]}${count ? ` · 打跑 ${count} 只` : ''}`;
    card.append(pic, name, info);
    card.setAttribute('aria-label', count ? `${type.name}，${type.desc}` : '还没遇到的怪物');
    card.addEventListener('click', () => toast(count ? type.desc : '去关卡里找找它吧！'));
    box.append(card);
    const c = pic.getContext('2d');
    c.scale(2, 2);
    drawMonster(c, type, 60, 92, type.boss ? 0.72 : 1, { t: 1, silhouette: !count });
  }
  $('#book-count').textContent = `${met}/${keys.length}`;
}
$('#open-book').addEventListener('click', () => {
  Sound.unlock();
  renderBook();
  show('book');
});
$('#open-credits').addEventListener('click', () => { $('#credits').hidden = false; $('#close-credits').focus(); });
$('#close-credits').addEventListener('click', () => { $('#credits').hidden = true; });

renderGrades();
