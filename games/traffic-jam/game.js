import { getMoveRange, moveCar, isSolved, calculateStars, sanitizeProgress, GRID_SIZE } from './engine.js';
import { LEVELS } from './levels.js';
import { sound } from './audio.js';

const STORAGE_KEY = 'traffic-jam:progress';

let currentLevelIndex = 0;
let cars = [];
let moves = 0;
let history = [];
let selectedCarId = null;
let progress = { cleared: {}, bestMoves: {} };

const $ = (sel) => document.querySelector(sel);
const boardEl = $('#board');
const carsLayerEl = $('#cars-layer');

function loadProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    progress = sanitizeProgress(raw);
  } catch {
    progress = { cleared: {}, bestMoves: {} };
  }
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {}
}

function initLevel(index) {
  currentLevelIndex = (index + LEVELS.length) % LEVELS.length;
  const level = LEVELS[currentLevelIndex];
  cars = JSON.parse(JSON.stringify(level.cars));
  moves = 0;
  history = [];
  selectedCarId = 'red';

  $('#level-title').textContent = `第 ${level.id} 关 · ${level.title}`;
  $('#level-diff').textContent = level.difficulty;
  $('#moves-val').textContent = moves;
  $('#min-moves-val').textContent = level.minMoves;
  $('#tip-text').textContent = level.tip;

  render();
}

function render() {
  carsLayerEl.innerHTML = '';
  $('#moves-val').textContent = moves;

  const level = LEVELS[currentLevelIndex];
  const best = progress.bestMoves[level.id];
  $('#best-val').textContent = best ? `${best} 步` : '-';

  cars.forEach((car) => {
    const el = document.createElement('div');
    el.className = `car-element ${car.orientation === 'H' ? 'horizontal' : 'vertical'}`;
    if (car.isTarget) el.classList.add('target-car');
    if (car.id === selectedCarId) el.classList.add('selected');

    el.dataset.id = car.id;
    el.style.backgroundColor = car.color;

    // Position calculation
    const cellSize = 'var(--cell-size)';
    const gap = 'var(--gap)';
    el.style.top = `calc(${car.row} * (${cellSize} + ${gap}))`;
    el.style.left = `calc(${car.col} * (${cellSize} + ${gap}))`;

    if (car.orientation === 'H') {
      el.style.width = `calc(${car.length} * ${cellSize} + ${car.length - 1} * ${gap})`;
      el.style.height = cellSize;
    } else {
      el.style.width = cellSize;
      el.style.height = `calc(${car.length} * ${cellSize} + ${car.length - 1} * ${gap})`;
    }

    const inner = document.createElement('div');
    inner.className = 'car-inner';
    inner.textContent = car.label;
    el.appendChild(inner);

    attachPointerEvents(el, car);
    carsLayerEl.appendChild(el);
  });
}

function attachPointerEvents(el, car) {
  let startX = 0;
  let startY = 0;
  let isDragging = false;
  let initialCarPos = 0;

  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    initialCarPos = car.orientation === 'H' ? car.col : car.row;
    selectedCarId = car.id;
    el.classList.add('dragging');
    sound.select();
    render();
  });

  el.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const cellPixels = el.parentElement.clientWidth / GRID_SIZE;
    const deltaCells = Math.round((car.orientation === 'H' ? dx : dy) / cellPixels);

    if (deltaCells !== 0) {
      const targetPos = initialCarPos + deltaCells;
      const range = getMoveRange(car, cars);
      const clamped = Math.max(range.min, Math.min(range.max, targetPos));
      const moveDelta = clamped - (car.orientation === 'H' ? car.col : car.row);
      if (moveDelta !== 0) {
        history.push(JSON.parse(JSON.stringify(cars)));
        const res = moveCar(cars, car.id, moveDelta);
        if (res.moved) {
          cars = res.cars;
          moves++;
          sound.slide();
          render();
          checkVictory();
        }
      }
    }
  });

  const stopDrag = () => {
    if (!isDragging) return;
    isDragging = false;
    el.classList.remove('dragging');
  };

  el.addEventListener('pointerup', stopDrag);
  el.addEventListener('pointercancel', stopDrag);
}

function checkVictory() {
  if (isSolved(cars)) {
    sound.win();
    const level = LEVELS[currentLevelIndex];
    const stars = calculateStars(moves, level.minMoves);
    progress.cleared[level.id] = Math.max(progress.cleared[level.id] || 0, stars);
    if (!progress.bestMoves[level.id] || moves < progress.bestMoves[level.id]) {
      progress.bestMoves[level.id] = moves;
    }
    saveProgress();

    $('#stars-display').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    $('#win-moves-info').textContent = `耗费 ${moves} 步（最优 ${level.minMoves} 步）`;
    $('#win-modal').showModal();
  }
}

// Controls
$('#btn-undo').addEventListener('click', () => {
  if (history.length > 0) {
    cars = history.pop();
    moves = Math.max(0, moves - 1);
    sound.select();
    render();
  }
});

$('#btn-restart').addEventListener('click', () => {
  sound.select();
  initLevel(currentLevelIndex);
});

$('#btn-levels').addEventListener('click', () => {
  sound.select();
  renderLevelGrid();
  $('#levels-modal').showModal();
});

$('#btn-next').addEventListener('click', () => {
  $('#win-modal').close();
  initLevel(currentLevelIndex + 1);
});

$('#btn-replay').addEventListener('click', () => {
  $('#win-modal').close();
  initLevel(currentLevelIndex);
});

$('#btn-close-levels').addEventListener('click', () => {
  $('#levels-modal').close();
});

function renderLevelGrid() {
  const grid = $('#level-grid');
  grid.innerHTML = '';
  LEVELS.forEach((level, i) => {
    const btn = document.createElement('button');
    btn.className = 'level-btn';
    if (i === currentLevelIndex) btn.classList.add('active');
    const stars = progress.cleared[level.id] || 0;
    if (stars > 0) btn.classList.add('cleared');

    btn.innerHTML = `<span>${level.id}</span><span class="star-mini">${'⭐'.repeat(stars)}</span>`;
    btn.addEventListener('click', () => {
      $('#levels-modal').close();
      initLevel(i);
    });
    grid.appendChild(btn);
  });
}

// Keyboard arrow controls
window.addEventListener('keydown', (e) => {
  if (!selectedCarId) return;
  const car = cars.find((c) => c.id === selectedCarId);
  if (!car) return;

  let delta = 0;
  if (car.orientation === 'H') {
    if (e.key === 'ArrowLeft') delta = -1;
    if (e.key === 'ArrowRight') delta = 1;
  } else {
    if (e.key === 'ArrowUp') delta = -1;
    if (e.key === 'ArrowDown') delta = 1;
  }

  if (delta !== 0) {
    e.preventDefault();
    history.push(JSON.parse(JSON.stringify(cars)));
    const res = moveCar(cars, car.id, delta);
    if (res.moved) {
      cars = res.cars;
      moves++;
      sound.slide();
      render();
      checkVictory();
    } else {
      sound.bump();
    }
  }
});

loadProgress();
initLevel(0);
