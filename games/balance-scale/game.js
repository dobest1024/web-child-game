import { levels, themes } from './levels.js';
import {
  emptyState,
  placeWeight,
  removeWeight,
  clearPans,
  usedWeights,
  isSolved,
  tiltOf,
  score,
  describeEquation,
  hiddenReveal,
  cleanProgress,
} from './engine.js';
import { drawScene, mascotSvg, weightSvg } from './art.js';
import { BalanceAudio } from './audio.js';

const $ = (selector) => document.querySelector(selector);
const audio = new BalanceAudio();
const STORAGE_KEY = 'balance-scale:progress';
const PAN_NAMES = { left: '左盘', right: '右盘' };
const GUIDE_TEXTS = [
  '把砝码放到右盘，让天平平平的！',
  '小动物的体重是秘密，用砝码把它问出来！',
  '读一读任务牌，先算一算，再配平！',
];
let progress = {};
try {
  progress = cleanProgress(JSON.parse(localStorage.getItem(STORAGE_KEY)));
} catch {
  /* Optional storage. */
}
let level = levels[0],
  state = emptyState(level.stock),
  selected = null,
  placedHistory = [],
  activePan = 'right',
  takeBacks = 0,
  focusIndex = 0,
  solved = false,
  finishTimer = null;

function say(message) {
  $('#status').textContent = message;
}
function itemLabel(item) {
  return item.count > 1
    ? `${item.count} 个${item.name}共 ${item.weight * item.count} 克`
    : `${item.name} ${item.hidden ? '?' : item.weight} 克`;
}
function panText(side) {
  const parts = level[side].map(itemLabel);
  if (state[side].length)
    parts.push(
      `砝码 ${state[side].reduce((sum, weight) => sum + weight.value, 0)} 克`,
    );
  return parts.join(' + ') || '空盘子';
}
function moodText(tilt) {
  if (tilt.side === 'left') return '⚖ 左边沉下去啦';
  if (tilt.side === 'right') return '⚖ 右边沉下去啦';
  return usedWeights(state) ? '⚖ 两边一样重，平啦！' : '⚖ 天平正等着呢';
}
function boxHtml() {
  const chips = state.box
    .map(
      (weight, i) =>
        `<button class="chip ${selected === weight.id ? 'selected' : ''}" data-id="${weight.id}" tabindex="${i === focusIndex ? 0 : -1}" aria-pressed="${selected === weight.id}" aria-label="${weight.value} 克砝码${selected === weight.id ? '，已选中' : ''}"${solved ? ' disabled' : ''}>${weightSvg(weight.value)}</button>`,
    )
    .join('');
  return `<span class="box-label">砝码盒</span>${chips || '<span class="box-empty">砝码都在天平上啦</span>'}`;
}
function updatePlaceButtons() {
  for (const side of ['left', 'right']) {
    const button = $(`#place-${side}`);
    button.disabled = solved;
    button.classList.toggle('primary', activePan === side);
    button.setAttribute('aria-pressed', String(activePan === side));
  }
}
function render() {
  const tilt = tiltOf(level, state);
  const boxHadFocus = $('#weight-box').contains(document.activeElement);
  focusIndex = Math.max(0, Math.min(focusIndex, state.box.length - 1));
  $('#scene').innerHTML = drawScene(level, state, tilt);
  $('#mood').textContent = moodText(tilt);
  $('#weight-box').innerHTML = boxHtml();
  if (boxHadFocus)
    $('#weight-box').querySelectorAll('.chip')[focusIndex]?.focus();
  $('#pan-left').setAttribute(
    'aria-label',
    `左盘：${panText('left')}，点击把选中的砝码放到左盘`,
  );
  $('#pan-right').setAttribute(
    'aria-label',
    `右盘：${panText('right')}，点击把选中的砝码放到右盘`,
  );
  $('#used').textContent = usedWeights(state);
  $('#backs').textContent = takeBacks;
  $('#progress').textContent = `${Object.keys(progress).length} / ${levels.length}`;
  $('#takeback').disabled = solved || usedWeights(state) === 0;
  $('#clear').disabled = solved || usedWeights(state) === 0;
  updatePlaceButtons();
}
function load(id) {
  clearTimeout(finishTimer);
  level = levels[id];
  state = emptyState(level.stock);
  selected = null;
  placedHistory = [];
  activePan = 'right';
  takeBacks = 0;
  focusIndex = 0;
  solved = false;
  const theme = themes[level.theme];
  $('#title').textContent = level.name;
  $('#story').textContent = theme.story;
  $('#chapter').textContent = `第 ${id + 1} 关 · ${theme.name}`;
  $('#stage-tag').textContent = `${theme.icon} ${theme.name}`;
  $('#sign-text').textContent = level.sign;
  $('#hint-text').textContent = level.hint;
  $('#guide-text').textContent = GUIDE_TEXTS[level.stage];
  $('#goals').innerHTML = `<span>⚖ 配平天平：1 星</span><span>🧠 砝码不超过 ${level.threeStar} 块：再得 1 星</span><span>✨ 不取回砝码：再得 1 星</span>`;
  render();
  say('从砝码盒选一块砝码，放到天平的盘子上吧！');
}
function select(id) {
  selected = selected === id ? null : id;
  const weight = state.box.find((item) => item.id === selected);
  audio.play('pick');
  render();
  say(
    weight
      ? `选中了 ${weight.value} 克砝码。点天平的盘子，或按 L / R 放上去。`
      : '取消选中啦，再点一次砝码试试。',
  );
}
function place(side, viaEnter = false) {
  if (solved) return;
  const weight = state.box.find((item) => item.id === selected);
  if (!weight) {
    say('先在下面的砝码盒里点一块砝码吧。');
    return;
  }
  const index = state.box.findIndex((item) => item.id === selected);
  state = placeWeight(state, side, selected);
  placedHistory.push({ id: weight.id, side });
  selected = null;
  focusIndex = Math.max(0, Math.min(index, state.box.length - 1));
  audio.play('place');
  if (viaEnter) activePan = side === 'left' ? 'right' : 'left';
  updatePlaceButtons();
  if (isSolved(level, state)) {
    finish();
    return;
  }
  render();
  const tilt = tiltOf(level, state);
  say(
    `${weight.value} 克放到${PAN_NAMES[side]}啦，现在${tilt.side === 'left' ? '左边' : '右边'}更低。` +
      (viaEnter ? `再按回车，会放到${PAN_NAMES[activePan]}。` : ''),
  );
}
function takeBack() {
  if (solved || usedWeights(state) === 0) return;
  while (
    placedHistory.length &&
    ![...state.left, ...state.right].some(
      (item) => item.id === placedHistory.at(-1).id,
    )
  ) {
    placedHistory.pop();
  }
  const last = placedHistory.pop();
  const id =
    last?.id ?? state.right.at(-1)?.id ?? state.left.at(-1)?.id;
  const weight = [...state.left, ...state.right].find(
    (item) => item.id === id,
  );
  state = removeWeight(state, id);
  takeBacks++;
  audio.play('back');
  render();
  say(`取回了 ${weight.value} 克砝码。想一想，再放一次。`);
}
function clearAll() {
  if (solved || usedWeights(state) === 0) return;
  state = clearPans(state);
  placedHistory = [];
  selected = null;
  takeBacks++;
  audio.play('back');
  render();
  say('砝码都回到盒子里啦，重新想一次。');
}
function finish() {
  solved = true;
  render();
  const stars = score(level, state, takeBacks);
  progress[level.id] = Math.max(progress[level.id] || 0, stars);
  let saved = true;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    saved = false;
  }
  const used = usedWeights(state);
  const reveal = hiddenReveal(level);
  $('#result-icon').innerHTML = mascotSvg(true);
  $('#stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  $('#stars').setAttribute('aria-label', `获得${stars}颗星`);
  $('#result-text').textContent =
    `${reveal.length ? `${reveal.join('，')}。` : ''}你用 ${used} 块砝码配平了天平！${saved ? '' : '浏览器暂时无法保存本次星星。'}`;
  $('#result-math').innerHTML = `${reveal.length ? '' : `<p class="task">${level.sign}</p>`}<p class="eq">${describeEquation(level, state)}</p>`;
  $('#badges').innerHTML =
    `<span>✓ 天平小当家</span><span>${used <= level.threeStar ? '✓' : '○'} 巧用砝码（≤ ${level.threeStar} 块）</span><span>${takeBacks === 0 ? '✓' : '○'} 一次配平</span>`;
  $('#next').textContent =
    level.id === levels.length - 1 ? '看看天平地图 ➜' : '下一关 ➜';
  audio.play('win');
  say('天平平啦！两边的重量一模一样。');
  finishTimer = setTimeout(() => $('#result-dialog').showModal(), 700);
}
function openMap() {
  $('#level-list').innerHTML = themes
    .map(
      (theme, i) =>
        `<div class="chapter-heading"><b>${theme.icon} ${theme.name}</b><small>${theme.story}</small></div><div class="level-grid">${levels
          .filter((item) => item.theme === i)
          .map(
            (item) =>
              `<button data-level="${item.id}" class="level-button ${item.id === level.id ? 'current' : ''}" aria-label="第${item.id + 1}关 ${item.name}，${progress[item.id] || 0}颗星"><strong>${String(item.id + 1).padStart(2, '0')}</strong><span>${item.name}</span><em>${'★'.repeat(progress[item.id] || 0)}${'☆'.repeat(3 - (progress[item.id] || 0))}</em></button>`,
          )
          .join('')}</div>`,
    )
    .join('');
  $('#map-dialog').showModal();
}
$('#weight-box').addEventListener('click', (event) => {
  const chip = event.target.closest('.chip');
  if (!chip || chip.disabled) return;
  focusIndex = [...$('#weight-box').querySelectorAll('.chip')].indexOf(chip);
  select(chip.dataset.id);
});
$('#weight-box').addEventListener('keydown', (event) => {
  const delta = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
  if (!delta) return;
  event.preventDefault();
  const chips = $('#weight-box').querySelectorAll('.chip');
  if (!chips.length) return;
  focusIndex = (focusIndex + delta + chips.length) % chips.length;
  chips.forEach((chip, i) => (chip.tabIndex = i === focusIndex ? 0 : -1));
  chips[focusIndex].focus();
});
$('#pan-left').addEventListener('click', () => place('left'));
$('#pan-right').addEventListener('click', () => place('right'));
$('#place-left').addEventListener('click', () => place('left'));
$('#place-right').addEventListener('click', () => place('right'));
$('#takeback').addEventListener('click', takeBack);
$('#clear').addEventListener('click', clearAll);
$('#hint').addEventListener('click', () => say(level.hint));
document.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
  if (document.querySelector('dialog[open]')) return;
  const onChip = event.target.closest?.('.chip');
  if (event.key === 'Enter') {
    if (onChip) {
      if (selected && onChip.dataset.id === selected) {
        event.preventDefault();
        place(activePan, true);
      }
      return;
    }
    if (event.target.closest?.('button, a')) return;
    if (selected) {
      event.preventDefault();
      place(activePan, true);
    }
    return;
  }
  const key = event.key.toLowerCase();
  if (key === 'l' || key === '1') {
    event.preventDefault();
    place('left');
  } else if (key === 'r' || key === '2') {
    event.preventDefault();
    place('right');
  } else if (key === 'x') {
    event.preventDefault();
    takeBack();
  }
});
$('#map').addEventListener('click', openMap);
$('#level-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-level]');
  if (button) {
    $('#map-dialog').close();
    load(Number(button.dataset.level));
  }
});
$('#help').addEventListener('click', () => $('#help-dialog').showModal());
document
  .querySelectorAll('[data-close]')
  .forEach((button) =>
    button.addEventListener('click', () => button.closest('dialog').close()),
  );
$('#retry').addEventListener('click', () => {
  $('#result-dialog').close();
  load(level.id);
});
$('#next').addEventListener('click', () => {
  $('#result-dialog').close();
  if (level.id === levels.length - 1) openMap();
  else load(level.id + 1);
});
function soundButton() {
  $('#sound').textContent = audio.enabled ? '♫ 音效开' : '♫ 音效关';
  $('#sound').setAttribute('aria-pressed', String(audio.enabled));
  $('#sound').setAttribute('aria-label', audio.enabled ? '关闭音效' : '开启音效');
}
$('#sound').addEventListener('click', () => {
  audio.toggle();
  soundButton();
  audio.play('pick');
});
document.addEventListener('pointerdown', () => audio.unlock(), {
  capture: true,
});
document.addEventListener('keydown', () => audio.unlock(), { capture: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) audio.stop();
});
window.addEventListener('pagehide', () => audio.stop());
$('#mascot').innerHTML = mascotSvg();
soundButton();
load(0);
