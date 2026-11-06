import { DIFFICULTIES, generatePuzzle, seedFor } from './levels.js';
import {
  HINTS_PER_PUZZLE,
  createGame,
  isEditable,
  countsRemaining,
  conflictPairs,
  judgePlacement,
  applyValue,
  clearCell,
  applyHint,
  isSolved,
  score,
  sanitizeProgress,
  formatDuration,
} from './engine.js';
import { ANIMALS, animalSvg, faceHtml, animalLabel } from './animals.js';
import { AnimalAudio } from './audio.js';
const $ = (selector) => document.querySelector(selector);
const audio = new AnimalAudio();
const STORAGE_KEY = 'animal-sudoku:progress';
let progress = loadProgress();
let difficulty = 'easy';
let index = progress[difficulty].next;
let game = null;
let selected = -1;
let focusIndex = 0;
let finished = false;
let startedAt = 0;
let elapsedMs = 0;
let clock = null;
let loadToken = 0;
function loadProgress() {
  try {
    return sanitizeProgress(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch {
    return sanitizeProgress(null);
  }
}
function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}
function say(message) {
  $('#status').textContent = message;
}
function lineup(cfg) {
  if (cfg.useDigits) return '🔢 数字 1-9 · 大孩子挑战';
  return ANIMALS.slice(0, cfg.size)
    .map((animal) => `${animal.emoji}${animal.name}`)
    .join(' · ');
}
function startPuzzle(diff, puzzleIndex, readyMessage) {
  difficulty = diff;
  index = puzzleIndex;
  finished = false;
  game = null;
  selected = -1;
  stopClock();
  elapsedMs = 0;
  const token = ++loadToken;
  const cfg = DIFFICULTIES[diff];
  $('#board').replaceChildren();
  $('#tray').replaceChildren();
  $('#elapsed').textContent = '0:00';
  $('#clock').textContent = '⏰ 0:00';
  $('#chapter').textContent = `${cfg.name} · ${cfg.size}×${cfg.size} 棋盘`;
  $('#title').textContent = `第 ${index + 1} 题`;
  $('#story').textContent = cfg.story;
  $('#board-tag').textContent = lineup(cfg);
  $('#guide-text').textContent =
    diff === 'easy' && index === 0
      ? '先点一个空格，再从下面选一只小动物送它回家！'
      : '仔细数一数，每个小伙伴在同一行、列、宫里只能出现一次哦。';
  say('小动物们正在排队进场…');
  setTimeout(() => {
    if (token !== loadToken) return;
    game = createGame(generatePuzzle(diff, seedFor(diff, index), index));
    focusIndex = 0;
    buildBoard();
    buildTray();
    startClock();
    render();
    say(readyMessage || '先选一个空格，再点托盘里的小动物。');
  }, 30);
}
function buildBoard() {
  const { size, boxRows, boxCols } = game.puzzle;
  const board = $('#board');
  board.className = `n${size}`;
  board.replaceChildren();
  const stacks = size / boxCols;
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) {
      const button = document.createElement('button');
      button.className = 'cell';
      button.dataset.rc = `${r},${c}`;
      if ((c + 1) % boxCols === 0 && c !== size - 1)
        button.classList.add('right-edge');
      if ((r + 1) % boxRows === 0 && r !== size - 1)
        button.classList.add('bottom-edge');
      const box = Math.floor(r / boxRows) * stacks + Math.floor(c / boxCols);
      if (box % 2 === 1) button.classList.add('alt-box');
      board.append(button);
    }
}
function buildTray() {
  const { size, useDigits } = game.puzzle;
  const tray = $('#tray');
  tray.replaceChildren();
  for (let value = 1; value <= size; value++) {
    const button = document.createElement('button');
    button.className = useDigits ? 'tray-item digit-face' : 'tray-item';
    button.dataset.value = value;
    tray.append(button);
  }
}
function isPeer(a, b, size, stacks, boxRows, boxCols) {
  const ar = Math.floor(a / size),
    ac = a % size,
    br = Math.floor(b / size),
    bc = b % size;
  if (ar === br || ac === bc) return true;
  return (
    Math.floor(ar / boxRows) * stacks + Math.floor(ac / boxCols) ===
    Math.floor(br / boxRows) * stacks + Math.floor(bc / boxCols)
  );
}
function describeCell(r, c, value, editable) {
  const label = animalLabel(value, game.puzzle.useDigits);
  if (!value) return '空格子';
  if (game.hinted.has(`${r},${c}`)) return `${label}（提示放的）`;
  if (!editable) return `${label}（题目固定）`;
  return `${label}（你放的）`;
}
function render() {
  if (!game) return;
  const { size, boxRows, boxCols, useDigits } = game.puzzle;
  const stacks = size / boxCols;
  const conflictSet = new Set(
    conflictPairs(game.grid, boxRows, boxCols).map(([r, c]) => r * size + c),
  );
  const cells = $('#board').children;
  for (let i = 0; i < cells.length; i++) {
    const r = Math.floor(i / size),
      c = i % size;
    const el = cells[i];
    const value = game.grid[r][c];
    const editable = isEditable(game, r, c);
    el.innerHTML = value ? faceHtml(value, useDigits) : '';
    el.classList.toggle('given', Boolean(value) && !editable && !game.hinted.has(`${r},${c}`));
    el.classList.toggle('hinted', game.hinted.has(`${r},${c}`));
    el.classList.toggle('conflict', conflictSet.has(i));
    el.classList.toggle('selected', i === selected);
    el.classList.toggle(
      'peer',
      i !== selected &&
        selected >= 0 &&
        isPeer(i, selected, size, stacks, boxRows, boxCols),
    );
    el.tabIndex = i === focusIndex ? 0 : -1;
    el.setAttribute(
      'aria-label',
      `第${r + 1}行第${c + 1}列，${describeCell(r, c, value, editable)}`,
    );
  }
  renderTray();
  const clockText = formatDuration(elapsedMs);
  $('#elapsed').textContent = clockText;
  $('#clock').textContent = `⏰ ${clockText}`;
  $('#hints').textContent = game.hintsLeft;
  const hintButton = $('#hint');
  hintButton.disabled = finished || game.hintsLeft <= 0;
  hintButton.textContent = `💡 帮帮我（剩 ${game.hintsLeft} 次）`;
  $('#erase').disabled = finished;
  $('#progress').textContent = `完成 ${Object.values(progress).reduce((sum, p) => sum + p.solved, 0)} 题`;
}
function renderTray() {
  const { size, useDigits } = game.puzzle;
  const counts = countsRemaining(game);
  for (const button of $('#tray').children) {
    const value = Number(button.dataset.value);
    const animal = ANIMALS[value - 1];
    button.innerHTML = `${
      useDigits
        ? `<span class="big-digit">${value}</span>`
        : `${animalSvg(animal.id)}<span class="name">${animal.name}</span>`
    }<span class="count">${counts[value]}</span>`;
    button.classList.toggle('empty', counts[value] === 0);
    button.setAttribute(
      'aria-label',
      `放入${animalLabel(value, useDigits)}，还剩 ${counts[value]} 个`,
    );
  }
}
function shakeCell(r, c) {
  const el = $('#board').children[r * game.puzzle.size + c];
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), 500);
}
function placeAt(r, c, value) {
  if (!game || finished) return;
  const judge = judgePlacement(game, r, c, value);
  if (!judge.allowed) {
    audio.play('shake');
    say(
      game.hinted.has(`${r},${c}`)
        ? '这一格是提示放好的，已经正确啦。'
        : '题目里放好的小动物不能搬家哦，换一个空格吧。',
    );
    return;
  }
  game = applyValue(game, r, c, value);
  selected = r * game.puzzle.size + c;
  focusIndex = selected;
  if (isSolved(game)) {
    render();
    finish();
    return;
  }
  if (judge.conflict) {
    audio.play('shake');
    shakeCell(r, c);
    say('哎呀，同一行、列或宫里已经有它的小伙伴了，数一数换个位置？');
  } else if (judge.correct) {
    audio.play('place');
    say('放对啦！继续给剩下的小伙伴找位置。');
  } else {
    audio.play('drop');
    say('放上去啦。咦，好像还差点什么，再观察观察。');
  }
  render();
}
function eraseAt(r, c) {
  if (!game || finished) return;
  if (!isEditable(game, r, c)) {
    say('这一格擦不掉哦，只有你自己放的可以擦。');
    return;
  }
  if (!game.grid[r][c]) {
    say('这里本来就是空格子呀。');
    return;
  }
  game = clearCell(game, r, c);
  audio.play('clear');
  render();
  say('擦掉啦，再想想放谁好呢。');
}
function finish() {
  finished = true;
  if (clock) elapsedMs = Date.now() - startedAt;
  stopClock();
  const hintsUsed = HINTS_PER_PUZZLE - game.hintsLeft;
  const stars = score(difficulty, elapsedMs, hintsUsed);
  const fast = elapsedMs <= DIFFICULTIES[difficulty].parMs;
  const entry = progress[difficulty];
  entry.solved += 1;
  entry.next = index + 1;
  entry.bestStars = Math.max(entry.bestStars, stars);
  entry.bestMs = entry.bestMs ? Math.min(entry.bestMs, elapsedMs) : elapsedMs;
  const saved = saveProgress();
  $('#result-mascot').innerHTML = animalSvg('panda');
  $('#stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  $('#stars').setAttribute('aria-label', `获得 ${stars} 颗星`);
  $('#result-text').textContent =
    `用时 ${formatDuration(elapsedMs)}，用了 ${hintsUsed} 次提示。${saved ? '' : '浏览器暂时无法保存本次星星。'}`;
  $('#badges').innerHTML =
    `<span>✓ 全部填对</span><span>${fast ? '✓' : '○'} 神速小达人</span><span>${hintsUsed === 0 ? '✓' : '○'} 独立完成</span>`;
  $('#result-dialog').showModal();
  audio.play('win');
  render();
  $('#guide-text').textContent = '全部填对啦！你真是小小数独高手！';
}
$('#board').addEventListener('click', (event) => {
  const button = event.target.closest('.cell');
  if (!button || !game || finished) return;
  const [r, c] = button.dataset.rc.split(',').map(Number);
  selected = r * game.puzzle.size + c;
  focusIndex = selected;
  button.focus();
  audio.play('select');
  render();
  say(
    isEditable(game, r, c)
      ? '好嘞，从下面选一只小动物放进去吧。'
      : '这一格已经住下小动物了，选白色的空格试试。',
  );
});
$('#board').addEventListener('keydown', (event) => {
  if (!game) return;
  const size = game.puzzle.size;
  const delta = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
  }[event.key];
  if (delta) {
    event.preventDefault();
    const r = Math.max(0, Math.min(size - 1, Math.floor(focusIndex / size) + delta[0]));
    const c = Math.max(0, Math.min(size - 1, (focusIndex % size) + delta[1]));
    const next = r * size + c;
    focusIndex = next;
    selected = next;
    $('#board').children[focusIndex].focus();
    render();
    return;
  }
  if (/^[1-9]$/.test(event.key)) {
    const value = Number(event.key);
    if (value > size) return;
    event.preventDefault();
    selected = focusIndex;
    placeAt(Math.floor(focusIndex / size), focusIndex % size, value);
    return;
  }
  if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') {
    event.preventDefault();
    selected = focusIndex;
    eraseAt(Math.floor(focusIndex / size), focusIndex % size);
  }
});
$('#tray').addEventListener('click', (event) => {
  const button = event.target.closest('[data-value]');
  if (!button || !game || finished) return;
  if (selected < 0) {
    audio.play('select');
    say('先在棋盘上点一个格子，再选小动物哦。');
    return;
  }
  placeAt(
    Math.floor(selected / game.puzzle.size),
    selected % game.puzzle.size,
    Number(button.dataset.value),
  );
});
$('#hint').addEventListener('click', () => {
  if (!game || finished) return;
  if (game.hintsLeft <= 0) {
    say('提示用完啦，相信你自己也能解开！');
    return;
  }
  const r = selected >= 0 ? Math.floor(selected / game.puzzle.size) : -1;
  const c = selected >= 0 ? selected % game.puzzle.size : -1;
  const result = applyHint(game, r, c);
  if (result.at === null) {
    say('现在都填对啦，不需要提示哦。');
    return;
  }
  game = result.game;
  selected = result.at[0] * game.puzzle.size + result.at[1];
  focusIndex = selected;
  if (isSolved(game)) {
    render();
    finish();
    return;
  }
  audio.play('hint');
  render();
  say('看，团团把正确的小伙伴放进来了。');
});
$('#erase').addEventListener('click', () => {
  if (!game || finished) return;
  if (selected < 0) {
    audio.play('select');
    say('先在棋盘上点一个要擦掉的格子哦。');
    return;
  }
  eraseAt(
    Math.floor(selected / game.puzzle.size),
    selected % game.puzzle.size,
  );
});
$('#reset').addEventListener('click', () => {
  startPuzzle(difficulty, index, '小动物们回到起点啦，换个思路再试试。');
});
function startClock() {
  stopClock();
  elapsedMs = 0;
  startedAt = Date.now();
  clock = setInterval(tickClock, 500);
  tickClock();
}
function tickClock() {
  if (!game || finished) return;
  elapsedMs = Date.now() - startedAt;
  const text = formatDuration(elapsedMs);
  $('#elapsed').textContent = text;
  $('#clock').textContent = `⏰ ${text}`;
}
function stopClock() {
  clearInterval(clock);
  clock = null;
}
function pauseClock() {
  if (!clock) return;
  elapsedMs = Date.now() - startedAt;
  clearInterval(clock);
  clock = null;
}
function resumeClock() {
  if (clock || finished || !game) return;
  startedAt = Date.now() - elapsedMs;
  clock = setInterval(tickClock, 500);
}
function openDiffDialog() {
  pauseClock();
  $('#diff-list').innerHTML = Object.values(DIFFICULTIES)
    .map((cfg) => {
      const p = progress[cfg.key];
      return `<button data-diff="${cfg.key}" class="diff-button ${cfg.key === difficulty ? 'current' : ''}"><strong>${cfg.name} · ${cfg.size}×${cfg.size}</strong><span>${cfg.blurb}</span><em>${'★'.repeat(p.bestStars)}${'☆'.repeat(3 - p.bestStars)} · 已完成 ${p.solved} 题</em></button>`;
    })
    .join('');
  $('#diff-dialog').showModal();
}
$('#diff').addEventListener('click', openDiffDialog);
$('#diff-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-diff]');
  if (!button) return;
  $('#diff-dialog').close();
  const key = button.dataset.diff;
  startPuzzle(key, progress[key].next);
});
$('#help').addEventListener('click', () => {
  pauseClock();
  $('#help-dialog').showModal();
});
for (const id of ['diff-dialog', 'help-dialog'])
  $('#' + id).addEventListener('close', () => {
    if (!finished) resumeClock();
  });
document
  .querySelectorAll('[data-close]')
  .forEach((button) =>
    button.addEventListener('click', () => button.closest('dialog').close()),
  );
$('#next').addEventListener('click', () => {
  $('#result-dialog').close();
  startPuzzle(difficulty, progress[difficulty].next);
});
$('#change-diff').addEventListener('click', () => {
  $('#result-dialog').close();
  openDiffDialog();
});
function soundButton() {
  $('#sound').textContent = audio.enabled ? '♫ 音效开' : '♫ 音效关';
  $('#sound').setAttribute('aria-pressed', String(audio.enabled));
  $('#sound').setAttribute('aria-label', audio.enabled ? '关闭音效' : '开启音效');
}
$('#sound').addEventListener('click', () => {
  audio.toggle();
  soundButton();
  audio.play('place');
});
document.addEventListener('pointerdown', () => audio.unlock(), {
  capture: true,
});
document.addEventListener('keydown', () => audio.unlock(), { capture: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pauseClock();
    audio.stop();
  } else if (!finished) resumeClock();
});
window.addEventListener('pagehide', () => {
  stopClock();
  audio.stop();
});
$('#mascot').innerHTML = animalSvg('panda');
soundButton();
startPuzzle(difficulty, index);
