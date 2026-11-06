import { solveCircuit, isLevelSolved, sanitizeProgress } from './engine.js';
import { CIRCUIT_LEVELS } from './levels.js';
import { sound } from './audio.js';

const STORAGE_KEY = 'circuit-lab:progress';

let currentLevelIndex = 0;
let components = [];
let targetItems = [];
let progress = { cleared: {} };

const $ = (s) => document.querySelector(s);
const boardEl = $('#circuit-board');

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
  currentLevelIndex = (index + CIRCUIT_LEVELS.length) % CIRCUIT_LEVELS.length;
  const level = CIRCUIT_LEVELS[currentLevelIndex];
  components = JSON.parse(JSON.stringify(level.components));
  targetItems = level.targetItems;

  $('#level-info').textContent = `第 ${level.id} 关 · ${level.title}`;
  $('#tip-text').textContent = level.tip;

  render();
}

function render() {
  boardEl.querySelectorAll('.component').forEach((el) => el.remove());

  // Solve circuit
  const { isShortCircuit, poweredItems } = solveCircuit(components);

  if (isShortCircuit) {
    $('#short-warn').style.display = 'inline';
    sound.shortCircuit();
  } else {
    $('#short-warn').style.display = 'none';
  }

  // Render components
  components.forEach((comp) => {
    const el = document.createElement('div');
    el.className = `component ${comp.type}`;
    positionComp(el, comp.row, comp.col);

    if (comp.type === 'wire') {
      el.innerHTML = renderWireSvg(comp.wireType, comp.rot, poweredItems.size > 0);
      el.title = '点击旋转导线';
      el.addEventListener('click', () => {
        comp.rot = (comp.rot + 1) % 4;
        sound.click();
        render();
        checkVictory();
      });
    } else if (comp.type === 'switch') {
      el.innerHTML = renderSwitchSvg(comp.dir, comp.closed);
      el.title = '点击开合闸刀';
      el.addEventListener('click', () => {
        comp.closed = !comp.closed;
        sound.switch();
        render();
        checkVictory();
      });
    } else if (comp.type === 'battery') {
      el.innerHTML = renderBatterySvg(comp.rot);
    } else if (comp.type === 'bulb') {
      const isLit = poweredItems.has(comp.id);
      el.innerHTML = `<span class="bulb-icon ${isLit ? 'lit' : ''}">${isLit ? '💡' : '🪔'}</span>`;
    } else if (comp.type === 'fan') {
      const isSpin = poweredItems.has(comp.id);
      el.innerHTML = `<span class="fan-icon ${isSpin ? 'spinning' : ''}">🌀</span>`;
    } else if (comp.type === 'buzzer') {
      const isBuzz = poweredItems.has(comp.id);
      el.innerHTML = `<span style="font-size:1.8rem">${isBuzz ? '🔔' : '🔕'}</span>`;
      if (isBuzz) sound.buzz();
    }

    boardEl.appendChild(el);
  });
}

function positionComp(el, r, c) {
  const cellSize = 'var(--cell)';
  el.style.top = `calc(${r} * ${cellSize})`;
  el.style.left = `calc(${c} * ${cellSize})`;
}

function renderWireSvg(type, rot, isActive) {
  const stroke = isActive ? '#fde047' : '#f59e0b';
  let path = '';
  if (type === 'straight') {
    path = rot % 2 === 0
      ? '<line x1="25" y1="0" x2="25" y2="50" stroke-width="8"/>'
      : '<line x1="0" y1="25" x2="50" y2="25" stroke-width="8"/>';
  } else if (type === 'corner') {
    // 0: N-E, 1: E-S, 2: S-W, 3: W-N
    if (rot === 0) path = '<path d="M25 0 Q25 25 50 25" stroke-width="8" fill="none"/>';
    if (rot === 1) path = '<path d="M50 25 Q25 25 25 50" stroke-width="8" fill="none"/>';
    if (rot === 2) path = '<path d="M25 50 Q25 25 0 25" stroke-width="8" fill="none"/>';
    if (rot === 3) path = '<path d="M0 25 Q25 25 25 0" stroke-width="8" fill="none"/>';
  } else if (type === 't-junction') {
    path = '<line x1="0" y1="25" x2="50" y2="25" stroke-width="8"/><line x1="25" y1="0" x2="25" y2="25" stroke-width="8"/>';
  } else if (type === 'cross') {
    path = '<line x1="0" y1="25" x2="50" y2="25" stroke-width="8"/><line x1="25" y1="0" x2="25" y2="50" stroke-width="8"/>';
  }

  return `
    <svg viewBox="0 0 50 50" stroke="${stroke}" stroke-linecap="round">
      ${path}
      <circle cx="25" cy="25" r="4" fill="${stroke}"/>
    </svg>
  `;
}

function renderBatterySvg(rot) {
  return `
    <svg viewBox="0 0 50 50">
      <rect x="12" y="14" width="26" height="22" rx="4" fill="#334155" stroke="#f59e0b" stroke-width="2"/>
      <rect x="38" y="20" width="5" height="10" rx="1" fill="#ef4444"/>
      <text x="32" y="29" font-size="12" font-weight="900" fill="#ef4444" text-anchor="middle">+</text>
      <text x="18" y="29" font-size="14" font-weight="900" fill="#94a3b8" text-anchor="middle">-</text>
      <line x1="0" y1="25" x2="12" y2="25" stroke="#f59e0b" stroke-width="5"/>
      <line x1="43" y1="25" x2="50" y2="25" stroke="#f59e0b" stroke-width="5"/>
    </svg>
  `;
}

function renderSwitchSvg(dir, closed) {
  const isH = dir === 'H';
  const arm = closed
    ? `<line x1="12" y1="25" x2="38" y2="25" stroke="#38bdf8" stroke-width="5"/>`
    : `<line x1="12" y1="25" x2="36" y2="10" stroke="#38bdf8" stroke-width="5"/>`;

  return `
    <svg viewBox="0 0 50 50">
      <line x1="0" y1="25" x2="12" y2="25" stroke="#f59e0b" stroke-width="5"/>
      <line x1="38" y1="25" x2="50" y2="25" stroke="#f59e0b" stroke-width="5"/>
      <circle cx="12" cy="25" r="4" fill="#f59e0b"/>
      <circle cx="38" cy="25" r="4" fill="#f59e0b"/>
      ${arm}
    </svg>
  `;
}

function checkVictory() {
  const { isShortCircuit, poweredItems } = solveCircuit(components);
  if (isLevelSolved(targetItems, poweredItems, isShortCircuit)) {
    sound.win();
    const level = CIRCUIT_LEVELS[currentLevelIndex];
    progress.cleared[level.id] = 3;
    saveProgress();
    setTimeout(() => {
      $('#win-dialog').showModal();
    }, 250);
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
  CIRCUIT_LEVELS.forEach((lvl, i) => {
    const btn = document.createElement('button');
    btn.className = `level-btn ${i === currentLevelIndex ? 'active' : ''}`;
    btn.innerHTML = `<span>第 ${lvl.id} 关</span><br><small>${progress.cleared[lvl.id] ? '⭐⭐⭐' : '未接通'}</small>`;
    btn.addEventListener('click', () => {
      $('#levels-dialog').close();
      initLevel(i);
    });
    grid.appendChild(btn);
  });
}

loadProgress();
initLevel(0);
