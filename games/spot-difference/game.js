import { scenes, viewBox, hintLimit } from './levels.js';
import {
  applyDiffs,
  cleanProgress,
  formatTime,
  hitTest,
  isComplete,
  score,
  shuffleDiffs,
  solvedCount,
} from './engine.js';
import { badgeSvg, drawScene, flagSvg, hintRing, mascotSvg } from './art.js';
import { DetectiveAudio } from './audio.js';

const $ = (selector) => document.querySelector(selector);
const audio = new DetectiveAudio();
const storageKey = 'spot-difference:progress';
let progress = {};
try {
  progress = cleanProgress(
    JSON.parse(localStorage.getItem(storageKey)),
    scenes.length,
  );
} catch {
  /* Optional storage. */
}
let scene = scenes[0],
  paramsB = scene.params,
  found = new Set(),
  activeHints = new Set(),
  hintsLeft = hintLimit,
  hintsUsed = 0,
  elapsed = 0,
  timer = null,
  phase = 'playing',
  order = [],
  missCount = 0;
const missLines = [
  '这里看起来一模一样哦，再找找别处！',
  '侦探要细心，换个角度看看吧！',
  '还不是不同之处，继续加油！',
];
const guideLines = [
  '嗨，小侦探！两幅花园图里有 6 处不一样，开始巡逻吧！',
  '玩具们说：房间照片被偷偷改过了，快找找哪里不对劲。',
  '戴上潜水镜！海底的鱼儿藏了 6 个小秘密。',
  '农场的动物们排好队啦，看看谁变得不一样。',
  '火箭准备发射！太空里的差异可不容易找哦。',
  '野餐开始啦！垫子上的好吃的有没有变化？',
  '厨房香喷喷的，锅碗瓢盆在玩找不同。',
  '雪花飘呀飘，雪地里的差异就藏在眼前。',
];
function say(message, error = false) {
  $('#status').textContent = message;
  $('#status').classList.toggle('error', error);
}
function stopClock() {
  clearInterval(timer);
  timer = null;
}
function startClock() {
  stopClock();
  timer = setInterval(() => {
    elapsed++;
    $('#clock').textContent = `⏱ ${formatTime(elapsed)}`;
    $('#time-side').textContent = formatTime(elapsed);
  }, 1000);
}
function buildZones() {
  const boards = [$('#zones-a'), $('#zones-b')];
  for (const board of boards) board.replaceChildren();
  boards.forEach((board, image) => {
    order.forEach((diffIndex, position) => {
      const zone = scene.diffs[diffIndex].zone;
      const button = document.createElement('button');
      button.className = 'zone';
      button.dataset.diff = diffIndex;
      button.tabIndex = -1;
      button.style.left = `${((zone.x - zone.r) / viewBox.width) * 100}%`;
      button.style.top = `${((zone.y - zone.r) / viewBox.height) * 100}%`;
      button.style.width = `${((zone.r * 2) / viewBox.width) * 100}%`;
      button.style.height = `${((zone.r * 2) / viewBox.height) * 100}%`;
      button.setAttribute(
        'aria-label',
        `${image ? '图二' : '图一'}第 ${position + 1} 个可疑位置，回车做记号`,
      );
      board.append(button);
    });
  });
}
function markers() {
  let svg = '';
  for (const index of found)
    svg += flagSvg(scene.diffs[index].zone.x, scene.diffs[index].zone.y);
  for (const index of activeHints) {
    const zone = scene.diffs[index].zone;
    svg += hintRing(zone.x, zone.y, zone.r);
  }
  return svg;
}
function render() {
  $('#scene-a').innerHTML = drawScene(scene.id, scene.params) + markers();
  $('#scene-b').innerHTML = drawScene(scene.id, paramsB) + markers();
  for (const button of document.querySelectorAll('.zone')) {
    const diffIndex = Number(button.dataset.diff);
    button.tabIndex = activeHints.has(diffIndex) ? 0 : -1;
  }
  $('#found').textContent = found.size;
  $('#found-side').textContent = found.size;
  $('#hints-left').textContent = hintsLeft;
  $('#hint').disabled = phase !== 'playing' || hintsLeft <= 0;
  $('#progress').textContent = `${solvedCount(progress)} / ${scenes.length}`;
}
function load(id) {
  scene = scenes[id];
  paramsB = applyDiffs(scene.params, scene.diffs);
  found = new Set();
  activeHints = new Set();
  hintsLeft = hintLimit;
  hintsUsed = 0;
  elapsed = 0;
  missCount = 0;
  phase = 'playing';
  order = shuffleDiffs(scene.diffs);
  $('#title').textContent = scene.name;
  $('#story').textContent = scene.story;
  $('#chapter').textContent = `第 ${id + 1} 案 · 共 ${scenes.length} 案`;
  $('#theme').textContent = `${scene.icon} ${scene.name}`;
  $('#guide-text').textContent = guideLines[id % guideLines.length];
  $('#clock').textContent = '⏱ 0:00';
  $('#time-side').textContent = '0:00';
  buildZones();
  render();
  startClock();
  say('对比两幅图，点一点不一样的地方。两张图里点哪一张都可以。');
}
function mark(index) {
  if (phase !== 'playing') return;
  if (found.has(index)) {
    say('这里已经插过小旗啦，再找找别处！');
    return;
  }
  found.add(index);
  activeHints.delete(index);
  audio.play('found');
  render();
  if (found.size === scene.diffs.length) {
    finish();
    return;
  }
  say(
    `找对啦！已经找到 ${found.size} / ${scene.diffs.length} 处，还差 ${scene.diffs.length - found.size} 处。`,
  );
}
function miss(frame) {
  if (phase !== 'playing') return;
  audio.play('miss');
  frame.classList.remove('miss');
  void frame.offsetWidth;
  frame.classList.add('miss');
  setTimeout(() => frame.classList.remove('miss'), 500);
  say(missLines[missCount++ % missLines.length], true);
}
function finish() {
  phase = 'finished';
  stopClock();
  render();
  const stars = score({ usedHints: hintsUsed, seconds: elapsed });
  progress[scene.id] = Math.max(progress[scene.id] || 0, stars);
  let saved = true;
  try {
    localStorage.setItem(storageKey, JSON.stringify(progress));
  } catch {
    saved = false;
  }
  $('#result-badge').innerHTML = badgeSvg();
  $('#stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  $('#stars').setAttribute('aria-label', `获得${stars}颗星`);
  $('#result-text').textContent =
    `找到全部 ${scene.diffs.length} 处不同！用时 ${formatTime(elapsed)}，用了 ${hintsUsed} 次提示。${saved ? '' : '浏览器暂时无法保存本次星星。'}`;
  $('#result-note').textContent = [
    '慢慢观察也能破案，再挑战一次更快找到吧！',
    '提示帮了忙也很棒！下次试试不用提示，冲击三颗星。',
    '没用提示还这么快，真是火眼金睛！',
  ][stars - 1];
  $('#next').textContent =
    scene.id === scenes.length - 1 && isComplete(progress, scenes.length)
      ? '查看侦探证书 ➜'
      : '下一案发现场 ➜';
  $('#result-dialog').showModal();
  audio.play('win');
  render();
}
function useHint() {
  if (phase !== 'playing') return;
  if (hintsLeft <= 0) {
    say('这一关的提示用完啦，相信你的火眼金睛！');
    return;
  }
  const candidates = scene.diffs
    .map((_, index) => index)
    .filter((index) => !found.has(index) && !activeHints.has(index));
  if (!candidates.length) {
    say(
      found.size === scene.diffs.length
        ? '全部都找到啦，太棒了！'
        : '放大镜正在标记中，先找找看！',
    );
    return;
  }
  hintsLeft--;
  hintsUsed++;
  activeHints.add(candidates[Math.floor(Math.random() * candidates.length)]);
  audio.play('hint');
  render();
  say('放大镜圈出了一处不同，两张图里都能找到它！');
}
function pauseForDialog() {
  if (phase === 'playing') {
    phase = 'paused';
    stopClock();
  }
}
function openDialog(dialog) {
  pauseForDialog();
  dialog.showModal();
}
for (const frame of [$('#frame-a'), $('#frame-b')])
  frame.addEventListener('click', (event) => {
    const zoneButton = event.target.closest('.zone');
    if (zoneButton) {
      mark(Number(zoneButton.dataset.diff));
      return;
    }
    if (phase !== 'playing') return;
    const rect = frame.querySelector('svg').getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * viewBox.width;
    const y = ((event.clientY - rect.top) / rect.height) * viewBox.height;
    const index = hitTest(scene.diffs, x, y);
    if (index >= 0) mark(index);
    else miss(frame);
  });
$('#hint').addEventListener('click', useHint);
$('#reset').addEventListener('click', () => {
  load(scene.id);
  say('现场恢复原样啦，换个思路再找一遍。');
});
function openMap() {
  $('#scene-list').innerHTML = scenes
    .map(
      (item) =>
        `<button data-scene="${item.id}" class="scene-button ${item.id === scene.id ? 'current' : ''}" aria-label="第${item.id + 1}案 ${item.name}，${progress[item.id] || 0}颗星"><strong>${String(item.id + 1).padStart(2, '0')}</strong><span>${item.icon} ${item.name}</span><em>${'★'.repeat(progress[item.id] || 0)}${'☆'.repeat(3 - (progress[item.id] || 0))}</em></button>`,
    )
    .join('');
  openDialog($('#map-dialog'));
}
$('#map').addEventListener('click', openMap);
$('#scene-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-scene]');
  if (button) {
    $('#map-dialog').close();
    load(Number(button.dataset.scene));
  }
});
$('#help').addEventListener('click', () => openDialog($('#help-dialog')));
document
  .querySelectorAll('[data-close]')
  .forEach((button) =>
    button.addEventListener('click', () => button.closest('dialog').close()),
  );
for (const dialog of document.querySelectorAll('dialog'))
  dialog.addEventListener('close', () => {
    if (phase === 'paused') {
      phase = 'playing';
      startClock();
    }
  });
$('#retry').addEventListener('click', () => {
  $('#result-dialog').close();
  load(scene.id);
});
$('#next').addEventListener('click', () => {
  $('#result-dialog').close();
  if (scene.id === scenes.length - 1 && isComplete(progress, scenes.length))
    openParty();
  else load((scene.id + 1) % scenes.length);
});
function openParty() {
  const total = Object.values(progress).reduce((sum, stars) => sum + stars, 0);
  $('#party-badge').innerHTML = badgeSvg();
  $('#party-text').textContent =
    `${scenes.length} 个案发现场全部侦破，一共获得 ${total} / ${scenes.length * 3} 颗星。荣誉小侦探就是你！`;
  $('#party-badges').innerHTML = scenes
    .map(
      (item) =>
        `<span>${item.icon} ${item.name} ${'★'.repeat(progress[item.id] || 0)}</span>`,
    )
    .join('');
  openDialog($('#party-dialog'));
  audio.play('win');
}
$('#party-again').addEventListener('click', () => {
  $('#party-dialog').close();
  load(0);
});
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
  audio.play('found');
});
document.addEventListener('pointerdown', () => audio.unlock(), {
  capture: true,
});
document.addEventListener('keydown', () => audio.unlock(), { capture: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pauseForDialog();
    audio.stop();
  } else if (phase === 'paused' && !document.querySelector('dialog[open]')) {
    phase = 'playing';
    startClock();
  }
});
window.addEventListener('pagehide', () => {
  stopClock();
  audio.stop();
});
$('#mascot').innerHTML = mascotSvg();
soundButton();
load(0);
