import { difficulties, getDifficulty, starsFor, parseProgress } from './levels.js';
import { createGame } from './engine.js';
import { SlideAudio } from './audio.js';
const $ = (selector) => document.querySelector(selector);
const audio = new SlideAudio();
const storageKey = 'number-slide:progress';
const swipeThreshold = 24;
let progress = {};
try {
  progress = parseProgress(localStorage.getItem(storageKey));
} catch {
  /* Optional storage. */
}
let difficulty = difficulties[0],
  game = null,
  tiles = new Map(),
  blankCell = null,
  startedAt = null,
  elapsed = 0,
  ticker = null,
  swipe = null,
  suppressClick = false;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
function say(message, error = false) {
  $('#status').textContent = message;
  $('#status').classList.toggle('error', error);
}
function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(
    seconds % 60,
  ).padStart(2, '0')}`;
}
function saveProgress() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(progress));
  } catch {
    /* Optional storage. */
  }
}
function recordOf(id) {
  return progress[id] || { bestMoves: null, bestTimeMs: null, stars: 0 };
}
function starsText(stars) {
  return '★'.repeat(stars) + '☆'.repeat(3 - stars);
}
function recordText(id) {
  const record = progress[id];
  if (!record) return '还没有记录，来创造第一个吧！';
  const parts = [];
  if (record.bestMoves !== null) parts.push(`最少 ${record.bestMoves} 步`);
  if (record.bestTimeMs !== null)
    parts.push(`最快 ${formatTime(record.bestTimeMs)}`);
  return parts.length ? parts.join(' · ') : '还没有记录，来创造第一个吧！';
}
function buildBoard() {
  const total = difficulty.size * difficulty.size;
  const field = $('#tiles');
  field.style.setProperty('--n', difficulty.size);
  field.replaceChildren();
  tiles = new Map();
  for (let value = 1; value < total; value++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tile';
    button.dataset.value = value;
    button.textContent = value;
    field.append(button);
    tiles.set(value, button);
  }
  blankCell = document.createElement('div');
  blankCell.className = 'tile blank';
  blankCell.innerHTML = '<span aria-hidden="true">🐾</span>';
  field.append(blankCell);
  fitFont();
}
function fitFont() {
  const field = $('#tiles');
  if (!field.clientWidth) return;
  field.style.fontSize = `${Math.max(
    14,
    Math.round((field.clientWidth / difficulty.size) * 0.42),
  )}px`;
}
function showTime() {
  const text = formatTime(elapsed);
  $('#time').textContent = text;
  $('#clock').textContent = text;
}
function render() {
  const size = difficulty.size;
  for (const [index, value] of game.board.entries()) {
    const shift = `translate(${(index % size) * 100}%, ${
      Math.floor(index / size) * 100
    }%)`;
    if (value === 0) {
      blankCell.style.transform = shift;
      continue;
    }
    const tile = tiles.get(value);
    tile.style.transform = shift;
    tile.setAttribute(
      'aria-label',
      `第${Math.floor(index / size) + 1}行第${(index % size) + 1}列，数字 ${value}`,
    );
  }
  $('#moves').textContent = game.moves;
  $('#mode').textContent = difficulty.name;
  $('#diff-name').textContent = difficulty.name;
  $('#goal').textContent = goalText(difficulty);
  $('#best-stars').textContent = starsText(recordOf(difficulty.id).stars);
  $('#best').textContent = recordText(difficulty.id);
  showTime();
}
function goalText(item) {
  return `三星目标：不超过 ${item.starMoves.three} 步；二星目标：不超过 ${item.starMoves.two} 步；一星：完成就有。`;
}
function startTimer() {
  startedAt = Date.now() - elapsed;
  ticker = setInterval(tickTime, 250);
}
function tickTime() {
  if (startedAt === null || game.finished) return;
  elapsed = Date.now() - startedAt;
  showTime();
}
function stopTimer() {
  if (ticker && startedAt !== null) elapsed = Date.now() - startedAt;
  clearInterval(ticker);
  ticker = null;
}
function pauseTimer() {
  if (!ticker) return;
  elapsed = Date.now() - startedAt;
  clearInterval(ticker);
  ticker = null;
}
function resumeTimer() {
  if (
    ticker ||
    startedAt === null ||
    !game ||
    game.finished ||
    document.hidden ||
    document.querySelector('dialog[open]')
  )
    return;
  startedAt = Date.now() - elapsed;
  ticker = setInterval(tickTime, 250);
}
function startGame() {
  stopTimer();
  startedAt = null;
  elapsed = 0;
  game = createGame(
    difficulty.size,
    difficulty.steps,
    Math.floor(Math.random() * 2 ** 31),
  );
  buildBoard();
  render();
  const total = difficulty.size * difficulty.size - 1;
  say(
    `我把 ${total} 个数字块打乱啦！把它们滑回 1 到 ${total} 的队伍，右下角给小脚印留个空位。`,
  );
}
function commit(result) {
  if (!result.moved) {
    audio.play('error');
    say(
      result.reason === 'finished'
        ? '已经拼好啦！点「再来一局」再玩一次吧。'
        : '这个方向滑不动哦。数字块要贴着小脚印，才能滑进空位。',
      true,
    );
    return;
  }
  if (game.moves === 1) startTimer();
  audio.play('slide');
  render();
  if (result.solved) finish();
}
function finish() {
  stopTimer();
  const stars = starsFor(difficulty, game.moves);
  const record = recordOf(difficulty.id);
  const newMoves = record.bestMoves === null || game.moves < record.bestMoves;
  const newTime = record.bestTimeMs === null || elapsed < record.bestTimeMs;
  progress[difficulty.id] = {
    bestMoves: newMoves ? game.moves : record.bestMoves,
    bestTimeMs: newTime ? elapsed : record.bestTimeMs,
    stars: Math.max(record.stars || 0, stars),
  };
  saveProgress();
  $('#stars').innerHTML = [0, 1, 2]
    .map(
      (i) =>
        `<span class="${i < stars ? 'full' : 'dim'}" style="--i:${i}">${
          i < stars ? '★' : '☆'
        }</span>`,
    )
    .join('');
  $('#stars').setAttribute('aria-label', `获得 ${stars} 颗星`);
  const parts = [
    `${difficulty.name}完成！用了 ${game.moves} 步，用时 ${formatTime(elapsed)}。`,
  ];
  if (newMoves) parts.push('刷新了最少步数记录！');
  else if (newTime) parts.push('刷新了最快纪录！');
  $('#result-text').textContent = parts.join(' ');
  $('#result-dialog').showModal();
  celebrate();
  audio.play('win');
  render();
}
function celebrate() {
  const confetti = $('#confetti');
  confetti.replaceChildren();
  if (reducedMotion) return;
  const colors = ['#5470c6', '#8b7fd6', '#e8a13c', '#5fae8d', '#d9718a'];
  for (let i = 0; i < 18; i++) {
    const piece = document.createElement('i');
    piece.style.setProperty('--x', String(Math.round(Math.random() * 100)));
    piece.style.setProperty('--d', `${(Math.random() * 0.4).toFixed(2)}s`);
    piece.style.setProperty('--c', colors[i % colors.length]);
    confetti.append(piece);
  }
}
function renderDiffList() {
  $('#diff-list').innerHTML = difficulties
    .map((item) => {
      const record = recordOf(item.id);
      return `<button data-diff="${item.id}" class="diff-option ${
        item.id === difficulty.id ? 'current' : ''
      }"><strong>${item.name}</strong><span>${item.blurb}</span><em>${starsText(
        record.stars,
      )}</em><small>${recordText(item.id)} · 三星不超过 ${
        item.starMoves.three
      } 步</small></button>`;
    })
    .join('');
}
function openDiff() {
  pauseTimer();
  renderDiffList();
  $('#diff-dialog').showModal();
}
$('#tiles').addEventListener('click', (event) => {
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  const button = event.target.closest('button.tile');
  if (!button) return;
  commit(game.slide(game.board.indexOf(Number(button.dataset.value))));
});
const board = $('#board');
board.addEventListener('pointerdown', (event) => {
  suppressClick = false;
  swipe = { x: event.clientX, y: event.clientY, id: event.pointerId };
});
board.addEventListener('pointerup', (event) => {
  if (!swipe || event.pointerId !== swipe.id) return;
  const dx = event.clientX - swipe.x;
  const dy = event.clientY - swipe.y;
  swipe = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < swipeThreshold) return;
  suppressClick = true;
  const direction =
    Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0;
  commit(game.towards(direction));
});
board.addEventListener('pointercancel', () => (swipe = null));
const keyDirections = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 };
document.addEventListener('keydown', (event) => {
  const direction = keyDirections[event.key];
  if (direction === undefined || document.querySelector('dialog[open]')) return;
  event.preventDefault();
  commit(game.towards(direction));
});
window.addEventListener('resize', fitFont);
$('#shuffle').addEventListener('click', startGame);
$('#diff').addEventListener('click', openDiff);
$('#help').addEventListener('click', () => {
  pauseTimer();
  $('#help-dialog').showModal();
});
$('#diff-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-diff]');
  if (!button) return;
  $('#diff-dialog').close();
  difficulty = getDifficulty(button.dataset.diff);
  startGame();
});
$('#again').addEventListener('click', () => {
  $('#result-dialog').close();
  startGame();
});
$('#switch').addEventListener('click', () => {
  $('#result-dialog').close();
  openDiff();
});
$('#result-dialog').addEventListener('close', () =>
  $('#confetti').replaceChildren(),
);
for (const id of ['diff-dialog', 'help-dialog', 'result-dialog'])
  $('#' + id).addEventListener('close', resumeTimer);
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
  audio.play('tap');
});
document.addEventListener('pointerdown', () => audio.unlock(), {
  capture: true,
});
document.addEventListener('keydown', () => audio.unlock(), { capture: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pauseTimer();
    audio.stop();
  } else resumeTimer();
});
window.addEventListener('pagehide', () => {
  pauseTimer();
  audio.stop();
});
soundButton();
startGame();
