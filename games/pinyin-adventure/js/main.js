'use strict';
// ===== 界面流程：标题 → 选年级 → 地图 → 关卡 → 结算 =====

const $ = (s) => document.querySelector(s);
let save = loadSave();
let game = null;
let current = null; // { world, level }

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
let voiceRequest = 0;
const stopGame = () => {
  starting = null;
  voiceRequest++;
  Sound.stopVoice();
  if (game) { game.stop(); game = null; }
};

// ---------- 标题页 ----------
function renderGrades() {
  $('#grades').innerHTML = '';
  for (const w of WORLDS) {
    const b = document.createElement('button');
    b.className = 'grade' + (w.grade === save.grade ? ' active' : '') + (w.locked ? ' locked' : '');
    b.textContent = `${'一二三四五六'[w.grade - 1]}年级${w.locked ? ' 🔒' : ''}`;
    b.setAttribute('aria-pressed', String(w.grade === save.grade));
    b.addEventListener('click', () => {
      save.grade = w.grade;
      writeSave(save);
      renderGrades();
      if (w.locked) toast(`${b.textContent.replace(' 🔒', '')}的「${w.name}」正在建设中，先去一年级玩玩吧！`);
    });
    $('#grades').append(b);
  }
}
$('#start').addEventListener('click', () => {
  Sound.unlock();
  const w = worldOf(save.grade);
  if (w.locked) {
    toast(`「${w.name}」正在建设中，先带你去一年级的声韵母森林！`);
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
  $('#world-title').textContent = `${'一二三四五六'[w.grade - 1]}年级 · ${w.name}`;
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
    b.innerHTML = `<span class="n">${L.boss ? '👾' : L.n}</span><span class="name"></span><span class="st">${open ? stars : '🔒'}</span>`;
    b.querySelector('.name').textContent = `${L.n}. ${L.name}`;
    b.setAttribute('aria-label', `第${L.n}关 ${L.name}${open ? '' : '，还没解锁'}`);
    b.addEventListener('click', () => (open ? openLevel(w, L) : toast('先通过前一关就能解锁啦！')));
    box.append(b);
  }
}

// ---------- 关卡 ----------
function openLevel(world, level) {
  stopGame();
  current = { world, level };
  show('play');
  $('#result').hidden = true;
  $('#paused').hidden = true;
  $('#intro').hidden = false;
  $('#intro-no').textContent = level.boss ? `第 ${level.n} 关 · Boss 关` : `第 ${level.n} 关`;
  $('#intro-name').textContent = level.name;
  $('#intro-text').textContent = level.intro;
  const canvas = $('#canvas');
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  $('#go').focus();
}
let starting = null;
$('#go').addEventListener('click', async () => {
  // 网慢时孩子会连点"出发"，只开一局
  if (starting === current) return;
  starting = current;
  Sound.unlock();
  const run = current;
  const { world, level } = run;
  const ids = [...new Set(Object.values(level.pools).flat().map((i) => i.audio))];
  await Sound.load(ids);
  if (starting !== run || current !== run || !$('#play').classList.contains('active')) return; // 加载期间离开了这一关
  $('#intro').hidden = true;
  stopGame();
  game = createGame($('#canvas'), level, world, {
    fails: levelRecord(save, world.grade, level.n).fails,
    onLearn(show) { save.learned[show] = true; writeSave(save); },
    onEnd: finishLevel,
  });
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
  $('#result-listen').hidden = !res.hardest;
  $('#result-skip').hidden = res.win || rec.fails < 5;
  if (res.win) {
    $('#result-title').textContent = level.boss ? `打败了${level.boss.name}！` : '过关啦！';
    $('#result-stars').textContent = '⭐'.repeat(res.stars) + '☆'.repeat(3 - res.stars);
    $('#result-text').textContent = `获得 🪙 ${res.coins}` + (res.stars < 3 ? '　不碰到刺猬、少顶错砖，就能拿 3 颗星哦！' : '　满分！太棒啦！');
    $('#result-next').textContent = last ? '回地图' : '下一关 ▶';
  } else {
    $('#result-title').textContent = '小兔累啦，休息一下';
    $('#result-text').textContent = rec.fails >= 1 ? '下一次会简单一点点，再来试试！' : '再来一次吧！';
    $('#result-next').textContent = '再试一次';
  }
  if (res.hardest) {
    const item = Object.values(level.pools).flat().find((i) => i.audio === res.hardest);
    $('#result-text').textContent += `　最容易错的是「${item ? item.show : ''}」，再听听记住它。`;
    $('#result-listen').onclick = () => Sound.say(res.hardest);
  }
  $('#result-next').focus();
}
$('#result-next').addEventListener('click', () => {
  const { world, level } = current;
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
  game.paused = true;
  game.stopVoice();
  game.release();
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
// 点完 HUD 按钮把焦点还给画面，否则空格会再按一次这个按钮
$('#replay').addEventListener('click', (e) => { e.currentTarget.blur(); if (game) game.replay(); });
document.addEventListener('visibilitychange', () => document.hidden && pause());

// ---------- 操作：点屏幕 / 空格 / ↑ 跳，按住跳得高 ----------
const canvas = $('#canvas');
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  Sound.unlock();
  if (game) game.press();
});
['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => canvas.addEventListener(t, () => game && game.release()));
const JUMP_KEYS = ['Space', 'ArrowUp', 'KeyW'];
const overlayOpen = () => !$('#intro').hidden || !$('#paused').hidden || !$('#result').hidden;
document.addEventListener('keydown', (e) => {
  // 弹窗打开时空格留给弹窗里的按钮
  if (!$('#play').classList.contains('active') || !game || overlayOpen()) return;
  if (JUMP_KEYS.includes(e.code)) {
    e.preventDefault();
    if (!e.repeat) game.press();
  } else if (e.code === 'Escape' || e.code === 'KeyP') pause();
  else if (e.code === 'KeyR') game.replay();
});
document.addEventListener('keyup', (e) => { if (JUMP_KEYS.includes(e.code) && game) game.release(); });

// ---------- 通用跳转 ----------
document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => {
  stopGame();
  $('#paused').hidden = true;
  $('#result').hidden = true;
  if (b.dataset.go === 'map') renderMap();
  if (b.dataset.go === 'title') renderGrades();
  show(b.dataset.go);
}));

// ---------- 图鉴 ----------
$('#open-book').addEventListener('click', () => {
  Sound.unlock();
  const items = [];
  for (const w of WORLDS) for (const L of w.levels || []) for (const i of Object.values(L.pools).flat()) {
    if (!items.some((x) => x.show === i.show)) items.push(i);
  }
  const box = $('#cards');
  box.innerHTML = '';
  let learned = 0;
  for (const item of items) {
    const b = document.createElement('button');
    const ok = save.learned[item.show];
    if (ok) learned++;
    b.className = 'card' + (ok ? ' learned' : '');
    b.textContent = item.show;
    b.setAttribute('aria-label', `${item.show}${ok ? '' : '，还没学会'}`);
    b.addEventListener('click', async () => {
      Sound.unlock();
      const request = ++voiceRequest;
      Sound.stopVoice();
      await Sound.load([item.audio]);
      if (request !== voiceRequest || !$('#book').classList.contains('active')) return;
      Sound.say(item.audio);
    });
    box.append(b);
  }
  $('#book-count').textContent = `${learned}/${items.length}`;
  show('book');
});
$('#open-credits').addEventListener('click', () => { $('#credits').hidden = false; });
$('#close-credits').addEventListener('click', () => { $('#credits').hidden = true; });

renderGrades();
