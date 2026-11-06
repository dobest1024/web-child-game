import { TOPPINGS, getSliceCounts, simplifyFraction, formatFraction, matchesOrder, sanitizeProgress } from './engine.js';
import { PIZZA_LEVELS } from './levels.js';
import { sound } from './audio.js';

const STORAGE_KEY = 'fraction-pizza:progress';

let currentLevelIndex = 0;
let cuts = 4;
let slices = Array(cuts).fill(null);
let selectedTopping = 'cheese';
let progress = { cleared: {} };

const $ = (s) => document.querySelector(s);

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
  currentLevelIndex = (index + PIZZA_LEVELS.length) % PIZZA_LEVELS.length;
  const level = PIZZA_LEVELS[currentLevelIndex];
  cuts = level.allowedCuts[0] || 4;
  slices = Array(cuts).fill(null);
  selectedTopping = 'cheese';

  $('#customer-title').textContent = level.customer;
  $('#customer-dialogue').textContent = `“${level.dialogue}”`;
  $('#level-number').textContent = `第 ${level.id} 关`;

  renderOrderBadges(level.order);
  renderCutsBar(level.allowedCuts);
  renderToppingsBar();
  renderPizza();
  updateBreakdown();
}

function renderOrderBadges(order) {
  const container = $('#order-badges');
  container.innerHTML = '';
  for (const [tKey, frac] of Object.entries(order)) {
    const t = TOPPINGS[tKey];
    const badge = document.createElement('span');
    badge.className = 'order-badge';
    badge.innerHTML = `<span>${t.icon}</span> <span>${t.name}</span> <b>${formatFraction(frac.num, frac.den)}</b>`;
    container.appendChild(badge);
  }
}

function renderCutsBar(allowedCuts) {
  const container = $('#cuts-bar');
  container.innerHTML = '<span style="font-size:0.85rem; font-weight:700; color:var(--text-dim)">切分成：</span>';
  allowedCuts.forEach((num) => {
    const btn = document.createElement('button');
    btn.className = `cut-btn ${cuts === num ? 'active' : ''}`;
    btn.textContent = `${num} 等份`;
    btn.addEventListener('click', () => {
      if (cuts !== num) {
        cuts = num;
        slices = Array(cuts).fill(null);
        sound.cut();
        renderCutsBar(allowedCuts);
        renderPizza();
        updateBreakdown();
      }
    });
    container.appendChild(btn);
  });
}

function renderToppingsBar() {
  const container = $('#toppings-panel');
  container.innerHTML = '';
  Object.values(TOPPINGS).forEach((t) => {
    const btn = document.createElement('button');
    btn.className = `topping-btn ${selectedTopping === t.id ? 'selected' : ''}`;
    btn.innerHTML = `<span>${t.icon}</span> <span>${t.name}</span>`;
    btn.addEventListener('click', () => {
      selectedTopping = t.id;
      sound.drop();
      renderToppingsBar();
    });
    container.appendChild(btn);
  });

  const eraseBtn = document.createElement('button');
  eraseBtn.className = `topping-btn erase-btn ${selectedTopping === null ? 'selected' : ''}`;
  eraseBtn.innerHTML = '<span>🧹</span> <span>擦除</span>';
  eraseBtn.addEventListener('click', () => {
    selectedTopping = null;
    sound.drop();
    renderToppingsBar();
  });
  container.appendChild(eraseBtn);
}

function renderPizza() {
  const svg = $('#pizza-svg');
  svg.innerHTML = '';

  const cx = 150;
  const cy = 150;
  const r = 135;

  // Outer crust & sauce
  const crust = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  crust.setAttribute('cx', cx);
  crust.setAttribute('cy', cy);
  crust.setAttribute('r', r);
  crust.setAttribute('fill', '#d97706');
  svg.appendChild(crust);

  const sauce = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  sauce.setAttribute('cx', cx);
  sauce.setAttribute('cy', cy);
  sauce.setAttribute('r', r - 12);
  sauce.setAttribute('fill', '#dc2626');
  svg.appendChild(sauce);

  // Sector paths
  const sliceAngle = (2 * Math.PI) / cuts;
  for (let i = 0; i < cuts; i++) {
    const startAngle = i * sliceAngle - Math.PI / 2;
    const endAngle = (i + 1) * sliceAngle - Math.PI / 2;

    const x1 = cx + (r - 14) * Math.cos(startAngle);
    const y1 = cy + (r - 14) * Math.sin(startAngle);
    const x2 = cx + (r - 14) * Math.cos(endAngle);
    const y2 = cy + (r - 14) * Math.sin(endAngle);

    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r - 14} ${r - 14} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.className.baseVal = 'pizza-sector';

    const topping = slices[i];
    path.setAttribute('fill', topping ? TOPPINGS[topping].color : '#fef08a');

    path.addEventListener('click', () => {
      slices[i] = selectedTopping;
      sound.drop();
      renderPizza();
      updateBreakdown();
    });

    svg.appendChild(path);

    // Topping Emoji
    if (topping) {
      const midAngle = (startAngle + endAngle) / 2;
      const tx = cx + (r * 0.58) * Math.cos(midAngle);
      const ty = cy + (r * 0.58) * Math.sin(midAngle) + 6;
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', tx);
      text.setAttribute('y', ty);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', cuts > 8 ? '16' : '24');
      text.style.pointerEvents = 'none';
      text.textContent = TOPPINGS[topping].icon;
      svg.appendChild(text);
    }
  }
}

function updateBreakdown() {
  const counts = getSliceCounts(slices);
  const parts = [];
  for (const [tKey, cnt] of Object.entries(counts)) {
    const t = TOPPINGS[tKey];
    const simp = simplifyFraction(cnt, cuts);
    const simpStr = (simp.num !== cnt || simp.den !== cuts) ? ` (= ${formatFraction(simp.num, simp.den)})` : '';
    parts.push(`${t.icon} ${t.name} <b>${cnt}/${cuts}${simpStr}</b>`);
  }
  $('#live-breakdown').innerHTML = parts.length ? parts.join(' &nbsp;|&nbsp; ') : '披萨还是空白的，点击扇区撒料吧！';
}

// Bake check
$('#btn-bake').addEventListener('click', () => {
  const level = PIZZA_LEVELS[currentLevelIndex];
  const res = matchesOrder(slices, cuts, level.order);
  if (res.match) {
    sound.ding();
    sound.win();
    progress.cleared[level.id] = 3;
    saveProgress();
    $('#win-dialog').showModal();
  } else {
    sound.error();
    alert(`还需要调整一下哟：\n${res.reason}`);
  }
});

$('#btn-clear').addEventListener('click', () => {
  slices = Array(cuts).fill(null);
  sound.cut();
  renderPizza();
  updateBreakdown();
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
  PIZZA_LEVELS.forEach((lvl, i) => {
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
