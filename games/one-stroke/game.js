import { levels, themes } from './levels.js';
import {
  move,
  isComplete,
  isStuck,
  nextOptions,
  startNodes,
  canStart,
  walkedEdges,
  edgeIndexOf,
  hint as findHint,
  score,
  sanitizeProgress,
} from './engine.js';
import { drawScene, fitted, pencilSvg } from './art.js';
import { OneStrokeAudio } from './audio.js';
const $ = (selector) => document.querySelector(selector);
const audio = new OneStrokeAudio();
const storageKey = 'one-stroke:progress';
const GREETINGS = [
  '一笔一画，慢慢来',
  '海风帮你扶稳画纸',
  '云朵上画画，稳稳的',
  '星星在为你的画眨眼',
];
const ENCOURAGE = [
  '漂亮！继续画。',
  '真棒，笔没有离开纸！',
  '很好，找一条没画过的小路。',
  '快啦，别漏掉小角落。',
  '稳稳的，继续！',
];
let progress = {};
try {
  progress = sanitizeProgress(JSON.parse(localStorage.getItem(storageKey)));
} catch {
  /* Optional storage. */
}
let level = levels[0],
  path = [],
  hints = 0,
  undos = 0,
  phase = 'drawing',
  hintEdge = -1,
  hintNode = -1,
  focus = 0,
  pts = [],
  cheerTimer = null,
  suppressClick = false,
  dragging = false,
  lastTouched = -1;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function say(message, error = false) {
  $('#status').textContent = message;
  $('#status').classList.toggle('error', error);
}
function wiggle() {
  const board = $('#board');
  board.classList.add('nope');
  if (!reducedMotion.matches) board.classList.add('wiggle');
  setTimeout(
    () => board.classList.remove('wiggle', 'nope'),
    reducedMotion.matches ? 320 : 420,
  );
}
function load(id) {
  clearTimeout(cheerTimer);
  level = levels[id];
  path = [];
  hints = 0;
  undos = 0;
  phase = 'drawing';
  hintEdge = -1;
  hintNode = -1;
  pts = fitted(level);
  focus = startNodes(level)[0];
  $('#title').textContent = level.name;
  $('#story').textContent = level.story;
  $('#chapter').textContent = `第 ${id + 1} 关 / ${themes[level.theme].name}`;
  $('#theme').textContent =
    `${themes[level.theme].icon} ${themes[level.theme].name}`;
  $('#mood').textContent = GREETINGS[level.theme];
  $('#hint-text').textContent = level.hint;
  $('#guide-text').textContent =
    level.id === 0
      ? '你好呀！从闪光的点落笔，把每条小路都画一遍。'
      : '先观察再下笔。卡住了就撤回一步，换条路走。';
  buildNodes();
  render();
  say('闪光的点是出发的地方，点它落笔！');
}
function buildNodes() {
  const wrap = $('#nodes');
  wrap.replaceChildren();
  pts.forEach(([x, y], index) => {
    const button = document.createElement('button');
    button.className = 'node';
    button.dataset.node = index;
    button.style.left = `${((x / 700) * 100).toFixed(2)}%`;
    button.style.top = `${((y / 620) * 100).toFixed(2)}%`;
    wrap.append(button);
  });
}
function render() {
  $('#scene').innerHTML = drawScene(
    level,
    path,
    hintEdge,
    hintNode,
    phase === 'done',
  );
  $('#walked').textContent = walkedEdges(level, path).size;
  $('#total').textContent = level.edges.length;
  $('#hint-count').textContent = hints;
  $('#undo-count').textContent = undos;
  $('#progress').textContent =
    `${Object.keys(progress).length} / ${levels.length}`;
  $('#undo').disabled = !path.length || phase === 'done';
  $('#hint').disabled = hints >= 2 || phase === 'done';
  const current = path.length ? path[path.length - 1] : -1;
  const options = new Set(nextOptions(level, path));
  const starts = path.length ? new Set() : new Set(startNodes(level));
  $('#nodes')
    .querySelectorAll('button')
    .forEach((button, index) => {
      button.tabIndex = index === focus ? 0 : -1;
      button.classList.toggle('current', index === current);
      button.classList.toggle('can-go', options.has(index) && index !== current);
      button.classList.toggle('startable', starts.has(index));
      const role = index === current
        ? '笔尖在这里'
        : starts.has(index)
          ? '可以从这里出发'
          : options.has(index)
            ? '可以连到这里'
            : '小圆点';
      button.setAttribute('aria-label', `第${index + 1}个点，${role}`);
    });
  document.body.classList.toggle('done', phase === 'done');
}
function activate(index) {
  if (phase === 'done') return;
  hintEdge = -1;
  hintNode = -1;
  if (!path.length) {
    if (!canStart(level, index)) {
      audio.play('error');
      wiggle();
      say('这一关要从闪光的点出发哦，换一个点试试。', true);
      render();
      return;
    }
    path = [index];
    audio.play('start');
    render();
    say(ENCOURAGE[0]);
    return;
  }
  if (index === path[path.length - 1]) {
    render();
    return;
  }
  const result = move(level, path, index);
  if (!result.ok) {
    audio.play('error');
    wiggle();
    say(
      result.reason === 'walked'
        ? '这条小路已经走过啦，选一条没画过的。'
        : '这两个点之间没有小路，要沿着线走哦。',
      true,
    );
    render();
    return;
  }
  path = result.path;
  if (isComplete(level, path)) {
    finish();
    return;
  }
  audio.play('draw');
  render();
  if (isStuck(level, path))
    say('哎呀，笔尖被困住啦！点「撤回一步」退回去换条路。', true);
  else say(ENCOURAGE[path.length % ENCOURAGE.length]);
}
function finish() {
  phase = 'done';
  const stars = score(hints, undos);
  progress[level.id] = Math.max(progress[level.id] || 0, stars);
  let saved = true;
  try {
    localStorage.setItem(storageKey, JSON.stringify(progress));
  } catch {
    saved = false;
  }
  render();
  say('太厉害了！所有小路一次画完，没有重复！');
  audio.play('win');
  $('#stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  $('#stars').setAttribute('aria-label', `获得${stars}颗星`);
  $('#result-text').textContent =
    `${level.edges.length} 条小路全部画完！提示 ${hints} 次，撤回 ${undos} 次。${saved ? '' : '浏览器暂时无法保存本次星星。'}`;
  $('#badges').innerHTML =
    `<span>✓ 一笔画小画家</span><span>${hints === 0 ? '✓' : '○'} 不用提示</span><span>${undos <= 1 ? '✓' : '○'} 下笔自信</span>`;
  $('#next').textContent =
    level.id === levels.length - 1 ? '看看关卡地图 ➜' : '下一幅画 ➜';
  clearTimeout(cheerTimer);
  cheerTimer = setTimeout(
    () => $('#result-dialog').showModal(),
    reducedMotion.matches ? 150 : 950,
  );
}
$('#nodes').addEventListener('pointerdown', (event) => {
  const button = event.target.closest('button[data-node]');
  if (!button) return;
  suppressClick = true;
  dragging = true;
  lastTouched = Number(button.dataset.node);
  focus = lastTouched;
  activate(lastTouched);
});
window.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  const element = document.elementFromPoint(event.clientX, event.clientY);
  const button = element && element.closest('button[data-node]');
  if (!button) return;
  const index = Number(button.dataset.node);
  if (index !== lastTouched) {
    lastTouched = index;
    focus = index;
    activate(index);
  }
});
window.addEventListener('pointerup', () => {
  dragging = false;
  lastTouched = -1;
});
$('#nodes').addEventListener('click', (event) => {
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  const button = event.target.closest('button[data-node]');
  if (!button) return;
  focus = Number(button.dataset.node);
  activate(focus);
});
function nodeInDirection(from, dx, dy) {
  const [fx, fy] = pts[from];
  let best = from;
  let bestScore = -Infinity;
  pts.forEach(([x, y], index) => {
    if (index === from) return;
    const vx = x - fx,
      vy = y - fy;
    const dot = vx * dx + vy * dy;
    if (dot <= 0) return;
    const distance = Math.hypot(vx, vy);
    const alignment = dot / distance - distance / 2000;
    if (alignment > bestScore) {
      bestScore = alignment;
      best = index;
    }
  });
  return best;
}
$('#nodes').addEventListener('keydown', (event) => {
  const delta = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
  }[event.key];
  if (!delta) return;
  event.preventDefault();
  focus = nodeInDirection(focus, delta[0], delta[1]);
  render();
  $('#nodes').children[focus].focus();
});
$('#undo').addEventListener('click', () => {
  if (!path.length || phase === 'done') return;
  path = path.slice(0, -1);
  undos++;
  hintEdge = -1;
  hintNode = -1;
  audio.play('undo');
  render();
  say(path.length ? '退回一步啦，换条小路试试。' : '回到出发前啦，重新选一个起点。');
});
$('#reset').addEventListener('click', () => {
  if (phase === 'done') $('#result-dialog').close();
  path = [];
  hints = 0;
  undos = 0;
  phase = 'drawing';
  hintEdge = -1;
  hintNode = -1;
  audio.play('undo');
  render();
  say('画纸擦干净啦，重新开始一笔画。');
});
$('#hint').addEventListener('click', () => {
  if (phase === 'done' || hints >= 2) return;
  const tip = findHint(level, path);
  if (tip.type === 'start') {
    hints++;
    hintNode = tip.node;
    audio.play('hint');
    render();
    say('从发光的这个点出发吧！');
  } else if (tip.type === 'move') {
    hints++;
    hintEdge = edgeIndexOf(level, path[path.length - 1], tip.node);
    audio.play('hint');
    render();
    say('闪光的小路是下一步哦，走这条！');
  } else {
    audio.play('hint');
    render();
    say('先「撤回一步」，后面的路才走得通哦。');
  }
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
  audio.play('hint');
});
function openMap() {
  $('#level-list').innerHTML = themes
    .map(
      (theme, chapter) =>
        `<div class="chapter-heading"><b>${theme.icon} ${theme.name}</b><small>${theme.story}</small></div><div class="level-grid">${levels
          .slice(chapter * 5, chapter * 5 + 5)
          .map(
            (item) =>
              `<button data-level="${item.id}" class="level-button ${item.id === level.id ? 'current' : ''}" aria-label="第${item.id + 1}关 ${item.name}，${progress[item.id] || 0}颗星"><strong>${String(item.id + 1).padStart(2, '0')}</strong><span>${item.name}</span><em>${'★'.repeat(progress[item.id] || 0)}${'☆'.repeat(3 - (progress[item.id] || 0))}</em></button>`,
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
$('#retry').addEventListener('click', () => {
  $('#result-dialog').close();
  load(level.id);
});
$('#next').addEventListener('click', () => {
  $('#result-dialog').close();
  if (level.id === levels.length - 1) openMap();
  else load(level.id + 1);
});
document.addEventListener('pointerdown', () => audio.unlock(), {
  capture: true,
});
document.addEventListener('keydown', () => audio.unlock(), { capture: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) audio.stop();
});
window.addEventListener('pagehide', () => {
  clearTimeout(cheerTimer);
  audio.stop();
});
$('#mascot').innerHTML = pencilSvg();
soundButton();
load(0);
