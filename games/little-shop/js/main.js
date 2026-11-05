'use strict';
// ===== 界面流程：标题 → 选年级 → 地图 → 关卡 → 结算；装修、图鉴 =====

const $ = (s) => document.querySelector(s);
const CN_NUM = '一二三四五六';
// 只给自测用：?speed=4 让时间走快 4 倍（最多 8 倍），正常游戏不带这个参数
const SPEED = Math.min(8, Math.max(1, Number(new URLSearchParams(location.search).get('speed')) || 1));
let save = loadSave();
let game = null;
let current = null; // { world, level, lastWin }
const stage = $('#stage');
const view = createView(stage);

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

// ---------- 画面大小：横屏 1000×625、竖屏 560×900 两种布局，等比缩放不裁切 ----------
function fitStage() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const portrait = vw / vh < 0.85;
  const [w, h] = portrait ? [560, 900] : [1000, 625];
  const s = Math.min(vw / w, vh / h);
  stage.classList.toggle('portrait', portrait);
  stage.style.width = `${w}px`;
  stage.style.height = `${h}px`;
  stage.style.transform = `translate(${(vw - w * s) / 2}px, ${(vh - h * s) / 2}px) scale(${s})`;
}
window.addEventListener('resize', fitStage);
fitStage();

// ---------- 游戏循环 ----------
let raf = 0;
let last = 0;
function loop(t) {
  const dt = Math.min(0.05, (t - last) / 1000 || 0);
  last = t;
  if (game) {
    if (!game.paused) game.tick(dt * SPEED);
    if (game) view.render(game);
  }
  raf = requestAnimationFrame(loop);
}
function stopGame() {
  if (game) game.paused = true;
  game = null;
  cancelAnimationFrame(raf);
  raf = 0;
}

// ---------- 标题页 ----------
function renderGrades() {
  $('#grades').innerHTML = '';
  for (const w of WORLDS) {
    const b = document.createElement('button');
    b.className = 'grade' + (w.grade === save.grade ? ' active' : '') + (w.locked ? ' locked' : '');
    b.textContent = `${CN_NUM[w.grade - 1]}年级${w.locked ? ' 🔒' : ''}`;
    b.setAttribute('aria-pressed', String(w.grade === save.grade));
    b.addEventListener('click', () => {
      Sound.unlock();
      save.grade = w.grade;
      writeSave(save);
      renderGrades();
      if (w.locked) toast(`${CN_NUM[w.grade - 1]}年级的「${w.name}」正在建设中，先去一年级的小店玩玩吧！`);
    });
    $('#grades').append(b);
  }
}
$('#start').addEventListener('click', () => {
  Sound.unlock();
  const w = worldOf(save.grade);
  if (w.locked) {
    toast(`「${w.name}」正在建设中，先带你去一年级的森林街角小店！`);
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
  $('#world-title').textContent = `${CN_NUM[w.grade - 1]}年级 · ${w.name}`;
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
    b.innerHTML = '<span class="n"></span><span class="name"></span><span class="st"></span>';
    b.querySelector('.n').textContent = L.boss ? L.boss.e : L.n;
    b.querySelector('.name').textContent = `${L.n}. ${L.name}`;
    b.querySelector('.st').textContent = open ? stars : '🔒';
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
  fitStage();
  $('#result').hidden = true;
  $('#paused').hidden = true;
  $('#intro').hidden = false;
  $('#intro-no').textContent = level.boss ? `第 ${level.n} 关 · Boss 关` : `第 ${level.n} 关`;
  $('#intro-name').textContent = level.name;
  $('#intro-text').textContent = level.intro;
  view.start(save.decor);
  $('#cust-area').innerHTML = '';
  $('#panel').innerHTML = '<p class="panel-wait">准备开门营业…</p>';
  $('#hud-info').innerHTML = '';
  $('#go').focus();
}
$('#go').addEventListener('click', () => {
  // 只开一局：介绍框已经关了（被连点）就不再开
  if ($('#intro').hidden || !current) return;
  Sound.unlock();
  $('#intro').hidden = true;
  stopGame();
  const { world, level } = current;
  game = createShop(level, world, {
    fails: levelRecord(save, world.grade, level.n).fails,
    onServe(id) { save.friends[id] = (save.friends[id] || 0) + 1; writeSave(save); },
    onLearn(ids) { ids.forEach((id) => (save.money[id] = true)); writeSave(save); },
    onEnd: finishLevel,
  });
  last = performance.now();
  raf = requestAnimationFrame(loop);
});

function finishLevel(res) {
  const { world, level } = current;
  const rec = { ...levelRecord(save, world.grade, level.n) };
  save.coins = Math.min(999999, save.coins + res.coins); // 输了金币也照样存好
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
  const isLast = level.n === world.levels.length;
  $('#result-stars').hidden = !res.win;
  $('#result-skip').hidden = res.win || rec.fails < 5;
  // 输了大按钮就是"再试一次"、打完最后一关大按钮就是"回地图"，别再重复一个
  $('#result-again').hidden = !res.win;
  $('#result [data-go="map"]').hidden = res.win && isLast;
  let text;
  if (res.win) {
    $('#result-title').textContent = level.boss ? `${level.boss.name}心满意足地走啦！` : '今天的生意真好！';
    $('#result-stars').textContent = '⭐'.repeat(res.stars) + '☆'.repeat(3 - res.stars);
    text = `赚到 🪙 ${res.coins}。` + (res.stars < 3 ? '别让顾客等太久、少算错几次，就能拿 3 颗星！' : '满分小店长！');
    $('#result-next').textContent = isLast ? '回地图' : '下一关 ▶';
  } else {
    $('#result-title').textContent = res.reason === 'hearts' ? '哎呀，被捣乱啦！' : '打烊啦，明天再来！';
    // 最多帮 3 次（game.js 里 assist = min(3, fails)），帮满了就不再说会变简单
    text = `今天服务了 ${res.served} 位顾客，赚到 🪙 ${res.coins}。` + (rec.fails <= 3 ? '下一次会简单一点点，再试试吧！' : '再试试吧！');
    $('#result-next').textContent = '再试一次';
  }
  if (res.hardest) text += `　最难的是「${TYPE_NAMES[res.hardest]}」，慢慢来～`;
  $('#result-text').textContent = text;
  $('#result-next').focus();
}
$('#result-next').addEventListener('click', () => {
  const { world, level, lastWin } = current;
  if (!lastWin) return openLevel(world, level); // 按这一局的输赢，不看以前拿过几颗星
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

// ---------- 操作：点一点（触屏、鼠标），也能用键盘 ----------
function act(el) {
  if (!game) return;
  Sound.unlock();
  const d = el.dataset;
  if (d.act === 'add') game.addMoney(d.id);
  else if (d.act === 'remove') game.removeMoney(Number(d.i));
  else if (d.act === 'item-add') game.addItem();
  else if (d.act === 'item-remove') game.removeItem();
  else if (d.act === 'choose') game.choose(d.v);
  else if (d.act === 'submit') game.submit();
  else if (d.act === 'pest') game.catchPest(Number(d.id));
}
// 捣乱的小东西用 pointerdown，手指一碰就算；其他按钮用 click（键盘回车也能触发）
stage.addEventListener('pointerdown', (e) => {
  const el = e.target.closest('[data-act="pest"]');
  if (el) { e.preventDefault(); act(el); }
});
stage.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  act(el);
  el.blur(); // 焦点不留在按钮上，免得空格、回车再按一次
});

const overlayOpen = () => !$('#intro').hidden || !$('#paused').hidden || !$('#result').hidden;
document.addEventListener('keydown', (e) => {
  // 弹窗打开时键盘留给弹窗里的按钮
  if (!$('#play').classList.contains('active') || !game || overlayOpen() || e.repeat) return;
  const t = game.customer && game.customer.task;
  if (e.code === 'Escape' || e.code === 'KeyP') return pause();
  if (e.code === 'Space') {
    e.preventDefault();
    if (game.pests.length) game.catchPest(game.pests[0].id);
    return;
  }
  if (!t) return;
  const digit = /^Digit([1-9])$/.exec(e.code) || /^Numpad([1-9])$/.exec(e.code);
  if (digit) {
    const i = Number(digit[1]) - 1;
    if (MONEY_TYPES.includes(t.type) && t.allowed[i]) game.addMoney(t.allowed[i]);
    else if ((t.type === 'pick' || t.type === 'clock' || t.type === 'calc') && t.choices[i]) game.choose(t.choices[i]);
    else if (t.type === 'count' && i === 0) game.addItem();
  } else if (e.code === 'Equal' || e.code === 'NumpadAdd' || e.code === 'ArrowUp') {
    if (t.type === 'count') game.addItem();
  } else if (e.code === 'Backspace' || e.code === 'Minus' || e.code === 'NumpadSubtract' || e.code === 'ArrowDown') {
    e.preventDefault();
    if (t.type === 'count') game.removeItem();
    else if (game.plate.length) game.removeMoney(game.plate.length - 1);
  } else if (e.code === 'Enter' || e.code === 'NumpadEnter') {
    e.preventDefault();
    game.submit();
  }
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

// ---------- 装修小店 ----------
function renderDecor() {
  $('#decor-coins').textContent = save.coins;
  $('#decor-scene').innerHTML = sceneHtml(save.decor);
  const list = $('#decor-list');
  list.innerHTML = '';
  for (const slot of DECOR_SLOTS) {
    const box = document.createElement('div');
    box.className = 'decor-slot';
    const h = document.createElement('h3');
    h.textContent = DECOR[slot].name;
    const row = document.createElement('div');
    row.className = 'decor-row';
    for (const item of DECOR[slot].items) {
      const b = document.createElement('button');
      const owned = ownsDecor(save, slot, item.id);
      const using = save.decor[slot] === item.id;
      b.className = 'decor-item' + (using ? ' using' : '') + (owned ? ' owned' : '');
      const icon = item.e !== undefined ? item.e || '⬜' : slot === 'awning' ? '⛱️' : '🪧';
      b.innerHTML = '<span class="decor-icon"></span><span class="decor-name"></span><span class="decor-price"></span>';
      b.querySelector('.decor-icon').textContent = icon;
      if (slot === 'awning') b.querySelector('.decor-icon').style.background = `linear-gradient(90deg,${item.colors.join(',')})`;
      b.querySelector('.decor-name').textContent = item.name;
      b.querySelector('.decor-price').textContent = using ? '用着呢' : owned ? '换上' : `🪙 ${item.price}`;
      b.addEventListener('click', () => {
        Sound.unlock();
        if (!owned) {
          if (save.coins < item.price) return toast(`还差 🪙 ${item.price - save.coins}，多做几单生意吧！`);
          save.coins -= item.price;
          save.decor.owned.push(`${slot}:${item.id}`);
          Sound.right();
          toast(`买到「${item.name}」啦！`);
        } else Sound.tap();
        save.decor[slot] = item.id;
        writeSave(save);
        renderDecor();
      });
      row.append(b);
    }
    box.append(h, row);
    list.append(box);
  }
}
// 预览按 1000px 宽画，再缩放到预览框里
function scaleDecorPreview() {
  const box = document.querySelector('.decor-preview');
  if (box.clientWidth) $('#decor-scene').style.transform = `scale(${box.clientWidth / 1000})`;
}
window.addEventListener('resize', scaleDecorPreview);
$('#open-decor').addEventListener('click', () => { Sound.unlock(); renderDecor(); show('decor'); scaleDecorPreview(); });

// ---------- 图鉴 ----------
const MONEY_FACTS = {
  j1: '10 个 1角 是 1元', j5: '2 个 5角 是 1元', y1: '1元 = 10角',
  y5: '5 个 1元 是 5元', y10: '2 张 5元 是 10元', y20: '2 张 10元 是 20元',
};
function renderBook() {
  const friends = $('#friend-cards');
  friends.innerHTML = '';
  let met = 0;
  for (const a of ANIMALS) {
    const n = save.friends[a.id] || 0;
    if (n) met++;
    const card = document.createElement('div');
    card.className = 'card' + (n ? ' learned' : '');
    card.innerHTML = '<span class="card-icon"></span><b></b><small></small>';
    card.querySelector('.card-icon').textContent = n ? a.e : '❔';
    card.querySelector('b').textContent = n ? a.name : '还没来过';
    card.querySelector('small').textContent = n ? `来买过 ${n} 次` : '';
    friends.append(card);
  }
  const money = $('#money-cards');
  money.innerHTML = '';
  let known = 0;
  for (const id of MONEY_ORDER) {
    const ok = !!save.money[id];
    if (ok) known++;
    const card = document.createElement('div');
    card.className = 'card money-card' + (ok ? ' learned' : '');
    card.innerHTML = `<span class="card-icon">${moneySvg(id)}</span><b></b><small></small>`;
    card.querySelector('b').textContent = MONEY[id].label;
    card.querySelector('small').textContent = ok ? MONEY_FACTS[id] : '用它做成一单生意就点亮';
    money.append(card);
  }
  $('#book-count').textContent = `朋友 ${met}/${ANIMALS.length} · 钱币 ${known}/${MONEY_ORDER.length}`;
}
$('#open-book').addEventListener('click', () => { Sound.unlock(); renderBook(); show('book'); });
$('#open-credits').addEventListener('click', () => { $('#credits').hidden = false; $('#close-credits').focus(); });
$('#close-credits').addEventListener('click', () => { $('#credits').hidden = true; });

renderGrades();
