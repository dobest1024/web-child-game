import { pieces, levels } from './levels.js';
import {
  SNAP_TOLERANCE,
  rotatePlacement,
  flipPlacement,
  placementPolygon,
  fingerprint,
  placementsMatch,
  minPresses,
  score,
  sanitizeProgress,
} from './engine.js';
import { drawScene, layout, trayPlacement } from './art.js';
import { TangramAudio } from './audio.js';

const $ = (selector) => document.querySelector(selector);
const audio = new TangramAudio();
const STORAGE_KEY = 'tangram:progress';
const pieceById = new Map(pieces.map((piece) => [piece.id, piece]));

let progress = loadProgress();
let level = levels[0];
let items = [];
let selectedId = null;
let hintsOn = false;
let hintUsed = false;
let rotations = 0;
let drag = null;

function loadProgress() {
  try {
    return sanitizeProgress(JSON.parse(localStorage.getItem(STORAGE_KEY)), levels.length);
  } catch {
    return {};
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

function initState() {
  const baseRot = (level.id * 5 + 3) % 8;
  items = level.slots.map((slot, index) => {
    const piece = pieceById.get(slot.pieceId);
    const rot = (baseRot + index * 3) % 8;
    const flip = piece.chiral ? level.id % 2 === 1 : false;
    return {
      pieceId: slot.pieceId,
      name: slot.name,
      shape: slot.shape,
      chiral: Boolean(piece.chiral),
      locked: false,
      lockedSlot: -1,
      placement: trayPlacement(level, piece, rot, flip, index),
    };
  });
  selectedId = null;
  hintsOn = false;
  hintUsed = false;
  rotations = 0;
  drag = null;
}

function selectedItem() {
  return items.find((item) => item.pieceId === selectedId) ?? null;
}

function render() {
  $('#scene').innerHTML = drawScene(level, items, selectedId, hintsOn);
  const locked = items.filter((item) => item.locked).length;
  $('#placed-board').textContent = `${locked} / 7`;
  $('#placed').textContent = `${locked} / 7`;
  $('#rotations').textContent = rotations;
  $('#budget').textContent = `巧手目标：旋转不超过 ${level.budget} 次。`;
  $('#progress').textContent = `${Object.keys(progress).length} / ${levels.length}`;
  $('#chapter').textContent = `第 ${level.id + 1} 关 · 共 ${levels.length} 关`;
  $('#title').textContent = `${level.emoji} ${level.name}`;
  $('#hint-text').textContent = hintsOn ? level.hint : '提示已关闭，靠自己观察剪影吧！';
  $('#hints').setAttribute('aria-pressed', String(hintsOn));
  $('#hints').textContent = hintsOn ? '💡 提示：开' : '💡 提示：关';
  $('#flip').disabled = !selectedItem() || !selectedItem().chiral;
}

function loadLevel(id) {
  level = levels[id];
  initState();
  render();
  say(
    level.id === 0
      ? '点击一块七巧板，把它拖进影子里。方向键微调，R 旋转，F 翻转！'
      : '先看看剪影像什么，再从最大的一块开始拼。',
  );
}

function select(pieceId) {
  selectedId = pieceId;
  if (pieceId) audio.play('pick');
  render();
  if (pieceId) say(`选中了${selectedItem().name}。拖到影子里，或用方向键移动。`);
}

function cycleSelection(step) {
  const floating = items.filter((item) => !item.locked);
  if (!floating.length) return;
  const index = floating.findIndex((item) => item.pieceId === selectedId);
  const next = floating[(index + step + floating.length) % floating.length];
  select(next.pieceId);
}

function tryLock(item) {
  const piece = pieceById.get(item.pieceId);
  for (let slotIndex = 0; slotIndex < level.slots.length; slotIndex++) {
    if (
      items.some(
        (other) =>
          other !== item && other.locked && other.lockedSlot === slotIndex,
      )
    )
      continue;
    const slot = level.slots[slotIndex];
    if (placementsMatch(piece, item.placement, slot)) {
      item.locked = true;
      item.lockedSlot = slotIndex;
      item.placement = { tx: slot.tx, ty: slot.ty, rot: slot.rot, flip: slot.flip };
      const lockedCount = items.filter((entry) => entry.locked).length;
      audio.play(lockedCount === items.length ? 'win' : 'lock');
      if (lockedCount === items.length) {
        finish();
      } else {
        say(`太棒了！${item.name}归位啦，还剩 ${items.length - lockedCount} 块。`);
        if (selectedId === item.pieceId) selectedId = null;
      }
      render();
      return true;
    }
  }
  return false;
}

function attemptPlace() {
  const item = selectedItem();
  if (!item) {
    say('先按空格 / Q / E 或点击选中一块七巧板。');
    return;
  }
  if (tryLock(item)) return;
  audio.play('miss');
  const piece = pieceById.get(item.pieceId);
  const near = level.slots.some(
    (slot, slotIndex) =>
      !items.some(
        (other) =>
          other !== item && other.locked && other.lockedSlot === slotIndex,
      ) &&
      slot.shape === item.shape &&
      Math.hypot(item.placement.tx - slot.tx, item.placement.ty - slot.ty) <=
        SNAP_TOLERANCE &&
      fingerprint(placementPolygon(piece, item.placement)) !==
        fingerprint(placementPolygon(piece, slot)),
  );
  say(
    near
      ? '位置很接近了！转一转方向（R），或翻个面试试（F）。'
      : '再靠近影子里的位置一些，回车就能放好。',
  );
}

function rotateSelected(steps) {
  const item = selectedItem();
  if (!item || item.locked) return;
  item.placement = rotatePlacement(item.placement, steps);
  rotations += 1;
  audio.play('rotate');
  render();
}

function flipSelected() {
  const item = selectedItem();
  if (!item || item.locked) return;
  if (!item.chiral) {
    say('这一块是对称的，不用翻转哦。');
    return;
  }
  item.placement = flipPlacement(item.placement);
  rotations += 1;
  audio.play('flip');
  render();
}

function nudgeSelected(dx, dy) {
  const item = selectedItem();
  if (!item || item.locked) return;
  item.placement = {
    ...item.placement,
    tx: item.placement.tx + dx,
    ty: item.placement.ty + dy,
  };
  render();
  tryLock(item);
}

function finish() {
  const stars = score(hintUsed, rotations, level.budget);
  const saved = saveProgressStar(stars);
  $('#stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  $('#stars').setAttribute('aria-label', `获得${stars}颗星`);
  $('#result-text').textContent =
    `${level.emoji} ${level.name}拼好啦！旋转 ${rotations} 次。` +
    (stars >= 3 ? '一点提示都没用，太厉害了！' : stars === 2 ? '很棒！不用提示就是三颗星。' : '再挑战一次，少用提示多拿星星。') +
    (saved ? '' : '（浏览器暂时没法保存星星）');
  $('#result-title').textContent = stars >= 2 ? '拼好啦，真漂亮！' : '完成！再试试更棒的拼法？';
  $('#next').textContent = level.id === levels.length - 1 ? '看看拼图地图 ➜' : '下一个图形 ➜';
  $('#result-dialog').showModal();
  render();
}

function saveProgressStar(stars) {
  progress[level.id] = Math.max(progress[level.id] ?? 0, stars);
  return saveProgress();
}

// —— 指针拖拽 ——
const scene = $('#scene');
function svgPoint(event) {
  const ctm = scene.getScreenCTM();
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
  const { s, ox, oy } = layout(level);
  return [(point.x - ox) / s, (point.y - oy) / s];
}

scene.addEventListener('pointerdown', (event) => {
  audio.unlock();
  const group = event.target.closest('[data-piece]');
  if (!group) return;
  const item = items.find((entry) => entry.pieceId === group.dataset.piece);
  if (!item || item.locked) return;
  selectedId = item.pieceId;
  const [hx, hy] = svgPoint(event);
  drag = {
    id: item.pieceId,
    grabX: hx - item.placement.tx,
    grabY: hy - item.placement.ty,
  };
  scene.setPointerCapture(event.pointerId);
  render();
});

scene.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const item = items.find((entry) => entry.pieceId === drag.id);
  if (!item) return;
  const [hx, hy] = svgPoint(event);
  item.placement = {
    ...item.placement,
    tx: Math.round((hx - drag.grabX) * 4) / 4,
    ty: Math.round((hy - drag.grabY) * 4) / 4,
  };
  render();
});

scene.addEventListener('pointerup', () => {
  if (!drag) return;
  const item = items.find((entry) => entry.pieceId === drag.id);
  drag = null;
  if (!item) return;
  if (!tryLock(item)) {
    audio.play('miss');
    say('放到影子边上试试，靠近正确位置会自动吸住。');
  }
  render();
});

scene.addEventListener('pointercancel', () => {
  if (!drag) return;
  drag = null;
  render();
});

scene.addEventListener('keydown', (event) => {
  const key = event.key;
  if (key === ' ' || key === 'e' || key === 'E' || key === ']') {
    event.preventDefault();
    cycleSelection(event.shiftKey && key === ' ' ? -1 : 1);
    return;
  }
  if (key === 'q' || key === 'Q' || key === '[') {
    event.preventDefault();
    cycleSelection(-1);
    return;
  }
  const step = event.shiftKey ? 2 : 1;
  const nudges = {
    ArrowUp: [0, -step],
    ArrowDown: [0, step],
    ArrowLeft: [-step, 0],
    ArrowRight: [step, 0],
  };
  if (nudges[key]) {
    event.preventDefault();
    nudgeSelected(...nudges[key]);
    return;
  }
  if (key === 'r' || key === 'R') {
    event.preventDefault();
    rotateSelected(event.shiftKey ? -1 : 1);
    return;
  }
  if (key === 'f' || key === 'F') {
    event.preventDefault();
    flipSelected();
    return;
  }
  if (key === 'Enter') {
    event.preventDefault();
    attemptPlace();
    return;
  }
  if (key === 'Escape') {
    selectedId = null;
    render();
  }
});

// —— 按钮 ——
$('#rotate-cw').addEventListener('click', () => {
  audio.unlock();
  rotateSelected(1);
});
$('#rotate-ccw').addEventListener('click', () => {
  audio.unlock();
  rotateSelected(-1);
});
$('#flip').addEventListener('click', () => {
  audio.unlock();
  flipSelected();
});
$('#place').addEventListener('click', () => {
  audio.unlock();
  attemptPlace();
});
$('#hints').addEventListener('click', () => {
  hintsOn = !hintsOn;
  if (hintsOn) hintUsed = true;
  audio.play('pick');
  render();
  say(hintsOn ? '入门模式：影子里有虚线提示。' : '挑战模式：只有剪影，加油！');
});
$('#reset').addEventListener('click', () => {
  loadLevel(level.id);
  say('拼图回到最初的样子，换种思路再试试。');
});
$('#map').addEventListener('click', openMap);
$('#level-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-level]');
  if (!button) return;
  $('#map-dialog').close();
  loadLevel(Number(button.dataset.level));
});
$('#help').addEventListener('click', () => {
  $('#help-dialog').showModal();
});
$('#sound').addEventListener('click', () => {
  audio.toggle();
  soundButton();
  audio.play('lock');
});
document.querySelectorAll('[data-close]').forEach((button) =>
  button.addEventListener('click', () => button.closest('dialog').close()),
);
$('#retry').addEventListener('click', () => {
  $('#result-dialog').close();
  loadLevel(level.id);
});
$('#next').addEventListener('click', () => {
  $('#result-dialog').close();
  if (level.id === levels.length - 1) openMap();
  else loadLevel(level.id + 1);
});

function openMap() {
  $('#level-list').innerHTML = levels
    .map(
      (entry) =>
        `<button data-level="${entry.id}" class="level-button ${entry.id === level.id ? 'current' : ''}" aria-label="第${entry.id + 1}关 ${entry.name}，${progress[entry.id] ?? 0}颗星"><strong>${String(entry.id + 1).padStart(2, '0')}</strong><span>${entry.emoji} ${entry.name}</span><em>${'★'.repeat(progress[entry.id] ?? 0)}${'☆'.repeat(3 - (progress[entry.id] ?? 0))}</em></button>`,
    )
    .join('');
  $('#map-dialog').showModal();
}

function soundButton() {
  $('#sound').textContent = audio.enabled ? '♫ 音效开' : '♫ 音效关';
  $('#sound').setAttribute('aria-pressed', String(audio.enabled));
  $('#sound').setAttribute('aria-label', audio.enabled ? '关闭音效' : '开启音效');
}

document.addEventListener('pointerdown', () => audio.unlock(), { capture: true });
document.addEventListener('keydown', () => audio.unlock(), { capture: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) audio.stop();
});
window.addEventListener('pagehide', () => audio.stop());

soundButton();
loadLevel(0);
