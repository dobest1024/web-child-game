import { RailwayAudio } from './audio.js';
import {
  levels,
  themes,
  cols,
  rows,
  same,
  key,
  sandboxLevel,
} from './levels.js';
import { extendRoute, evaluateRoute, readSandbox } from './engine.js';
import { animalSvg, animal, drawScene, locomotive } from './art.js';
const $ = (selector) => document.querySelector(selector);
const progressKey = 'little-railway:progress:v1';
const sandboxKey = 'little-railway:sandbox:v1';
let progress = {};
try {
  const saved = JSON.parse(localStorage.getItem(progressKey));
  if (saved && typeof saved === 'object')
    for (const level of levels)
      if ([1, 2, 3].includes(saved[level.id]))
        progress[level.id] = saved[level.id];
} catch {
  /* Play still works when storage is unavailable. */
}
let level = levels[0];
let route = [level.start];
let running = false;
let frame = 0;
let speed = 1;
let tool = 'track';
const sounds = new RailwayAudio();
let dragging = false;
let suppressClick = false;
let focusIndex = level.start[1] * cols + level.start[0];
let collected = [];
let freeDraft = null;
let freeDirty = false;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const palettes = [
  ['track', '🛤 铺轨'],
  ['tree', '🌳 树木'],
  ['water', '💧 河水'],
  ['bridge', '🌉 木桥'],
  ['friend', '🐰 朋友'],
  ['star', '⭐ 星星'],
  ['erase', '⌫ 橡皮'],
];
function tell(message, error = false) {
  $('#status').textContent = message;
  $('#status').classList.toggle('error', error);
  if (error) sounds.play('error');
}
function store(name, value) {
  try {
    localStorage.setItem(name, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
function rememberDraft() {
  if (level.sandbox)
    freeDraft = {
      level: structuredClone(level),
      route: structuredClone(route),
    };
}
function setLevel(next, savedRoute) {
  stopTrain(false);
  rememberDraft();
  level = structuredClone(next);
  route = savedRoute ? structuredClone(savedRoute) : [level.start];
  collected = [];
  tool = 'track';
  focusIndex = level.start[1] * cols + level.start[0];
  $('#chapter').textContent = level.sandbox
    ? '创意工坊 / 自由建造'
    : `第 ${Math.floor(level.id / 6) + 1} 章 / ${themes[level.theme].name} · 第 ${level.id + 1} 站`;
  $('#title').textContent = level.name;
  $('#story').textContent = level.story;
  $('#editor').hidden = !level.sandbox;
  $('#free-mode').textContent = level.sandbox
    ? '🗺 返回旅行关卡'
    : '✦ 自由建造 · 设计自己的铁路';
  $('#theme').value = String(level.theme);
  $('#budget').textContent = level.sandbox
    ? '慢慢铺，不限目标'
    : `巧手目标 ≤ ${level.budget} 格`;
  $('#guide').textContent = level.sandbox
    ? '搭个小世界吧！选下方工具布置地图，再换回「铺轨」让它跑起来。'
    : level.id === 0
      ? '嗨，小工程师！点起点右边亮着的格子，去接兔兔吧。'
      : level.story;
  $('#save-status').textContent = freeDirty
    ? '有新设计，记得保存哦'
    : '保存在这台设备的浏览器里';
  renderPalette();
  render(true);
  tell('从绿色起点旁边开始铺轨吧！');
}
function renderPalette() {
  $('#palette').innerHTML = palettes
    .map(
      ([id, label]) =>
        `<button data-tool="${id}" aria-pressed="${id === tool}">${label}</button>`,
    )
    .join('');
}
function render(rebuild = false) {
  const theme = themes[level.theme];
  $('#location').textContent = `${theme.icon} ${theme.name}`;
  $('#weather').textContent = [
    '晴 · 适合出发的一天',
    '海风 · 有贝壳的味道',
    '小雪 · 车厢里暖暖的',
  ][level.theme];
  $('#scene').innerHTML = drawScene(level, route, collected, running);
  if (rebuild) {
    $('#cells').replaceChildren();
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const cell = document.createElement('button');
        cell.className = 'cell';
        cell.dataset.x = x;
        cell.dataset.y = y;
        $('#cells').append(cell);
      }
  }
  updateCells();
  updateMission();
  $('#undo').disabled = running || route.length < 2;
  $('#reset').disabled = running || route.length < 2;
  $('#hint').disabled = running;
  $('#theme').disabled = running;
  $('#save').disabled = running;
  $('#palette')
    .querySelectorAll('button')
    .forEach((button) => {
      button.disabled = running;
    });
  $('#go').innerHTML = running
    ? '停一下 <span>Ⅱ</span>'
    : '出发喽！ <span>➜</span>';
  $('#progress').textContent = `${Object.keys(progress).length} / 18`;
  $('#caption').textContent = running
    ? '小火车出发啦，看看谁上车了！'
    : level.sandbox && tool !== 'track'
      ? '点击格子，布置你的铁路世界'
      : '点亮着的邻格，接着铺铁路';
}
function updateCells() {
  const last = route.at(-1);
  $('#cells')
    .querySelectorAll('button')
    .forEach((button, i) => {
      const p = [Number(button.dataset.x), Number(button.dataset.y)];
      const id = key(p);
      const friend = level.passengers.find((item) => same(item.at, p));
      let content = same(p, level.start)
        ? '绿色起点'
        : same(p, level.goal)
          ? '红屋顶终点'
          : friend
            ? `${friend.name}等车处`
            : level.tokens.some((item) => same(item, p))
              ? '星星纪念章'
              : level.rocks.includes(id)
                ? '树木，不能通行'
                : level.water.includes(id)
                  ? '河水，不能通行'
                  : level.bridges.includes(id)
                    ? '木桥'
                    : '草地';
      const used = route.some((item) => same(item, p));
      button.setAttribute(
        'aria-label',
        `第${p[1] + 1}行第${p[0] + 1}列，${content}${used ? '，已铺轨' : ''}`,
      );
      button.tabIndex = i === focusIndex ? 0 : -1;
      button.disabled = running;
      button.classList.toggle('end', same(p, last));
      button.classList.toggle(
        'available',
        !running &&
          tool === 'track' &&
          !used &&
          !same(last, level.goal) &&
          !level.rocks.includes(id) &&
          !level.water.includes(id) &&
          Math.abs(last[0] - p[0]) + Math.abs(last[1] - p[1]) === 1,
      );
    });
}
function updateMission() {
  const seen = new Set(running ? collected : route.map(key));
  $('#passengers').innerHTML = level.passengers.length
    ? level.passengers
        .map(
          (p) =>
            `<div class="passenger ${seen.has(key(p.at)) ? 'connected' : ''}">${animalSvg(p.kind, seen.has(key(p.at)))}<span>${p.name}</span><b>${seen.has(key(p.at)) ? (running ? '✓ 已上车' : '✓ 已连通') : '等你来接'}</b></div>`,
        )
        .join('')
    : '<p class="soft-note">空车也能兜风，可以用「朋友」工具邀请乘客。</p>';
  $('#destination').textContent = same(route.at(-1), level.goal)
    ? '✓ 已连接'
    : '等待连接';
  $('#token-status').textContent =
    `${level.tokens.filter((p) => seen.has(key(p))).length} / ${level.tokens.length}`;
  $('#used').textContent = route.length - 1;
}
function markDirty() {
  if (!level.sandbox) return;
  freeDirty = true;
  $('#save-status').textContent = '有新设计，记得保存哦';
}
function editPoint(p) {
  if (running) return;
  if (level.sandbox && tool !== 'track') {
    if (same(p, level.start) || same(p, level.goal))
      return tell('起点和终点要留着给火车使用哦。', true);
    if (
      tool === 'friend' &&
      level.passengers.length >= 4 &&
      !level.passengers.some((item) => same(item.at, p))
    )
      return tell('这趟小列车最多邀请 4 位朋友。', true);
    if (
      tool === 'star' &&
      level.tokens.length >= 4 &&
      !level.tokens.some((item) => same(item, p))
    )
      return tell('最多放 4 颗星星，试试把它们放在有趣的位置。', true);
    const id = key(p);
    for (const field of ['rocks', 'water', 'bridges'])
      level[field] = level[field].filter((item) => item !== id);
    level.passengers = level.passengers.filter((item) => !same(item.at, p));
    level.tokens = level.tokens.filter((item) => !same(item, p));
    if (tool === 'tree') level.rocks.push(id);
    if (tool === 'water') level.water.push(id);
    if (tool === 'bridge') level.bridges.push(id);
    if (tool === 'friend') {
      const kind = level.passengers.length % 4;
      level.passengers.push({
        at: p,
        kind,
        name: ['兔兔', '小熊', '小猫', '企鹅'][kind],
      });
    }
    if (tool === 'star') level.tokens.push(p);
    route = [level.start];
    tell('布置好啦！选「铺轨」，从起点开始设计路线。');
  } else {
    const next = extendRoute(level, route, p);
    if (next.error) return tell(next.error, true);
    route = next.route;
    const result = evaluateRoute(level, route);
    tell(
      result.success
        ? '路线准备好了，按「出发喽」接朋友去旅行！'
        : same(route.at(-1), level.goal)
          ? result.message
          : '铺得真不错！接上每一位朋友，再去红屋顶车站。',
    );
  }
  markDirty();
  collected = [];
  sounds.play('place');
  render();
}
const cells = $('#cells');
cells.addEventListener('pointerdown', (event) => {
  const cell = event.target.closest('.cell');
  if (!cell || running || event.button !== 0) return;
  dragging = true;
  suppressClick = true;
  focusIndex = Number(cell.dataset.y) * cols + Number(cell.dataset.x);
  editPoint([Number(cell.dataset.x), Number(cell.dataset.y)]);
});
cells.addEventListener('pointermove', (event) => {
  if (!dragging || running) return;
  const cell = document
    .elementFromPoint(event.clientX, event.clientY)
    ?.closest('.cell');
  if (!cell || !cells.contains(cell)) return;
  const p = [Number(cell.dataset.x), Number(cell.dataset.y)];
  if (same(p, route.at(-1)) && tool === 'track') return;
  if (tool !== 'track') return; // Paint terrain deliberately; drag is for tracks.
  const last = route.at(-1);
  if (Math.abs(last[0] - p[0]) + Math.abs(last[1] - p[1]) === 1) editPoint(p);
});
window.addEventListener('pointerup', () => {
  dragging = false;
  setTimeout(() => {
    suppressClick = false;
  }, 0);
});
window.addEventListener('pointercancel', () => {
  dragging = false;
  suppressClick = false;
});
window.addEventListener('blur', () => {
  dragging = false;
});
cells.addEventListener('click', (event) => {
  if (suppressClick) return;
  const cell = event.target.closest('.cell');
  if (cell) editPoint([Number(cell.dataset.x), Number(cell.dataset.y)]);
});
cells.addEventListener('keydown', (event) => {
  const cell = event.target.closest('.cell');
  if (!cell || running) return;
  let x = Number(cell.dataset.x),
    y = Number(cell.dataset.y);
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault();
    if (event.key === 'ArrowUp') y = Math.max(0, y - 1);
    if (event.key === 'ArrowDown') y = Math.min(rows - 1, y + 1);
    if (event.key === 'ArrowLeft') x = Math.max(0, x - 1);
    if (event.key === 'ArrowRight') x = Math.min(cols - 1, x + 1);
    focusIndex = y * cols + x;
    updateCells();
    cells.children[focusIndex].focus();
  } else if (event.key === 'Backspace') {
    event.preventDefault();
    undo();
  }
});
function undo() {
  if (running || route.length < 2) return;
  route.pop();
  sounds.play('undo');
  markDirty();
  render();
  tell('退回一格啦，试试另一个方向。');
}
$('#undo').addEventListener('click', undo);
$('#reset').addEventListener('click', () => {
  sounds.play('undo');
  route = [level.start];
  collected = [];
  markDirty();
  render();
  tell('重新出发！从绿色起点开始。');
});
$('#hint').addEventListener('click', () => {
  const missing = level.passengers.find(
    (p) => !route.some((item) => same(item, p.at)),
  );
  const message = missing
    ? `${missing.name}在第 ${missing.at[1] + 1} 行、第 ${missing.at[0] + 1} 列等你。先接它，再去终点；遇到水要走木桥。`
    : '朋友都连上啦！终点在第 ' +
      (level.goal[1] + 1) +
      ' 行、第 ' +
      (level.goal[0] + 1) +
      ' 列。想拿更多星星，可以绕去收集纪念章。';
  $('#guide').textContent = message;
  tell(message);
});
$('#speed').addEventListener('click', () => {
  speed = speed === 1 ? 2 : 1;
  $('#speed').textContent = `${speed}×`;
});
function updateSoundControls() {
  $('#sound').textContent = sounds.enabled ? '♫ 声音开' : '♫ 声音关';
  $('#sound').setAttribute('aria-pressed', String(sounds.enabled));
  $('#sound').setAttribute(
    'aria-label',
    sounds.enabled ? '关闭声音' : '开启声音',
  );
  $('#volume').value = Math.round(sounds.volume * 100);
}
document.addEventListener('pointerdown', () => sounds.unlock(), {
  capture: true,
});
document.addEventListener('keydown', () => sounds.unlock(), { capture: true });
document.addEventListener('visibilitychange', () => {
  sounds.stop();
  if (sounds.master)
    sounds.master.gain.value =
      !document.hidden && sounds.enabled ? sounds.volume : 0;
});
window.addEventListener('pagehide', () => sounds.stop());
$('#sound').addEventListener('click', () => {
  sounds.setEnabled(!sounds.enabled);
  updateSoundControls();
  sounds.play('board');
});
$('#volume').addEventListener('input', (event) =>
  sounds.setVolume(Number(event.target.value) / 100),
);
$('#volume').addEventListener('change', () => sounds.play('place'));
updateSoundControls();
$('#help').addEventListener('click', () => {
  if (running) stopTrain();
  $('#help-dialog').showModal();
});
document
  .querySelectorAll('[data-close]')
  .forEach((button) =>
    button.addEventListener('click', () => button.closest('dialog').close()),
  );
function openMap() {
  if (running) stopTrain();
  $('#level-list').innerHTML = themes
    .map(
      (theme, index) =>
        `<div class="chapter-heading"><b>${theme.icon} ${theme.name}</b><small>${theme.subtitle}</small></div><div class="level-grid">${levels
          .slice(index * 6, index * 6 + 6)
          .map(
            (item) =>
              `<button class="level-button ${item.id === level.id ? 'current' : ''}" data-level="${item.id}" aria-label="第${item.id + 1}关 ${item.name}，${progress[item.id] || 0}颗星"><strong>${String(item.id + 1).padStart(2, '0')}</strong><span>${item.name}</span><em>${'★'.repeat(progress[item.id] || 0)}${'☆'.repeat(3 - (progress[item.id] || 0))}</em></button>`,
          )
          .join('')}</div>`,
    )
    .join('');
  $('#map-dialog').showModal();
}
$('#open-map').addEventListener('click', openMap);
$('#level-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-level]');
  if (!button) return;
  $('#map-dialog').close();
  setLevel(levels[Number(button.dataset.level)]);
});
$('#palette').addEventListener('click', (event) => {
  const button = event.target.closest('[data-tool]');
  if (!button) return;
  tool = button.dataset.tool;
  renderPalette();
  updateCells();
  $('#caption').textContent =
    tool === 'track'
      ? '点亮着的邻格，接着铺铁路'
      : '点击格子，布置你的铁路世界';
});
$('#theme').addEventListener('change', () => {
  level.theme = Number($('#theme').value);
  markDirty();
  render();
});
$('#save').addEventListener('click', () => {
  rememberDraft();
  const saved = store(sandboxKey, freeDraft);
  if (saved) freeDirty = false;
  $('#save-status').textContent = saved
    ? '✓ 已保存，下次打开还能接着玩'
    : '浏览器没有允许保存，本次仍可继续玩';
  tell(
    saved ? '你的梦幻铁路保存好啦！' : '暂时无法保存，请保留这个页面。',
    !saved,
  );
});
$('#free-mode').addEventListener('click', () => {
  if (level.sandbox) {
    openMap();
    return;
  }
  let saved = freeDraft;
  if (!saved) {
    try {
      saved = readSandbox(localStorage.getItem(sandboxKey));
    } catch {
      /* Use a blank world. */
    }
  }
  setLevel(saved?.level || sandboxLevel(), saved?.route);
});
function stopTrain(message = true) {
  sounds.stop();
  if (running && message) sounds.play('stop');
  cancelAnimationFrame(frame);
  frame = 0;
  running = false;
  collected = [];
  if (message) {
    render();
    tell('火车回到起点啦，轨道还在，可以修改后再出发。');
  }
}
function positionAt(distance) {
  const i = Math.min(route.length - 2, Math.max(0, Math.floor(distance)));
  const ratio = Math.min(1, Math.max(0, distance - i));
  const a = route[i],
    b = route[i + 1];
  return {
    x: (a[0] + (b[0] - a[0]) * ratio) * 100 + 50,
    y: (a[1] + (b[1] - a[1]) * ratio) * 100 + 50,
    angle: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI,
  };
}
function finish(result) {
  running = false;
  frame = 0;
  let persisted = true;
  if (!level.sandbox) {
    progress[level.id] = Math.max(progress[level.id] || 0, result.stars);
    persisted = store(progressKey, progress);
  }
  $('#progress').textContent = `${Object.keys(progress).length} / 18`;
  $('#result-art').innerHTML = animalSvg(level.passengers[0]?.kind || 0, true);
  $('#result-title').textContent = level.sandbox
    ? '你的铁路跑起来啦！'
    : level.id === 17
      ? '星光列车，圆满到站！'
      : '大家都到站啦！';
  $('#result-stars').textContent =
    '★'.repeat(result.stars) + '☆'.repeat(3 - result.stars);
  $('#result-stars').setAttribute('aria-label', `获得${result.stars}颗星`);
  $('#result-text').textContent =
    `${level.passengers.length ? level.passengers.map((p) => p.name).join('、') + '都' : '小火车'}安全到站！用了 ${route.length - 1} 格轨道。${persisted ? '' : '本次星星暂时无法保存。'}`;
  $('#rewards').innerHTML =
    `<span>✓ 快乐到站</span><span>${result.souvenir ? '✓' : '○'} 星星收藏家</span><span>${result.efficient ? '✓' : '○'} 巧手工程师</span>`;
  $('#next').textContent = level.sandbox
    ? '继续建造 ➜'
    : level.id === 17
      ? '看看旅行地图 ➜'
      : '下一站 ➜';
  $('#result-dialog').showModal();
  sounds.stop();
  sounds.play('win');
  tell('送达成功！朋友们为小工程师鼓掌。');
}
$('#go').addEventListener('click', () => {
  if (running) {
    stopTrain();
    return;
  }
  const result = evaluateRoute(level, route);
  if (!result.success) {
    tell(result.message, true);
    return;
  }
  running = true;
  collected = [];
  render();
  sounds.play('whistle');
  tell('呜——出发！下一站，快乐。');
  const svg = $('#scene');
  const ns = 'http://www.w3.org/2000/svg';
  const wagon = document.createElementNS(ns, 'g');
  wagon.innerHTML =
    '<rect x="-25" y="-20" width="50" height="40" rx="8" fill="#f6d485" stroke="#64826b" stroke-width="4"/><path d="M-17-24v5M17-24v5M-17 19v5M17 19v5" stroke="#456858" stroke-width="7"/><g id="riders"></g>';
  svg.append(wagon);
  const train = document.createElementNS(ns, 'g');
  train.innerHTML = locomotive();
  svg.append(train);
  let distance = 0,
    previous = null,
    visited = -1,
    beat = -1;
  const step = (now) => {
    if (!running) return;
    if (previous !== null)
      distance +=
        (Math.min(now - previous, 80) / (reducedMotion ? 550 : 450)) * speed;
    previous = now;
    distance = Math.min(route.length - 1, distance);
    const point = positionAt(distance);
    const behind = positionAt(Math.max(0, distance - 0.72));
    train.setAttribute(
      'transform',
      `translate(${point.x} ${point.y}) rotate(${point.angle}) scale(.85)`,
    );
    wagon.setAttribute(
      'transform',
      `translate(${behind.x} ${behind.y}) rotate(${behind.angle}) scale(.8)`,
    );
    wagon.style.opacity = distance < 0.8 ? '0' : '1';
    const nextBeat = Math.floor(distance * 3);
    if (nextBeat !== beat) {
      beat = nextBeat;
      sounds.play('roll');
    }
    const at = Math.floor(distance);
    if (at !== visited) {
      visited = at;
      const id = key(route[at]);
      collected.push(id);
      const passenger = level.passengers.find((p) => key(p.at) === id);
      if (passenger) {
        svg.querySelector(`[data-passenger="${id}"]`)?.remove();
        sounds.play('board');
        tell(`${passenger.name}上车啦！车厢里又多了一位好朋友。`);
        $('#riders').innerHTML =
          `<g transform="translate(-17 -18) scale(.34)">${animal(passenger.kind, true)}</g>`;
      }
      if (level.tokens.some((p) => key(p) === id)) {
        svg.querySelector(`[data-token="${id}"]`)?.remove();
        sounds.play('star');
      }
      updateMission();
    }
    if (distance >= route.length - 1) finish(result);
    else frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
});
$('#replay').addEventListener('click', () => {
  $('#result-dialog').close();
  stopTrain();
});
$('#next').addEventListener('click', () => {
  $('#result-dialog').close();
  if (level.sandbox) {
    stopTrain();
    return;
  }
  if (level.id === 17) {
    stopTrain();
    openMap();
    return;
  }
  setLevel(levels[level.id + 1]);
});
$('#result-dialog').addEventListener('cancel', () => stopTrain());
$('#result-dialog').addEventListener('close', () => {
  if (!running) render();
});
window.addEventListener('beforeunload', (event) => {
  if (freeDirty) {
    event.preventDefault();
    event.returnValue = '';
  }
});
$('#guide-art').innerHTML = animalSvg(1);
setLevel(levels[0]);
