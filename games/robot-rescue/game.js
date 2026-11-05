import { levels, themes, commands, cols, rows, key, same } from './levels.js';
import { compile, initialState, step, result, programSize } from './engine.js';
import { scene, robotSvg, animalSvg } from './art.js';
import { RobotAudio } from './audio.js';
const $ = (selector) => document.querySelector(selector);
const audio = new RobotAudio();
const progressKey = 'robot-rescue:progress:v1';
let progress = {};
try {
  const saved = JSON.parse(localStorage.getItem(progressKey));
  for (const level of levels)
    if ([1, 2, 3].includes(saved?.[level.id]))
      progress[level.id] = saved[level.id];
} catch {
  /* Play without persistence if storage is unavailable. */
}
let level = levels[0];
let state = initialState(level);
let program = [];
let steps = [];
let cursor = 0;
let phase = 'editing';
let timer = null;
let selected = null;
let target = null;
let activeSource = null;
let speed = 1;
let focusCell = 0;
const drafts = new Map();
const isExecuting = () => phase === 'running' || phase === 'paused';
function say(message, error = false) {
  $('#status').textContent = message;
  $('.radio').classList.toggle('error', error);
}
function pause() {
  clearTimeout(timer);
  timer = null;
  if (phase === 'running') phase = 'paused';
  audio.stop();
  updateControls();
}
function reset(message = true) {
  clearTimeout(timer);
  timer = null;
  audio.stop();
  state = initialState(level);
  steps = [];
  cursor = 0;
  activeSource = null;
  phase = 'editing';
  $('#robot').classList.add('resetting');
  renderWorld();
  renderProgram();
  requestAnimationFrame(() =>
    requestAnimationFrame(() => $('#robot').classList.remove('resetting')),
  );
  if (message) say('豆豆回到起点了，指令都还在。修改后再试一次吧！');
}
function loadLevel(id) {
  drafts.set(level.id, structuredClone(program));
  pause();
  level = levels[id];
  program = structuredClone(drafts.get(id) || []);
  selected = null;
  target = null;
  $('#title').textContent = level.name;
  $('#story').textContent = level.story;
  $('#chapter').textContent =
    `${String(level.id + 1).padStart(2, '0')} / ${themes[level.theme].name}`;
  $('#theme-name').textContent =
    `${themes[level.theme].icon} ${themes[level.theme].name}`;
  $('#budget').textContent = `巧手目标：不超过 ${level.budget} 张`;
  const lessons = [
    [
      '先后顺序很重要',
      '到动物身边，再抱起它。每张指令都按从上到下的顺序执行。',
    ],
    [
      '重复，让长路变短',
      '重复口袋本身算一张，里面每个动作也算一张。执行多次，不会增加指令张数。',
    ],
    [
      '先观察，再行动',
      '探路：前方有障碍就原地右转，否则向前走一格。它不会自动寻找动物哦。',
    ],
  ];
  $('#lesson-title').textContent = lessons[level.theme][0];
  $('#lesson-text').textContent = lessons[level.theme][1];
  $('#add-repeat').hidden = !level.repeat;
  $('#main-target').hidden = !level.repeat;
  $('#commands').innerHTML = Object.entries(commands)
    .filter(([name]) => name !== 'switch' || level.switchAt)
    .filter(([name]) => name !== 'probe' || level.probe)
    .map(
      ([name, item]) =>
        `<button class="command-button ${item.color}" data-command="${name}" aria-label="添加${item.name}指令" title="${item.detail}"><span aria-hidden="true">${item.icon}</span>${item.name}</button>`,
    )
    .join('');
  focusCell = level.start[1] * cols + level.start[0];
  $('#map-cells').replaceChildren();
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const button = document.createElement('button');
      button.className = 'map-cell';
      button.dataset.x = x;
      button.dataset.y = y;
      $('#map-cells').append(button);
    }
  reset(false);
  say(
    level.id === 0
      ? '队长，先加 2 张前进，再加救援，最后 2 张前进。点「开始救援」试试！'
      : level.hint,
  );
}
function cellDescription(p) {
  const id = key(p);
  if (same(p, state.position)) return '豆豆在这里';
  if (same(p, level.goal)) return '救援站';
  const animal = level.animals.find(
    (a) => same(a.at, p) && !state.rescued.includes(key(a.at)),
  );
  if (animal) return `${animal.name}在等救援`;
  if (level.switchAt && same(p, level.switchAt))
    return state.bridgeOpen ? '已经开启的机关' : '黄色开关';
  if (level.gates.includes(id))
    return state.bridgeOpen ? '已升起的桥' : '未升起的桥';
  if (level.water.includes(id)) return '河水，不能通行';
  if (level.rocks.includes(id)) return '障碍，不能通行';
  if (
    level.crystals.some((point) => same(point, p)) &&
    !state.collected.includes(id)
  )
    return '能量星星';
  return '可以通行的草地';
}
function renderWorld() {
  $('#scene').innerHTML = scene(level, state);
  $('#robot').innerHTML = robotSvg(state.direction, state.event === 'rescue');
  $('#robot').style.left = `${(state.position[0] / cols) * 100}%`;
  $('#robot').style.top = `${(state.position[1] / rows) * 100}%`;
  $('#position').textContent =
    `豆豆朝${['右 →', '下 ↓', '左 ←', '上 ↑'][state.direction]}`;
  $('#friends').innerHTML = level.animals
    .map(
      (a) =>
        `<span class="friend ${state.rescued.includes(key(a.at)) ? 'saved' : ''}">${animalSvg(a.kind, state.rescued.includes(key(a.at)))}${state.rescued.includes(key(a.at)) ? '✓' : '○'} ${a.name}</span>`,
    )
    .join('');
  $('#crystals').textContent =
    `✦ 能量星 ${state.collected.length} / ${level.crystals.length}`;
  $('#home-status').textContent =
    `${same(state.position, level.goal) ? '✓' : '⌂'} 抵达救援站`;
  $('#map-cells')
    .querySelectorAll('button')
    .forEach((button, i) => {
      const p = [Number(button.dataset.x), Number(button.dataset.y)];
      button.setAttribute(
        'aria-label',
        `第${p[1] + 1}行第${p[0] + 1}列，${cellDescription(p)}`,
      );
      button.tabIndex = i === focusCell ? 0 : -1;
    });
  $('#step-count').textContent =
    `已执行 ${state.moves} 步${steps.length ? ` / ${steps.length}` : ''}`;
  $('#world-note').textContent =
    phase === 'running'
      ? '正在执行你的计划'
      : phase === 'paused'
        ? '已暂停，可以走一步检查'
        : '观察地图，再安排动作';
}
function chip(command, address, index) {
  const item = commands[command.type];
  return `<div class="program-item ${selected === address ? 'selected' : ''} ${activeSource === address ? 'active' : ''}" data-source="${address}"><span class="index">${index + 1}</span><button class="command-chip ${item.color}" data-select="${address}" aria-label="选择第${index + 1}张${item.name}指令">${item.icon} ${item.name}</button><button class="remove" data-remove="${address}" aria-label="删除第${index + 1}张${item.name}指令">×</button></div>`;
}
function renderProgram() {
  $('#program').innerHTML = program.length
    ? program
        .map((command, i) => {
          if (command.type !== 'repeat') return chip(command, String(i), i);
          return `<div class="program-item repeat-block ${selected === String(i) ? 'selected' : ''}" data-source="${i}"><div class="repeat-head"><span class="index">${i + 1}</span><button class="command-chip" data-select="${i}" aria-label="选择第${i + 1}个重复口袋">⟳ 重复口袋</button><select data-times="${i}" aria-label="第${i + 1}个口袋重复次数">${[2, 3, 4].map((n) => `<option value="${n}" ${n === command.times ? 'selected' : ''}>${n} 次</option>`).join('')}</select><button class="remove" data-remove="${i}" aria-label="删除第${i + 1}个重复口袋">×</button></div><div class="repeat-body">${command.body.length ? command.body.map((child, j) => chip(child, `${i}:${j}`, j)).join('') : '<div class="repeat-empty">↑ 点上方动作，装进这个口袋</div>'}</div></div>`;
        })
        .join('')
    : '<div class="empty-program"><span class="empty-icon">▤</span>这里等着你的第一个计划<br>点上方动作卡，豆豆会按顺序执行<br><small>先接近朋友，再执行救援 ♡</small></div>';
  $('#size').textContent = programSize(program);
  $('#target-note').textContent =
    target === null
      ? '↓ 新动作放在主程序末尾。点指令可选择、删除或移动。'
      : `⟳ 新动作会装进第 ${target + 1} 个重复口袋。放好后点「放到主程序」。`;
  updateControls();
  const active = $('#program').querySelector('.active');
  if (active) {
    const scroller = $('.program-scroll');
    const relativeTop =
      active.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    if (
      relativeTop < 0 ||
      relativeTop + active.offsetHeight > scroller.clientHeight
    )
      scroller.scrollTop += relativeTop - 50;
  }
}
function updateControls() {
  const locked = isExecuting();
  document.body.classList.toggle('executing', locked);
  $('#commands')
    .querySelectorAll('button')
    .forEach((button) => {
      button.disabled = locked;
    });
  $('#program')
    .querySelectorAll('button,select')
    .forEach((control) => {
      control.disabled = locked;
    });
  for (const id of [
    'add-repeat',
    'main-target',
    'clear',
    'move-up',
    'move-down',
  ])
    $(`#${id}`).disabled = locked;
  const [parentIndex, childIndex] =
    selected === null ? [-1] : selected.split(':').map(Number);
  const selectedIndex = childIndex ?? parentIndex;
  const selectedList =
    childIndex === undefined ? program : program[parentIndex].body;
  $('#move-up').disabled = locked || selectedIndex <= 0;
  $('#move-down').disabled =
    locked || selectedIndex < 0 || selectedIndex >= selectedList.length - 1;
  $('#clear').disabled = locked || !program.length;
  $('#step').disabled = phase === 'running';
  $('#run').textContent =
    phase === 'running'
      ? '暂停一下 Ⅱ'
      : phase === 'paused'
        ? '继续救援 ▶'
        : '开始救援 ▶';
  $('#progress').textContent = `${Object.keys(progress).length} / 18`;
}
function edit() {
  if (isExecuting()) return false;
  if (phase === 'finished' || state.moves) reset(false);
  return true;
}
function add(type) {
  if (!edit()) return;
  if (
    (type === 'switch' && !level.switchAt) ||
    (type === 'probe' && !level.probe)
  )
    return;
  const list = target === null ? program : program[target]?.body;
  if (!list) return;
  if (list.length >= (target === null ? 40 : 12))
    return say('这个口袋装满了，先整理一下指令吧。', true);
  list.push({ type });
  selected =
    target === null
      ? String(program.length - 1)
      : `${target}:${list.length - 1}`;
  audio.play('add');
  renderProgram();
}
$('#commands').addEventListener('click', (event) => {
  const button = event.target.closest('[data-command]');
  if (button) add(button.dataset.command);
});
$('#add-repeat').addEventListener('click', () => {
  if (!edit() || program.length >= 40) return;
  program.push({ type: 'repeat', times: 3, body: [] });
  target = program.length - 1;
  selected = String(target);
  audio.play('add');
  renderProgram();
});
$('#main-target').addEventListener('click', () => {
  target = null;
  selected = null;
  renderProgram();
});
$('#program').addEventListener('click', (event) => {
  if (isExecuting()) return;
  const remove = event.target.closest('[data-remove]');
  const select = event.target.closest('[data-select]');
  if (remove) {
    if (!edit()) return;
    const [i, j] = remove.dataset.remove.split(':').map(Number);
    if (j === undefined) {
      program.splice(i, 1);
      if (target === i) target = null;
      else if (target > i) target--;
    } else program[i].body.splice(j, 1);
    selected = null;
    audio.play('left');
    renderProgram();
  } else if (select) {
    selected = select.dataset.select;
    const [i, j] = selected.split(':').map(Number);
    target = program[i].type === 'repeat' ? i : null;
    renderProgram();
  }
});
$('#program').addEventListener('change', (event) => {
  if (!event.target.matches('[data-times]') || !edit()) return;
  program[Number(event.target.dataset.times)].times = Number(
    event.target.value,
  );
  renderProgram();
});
function reorder(delta) {
  if (!edit() || selected === null) return;
  const [i, j] = selected.split(':').map(Number);
  const list = j === undefined ? program : program[i].body;
  const from = j ?? i;
  const to = from + delta;
  if (to < 0 || to >= list.length) return;
  [list[from], list[to]] = [list[to], list[from]];
  if (j === undefined) {
    if (target === i) target = to;
    else if (target === to) target = i;
    selected = String(to);
  } else selected = `${i}:${to}`;
  renderProgram();
  audio.play('add');
}
$('#move-up').addEventListener('click', () => reorder(-1));
$('#move-down').addEventListener('click', () => reorder(1));
$('#clear').addEventListener('click', () => {
  if (!edit()) return;
  program = [];
  target = null;
  selected = null;
  renderProgram();
  say('行动口袋清空了，来试试新的计划吧。');
});
function prepare() {
  if (phase === 'paused') return true;
  const compiled = compile(program);
  if (compiled.error) {
    say(compiled.error, true);
    audio.play('error');
    return false;
  }
  reset(false);
  steps = compiled.steps;
  phase = 'paused';
  return true;
}
function advance() {
  if (cursor >= steps.length) return finishExecution();
  const command = steps[cursor];
  activeSource = command.source;
  state = step(level, state, command.type);
  cursor++;
  audio.play(state.failure ? 'error' : state.event);
  const outcome = result(level, state, program);
  const description =
    state.event === 'turn-probe'
      ? '探路灯发现前方有障碍，豆豆原地右转。'
      : state.event === 'rescue'
        ? '朋友抱上来啦！继续去救援站。'
        : state.event === 'bridge'
          ? '机关启动，桥升起来啦！'
          : state.event === 'crystal'
            ? '找到一颗能量星星！'
            : `执行${commands[command.type].name}：豆豆在第 ${state.position[1] + 1} 行、第 ${state.position[0] + 1} 列。`;
  say(
    state.failure ||
      `${command.iteration ? `重复口袋第 ${command.iteration} 次：` : ''}${description}`,
    Boolean(state.failure),
  );
  renderWorld();
  renderProgram();
  if (state.failure || outcome.success || cursor >= steps.length) {
    finishExecution();
    return;
  }
  if (phase === 'running') timer = setTimeout(advance, 650 / speed);
}
function finishExecution() {
  clearTimeout(timer);
  timer = null;
  phase = 'finished';
  const outcome = result(level, state, program);
  renderWorld();
  updateControls();
  if (!outcome.success) {
    say(`${outcome.message} 点「回起点」修改计划，或直接修改指令。`, true);
    if (!state.failure) audio.play('error');
    return;
  }
  progress[level.id] = Math.max(progress[level.id] || 0, outcome.stars);
  let saved = true;
  try {
    localStorage.setItem(progressKey, JSON.stringify(progress));
  } catch {
    saved = false;
  }
  $('#result-art').innerHTML = robotSvg(0, true);
  $('#stars').textContent =
    '★'.repeat(outcome.stars) + '☆'.repeat(3 - outcome.stars);
  $('#stars').setAttribute('aria-label', `获得${outcome.stars}颗星`);
  $('#result-text').textContent =
    `救回 ${state.rescued.length} 位朋友，用了 ${programSize(program)} 张指令，执行 ${state.moves} 步。${saved ? '' : '浏览器暂时无法保存本次星星。'}`;
  $('#badges').innerHTML =
    `<span>✓ 救援小英雄</span><span>${outcome.collector ? '✓' : '○'} 星星收集家</span><span>${outcome.efficient ? '✓' : '○'} 巧手小队长</span>`;
  $('#next').textContent = level.id === 17 ? '查看救援手册 ➜' : '下一次救援 ➜';
  $('#result-dialog').showModal();
  audio.stop();
  audio.play('win');
  updateControls();
  say('任务完成！大家都平安回家啦。');
}
function showRobotOnPhone() {
  if (matchMedia('(max-width: 700px)').matches) {
    $('#board').scrollIntoView({
      block: 'start',
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  }
}
$('#run').addEventListener('click', () => {
  if (phase === 'running') {
    pause();
    renderWorld();
    say('暂停啦。可以走一步检查，也可以继续执行。');
    return;
  }
  if (!prepare()) return;
  phase = 'running';
  updateControls();
  showRobotOnPhone();
  advance();
});
$('#step').addEventListener('click', () => {
  if (phase === 'running' || !prepare()) return;
  phase = 'paused';
  showRobotOnPhone();
  advance();
});
$('#reset').addEventListener('click', () => reset());
$('#speed').addEventListener('click', () => {
  speed = speed === 1 ? 2 : 1;
  $('#speed').textContent = `速度 ${speed}×`;
});
$('#hint').addEventListener('click', () => say(level.hint));
$('#map-cells').addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const p = [Number(button.dataset.x), Number(button.dataset.y)];
  focusCell = p[1] * cols + p[0];
  $('#map-cells')
    .querySelectorAll('button')
    .forEach((cell, i) => {
      cell.tabIndex = i === focusCell ? 0 : -1;
    });
  say(`第 ${p[1] + 1} 行、第 ${p[0] + 1} 列：${cellDescription(p)}。`);
});
$('#map-cells').addEventListener('keydown', (event) => {
  const delta = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  }[event.key];
  if (!delta) return;
  event.preventDefault();
  const x = Math.max(0, Math.min(cols - 1, (focusCell % cols) + delta[0]));
  const y = Math.max(
    0,
    Math.min(rows - 1, Math.floor(focusCell / cols) + delta[1]),
  );
  focusCell = y * cols + x;
  $('#map-cells')
    .querySelectorAll('button')
    .forEach((button, i) => {
      button.tabIndex = i === focusCell ? 0 : -1;
    });
  $('#map-cells').children[focusCell].focus();
});
function showMap() {
  pause();
  $('#levels').innerHTML = themes
    .map(
      (theme, i) =>
        `<div class="chapter-heading"><b>${theme.icon} ${theme.name}</b><small>${theme.label}</small></div><div class="level-grid">${levels
          .slice(i * 6, i * 6 + 6)
          .map(
            (item) =>
              `<button class="level-button ${item.id === level.id ? 'current' : ''}" data-level="${item.id}" aria-label="第${item.id + 1}关 ${item.name}，${progress[item.id] || 0}颗星"><strong>${String(item.id + 1).padStart(2, '0')}</strong><span>${item.name}</span><em>${'★'.repeat(progress[item.id] || 0)}${'☆'.repeat(3 - (progress[item.id] || 0))}</em></button>`,
          )
          .join('')}</div>`,
    )
    .join('');
  $('#map-dialog').showModal();
}
$('#map').addEventListener('click', showMap);
$('#levels').addEventListener('click', (event) => {
  const button = event.target.closest('[data-level]');
  if (!button) return;
  $('#map-dialog').close();
  loadLevel(Number(button.dataset.level));
});
function help() {
  pause();
  $('#help-dialog').showModal();
}
$('#help').addEventListener('click', help);
$('#help-footer').addEventListener('click', help);
document
  .querySelectorAll('[data-close]')
  .forEach((button) =>
    button.addEventListener('click', () => button.closest('dialog').close()),
  );
$('#retry').addEventListener('click', () => {
  $('#result-dialog').close();
  reset();
});
$('#next').addEventListener('click', () => {
  $('#result-dialog').close();
  if (level.id === 17) showMap();
  else loadLevel(level.id + 1);
});
document.addEventListener('pointerdown', () => audio.unlock(), {
  capture: true,
});
document.addEventListener('keydown', (event) => {
  audio.unlock();
  if (
    event.repeat ||
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    document.querySelector('dialog[open]') ||
    event.target.matches('input,select,textarea')
  )
    return;
  const action = { w: 'forward', a: 'left', d: 'right', r: 'rescue' }[
    event.key.toLowerCase()
  ];
  if (action) {
    event.preventDefault();
    add(action);
  }
  if (event.code === 'Space' && !event.target.closest('button,a')) {
    event.preventDefault();
    $('#run').click();
  }
});
function updateSound() {
  $('#sound').textContent = audio.enabled ? '♫ 音效开' : '♫ 音效关';
  $('#sound').setAttribute('aria-pressed', String(audio.enabled));
  $('#sound').setAttribute(
    'aria-label',
    audio.enabled ? '关闭音效' : '开启音效',
  );
}
$('#sound').addEventListener('click', () => {
  audio.toggle();
  updateSound();
  audio.play('rescue');
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pause();
    renderWorld();
  }
});
window.addEventListener('pagehide', () => {
  clearTimeout(timer);
  audio.stop();
});
$('#radio-face').innerHTML = robotSvg();
updateSound();
loadLevel(0);
