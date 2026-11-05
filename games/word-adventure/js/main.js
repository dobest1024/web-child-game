'use strict';
// ===== 界面流程：标题 → 选年级 → 地图 → 关卡 → 结算，另有单词图鉴 =====

const $ = (s) => document.querySelector(s);
const GRADE_NAMES = '一二三四五六';
const calm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const GROUP_NAMES = { letter: '字母', color: '颜色', number: '数字', animal: '动物', fruit: '水果', body: '身体', family: '家人', cvc: '三个字母的小词' };
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
let voiceRequest = 0;
const stopGame = () => {
  starting = null;
  voiceRequest++;
  Sound.stopVoice();
  if (game) { game.stop(); game = null; }
};
const gradesText = (w) => w.grades.map((g) => GRADE_NAMES[g - 1]).join('') + '年级';

// ---------- 标题页 ----------
function renderGrades() {
  $('#grades').innerHTML = '';
  for (let grade = 1; grade <= 6; grade++) {
    const w = worldOfGrade(grade);
    const b = document.createElement('button');
    b.className = 'grade' + (grade === save.grade ? ' active' : '') + (w.locked ? ' locked' : '');
    b.textContent = `${GRADE_NAMES[grade - 1]}年级${w.locked ? ' 🔒' : ''}`;
    b.setAttribute('aria-pressed', String(grade === save.grade));
    b.addEventListener('click', () => {
      save.grade = grade;
      writeSave(save);
      renderGrades();
      if (w.locked) toast(`「${w.name}」正在建设中，先去一二年级的英语启蒙岛玩玩吧！`);
    });
    $('#grades').append(b);
  }
}
$('#start').addEventListener('click', () => {
  Sound.unlock();
  const w = worldOfGrade(save.grade);
  if (w.locked) {
    toast(`「${w.name}」正在建设中，先带你去英语启蒙岛！`);
    save.grade = 1;
    writeSave(save);
    renderGrades();
  }
  renderMap();
  show('map');
});

// ---------- 地图 ----------
function renderMap() {
  const w = worldOfGrade(save.grade);
  $('#world-title').textContent = `${gradesText(w)} · ${w.name}`;
  $('#map-coins').textContent = save.coins;
  const box = $('#levels');
  box.innerHTML = '';
  const firstOpen = w.levels.find((L) => levelRecord(save, w.id, L.n).stars === 0 && isUnlocked(save, w.id, L.n));
  for (const L of w.levels) {
    const rec = levelRecord(save, w.id, L.n);
    const open = isUnlocked(save, w.id, L.n);
    const b = document.createElement('button');
    b.className = 'level-node' + (L.boss ? ' boss' : '') + (open ? '' : ' locked') + (L === firstOpen ? ' current' : '');
    const stars = rec.skipped && !rec.stars ? '☆☆☆' : '⭐'.repeat(rec.stars) + '☆'.repeat(3 - rec.stars);
    b.innerHTML = `<span class="n">${L.boss ? '🦖' : L.n}</span><span class="name"></span><span class="st">${open ? stars : '🔒'}</span>`;
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
// 要用到的读音：题库里的词；小蛇关还会读吃到的每个字母（干扰字母可能是任意一个）
function audioIds(level) {
  const ids = level.pool.map((i) => i.audio);
  if (level.mode === 'snake') ids.push(...Object.values(LETTERS).map((l) => l.audio));
  return [...new Set(ids)];
}
let starting = null;
$('#go').addEventListener('click', async () => {
  // 网慢时孩子会连点"出发"，只开一局
  if (starting === current) return;
  starting = current;
  Sound.unlock();
  const run = current;
  const { world, level } = run;
  await Sound.load(audioIds(level));
  if (starting !== run || current !== run || !$('#play').classList.contains('active')) return; // 加载期间离开了这一关
  $('#intro').hidden = true;
  stopGame();
  game = createGame($('#canvas'), level, world, {
    fails: levelRecord(save, world.id, level.n).fails,
    calm,
    onLearn(id) { save.learned[id] = true; writeSave(save); },
    onEnd: finishLevel,
  });
});

function finishLevel(res) {
  const { world, level } = current;
  const rec = { ...levelRecord(save, world.id, level.n) };
  save.coins += res.coins; // 输了金币也照样存好
  if (res.win) {
    rec.stars = Math.max(rec.stars, res.stars);
    rec.fails = 0;
  } else {
    rec.fails++;
  }
  save.levels[levelKey(world.id, level.n)] = rec;
  writeSave(save);
  current.lastWin = res.win;

  $('#result').hidden = false;
  const last = level.n === world.levels.length;
  $('#result-stars').hidden = !res.win;
  $('#result-listen').hidden = !res.hardest;
  $('#result-skip').hidden = res.win || rec.fails < 5;
  // 输了大按钮就是"再试一次"、打完最后一关大按钮就是"回地图"，别再重复一个
  $('#result-again').hidden = !res.win;
  $('#result [data-go="map"]').hidden = res.win && last;
  if (res.win) {
    const tip = game && game.mode.usesHearts ? '不掉小心心、少答错，就能拿 3 颗星哦！' : '少答错几次，就能拿 3 颗星哦！';
    $('#result-title').textContent = level.boss ? `打败了${level.boss.name}！` : '过关啦！';
    $('#result-stars').textContent = '⭐'.repeat(res.stars) + '☆'.repeat(3 - res.stars);
    $('#result-text').textContent = `获得 🪙 ${res.coins}　` + (res.stars < 3 ? tip : '满分！太棒啦！');
    $('#result-next').textContent = last ? '回地图' : '下一关 ▶';
  } else {
    $('#result-title').textContent = '小心心用完啦，休息一下';
    // 最多帮 3 次（game.js 里 assist = min(3, fails)），帮满了就不再说会变简单
    $('#result-text').textContent = rec.fails <= 3 ? '下一次会简单一点点，再来试试！' : '再来一次吧！';
    $('#result-next').textContent = '再试一次';
  }
  if (res.hardest) {
    const item = res.hardest;
    $('#result-text').textContent += `　最容易错的是「${item.show}」（${item.zh}），再听听记住它。`;
    $('#result-listen').onclick = () => Sound.say(item.audio);
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
  save.levels[levelKey(world.id, level.n)] = { ...levelRecord(save, world.id, level.n), skipped: true };
  writeSave(save);
  stopGame();
  renderMap();
  show('map');
});

// ---------- 暂停 ----------
function pause() {
  if (!game || game.state !== 'play' || !$('#intro').hidden) return;
  game.paused = true;
  Sound.stopVoice();
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

// ---------- 操作：点泡泡 / 翻卡片；小蛇关点屏幕或滑动转弯 ----------
const canvas = $('#canvas');
let touch = null; // 小蛇关：按下的位置，松手时没怎么动就当点一下
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  Sound.unlock();
  if (!game) return;
  if (game.mode.swipe) {
    touch = { x: e.clientX, y: e.clientY, used: false };
    canvas.setPointerCapture(e.pointerId); // 手指滑出画布也能收到松手
  }
  else game.tapClient(e.clientX, e.clientY);
});
canvas.addEventListener('pointermove', (e) => {
  if (!touch || touch.used || !game) return;
  const dx = e.clientX - touch.x, dy = e.clientY - touch.y;
  if (Math.hypot(dx, dy) > 30) { touch.used = true; game.swipe(dx, dy); }
});
canvas.addEventListener('pointerup', () => {
  if (touch && !touch.used && game) game.tapClient(touch.x, touch.y);
  touch = null;
});
canvas.addEventListener('pointercancel', () => { touch = null; });
const overlayOpen = () => !$('#intro').hidden || !$('#paused').hidden || !$('#result').hidden;
document.addEventListener('keydown', (e) => {
  // 弹窗打开时空格、回车留给弹窗里的按钮
  if (!$('#play').classList.contains('active') || !game || overlayOpen()) return;
  if (e.code === 'Escape' || e.code === 'KeyP') pause();
  else if (e.code === 'KeyR') game.replay();
  else if (!e.repeat && game.key(e.code)) e.preventDefault();
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

// ---------- 图鉴 ----------
function picHtml(pic) {
  if (pic.text) return `<span class="meaning">${pic.text}</span>`;
  if (pic.emoji) return pic.emoji;
  if (pic.color) return `<span class="swatch" style="background:${pic.color}"></span>`;
  if (pic.number) return `<span class="digit">${pic.number}</span>`;
  return `<span class="abc">${pic.letter.toUpperCase()}${pic.letter}</span>`;
}
$('#open-book').addEventListener('click', () => {
  Sound.unlock();
  const items = [...Object.values(LETTERS), ...Object.values(WORDS)];
  const box = $('#cards');
  box.innerHTML = '';
  let learned = 0;
  const names = { ...GROUP_NAMES, ...{"school": "校园", "food": "食物", "home": "家里", "action": "动作", "feeling": "感受", "size": "比较", "clothes": "衣服", "people": "人物", "classroom": "课堂", "numbers": "数字", "meals": "餐食", "weather": "天气", "week": "星期", "sports": "运动", "places": "地点", "positions": "方位", "subjects": "学科", "jobs": "职业", "transport": "交通", "city": "城市", "shopping": "购物", "daily": "日常", "nature": "自然", "health": "健康", "months": "月份", "seasons": "季节", "abilities": "能力", "character": "性格", "travel": "旅行", "life": "生活", "adverbs": "频率", "environment": "环境", "comparison": "比较", "past": "过去式", "plans": "计划", "feelings": "情绪", "communication": "交流", "community": "社会", "resources": "资源", "learning": "学习"} };
  for (const item of items) if (!names[item.group]) names[item.group] = `${GRADE_NAMES[(item.grade || 1) - 1]}年级 · ${item.group}`;
  for (const [group, name] of Object.entries(names)) {
    const h = document.createElement('h3');
    h.textContent = name;
    const grid = document.createElement('div');
    grid.className = 'cards';
    for (const item of items.filter((i) => i.group === group)) {
      const ok = save.learned[item.id];
      if (ok) learned++;
      const b = document.createElement('button');
      b.className = 'card' + (ok ? ' learned' : '');
      b.innerHTML = `<span class="pic">${picHtml(item.pic)}</span><span class="en"></span><span class="zh"></span>`;
      // 字母卡的图就是大小写 Aa，下面不再重复写
      if (item.group !== 'letter') {
        b.querySelector('.en').textContent = item.show;
        b.querySelector('.zh').textContent = item.zh;
      }
      b.setAttribute('aria-label', `${item.show} ${item.zh}${ok ? '' : '，还没学会'}`);
      b.addEventListener('click', async () => {
        Sound.unlock();
      const request = ++voiceRequest;
      Sound.stopVoice();
      await Sound.load([item.audio]);
      if (request !== voiceRequest || !$('#book').classList.contains('active')) return;
        Sound.say(item.audio);
      });
      grid.append(b);
    }
    box.append(h, grid);
  }
  $('#book-count').textContent = `${learned}/${items.length}`;
  show('book');
});
$('#open-credits').addEventListener('click', () => { $('#credits').hidden = false; $('#close-credits').focus(); });
$('#close-credits').addEventListener('click', () => { $('#credits').hidden = true; });

renderGrades();
