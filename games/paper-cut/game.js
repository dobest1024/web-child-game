import {
  getFoldDimensions,
  unfoldGrid,
  compareGrids,
  sanitizeProgress,
} from './engine.js';
import { PAPER_LEVELS, getLevelTargetGrid } from './levels.js';
import { sound } from './audio.js';

const STORAGE_KEY = 'paper-cut:progress';

let currentLevelIndex = 0;
let cutCells = new Set();
let progress = { cleared: {}, album: [] };

const $ = (s) => document.querySelector(s);
const cuttingGridEl = $('#cutting-grid');
const previewGridEl = $('#preview-grid');
const targetGridEl = $('#target-grid');

function loadProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    progress = sanitizeProgress(raw);
  } catch {
    progress = { cleared: {}, album: [] };
  }
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {}
}

function initLevel(index) {
  currentLevelIndex = (index + PAPER_LEVELS.length) % PAPER_LEVELS.length;
  const level = PAPER_LEVELS[currentLevelIndex];
  cutCells.clear();

  $('#level-info').textContent = `第 ${level.id} 关 · ${level.title}`;
  $('#tip-text').textContent = level.tip;

  const foldNames = { V: '左右对折 📖', H: '上下对折 📕', VH: '四折折角 🗂️' };
  $('#fold-name').textContent = foldNames[level.foldType] || level.foldType;

  renderCuttingBoard();
  renderTarget();
  renderPreview();
}

function renderCuttingBoard() {
  const level = PAPER_LEVELS[currentLevelIndex];
  const dims = getFoldDimensions(level.foldType);

  cuttingGridEl.innerHTML = '';
  cuttingGridEl.style.gridTemplateRows = `repeat(${dims.rows}, var(--cell))`;
  cuttingGridEl.style.gridTemplateColumns = `repeat(${dims.cols}, var(--cell))`;

  for (let r = 0; r < dims.rows; r++) {
    for (let c = 0; c < dims.cols; c++) {
      const cell = document.createElement('div');
      cell.className = 'cut-cell';
      const key = `${r},${c}`;
      if (cutCells.has(key)) {
        cell.classList.add('cut-out');
        cell.innerHTML = '✂️';
      }

      cell.addEventListener('click', () => {
        if (cutCells.has(key)) {
          cutCells.delete(key);
        } else {
          cutCells.add(key);
          sound.snip();
        }
        renderCuttingBoard();
        renderPreview();
      });

      cuttingGridEl.appendChild(cell);
    }
  }
}

function renderTarget() {
  const level = PAPER_LEVELS[currentLevelIndex];
  const targetGrid = getLevelTargetGrid(level);

  targetGridEl.innerHTML = '';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = document.createElement('div');
      cell.className = `mini-cell ${targetGrid[r][c] ? 'filled' : ''}`;
      targetGridEl.appendChild(cell);
    }
  }
}

function renderPreview() {
  const level = PAPER_LEVELS[currentLevelIndex];
  const cutArray = Array.from(cutCells).map((str) => str.split(',').map(Number));
  const currentGrid = unfoldGrid(cutArray, level.foldType, 8);

  previewGridEl.innerHTML = '';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = document.createElement('div');
      cell.className = `mini-cell ${currentGrid[r][c] ? 'filled' : ''}`;
      previewGridEl.appendChild(cell);
    }
  }
}

// Unfold & Check
$('#btn-check').addEventListener('click', () => {
  const level = PAPER_LEVELS[currentLevelIndex];
  const cutArray = Array.from(cutCells).map((str) => str.split(',').map(Number));
  const currentGrid = unfoldGrid(cutArray, level.foldType, 8);
  const targetGrid = getLevelTargetGrid(level);

  const res = compareGrids(currentGrid, targetGrid, 8);
  sound.unfold();

  if (res.perfect) {
    sound.win();
    progress.cleared[level.id] = 3;
    saveProgress();
    setTimeout(() => {
      $('#win-dialog').showModal();
    }, 250);
  } else {
    alert(`还需要再调整一下：\n已经剪对 ${res.matched} 处，还差 ${res.totalTarget - res.matched} 处（剪错 ${res.falseCuts} 处）。`);
  }
});

$('#btn-clear').addEventListener('click', () => {
  cutCells.clear();
  renderCuttingBoard();
  renderPreview();
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
  PAPER_LEVELS.forEach((lvl, i) => {
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
