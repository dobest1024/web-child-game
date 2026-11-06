// DOM 接线模块：渲染棋盘、输入（键盘/触屏）、存档恢复、弹窗。纯逻辑都在 engine.js。
import { ANIMALS, animalByValue } from './levels.js';
import {
  SIZE,
  WIN_VALUE,
  applyMove,
  canUndo,
  isGameOver,
  newGame,
  sanitizeProgress,
  undoMove,
} from './engine.js';
import { ZooAudio } from './audio.js';

const $ = (selector) => document.querySelector(selector);
const audio = new ZooAudio();
const storageKey = 'zoo-2048:progress';
const cellsLayer = $('#cells');
const tilesLayer = $('#tiles');
const calmWords = [
  '新蛋孵出来啦，继续滑动吧。',
  '又来了一位新朋友。',
  '找找看，哪两只动物长得一样？',
];
let progress = loadProgress();
let game = resumeGame();
let tileEls = Array(SIZE * SIZE).fill(null);
let trash = [];

function loadProgress() {
  try {
    return sanitizeProgress(JSON.parse(localStorage.getItem(storageKey)));
  } catch {
    /* Optional storage. */
    return sanitizeProgress(null);
  }
}

function resumeGame() {
  if (progress.game && !isGameOver(progress.game.board)) return progress.game;
  return newGame();
}

function saveProgress() {
  progress.best = Math.max(progress.best, game.score);
  progress.album = [
    ...new Set([...progress.album, ...game.seen, ...game.board.filter(Boolean)]),
  ].sort((a, b) => a - b);
  progress.bestAnimal = Math.max(progress.bestAnimal, ...progress.album, 0);
  progress.game = isGameOver(game.board) ? null : game;
  try {
    localStorage.setItem(storageKey, JSON.stringify(progress));
  } catch {
    /* Optional storage. */
  }
}

function say(message, error = false) {
  $('#status').textContent = message;
  $('#status').classList.toggle('error', error);
}

function dialogOpen() {
  return Boolean(document.querySelector('dialog[open]'));
}

function place(tile, at) {
  tile.style.setProperty('--c', String(at % SIZE));
  tile.style.setProperty('--r', String(Math.floor(at / SIZE)));
}

function createTileEl(value, at, mood = '') {
  const animal = animalByValue(value);
  const tile = document.createElement('div');
  tile.className = `tile${mood ? ` ${mood}` : ''}`;
  place(tile, at);
  const face = document.createElement('div');
  face.className = 'face';
  face.style.background = animal.background;
  face.innerHTML = `${animal.svg}<b>${value}</b>`;
  tile.append(face);
  return tile;
}

function renderBoard() {
  trash.forEach((tile) => tile.remove());
  trash = [];
  tilesLayer.replaceChildren();
  tileEls = Array(SIZE * SIZE).fill(null);
  game.board.forEach((value, at) => {
    if (!value) return;
    const tile = createTileEl(value, at);
    tileEls[at] = tile;
    tilesLayer.append(tile);
  });
}

// 用 engine 返回的 layout 做滑动动画：旧块滑到新位置，合并处弹跳出新动物。
function animateMove(result) {
  trash.forEach((tile) => tile.remove());
  trash = [];
  const next = Array(SIZE * SIZE).fill(null);
  result.layout.forEach((entry, at) => {
    if (!entry) return;
    if (entry.from.length === 2) {
      for (const source of entry.from) {
        const tile = tileEls[source];
        if (tile) {
          place(tile, at);
          trash.push(tile);
        }
      }
      next[at] = createTileEl(entry.value, at, 'bounce');
    } else {
      const tile = tileEls[entry.from[0]];
      if (tile) {
        place(tile, at);
        next[at] = tile;
      } else next[at] = createTileEl(entry.value, at, 'pop');
    }
  });
  if (result.spawnedAt != null)
    next[result.spawnedAt] = createTileEl(
      result.spawnValue,
      result.spawnedAt,
      'pop',
    );
  tileEls = next;
  tilesLayer.append(...next.filter(Boolean));
  if (trash.length)
    setTimeout(() => {
      trash.forEach((tile) => tile.remove());
      trash = [];
    }, 200);
}

function nextGoalMarkup(highest) {
  if (!highest)
    return '<p class="note">先滑动几次，孵出第一只小动物吧。</p>';
  const current = animalByValue(highest);
  if (highest >= WIN_VALUE)
    return `<div class="evo"><span class="evo-chip" style="background:${current.background}">${current.svg}<b>${current.name}</b><small>${current.value} 分</small></span></div><p class="note">神秘独角兽已经住进你的动物园啦！继续挑战更高分吧。</p>`;
  const target = ANIMALS[current.level];
  return `<div class="evo"><span class="evo-chip" style="background:${current.background}">${current.svg}<b>${current.name}</b><small>${current.value} 分</small></span><span class="evo-arrow">➜</span><span class="evo-chip" style="background:${target.background}">${target.svg}<b>${target.name}</b><small>${target.value} 分</small></span></div><p class="note">两只「${current.name}」碰在一起，就会变成「${target.name}」！</p>`;
}

function renderPanel() {
  const highest = Math.max(...game.board);
  $('#score').textContent = game.score;
  $('#best').textContent = Math.max(progress.best, game.score);
  $('#albumCount').textContent = `${progress.album.length} / ${ANIMALS.length}`;
  $('#undoCount').textContent = game.undos;
  $('#undo').disabled = !canUndo(game);
  $('#nextGoal').innerHTML = nextGoalMarkup(highest);
  $('#mascot').innerHTML = animalByValue(Math.max(highest, 2)).svg;
}

function renderAll() {
  renderBoard();
  renderPanel();
}

function step(direction) {
  if (dialogOpen() || isGameOver(game.board)) return;
  const previousBest = progress.best;
  const result = applyMove(game, direction);
  if (!result.moved) {
    audio.play('error');
    say('这个方向滑不动啦，换一个方向试试吧。', true);
    return;
  }
  animateMove(result);
  game = result.state;
  if (result.merges.length) {
    const mergedValue = Math.max(...result.merges.map((at) => game.board[at]));
    audio.play('merge', Math.log2(mergedValue) - 1);
    say(
      `进化成功！「${animalByValue(mergedValue).name}」加入了动物园，+${result.gained} 分！`,
    );
  } else {
    audio.play('move');
    say(calmWords[game.history.length % calmWords.length]);
  }
  const record = game.score > previousBest;
  renderPanel();
  saveProgress();
  if (result.wonNow) celebrate();
  else if (isGameOver(game.board)) finish(record);
}

function celebrate() {
  const unicorn = animalByValue(WIN_VALUE);
  $('#win-unicorn').innerHTML = `<div class="big-animal" style="background:${unicorn.background}">${unicorn.svg}</div>`;
  $('#win-text').textContent = `两只狮子合体，神秘的独角兽出现啦！现在的分数是 ${game.score} 分。棋盘还留着，可以继续挑战更高分哦。`;
  $('#win-dialog').showModal();
  audio.play('win');
}

function albumCard(value) {
  const animal = animalByValue(value);
  return `<div class="album-card"><div class="album-svg" style="background:${animal.background}">${animal.svg}</div><b>${animal.name}</b><small>${value} 分</small></div>`;
}

function finish(record) {
  audio.play('over');
  $('#result-album').innerHTML = game.seen.map(albumCard).join('');
  $('#result-text').textContent = record
    ? `这一局得到 ${game.score} 分，创造了新纪录！本局一共见到了 ${game.seen.length} 位动物朋友。`
    : `这一局得到 ${game.score} 分，最高纪录是 ${progress.best} 分。本局一共见到了 ${game.seen.length} 位动物朋友。`;
  $('#result-dialog').showModal();
}

function undo() {
  if (dialogOpen()) return;
  const result = undoMove(game);
  if (!result.ok) {
    audio.play('error');
    say(
      game.undos <= 0
        ? '这一局的撤销机会用完啦。'
        : '还没有可以撤销的步骤哦。',
      true,
    );
    return;
  }
  game = result.state;
  renderAll();
  saveProgress();
  audio.play('undo');
  say(`撤销成功！这一局还能撤销 ${game.undos} 次。`);
}

function startOver() {
  game = newGame();
  renderAll();
  saveProgress();
  say('新的一局开始啦，从小小的蛋重新出发！');
}

const KEYS = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  w: 'up',
  a: 'left',
  s: 'down',
  d: 'right',
  u: 'undo',
  z: 'undo',
};

document.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey || dialogOpen()) return;
  const action = KEYS[event.key] ?? KEYS[event.key.toLowerCase()];
  if (!action) return;
  event.preventDefault();
  audio.unlock();
  if (action === 'undo') undo();
  else step(action);
});

let swipe = null;
$('#board').addEventListener('pointerdown', (event) => {
  swipe = { id: event.pointerId, x: event.clientX, y: event.clientY };
});
$('#board').addEventListener('pointerup', (event) => {
  if (!swipe || event.pointerId !== swipe.id) return;
  const dx = event.clientX - swipe.x;
  const dy = event.clientY - swipe.y;
  swipe = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  const direction =
    Math.abs(dx) > Math.abs(dy)
      ? dx > 0
        ? 'right'
        : 'left'
      : dy > 0
        ? 'down'
        : 'up';
  audio.unlock();
  step(direction);
});
$('#board').addEventListener('pointercancel', () => (swipe = null));

$('#undo').addEventListener('click', () => {
  audio.unlock();
  undo();
});
$('#reset').addEventListener('click', () => {
  audio.unlock();
  startOver();
});
$('#again').addEventListener('click', () => {
  $('#result-dialog').close();
  startOver();
});
$('#win-new').addEventListener('click', () => {
  $('#win-dialog').close();
  startOver();
});

function openAlbum() {
  $('#album-grid').innerHTML = ANIMALS.map((animal) =>
    progress.album.includes(animal.value)
      ? albumCard(animal.value)
      : `<div class="album-card locked"><div class="album-svg album-mystery">?</div><b>？？？</b><small>${animal.value} 分</small></div>`,
  ).join('');
  $('#album-dialog').showModal();
}
$('#album').addEventListener('click', () => {
  audio.unlock();
  openAlbum();
});

$('#help').addEventListener('click', () => {
  audio.unlock();
  $('#help-dialog').showModal();
});

document
  .querySelectorAll('[data-close]')
  .forEach((button) =>
    button.addEventListener('click', () => button.closest('dialog').close()),
  );

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
  audio.play('merge');
});

document.addEventListener('pointerdown', () => audio.unlock(), {
  capture: true,
});
document.addEventListener('keydown', () => audio.unlock(), { capture: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) audio.stop();
});
window.addEventListener('pagehide', () => audio.stop());

for (let i = 0; i < SIZE * SIZE; i++) {
  const cell = document.createElement('div');
  cell.className = 'cell';
  cellsLayer.append(cell);
}
const resumed = game === progress.game;
saveProgress();
soundButton();
renderAll();
say(
  resumed
    ? '欢迎回来！上一次的棋局已经准备好啦。'
    : '滑动棋盘，让相同的动物碰面吧！',
);
