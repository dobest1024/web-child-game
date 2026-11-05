'use strict';
// ===== 界面流程：标题 → 选年级 → 地图 → 关卡 → 结算 =====

const $ = (s) => document.querySelector(s);
let save = loadSave();
let game = null;
let current = null; // { world, level, lastWin }
const GRADE_NAMES = '一二三四五六';

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
  if (worldOf(save.grade).locked) {
    toast(`「${worldOf(save.grade).name}」正在建设中，先带你去一年级的诗词花园！`);
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
    b.innerHTML = `<span class="n"></span><span class="name"></span><span class="st"></span>`;
    b.querySelector('.n').textContent = L.boss ? (L.boss.kind === 'owl' ? '🦉' : '🐉') : String(L.n);
    b.querySelector('.name').textContent = `${L.n}. ${L.name}`;
    b.querySelector('.st').textContent = open ? stars : '🔒';
    b.setAttribute('aria-label', `第${L.n}关 ${L.name}${open ? '' : '，还没解锁'}`);
    b.addEventListener('click', () => (open ? openLevel(w, L) : toast('先通过前一关就能解锁啦！')));
    box.append(b);
  }
}

// ---------- 关卡 ----------
function levelAudioIds(level) {
  const poems = level.tasks.flatMap((t) => (t.type === 'boss' ? t.poems : [t.poem])).map(poemById);
  return [...new Set(poems.flatMap((p) => p.lines.map((_, i) => lineAudio(p, i))))];
}
function openLevel(world, level) {
  stopGame();
  current = { world, level, lastWin: false };
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
  await Sound.load(levelAudioIds(run.level));
  if (starting !== run || current !== run || !$('#play').classList.contains('active')) return; // 加载期间离开了这一关
  $('#intro').hidden = true;
  stopGame();
  game = createGame($('#canvas'), run.level, run.world, {
    fails: levelRecord(save, run.world.grade, run.level.n).fails,
    onLearn(id) { save.learned[id] = true; writeSave(save); },
    onEnd: finishLevel,
  });
});

function finishLevel(res) {
  const { world, level } = current;
  const rec = { ...levelRecord(save, world.grade, level.n) };
  save.coins += res.coins; // 输了金币也照样存好
  if (res.win) {
    rec.stars = Math.max(rec.stars, res.stars);
    rec.fails = 0;
  } else {
    rec.fails++;
  }
  save.levels[`${world.grade}-${level.n}`] = rec;
  writeSave(save);
  current.lastWin = res.win;

  $('#result').hidden = false;
  const last = level.n === world.levels.length;
  $('#result-stars').hidden = !res.win;
  $('#result-skip').hidden = res.win || rec.fails < 5;
  $('#result-again').hidden = !res.win; // 输了时"再试一次"就是重来
  if (res.win) {
    $('#result-title').textContent = level.boss ? `打败了${level.boss.name}！` : '过关啦！';
    $('#result-stars').textContent = '⭐'.repeat(res.stars) + '☆'.repeat(3 - res.stars);
    $('#result-text').textContent = `获得 🪙 ${res.coins}` + (res.stars < 3 ? '　少接错字、别被打中，就能拿 3 颗星哦！' : '　满分！太棒啦！');
    $('#result-next').textContent = last ? '回地图' : '下一关 ▶';
  } else {
    $('#result-title').textContent = '小鸡累啦，休息一下';
    $('#result-text').textContent = '下一次会简单一点点，再来试试！';
    $('#result-next').textContent = '再试一次';
  }
  if (res.hardest) {
    const p = poemById(res.hardest);
    $('#result-text').textContent += `　最容易错的是《${p.title}》，去诗卡图鉴里再读读。`;
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
  game.releaseAll();
  Sound.stopVoice();
  $('#paused').hidden = false;
  $('#resume').focus();
}
$('#pause').addEventListener('click', pause);
$('#resume').addEventListener('click', () => {
  Sound.unlock(); // 切到后台回来，iOS / 微信会把声音挂起
  $('#paused').hidden = true;
  if (game) game.paused = false;
});
$('#restart').addEventListener('click', () => openLevel(current.world, current.level));
$('#replay').addEventListener('click', () => { Sound.unlock(); if (game) game.replay(); });
document.addEventListener('visibilitychange', () => document.hidden && pause());

// ---------- 操作：拖动 / 点击，← → 移动篮子，数字键选木板和下句 ----------
const canvas = $('#canvas');
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  Sound.unlock();
  if (!game) return;
  canvas.setPointerCapture(e.pointerId);
  game.pointerDown(...game.toLogical(e.clientX, e.clientY));
});
canvas.addEventListener('pointermove', (e) => { if (game) game.pointerMove(...game.toLogical(e.clientX, e.clientY)); });
['pointerup', 'pointercancel'].forEach((t) => canvas.addEventListener(t, () => game && game.pointerUp()));
document.addEventListener('keydown', (e) => {
  if (!$('#play').classList.contains('active') || !game) return;
  if (e.code === 'Escape' || e.code === 'KeyP') return pause();
  if (!$('#paused').hidden || !$('#result').hidden || !$('#intro').hidden) return;
  if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(e.code) || /^Digit[1-9]$/.test(e.code)) {
    e.preventDefault();
    if (!e.repeat) game.key(e.code, true);
  } else if (e.code === 'KeyR') game.replay();
});
document.addEventListener('keyup', (e) => { if (game) game.key(e.code, false); });

// ---------- 通用跳转 ----------
document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => {
  stopGame();
  $('#paused').hidden = true;
  $('#result').hidden = true;
  if (b.dataset.go === 'map') renderMap();
  if (b.dataset.go === 'title') renderGrades();
  show(b.dataset.go);
}));

// ---------- 诗卡图鉴 ----------
let reading = [];
let readingRequest = 0;
function stopReading() {
  readingRequest++;
  reading.forEach(clearTimeout);
  reading = [];
  Sound.stopVoice();
  document.querySelectorAll('#pv-lines span').forEach((s) => s.classList.remove('reading'));
}
function openPoem(p) {
  stopReading();
  $('#pv-icon').textContent = p.icon;
  $('#pv-title').textContent = `《${p.title}》`;
  $('#pv-author').textContent = `${p.dynasty} · ${p.author}`;
  const box = $('#pv-lines');
  box.replaceChildren(...p.lines.map((l) => {
    const s = document.createElement('span');
    s.textContent = l;
    return s;
  }));
  $('#pv-read').onclick = async () => {
    Sound.unlock();
    stopReading();
    const request = readingRequest;
    await Sound.load(p.lines.map((_, i) => lineAudio(p, i)));
    if (request !== readingRequest || $('#poem-view').hidden) return;
    let at = 0;
    p.lines.forEach((l, i) => {
      reading.push(setTimeout(() => {
        box.querySelectorAll('span').forEach((s, k) => s.classList.toggle('reading', k === i));
        Sound.say(lineAudio(p, i));
      }, at * 1000));
      at += Sound.length(lineAudio(p, i), bare(l)) + 0.35;
    });
    reading.push(setTimeout(stopReading, at * 1000 + 300));
  };
  $('#poem-view').hidden = false;
  $('#pv-read').focus();
}
$('#pv-close').addEventListener('click', () => { stopReading(); $('#poem-view').hidden = true; });
$('#open-book').addEventListener('click', () => {
  Sound.unlock();
  const box = $('#cards');
  box.innerHTML = '';
  let learned = 0;
  for (const p of POEMS) {
    const ok = !!save.learned[p.id];
    if (ok) learned++;
    const b = document.createElement('button');
    b.className = 'card' + (ok ? ' learned' : '');
    b.innerHTML = '<span class="ic"></span><span class="t"></span><span class="a"></span>';
    b.querySelector('.ic').textContent = p.icon;
    b.querySelector('.t').textContent = p.title.replace(/（.*）/, '');
    b.querySelector('.a').textContent = `${GRADE_NAMES[p.grade - 1]}年级 · ` + (ok ? `${p.dynasty} · ${p.author}` : '还没学会');
    b.setAttribute('aria-label', `${p.title}${ok ? '' : '，还没学会'}`);
    b.addEventListener('click', () => (ok ? openPoem(p) : toast('在关卡里学会这首诗，就能打开诗卡啦！')));
    box.append(b);
  }
  $('#book-count').textContent = `${learned}/${POEMS.length}`;
  show('book');
});
$('#open-credits').addEventListener('click', () => { $('#credits').hidden = false; });
$('#close-credits').addEventListener('click', () => { $('#credits').hidden = true; });

renderGrades();
