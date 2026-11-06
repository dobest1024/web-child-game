// 迷宫寻宝队 · DOM 接线：渲染迷宫、响应键盘 / 滑动 / 屏幕方向键、存档与弹窗。
import { levels, themes } from './levels.js';
import { startState, move, score, sanitizeProgress } from './engine.js';
import { drawScene, foxSvg, starBadgeSvg, keyBadgeSvg } from './art.js';
import { MazeAudio } from './audio.js';
const $ = (selector) => document.querySelector(selector);
const audio = new MazeAudio();
const storageKey = 'maze-treasure:progress';
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
let progress = {};
try {
  progress = sanitizeProgress(JSON.parse(localStorage.getItem(storageKey)));
} catch {
  /* Optional storage. */
}
let level = levels[0],
  fox = startState(level),
  phase = 'play',
  lastStep = 0,
  swipe = null,
  winTimer = null;
function say(message, error = false) {
  $('#status').textContent = message;
  $('#status').classList.toggle('error', error);
}
function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}
function load(id) {
  clearTimeout(winTimer);
  winTimer = null;
  level = levels[id];
  fox = startState(level);
  phase = 'play';
  lastStep = 0;
  $('#fox').classList.remove('cheer');
  $('#title').textContent = level.name;
  $('#story').textContent = level.story;
  $('#chapter').textContent = `第 ${id + 1} 关 / ${themes[level.theme].name}`;
  $('#theme').textContent =
    `${themes[level.theme].icon} ${themes[level.theme].name}`;
  $('#weather').textContent = [
    '皮皮揉揉眼睛，出发！',
    '萤火虫一闪一闪，好温柔',
    '月亮圆圆，夜风轻轻',
  ][level.theme];
  $('#hint-text').textContent = level.hint;
  $('#guide-text').textContent =
    level.id === 0
      ? '嗨，我是皮皮！用方向键、滑动屏幕或下面的按钮，带我去捡星星吧。'
      : '先看清楚路，再出发。走错了也不要紧，原路退回来就好。';
  $('#scene').setAttribute(
    'viewBox',
    `0 0 ${level.size * 50} ${level.size * 50}`,
  );
  $('#fox').style.width = `${(100 / level.size) * 1.12}%`;
  render();
  say('出发！用方向键、WASD、滑动屏幕或下面的方向按钮带皮皮走。');
}
function render() {
  const collected = new Set([...fox.keys, ...fox.stars]);
  $('#scene').innerHTML = drawScene(level, collected, phase === 'won');
  const [x, y] = fox.at.split(',').map(Number);
  const cell = 100 / level.size;
  const node = $('#fox');
  node.style.left = `${(x + 0.5) * cell}%`;
  node.style.top = `${(y + 0.5) * cell}%`;
  $('#steps').textContent = fox.steps;
  $('#par').textContent = level.par;
  $('#progress').textContent = `${Object.keys(progress).length} / 12`;
  $('#board').setAttribute(
    'aria-label',
    `迷宫地图，共${level.size}行${level.size}列。皮皮在第${y + 1}行第${x + 1}列，已走${fox.steps}步。用方向键或滑动移动`,
  );
  $('#treasures').innerHTML =
    level.stars
      .map(
        (at, i) =>
          `<div class="treasure-row ${fox.stars.includes(at) ? 'got' : ''}">${starBadgeSvg()}<span>星星 ${i + 1}</span><b>${fox.stars.includes(at) ? '✓ 捡到啦' : '还在迷宫里'}</b></div>`,
      )
      .join('') +
    (level.keys.length
      ? `<div class="treasure-row ${fox.keys.length === level.keys.length ? 'got' : ''}">${keyBadgeSvg()}<span>金钥匙</span><b>${fox.keys.length} / ${level.keys.length}${fox.keys.length === level.keys.length ? ' · 门开啦' : ''}</b></div>`
      : '');
}
function bump() {
  if (reduceMotion.matches) return;
  const node = $('#fox');
  node.classList.remove('bump');
  void node.offsetWidth;
  node.classList.add('bump');
}
function go(direction) {
  if (phase !== 'play') return;
  if (!reduceMotion.matches && Date.now() - lastStep < 100) return;
  lastStep = Date.now();
  const result = move(level, fox, direction);
  if (result.event === 'wall') {
    audio.play('wall');
    bump();
    say('撞到小墙啦，换一条路试试。');
    return;
  }
  if (result.event === 'locked') {
    audio.play('locked');
    bump();
    say(
      `门还锁着呢，再去找 ${level.keys.length - fox.keys.length} 把金钥匙吧。`,
    );
    return;
  }
  fox = result.state;
  if (result.event === 'star') {
    audio.play('star');
    say('捡到一颗亮晶晶的星星！');
  } else if (result.event === 'key') {
    audio.play('key');
    say(
      fox.keys.length === level.keys.length
        ? '金钥匙集齐啦，回家的门打开啦！'
        : `捡到一把金钥匙！还差 ${level.keys.length - fox.keys.length} 把。`,
    );
  } else if (result.event === 'home') {
    win();
    return;
  } else audio.play('step');
  render();
}
function win() {
  phase = 'won';
  render();
  const stars = score(level, fox);
  progress[level.id] = Math.max(progress[level.id] || 0, stars);
  const saved = save();
  const allStars = fox.stars.length === level.stars.length;
  $('#fox').classList.add('cheer');
  $('#result-stars').textContent =
    '★'.repeat(stars) + '☆'.repeat(3 - stars);
  $('#result-stars').setAttribute('aria-label', `获得${stars}颗星`);
  $('#result-text').textContent =
    `皮皮平安回到家啦！走了 ${fox.steps} 步（参考步数 ${level.par}），捡到 ${fox.stars.length} / ${level.stars.length} 颗星星。${saved ? '' : '浏览器暂时无法保存本次星星。'}`;
  $('#badges').innerHTML =
    `<span>✓ 平安回家</span><span>${allStars ? '✓' : '○'} 宝贝全收</span><span>${fox.steps <= level.par ? '✓' : '○'} 参考步数小达人</span>`;
  $('#next').textContent =
    level.id === 11 ? '看看森林地图 ➜' : '下一片森林 ➜';
  audio.play('win');
  clearTimeout(winTimer);
  winTimer = setTimeout(
    () => $('#result-dialog').showModal(),
    reduceMotion.matches ? 0 : 600,
  );
}
const keyboardDirections = {
  ArrowUp: 0,
  ArrowRight: 1,
  ArrowDown: 2,
  ArrowLeft: 3,
  w: 0,
  d: 1,
  s: 2,
  a: 3,
  W: 0,
  D: 1,
  S: 2,
  A: 3,
};
document.addEventListener('keydown', (event) => {
  if (document.querySelector('dialog[open]')) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const direction = keyboardDirections[event.key];
  if (direction === undefined) return;
  event.preventDefault();
  go(direction);
});
document.querySelectorAll('[data-direction]').forEach((button) =>
  button.addEventListener('click', () => go(Number(button.dataset.direction))),
);
const board = $('#board');
board.addEventListener('pointerdown', (event) => {
  swipe = { x: event.clientX, y: event.clientY };
});
board.addEventListener('pointerup', (event) => {
  if (!swipe) return;
  const dx = event.clientX - swipe.x,
    dy = event.clientY - swipe.y;
  swipe = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  go(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0);
});
board.addEventListener('pointercancel', () => (swipe = null));
$('#reset').addEventListener('click', () => {
  load(level.id);
  say('回到起点啦，换条路线再走一次。');
});
$('#hint').addEventListener('click', () => say(level.hint));
$('#fox').innerHTML = foxSvg();
$('#fox-guide').innerHTML = foxSvg();
$('#result-fox').innerHTML = foxSvg();
function openMap() {
  $('#level-list').innerHTML = themes
    .map(
      (theme, i) =>
        `<div class="chapter-heading"><b>${theme.icon} ${theme.name}</b><small>${theme.story}</small></div><div class="level-grid">${levels
          .slice(i * 4, i * 4 + 4)
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
$('#help').addEventListener('click', () => $('#help-dialog').showModal());
document
  .querySelectorAll('[data-close]')
  .forEach((button) =>
    button.addEventListener('click', () => button.closest('dialog').close()),
  );
document.querySelectorAll('dialog').forEach((dialog) =>
  dialog.addEventListener('close', () => board.focus({ preventScroll: true })),
);
$('#retry').addEventListener('click', () => {
  $('#result-dialog').close();
  load(level.id);
});
$('#next').addEventListener('click', () => {
  $('#result-dialog').close();
  if (level.id === 11) openMap();
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
  audio.play('star');
});
document.addEventListener('pointerdown', () => audio.unlock(), {
  capture: true,
});
document.addEventListener('keydown', () => audio.unlock(), { capture: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) audio.stop();
});
window.addEventListener('pagehide', () => audio.stop());
soundButton();
load(0);
