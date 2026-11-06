import { rollCube, checkOppositePair, sanitizeProgress } from './engine.js';
import { CUBE_LEVELS } from './levels.js';
import { sound } from './audio.js';

const STORAGE_KEY = 'cube-unfold:progress';

let currentLevelIndex = 0;
let currentCube = null;
let currentPos = null;
let progress = { cleared: {} };

const $ = (s) => document.querySelector(s);
const netContainerEl = $('#net-container');
const rollBoardEl = $('#roll-board');

function loadProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    progress = sanitizeProgress(raw);
  } catch {
    progress = { cleared: {} };
  }
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {}
}

function initLevel(index) {
  currentLevelIndex = (index + CUBE_LEVELS.length) % CUBE_LEVELS.length;
  const level = CUBE_LEVELS[currentLevelIndex];

  $('#level-info').textContent = `第 ${level.id} 关 · ${level.title}`;
  $('#tip-text').textContent = level.tip;

  if (level.type === 'net') {
    netContainerEl.style.display = 'grid';
    rollBoardEl.style.display = 'none';
    $('#question-text').textContent = level.question;
    renderNet(level);
  } else {
    netContainerEl.style.display = 'none';
    rollBoardEl.style.display = 'grid';
    currentCube = { ...level.initialCube };
    currentPos = { ...level.start };
    $('#question-text').textContent = `翻滚骰子，让朝上的数字为 【${level.targetTop}】 并停在绿色终点！`;
    renderRollBoard(level);
  }
}

function renderNet(level) {
  netContainerEl.innerHTML = '';
  // Determine bounds
  const maxR = Math.max(...level.faces.map((f) => f.r));
  const maxC = Math.max(...level.faces.map((f) => f.c));

  netContainerEl.style.gridTemplateRows = `repeat(${maxR + 1}, var(--cell))`;
  netContainerEl.style.gridTemplateColumns = `repeat(${maxC + 1}, var(--cell))`;

  level.faces.forEach((face) => {
    const el = document.createElement('div');
    el.className = 'face-tile';
    el.textContent = face.label;
    el.style.gridRow = face.r + 1;
    el.style.gridColumn = face.c + 1;

    if (face.label === level.targetQuestionFace) {
      el.classList.add('target-face');
      el.title = '目标面';
    } else {
      el.addEventListener('click', () => {
        sound.click();
        handleNetAnswer(level, face.label);
      });
    }

    netContainerEl.appendChild(el);
  });
}

function handleNetAnswer(level, selectedLabel) {
  if (selectedLabel === level.correctAnswer) {
    sound.win();
    progress.cleared[level.id] = 3;
    saveProgress();
    setTimeout(() => {
      $('#win-dialog').showModal();
    }, 200);
  } else {
    sound.error();
    alert('不对哟！再仔细观察折痕和相对面的规律想一想！');
  }
}

function renderRollBoard(level) {
  rollBoardEl.innerHTML = '';
  const size = level.gridSize;
  rollBoardEl.style.gridTemplateRows = `repeat(${size}, var(--cell))`;
  rollBoardEl.style.gridTemplateColumns = `repeat(${size}, var(--cell))`;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = document.createElement('div');
      cell.className = 'roll-cell';
      if (r === level.end.r && c === level.end.c) {
        cell.classList.add('goal');
        cell.innerHTML = `🏁<br><small style="color:#166534">需${level.targetTop}</small>`;
      }
      rollBoardEl.appendChild(cell);
    }
  }

  // Cube Token
  const token = document.createElement('div');
  token.className = 'cube-token';
  token.id = 'cube-token';
  token.innerHTML = `<span>${currentCube.top}</span><small style="font-size:0.65rem">朝上</small>`;
  token.style.top = `calc(${currentPos.r} * (var(--cell) + 4px) + 6px)`;
  token.style.left = `calc(${currentPos.c} * (var(--cell) + 4px) + 6px)`;
  rollBoardEl.appendChild(token);
}

function doRoll(dir) {
  const level = CUBE_LEVELS[currentLevelIndex];
  if (level.type !== 'roll') return;

  const deltas = { N: [-1, 0], S: [1, 0], E: [0, 1], W: [0, -1] };
  const [dr, dc] = deltas[dir];
  const nextR = currentPos.r + dr;
  const nextC = currentPos.c + dc;

  if (nextR < 0 || nextR >= level.gridSize || nextC < 0 || nextC >= level.gridSize) {
    sound.error();
    return;
  }

  currentPos = { r: nextR, c: nextC };
  currentCube = rollCube(currentCube, dir);
  sound.roll();

  renderRollBoard(level);

  // Check victory
  if (currentPos.r === level.end.r && currentPos.c === level.end.c) {
    if (currentCube.top === level.targetTop) {
      sound.win();
      progress.cleared[level.id] = 3;
      saveProgress();
      setTimeout(() => {
        $('#win-dialog').showModal();
      }, 250);
    } else {
      sound.error();
      setTimeout(() => {
        alert(`到达终点了，但朝上的点数是 【${currentCube.top}】，目标需要是 【${level.targetTop}】！按“重置”换条路线再试一次吧！`);
      }, 100);
    }
  }
}

// Keyboard arrow controls for rolling
window.addEventListener('keydown', (e) => {
  if (CUBE_LEVELS[currentLevelIndex].type !== 'roll') return;
  if (e.key === 'ArrowUp') { e.preventDefault(); doRoll('N'); }
  if (e.key === 'ArrowDown') { e.preventDefault(); doRoll('S'); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); doRoll('W'); }
  if (e.key === 'ArrowRight') { e.preventDefault(); doRoll('E'); }
});

$('#btn-restart').addEventListener('click', () => {
  initLevel(currentLevelIndex);
});

$('#btn-next').addEventListener('click', () => {
  $('#win-dialog').close();
  initLevel(currentLevelIndex + 1);
});

$('#btn-levels').addEventListener('click', () => {
  renderLevelGrid();
  $('#levels-dialog').showModal();
});

$('#btn-close-levels').addEventListener('click', () => {
  $('#levels-dialog').close();
});

function renderLevelGrid() {
  const grid = $('#level-grid');
  grid.innerHTML = '';
  CUBE_LEVELS.forEach((lvl, i) => {
    const btn = document.createElement('button');
    btn.className = `level-btn ${i === currentLevelIndex ? 'active' : ''}`;
    btn.innerHTML = `<span>第 ${lvl.id} 关</span><br><small>${progress.cleared[lvl.id] ? '⭐⭐⭐' : '未解锁'}</small>`;
    btn.addEventListener('click', () => {
      $('#levels-dialog').close();
      initLevel(i);
    });
    grid.appendChild(btn);
  });
}

loadProgress();
initLevel(0);
