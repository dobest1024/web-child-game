import { levels, themes, cols, rows, key, same } from './levels.js';
import { initialState, move, gateOpen, complete, score } from './engine.js';
import { character, scene } from './art.js';
import { DeliveryAudio } from './audio.js';
const $ = (selector) => document.querySelector(selector);
const audio = new DeliveryAudio();
const progressKey = 'icefire-delivery:progress:v1';
let progress = {};
try { const saved = JSON.parse(localStorage.getItem(progressKey)); for (const level of levels) if ([1, 2, 3].includes(saved?.[level.id])) progress[level.id] = saved[level.id]; } catch { /* Storage is optional. */ }
let level = levels[0];
let state = initialState(level);
let history = [];
let focusCell = 0;
const holds = new Map();
const bindings = { w: [0, 'up'], a: [0, 'left'], s: [0, 'down'], d: [0, 'right'], ArrowUp: [1, 'up'], ArrowLeft: [1, 'left'], ArrowDown: [1, 'down'], ArrowRight: [1, 'right'] };
function say(text, error = false) { $('#status').textContent = text; $('#status').classList.toggle('error', error); }
function stopHolds() { for (const interval of holds.values()) clearInterval(interval); holds.clear(); }
function act(player, direction) {
  if (document.hidden || document.querySelector('dialog[open]') || complete(level, state)) return;
  const previous = state;
  const next = move(level, state, player, direction);
  history.push(previous);
  if (history.length > 300) history.shift();
  state = next;
  audio.play(state.event, player);
  say(state.message, state.event === 'blocked');
  render();
  if (complete(level, state)) finish();
}
function beginHold(id, player, direction) {
  if (holds.has(id) || document.querySelector('dialog[open]')) return;
  act(player, direction);
  if (!complete(level, state)) holds.set(id, setInterval(() => act(player, direction), 210));
}
function endHold(id) { clearInterval(holds.get(id)); holds.delete(id); }
function description(point) {
  const id = key(point);
  const actor = state.players.findIndex((p) => same(p, point));
  if (actor !== -1) return `${actor === 0 ? '冰冰' : '暖暖'}在这里`;
  const parcel = level.packages.find((p) => same(p.at, point) && !state.picked.includes(p.id));
  if (parcel) return parcel.player === 0 ? '蓝色包裹' : '橙色包裹';
  const goal = level.goals.findIndex((p) => same(p, point));
  if (goal !== -1) return goal === 0 ? '冰冰的蓝色邮筒' : '暖暖的橙色邮筒';
  if (level.plates.some((p) => same(p, point))) return '金色开门踏板';
  if (level.gates.includes(id)) return gateOpen(level, state) ? '打开的门' : '关闭的门';
  if (level.walls.includes(id)) return '树木或石头，不能通行';
  const terrain = level.terrain.find((tile) => same(tile.at, point));
  return terrain ? terrain.player === 0 ? '蓝色水洼，冰冰专用' : '橙色暖石，暖暖专用' : '可以通行的草地';
}
function render(rebuild = false) {
  $('#scene').innerHTML = scene(level, state);
  for (const player of [0, 1]) {
    const actor = $(`#actor-${player}`);
    actor.innerHTML = character(player, state.carried[player].length, complete(level, state));
    actor.style.left = `${state.players[player][0] / cols * 100}%`;
    actor.style.top = `${state.players[player][1] / rows * 100}%`;
  }
  if (rebuild) {
    $('#cells').replaceChildren();
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const button = document.createElement('button'); button.className = 'cell'; button.dataset.x = x; button.dataset.y = y; $('#cells').append(button);
    }
  }
  $('#cells').querySelectorAll('button').forEach((button, i) => { const point = [Number(button.dataset.x), Number(button.dataset.y)]; button.setAttribute('aria-label', `第${point[1] + 1}行第${point[0] + 1}列，${description(point)}`); button.tabIndex = i === focusCell ? 0 : -1; });
  $('#delivery-list').innerHTML = [0, 1].map((player) => {
    const total = level.packages.filter((p) => p.player === player);
    const delivered = total.filter((p) => state.delivered.includes(p.id)).length;
    $(`#${player === 0 ? 'blue' : 'orange'}-count`).textContent = `${delivered} / ${total.length}`;
    return `<div class="delivery-row">${character(player)}<span>${player === 0 ? '冰冰' : '暖暖'}的快递</span><b>${delivered} / ${total.length}</b></div>`;
  }).join('');
  $('#moves').textContent = state.moves;
  $('#undo').disabled = history.length === 0;
  $('#gate-state').textContent = !level.gates.length ? '合作邮路 · 准备出发' : gateOpen(level, state) ? '◎ 踏板踩住 · 门已打开' : '◎ 踏板松开 · 门已关闭';
  $('#progress').textContent = `${Object.keys(progress).length} / 12`;
}
function loadLevel(index) {
  stopHolds(); audio.stop();
  level = levels[index]; state = initialState(level); history = []; focusCell = 0;
  $('#chapter').textContent = `${String(index + 1).padStart(2, '0')} / ${themes[level.theme].name}`;
  $('#title').textContent = level.name; $('#story').textContent = level.story;
  $('#theme-name').textContent = `${themes[level.theme].icon} ${themes[level.theme].name}`;
  $('#tip').textContent = level.hint; $('#budget').textContent = `≤ ${level.budget} 步`;
  document.querySelectorAll('.actor').forEach((actor) => actor.classList.add('resetting'));
  render(true);
  requestAnimationFrame(() => requestAnimationFrame(() => document.querySelectorAll('.actor').forEach((actor) => actor.classList.remove('resetting'))));
  say(index < 2 ? '拿同色包裹，送到同色邮筒。两个人一起玩，也可以一个人轮流操作。' : '先让冰冰踩住左边踏板，再让暖暖带包裹过门。');
}
function finish() {
  stopHolds();
  const stars = score(level, state);
  progress[level.id] = Math.max(progress[level.id] || 0, stars);
  let saved = true;
  try { localStorage.setItem(progressKey, JSON.stringify(progress)); } catch { saved = false; }
  $('#result-art').innerHTML = character(0, 0, true) + character(1, 0, true);
  $('#stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  $('#stars').setAttribute('aria-label', `获得${stars}颗星`);
  $('#result-text').textContent = `合力送达 ${state.delivered.length} 件快递，用了 ${state.moves} 步。${state.bumps === 0 ? '一路都很顺利！' : '再试试少碰壁的路线吧。'}${saved ? '' : '当前浏览器暂时无法保存星星。'}`;
  $('#next').textContent = level.id === 11 ? '看看旅行册 ➜' : '下一站 ➜';
  $('#result-dialog').showModal(); render();
}
$('#undo').addEventListener('click', () => {
  stopHolds();
  if (!history.length) return;
  state = history.pop(); audio.stop(); audio.play('undo'); render(); say('退回刚才的一步了，再商量一下怎么走吧。');
});
$('#reset').addEventListener('click', () => loadLevel(level.id));
$('#hint').addEventListener('click', () => say(level.hint));
$('#cells').addEventListener('click', (event) => {
  const cell = event.target.closest('button'); if (!cell) return;
  const p = [Number(cell.dataset.x), Number(cell.dataset.y)]; focusCell = p[1] * cols + p[0];
  $('#cells').querySelectorAll('button').forEach((button, i) => { button.tabIndex = i === focusCell ? 0 : -1; });
  say(`第 ${p[1] + 1} 行、第 ${p[0] + 1} 列：${description(p)}。`);
});
// Each pointer has its own hold timer, so two touch pads work simultaneously.
document.querySelectorAll('.pad button').forEach((button) => {
  button.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault(); button.setPointerCapture(event.pointerId);
    audio.unlock(); beginHold(`pointer:${event.pointerId}`, Number(button.closest('.pad').dataset.player), button.dataset.dir);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, (event) => endHold(`pointer:${event.pointerId}`));
  button.addEventListener('click', (event) => { if (event.detail === 0) act(Number(button.closest('.pad').dataset.player), button.dataset.dir); });
});
document.addEventListener('keydown', (event) => {
  audio.unlock();
  if (event.ctrlKey || event.metaKey || event.altKey || document.querySelector('dialog[open]') || event.target.matches('input,select,textarea')) return;
  const name = event.key.startsWith('Arrow') ? event.key : event.key.toLowerCase();
  const command = bindings[name];
  if (!command) return;
  event.preventDefault();
  beginHold(`key:${name}`, ...command);
});
document.addEventListener('keyup', (event) => endHold(`key:${event.key.startsWith('Arrow') ? event.key : event.key.toLowerCase()}`));
window.addEventListener('blur', () => { stopHolds(); audio.stop(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { stopHolds(); audio.stop(); } });
window.addEventListener('pagehide', () => { stopHolds(); audio.stop(); });
document.addEventListener('pointerdown', () => audio.unlock(), { capture: true });
function updateSound() { $('#sound').textContent = audio.enabled ? '♫ 音效开' : '♫ 音效关'; $('#sound').setAttribute('aria-pressed', String(audio.enabled)); $('#sound').setAttribute('aria-label', audio.enabled ? '关闭音效' : '开启音效'); }
$('#sound').addEventListener('click', () => { audio.toggle(); updateSound(); audio.play('pickup'); });
function showMap() {
  stopHolds(); audio.stop();
  $('#level-list').innerHTML = themes.map((theme, index) => `<div class="chapter-heading"><b>${theme.icon} ${theme.name}</b><small>${theme.subtitle}</small></div><div class="level-grid">${levels.slice(index * 4, index * 4 + 4).map((item) => `<button class="level-button ${item.id === level.id ? 'current' : ''}" data-level="${item.id}" aria-label="第${item.id + 1}关 ${item.name}，${progress[item.id] || 0}颗星"><strong>${String(item.id + 1).padStart(2, '0')}</strong><span>${item.name}</span><em>${'★'.repeat(progress[item.id] || 0)}${'☆'.repeat(3 - (progress[item.id] || 0))}</em></button>`).join('')}</div>`).join('');
  $('#map-dialog').showModal();
}
$('#map').addEventListener('click', showMap);
$('#level-list').addEventListener('click', (event) => { const button = event.target.closest('[data-level]'); if (!button) return; $('#map-dialog').close(); loadLevel(Number(button.dataset.level)); });
$('#help').addEventListener('click', () => { stopHolds(); audio.stop(); $('#help-dialog').showModal(); });
document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));
$('#replay').addEventListener('click', () => { $('#result-dialog').close(); loadLevel(level.id); });
$('#next').addEventListener('click', () => { $('#result-dialog').close(); if (level.id === 11) showMap(); else loadLevel(level.id + 1); });
$('#blue-avatar').innerHTML = character(0); $('#orange-avatar').innerHTML = character(1);
updateSound(); loadLevel(0);
