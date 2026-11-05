import { levels, themes, initialTiles, cols, rows } from './levels.js';
import { turnTile, toggleValve, flow, score, portsOf } from './engine.js';
import { drawScene, dropSvg, flowerSvg } from './art.js';
import { WaterAudio } from './audio.js';
const $ = (selector) => document.querySelector(selector);
const audio = new WaterAudio();
const storageKey = 'water-rescue:progress:v1';
let progress = {};
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  for (const l of levels)
    if ([1, 2, 3].includes(saved?.[l.id])) progress[l.id] = saved[l.id];
} catch {
  /* Optional storage. */
}
let level = levels[0],
  tiles = initialTiles(level),
  history = [],
  moves = 0,
  attempts = 0;
let wet = new Set(),
  leaks = [],
  blocked = [],
  outcome = null,
  phase = 'editing',
  distance = 0,
  timer = null,
  speed = 1,
  focus = 0;
function say(message, error = false) {
  $('#status').textContent = message;
  $('#status').classList.toggle('error', error);
}
function stop() {
  clearTimeout(timer);
  timer = null;
  audio.stop();
}
function clearFlow() {
  stop();
  wet = new Set();
  leaks = [];
  blocked = [];
  outcome = null;
  phase = 'editing';
  distance = 0;
}
function load(id) {
  clearFlow();
  level = levels[id];
  tiles = initialTiles(level);
  history = [];
  moves = 0;
  attempts = 0;
  focus = Number(level.source.split(',')[1]) * cols;
  $('#title').textContent = level.name;
  $('#story').textContent = level.story;
  $('#chapter').textContent = `第 ${id + 1} 站 / ${themes[level.theme].name}`;
  $('#theme').textContent =
    `${themes[level.theme].icon} ${themes[level.theme].name}`;
  $('#weather').textContent = [
    '早安，小园丁',
    '海风正好，花也在等你',
    '小花睡前，喝一口清水',
  ][level.theme];
  $('#hint-text').textContent = level.hint;
  $('#guide-text').textContent =
    level.id === 0
      ? '嗨！把竖着的水管转横，清水就能去找小花啦。'
      : '先观察，再动手。红圈会告诉你哪里需要调整。';
  $('#budget').textContent =
    `巧手目标：调整不超过 ${level.budget} 次（含开关阀门）。`;
  $('#cells').replaceChildren();
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const button = document.createElement('button');
      button.className = 'cell';
      button.dataset.at = `${x},${y}`;
      $('#cells').append(button);
    }
  render();
  say('先接好水管，再点「开闸放水」。');
}
function render() {
  document.body.classList.toggle(
    'flowing',
    phase === 'running' || phase === 'paused',
  );
  $('#scene').innerHTML = drawScene(level, tiles, wet, leaks, blocked);
  $('#cells')
    .querySelectorAll('button')
    .forEach((button, i) => {
      const tile = tiles.find((item) => item.at === button.dataset.at);
      const [x, y] = button.dataset.at.split(',').map(Number);
      const directions = tile
        ? portsOf(tile)
            .map((port) => ['上', '右', '下', '左'][port])
            .join('、')
        : '';
      const name = !tile
        ? '花园空地'
        : tile.kind === 'pipe'
          ? `${tile.ports.length === 4 ? '十字' : tile.ports.length === 3 ? '三通' : '水'}管，开口朝${directions}`
          : tile.kind === 'valve'
            ? `${tile.open ? '已打开' : '已关闭'}的阀门`
            : tile.kind === 'source'
              ? '固定水源'
              : wet.has(tile.at)
                ? '盛开的花朵'
                : '等水的花朵';
      button.setAttribute('aria-label', `第${y + 1}行第${x + 1}列，${name}`);
      button.classList.toggle(
        'interactive',
        Boolean(tile && ['pipe', 'valve'].includes(tile.kind)),
      );
      button.classList.toggle(
        'fixed',
        !tile || !['pipe', 'valve'].includes(tile.kind),
      );
      button.tabIndex = i === focus ? 0 : -1;
      button.disabled = phase === 'running' || phase === 'paused';
    });
  $('#flowers').innerHTML = level.flowers
    .map(
      (at, i) =>
        `<div class="flower-row ${wet.has(at) ? 'watered' : ''}">${flowerSvg(level.theme, wet.has(at))}<span>${['小花朵', '花妹妹', '花弟弟'][i]}</span><b>${wet.has(at) ? '✓ 喝到水啦' : '等你来浇水'}</b></div>`,
    )
    .join('');
  $('#moves').textContent = moves;
  $('#attempts').textContent = attempts;
  $('#progress').textContent = `${Object.keys(progress).length} / 15`;
  $('#undo').disabled =
    !history.length || phase === 'running' || phase === 'paused';
  $('#run').innerHTML =
    phase === 'running'
      ? '暂停水流 <span>Ⅱ</span>'
      : phase === 'paused'
        ? '继续放水 <span>➜</span>'
        : '开闸放水 <span>➜</span>';
}
function change(at) {
  if (phase === 'running' || phase === 'paused') return;
  const tile = tiles.find((item) => item.at === at);
  if (!tile || !['pipe', 'valve'].includes(tile.kind)) {
    say(
      !tile
        ? '这里是花园空地，水管要沿已有的位置连接哦。'
        : tile.kind === 'source'
          ? '这里是水源，蓝色的小伙伴从这里出发。'
          : '这朵花等着喝水，转动它旁边的水管吧。',
    );
    return;
  }
  clearFlow();
  history.push(structuredClone(tiles));
  moves++;
  tiles = tile.kind === 'valve' ? toggleValve(tiles, at) : turnTile(tiles, at);
  audio.play(tile.kind === 'valve' ? 'valve' : 'turn');
  render();
  say(
    tile.kind === 'valve'
      ? '阀门切换好了，看看它后面的水路。'
      : '转好啦！沿着水源检查每一个管口。',
  );
}
$('#cells').addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (button) {
    focus =
      Number(button.dataset.at.split(',')[1]) * cols +
      Number(button.dataset.at.split(',')[0]);
    change(button.dataset.at);
  }
});
$('#cells').addEventListener('keydown', (event) => {
  const delta = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
  }[event.key];
  if (!delta) return;
  event.preventDefault();
  const x = Math.max(0, Math.min(cols - 1, (focus % cols) + delta[0])),
    y = Math.max(0, Math.min(rows - 1, Math.floor(focus / cols) + delta[1]));
  focus = y * cols + x;
  $('#cells')
    .querySelectorAll('button')
    .forEach((button, i) => (button.tabIndex = i === focus ? 0 : -1));
  $('#cells').children[focus].focus();
});
$('#undo').addEventListener('click', () => {
  if (!history.length) return;
  clearFlow();
  tiles = history.pop();
  moves = Math.max(0, moves - 1);
  render();
  audio.play('turn');
  say('撤回上一次调整啦。');
});
$('#reset').addEventListener('click', () => {
  load(level.id);
  say('水管回到最初的样子啦，换个思路再试试。');
});
$('#speed').addEventListener('click', () => {
  speed = speed === 1 ? 2 : 1;
  $('#speed').textContent = `${speed}×`;
});
function finish() {
  stop();
  phase = 'finished';
  leaks = outcome.leaks;
  blocked = outcome.blocked;
  render();
  say(outcome.message, !outcome.success);
  if (!outcome.success) {
    audio.play('error');
    return;
  }
  const stars = score(level, outcome, moves, attempts);
  progress[level.id] = Math.max(progress[level.id] || 0, stars);
  let saved = true;
  try {
    localStorage.setItem(storageKey, JSON.stringify(progress));
  } catch {
    saved = false;
  }
  $('#result-flower').innerHTML = flowerSvg(level.theme, true);
  $('#stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  $('#stars').setAttribute('aria-label', `获得${stars}颗星`);
  $('#result-text').textContent =
    `${level.flowers.length} 朵花全部盛开！调整 ${moves} 次，放水 ${attempts} 次。${saved ? '' : '浏览器暂时无法保存本次星星。'}`;
  $('#badges').innerHTML =
    `<span>✓ 花园守护者</span><span>${moves <= level.budget ? '✓' : '○'} 巧手小园丁</span><span>${attempts <= 2 ? '✓' : '○'} 节水小明星</span>`;
  $('#next').textContent = level.id === 14 ? '看看花园地图 ➜' : '下一座花园 ➜';
  $('#result-dialog').showModal();
  audio.play('win');
  render();
}
function tick() {
  if (phase !== 'running') return;
  const arriving = outcome.order.filter((item) => item.distance === distance);
  for (const item of arriving) wet.add(item.at);
  leaks = outcome.leaks.filter((item) => wet.has(item.at));
  blocked = outcome.blocked.filter((at) => wet.has(at));
  audio.play(
    arriving.some((item) => level.flowers.includes(item.at)) ? 'bloom' : 'flow',
  );
  render();
  if (distance >= Math.max(...outcome.order.map((item) => item.distance))) {
    timer = setTimeout(finish, 450 / speed);
    return;
  }
  distance++;
  timer = setTimeout(tick, 420 / speed);
}
$('#run').addEventListener('click', () => {
  if (phase === 'running') {
    stop();
    phase = 'paused';
    render();
    say('水流暂停啦，可以慢慢观察。');
    return;
  }
  if (phase === 'paused') {
    phase = 'running';
    render();
    tick();
    return;
  }
  clearFlow();
  attempts++;
  outcome = flow(level, tiles);
  phase = 'running';
  if (matchMedia('(max-width: 700px)').matches)
    $('#board').scrollIntoView({
      block: 'start',
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  say('开闸啦！看看小水滴会走到哪里。');
  render();
  tick();
});
$('#hint').addEventListener('click', () => say(level.hint));
function pauseForDialog() {
  if (phase === 'running') {
    stop();
    phase = 'paused';
    render();
  }
}
function openMap() {
  pauseForDialog();
  $('#level-list').innerHTML = themes
    .map(
      (theme, i) =>
        `<div class="chapter-heading"><b>${theme.icon} ${theme.name}</b><small>${theme.story}</small></div><div class="level-grid">${levels
          .slice(i * 5, i * 5 + 5)
          .map(
            (l) =>
              `<button data-level="${l.id}" class="level-button ${l.id === level.id ? 'current' : ''}" aria-label="第${l.id + 1}关 ${l.name}，${progress[l.id] || 0}颗星"><strong>${String(l.id + 1).padStart(2, '0')}</strong><span>${l.name}</span><em>${'★'.repeat(progress[l.id] || 0)}${'☆'.repeat(3 - (progress[l.id] || 0))}</em></button>`,
          )
          .join('')}</div>`,
    )
    .join('');
  $('#map-dialog').showModal();
}
$('#map').addEventListener('click', openMap);
$('#level-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-level]');
  if (button) {
    $('#map-dialog').close();
    load(Number(button.dataset.level));
  }
});
$('#help').addEventListener('click', () => {
  pauseForDialog();
  $('#help-dialog').showModal();
});
document
  .querySelectorAll('[data-close]')
  .forEach((button) =>
    button.addEventListener('click', () => button.closest('dialog').close()),
  );
$('#retry').addEventListener('click', () => {
  $('#result-dialog').close();
  load(level.id);
});
$('#next').addEventListener('click', () => {
  $('#result-dialog').close();
  if (level.id === 14) openMap();
  else load(level.id + 1);
});
function soundButton() {
  $('#sound').textContent = audio.enabled ? '♫ 音效开' : '♫ 音效关';
  $('#sound').setAttribute('aria-pressed', String(audio.enabled));
  $('#sound').setAttribute(
    'aria-label',
    audio.enabled ? '关闭音效' : '开启音效',
  );
}
$('#sound').addEventListener('click', () => {
  audio.toggle();
  soundButton();
  audio.play('bloom');
});
document.addEventListener('pointerdown', () => audio.unlock(), {
  capture: true,
});
document.addEventListener('keydown', () => audio.unlock(), { capture: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pauseForDialog();
    audio.stop();
  }
});
window.addEventListener('pagehide', stop);
$('#droplet').innerHTML = dropSvg();
soundButton();
load(0);
