import { traceLaser, isLevelSolved, sanitizeProgress, GRID_SIZE } from './engine.js';
import { OPTIC_LEVELS } from './levels.js';
import { sound } from './audio.js';

const STORAGE_KEY = 'laser-mirror:progress';

let currentLevelIndex = 0;
let emitters = [];
let targets = [];
let items = [];
let progress = { cleared: {} };

const $ = (s) => document.querySelector(s);
const boardEl = $('#lab-board');
const laserSvg = $('#laser-svg');

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
  currentLevelIndex = (index + OPTIC_LEVELS.length) % OPTIC_LEVELS.length;
  const level = OPTIC_LEVELS[currentLevelIndex];
  emitters = JSON.parse(JSON.stringify(level.emitters));
  targets = JSON.parse(JSON.stringify(level.targets));
  items = JSON.parse(JSON.stringify(level.items));

  $('#level-info').textContent = `第 ${level.id} 关 · ${level.title}`;
  $('#tip-text').textContent = level.tip;

  render();
}

function render() {
  // Clear previous items
  boardEl.querySelectorAll('.grid-item').forEach((el) => el.remove());

  // Render items (emitters, targets, rocks, mirrors, splitters)
  emitters.forEach((em) => {
    const el = document.createElement('div');
    el.className = 'grid-item emitter';
    positionItem(el, em.row, em.col);
    el.innerHTML = `<span style="font-size:1.6rem; transform: rotate(${getEmitterRotation(em.dir)}deg); display:inline-block">🔦</span>`;
    boardEl.appendChild(el);
  });

  items.forEach((item) => {
    const el = document.createElement('div');
    el.className = `grid-item ${item.type}`;
    positionItem(el, item.row, item.col);

    if (item.type === 'mirror') {
      el.innerHTML = renderMirrorSvg(item.angle);
      el.title = '点击旋转镜子';
      el.addEventListener('click', () => {
        item.angle = item.angle === 0 ? 1 : 0;
        sound.rotate();
        render();
        checkVictory();
      });
    } else if (item.type === 'rock') {
      el.innerHTML = '<span style="font-size:1.6rem">🪨</span>';
    } else if (item.type === 'splitter') {
      el.innerHTML = '<span style="font-size:1.5rem">💎</span>';
      el.title = '分光晶体';
    }
    boardEl.appendChild(el);
  });

  // Calculate Laser Beams
  const allSceneItems = [...items, ...targets];
  const { segments, hitTargets } = traceLaser(emitters, allSceneItems);

  // Render Targets with lit status
  targets.forEach((tgt) => {
    const el = document.createElement('div');
    const isLit = hitTargets.has(`${tgt.row},${tgt.col}`);
    el.className = `grid-item target-crystal ${isLit ? 'lit' : ''}`;
    el.style.color = tgt.color;
    positionItem(el, tgt.row, tgt.col);
    el.innerHTML = isLit ? '🔮' : '⚪';
    boardEl.appendChild(el);
  });

  // Render Laser Lines in SVG
  laserSvg.innerHTML = '';
  const cellPx = boardEl.clientWidth / GRID_SIZE;

  segments.forEach((seg) => {
    const x1 = (seg.c1 + 0.5) * cellPx;
    const y1 = (seg.r1 + 0.5) * cellPx;
    const x2 = (seg.c2 + 0.5) * cellPx;
    const y2 = (seg.r2 + 0.5) * cellPx;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', seg.color);
    line.setAttribute('stroke-width', '4');
    line.className.baseVal = 'laser-beam';
    laserSvg.appendChild(line);
  });

  return { hitTargets };
}

function positionItem(el, r, c) {
  const cellSize = 'var(--cell)';
  el.style.top = `calc(${r} * ${cellSize})`;
  el.style.left = `calc(${c} * ${cellSize})`;
}

function getEmitterRotation(dir) {
  if (dir === 'E') return 0;
  if (dir === 'S') return 90;
  if (dir === 'W') return 180;
  if (dir === 'N') return 270;
  return 0;
}

function renderMirrorSvg(angle) {
  // angle 0 is '/', angle 1 is '\'
  const isSlash = angle === 0;
  return `
    <svg class="mirror-icon" viewBox="0 0 40 40">
      <line x1="${isSlash ? 5 : 5}" y1="${isSlash ? 35 : 5}" x2="${isSlash ? 35 : 35}" y2="${isSlash ? 5 : 35}" stroke="#93c5fd" stroke-width="5" stroke-linecap="round"/>
      <line x1="${isSlash ? 7 : 7}" y1="${isSlash ? 37 : 7}" x2="${isSlash ? 37 : 37}" y2="${isSlash ? 7 : 37}" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;
}

function checkVictory() {
  const allSceneItems = [...items, ...targets];
  const { hitTargets } = traceLaser(emitters, allSceneItems);
  if (isLevelSolved(targets, hitTargets)) {
    sound.crystal();
    sound.win();
    const level = OPTIC_LEVELS[currentLevelIndex];
    progress.cleared[level.id] = 3;
    saveProgress();
    setTimeout(() => {
      $('#win-dialog').showModal();
    }, 200);
  }
}

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
  OPTIC_LEVELS.forEach((lvl, i) => {
    const btn = document.createElement('button');
    btn.className = `level-btn ${i === currentLevelIndex ? 'active' : ''}`;
    btn.innerHTML = `<span>第 ${lvl.id} 关</span><br><small>${progress.cleared[lvl.id] ? '⭐⭐⭐' : '未点亮'}</small>`;
    btn.addEventListener('click', () => {
      $('#levels-dialog').close();
      initLevel(i);
    });
    grid.appendChild(btn);
  });
}

loadProgress();
initLevel(0);
