import { levels, themes, tools } from './levels.js';
import { simulate, trajectory } from './engine.js';
import { squirrel, marble, scene, bellArt } from './art.js';
import { WorkshopAudio } from './audio.js';
const $ = (selector) => document.querySelector(selector);
const audio = new WorkshopAudio();
const storageKey = 'contraption-house:stars:v1';
let progress = {};
try {
  const data = JSON.parse(localStorage.getItem(storageKey));
  for (const level of levels)
    if ([1, 2, 3].includes(data?.[level.id]))
      progress[level.id] = data[level.id];
} catch {}
let level = levels[0],
  arrangement = {},
  selected = 0,
  type = 'ramp',
  direction = 1,
  armed = true;
let outcome = null,
  segmentIndex = 0,
  frame = null,
  running = false,
  playingSegment = false,
  celebrating = false,
  speed = 1,
  collected = [],
  ball = { x: 70, y: 110 },
  activeSlot = -1;
const drafts = new Map();
function say(message, error = false) {
  $('#status').textContent = message;
  $('.radio').classList.toggle('error', error);
}
function loadLevel(id) {
  drafts.set(level.id, structuredClone(arrangement));
  cancel();
  level = levels[id];
  arrangement = structuredClone(drafts.get(id) || {});
  selected = level.start;
  type = level.available[0];
  direction = 1;
  armed = true;
  $('#chapter').textContent =
    `${String(id + 1).padStart(2, '0')} / ${themes[level.theme].name}`;
  $('#title').textContent = level.name;
  $('#story').textContent = level.story;
  $('#theme-name').textContent =
    `${themes[level.theme].icon} ${themes[level.theme].name}`;
  $('#sockets').innerHTML = level.slots
    .map(
      (slot, i) =>
        `<button class="socket" data-slot="${i}" style="left:${(slot.x / 840) * 100}%;top:${(slot.y / 520) * 100}%" aria-label="插槽 ${String.fromCharCode(65 + i)}，${i === level.start ? '小球起点' : '点击放置机关'}">${String.fromCharCode(65 + i)}</button>`,
    )
    .join('');
  reset(false);
  renderTools();
  say(
    level.id === 0
      ? '选「斜坡」，放到 A 和 B 插槽，再点小球出发。虚线会告诉你预计落点！'
      : level.story,
  );
}
function cancel() {
  cancelAnimationFrame(frame);
  frame = null;
  running = false;
  playingSegment = false;
  celebrating = false;
  audio.stop();
}
function reset(message = true) {
  cancel();
  outcome = null;
  segmentIndex = 0;
  activeSlot = -1;
  collected = [];
  const start = level.slots[level.start];
  ball = { x: start.x, y: start.y };
  render();
  if (message) say('小球回到起点了，机关都还在，修改后再试试吧。');
}
function renderTools() {
  $('#tools').innerHTML = level.available
    .map(
      (id) =>
        `<button class="tool" data-tool="${id}" aria-pressed="${id === type}" aria-label="选择${tools[id].name}"><span>${tools[id].icon}</span>${tools[id].name}</button>`,
    )
    .join('');
  $('#direction').textContent = direction === 1 ? '向右 →' : '← 向左';
  $('#tool-description').textContent =
    `${tools[type].name}：${{ ramp: '向旁边滚下一层，横跨一个短间距。', spring: '向旁边跳上一层，横跨一个短间距。', fan: '平着吹到更远的插槽，距离比平桥长。', bridge: '平着滚到较近的插槽。' }[type]}虚线显示预计落点。`;
}
function render() {
  $('#scene').innerHTML = scene(
    level,
    arrangement,
    running || playingSegment ? null : selected,
    { type, direction },
    collected,
    activeSlot,
  );
  $('#animation').innerHTML = marble(ball.x, ball.y);
  $('#sockets')
    .querySelectorAll('button')
    .forEach((button) => {
      const i = Number(button.dataset.slot);
      button.classList.toggle('filled', Boolean(arrangement[i]));
      button.classList.toggle('selected', i === selected);
      button.classList.toggle('active', i === activeSlot);
      button.disabled = running || playingSegment;
      button.setAttribute(
        'aria-label',
        `插槽 ${String.fromCharCode(65 + i)}，${arrangement[i] ? tools[arrangement[i].type].name + (arrangement[i].direction === 1 ? '向右' : '向左') : '空插槽'}${i === level.start ? '，小球起点' : ''}`,
      );
    });
  $('#selection-label').textContent =
    selected === null
      ? '未选中插槽'
      : `选中插槽 ${String.fromCharCode(65 + selected)}`;
  $('#rotate').disabled = running || playingSegment || !arrangement[selected];
  $('#remove').disabled = $('#rotate').disabled;
  $('#run').textContent = running
    ? '暂停一下 Ⅱ'
    : outcome && segmentIndex
      ? '继续出发 ▶'
      : '小球出发！ ▶';
  $('#run').disabled = celebrating;
  $('#step').disabled = running || playingSegment;
  $('#direction').disabled = running || playingSegment;
  $('#tools')
    .querySelectorAll('button')
    .forEach((button) => {
      button.disabled = running || playingSegment;
    });
  $('#star-state').textContent = `${collected.length} / ${level.stars.length}`;
  $('#budget').textContent =
    `${Object.keys(arrangement).length} / 目标 ${level.budget} 个`;
  $('#progress').textContent = `${Object.keys(progress).length} / 12`;
  $('#goal-state').textContent =
    running || playingSegment ? '机关运转中' : '等待出发';
}
function editSlot(index) {
  if (running || playingSegment) return;
  if (outcome) reset(false);
  selected = index;
  if (!arrangement[index] || armed) {
    arrangement[index] = { type, direction };
    audio.play('place');
    armed = false;
    say('搭好啦！看看虚线落点，下一站有没有机关接住小球？');
  } else {
    type = arrangement[index].type;
    direction = arrangement[index].direction;
    renderTools();
    say('已选中这个机关，可以换方向、收起来，或先选另一个工具再替换。');
  }
  render();
}
$('#tools').addEventListener('click', (event) => {
  const button = event.target.closest('[data-tool]');
  if (!button) return;
  type = button.dataset.tool;
  armed = true;
  renderTools();
  render();
  say(`选好了${tools[type].name}，点插槽放置或替换。`);
});
$('#direction').addEventListener('click', () => {
  direction *= -1;
  armed = true;
  renderTools();
  render();
});
$('#sockets').addEventListener('click', (event) => {
  const button = event.target.closest('[data-slot]');
  if (button) editSlot(Number(button.dataset.slot));
});
function rotate() {
  if (running || playingSegment || !arrangement[selected]) return;
  if (outcome) reset(false);
  arrangement[selected].direction *= -1;
  direction = arrangement[selected].direction;
  type = arrangement[selected].type;
  audio.play('place');
  renderTools();
  render();
  say('方向换好了，看看小球现在会落到哪里。');
}
function remove() {
  if (running || playingSegment || !arrangement[selected]) return;
  if (outcome) reset(false);
  delete arrangement[selected];
  render();
  say('机关收起来了，试试换一种工具。');
}
$('#rotate').addEventListener('click', rotate);
$('#remove').addEventListener('click', remove);
$('#sockets').addEventListener('keydown', (event) => {
  const button = event.target.closest('[data-slot]');
  if (!button) return;
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault();
    const index =
      (Number(button.dataset.slot) +
        (event.key === 'ArrowRight' ? 1 : level.slots.length - 1)) %
      level.slots.length;
    $('#sockets').children[index].focus();
  }
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    selected = Number(button.dataset.slot);
    remove();
  }
  if (event.key.toLowerCase() === 'r') {
    selected = Number(button.dataset.slot);
    rotate();
  }
});
function prepare() {
  if (!outcome) {
    outcome = simulate(level, arrangement);
    segmentIndex = 0;
    collected = [];
  }
  if (!outcome.segments.length) {
    say(outcome.message, true);
    audio.play('error');
    outcome = null;
    return false;
  }
  return true;
}
function showBoard() {
  if (matchMedia('(max-width:700px)').matches)
    $('#board').scrollIntoView({ block: 'start', behavior: 'smooth' });
}
function animateSegment(auto) {
  if (!prepare()) {
    running = false;
    render();
    return;
  }
  if (segmentIndex >= outcome.segments.length) {
    finish();
    return;
  }
  const segment = outcome.segments[segmentIndex];
  activeSlot = segment.slot;
  playingSegment = true;
  render();
  audio.play(segment.type);
  say(
    `${tools[segment.type].name}启动！${segment.direction === 1 ? '向右' : '向左'}${segment.type === 'spring' ? '弹起来' : segment.type === 'fan' ? '吹过去' : '滚过去'}。`,
  );
  let started = null;
  const draw = (now) => {
    if (started === null) started = now;
    const progress = Math.min(segment.endT, (now - started) / (1000 / speed));
    ball = trajectory(segment.from, segment, progress);
    level.stars.forEach((star, i) => {
      if (
        !collected.includes(i) &&
        Math.hypot(star.x - ball.x, star.y - ball.y) < 24
      ) {
        collected.push(i);
        audio.play('star');
        $('#star-state').textContent =
          `${collected.length} / ${level.stars.length}`;
        $('#scene').innerHTML = scene(
          level,
          arrangement,
          null,
          null,
          collected,
          activeSlot,
        );
      }
    });
    $('#animation').innerHTML = marble(
      ball.x,
      ball.y,
      progress * 360 * segment.direction,
    );
    if (progress < segment.endT) {
      frame = requestAnimationFrame(draw);
      return;
    }
    playingSegment = false;
    segmentIndex++;
    if (segmentIndex >= outcome.segments.length) finish();
    else if (auto && running) animateSegment(true);
    else {
      running = false;
      render();
      say('这一段完成了！再点「演示一段」观察下一个机关。');
    }
  };
  frame = requestAnimationFrame(draw);
}
function finish() {
  running = false;
  playingSegment = false;
  activeSlot = -1;
  const completed = outcome;
  if (!completed.success) {
    render();
    say(completed.message, true);
    audio.play('error');
    outcome = null;
    segmentIndex = 0;
    return;
  }
  // Save when the bell rings, so a click or tab switch during the celebration keeps the stars.
  progress[level.id] = Math.max(progress[level.id] || 0, completed.stars);
  let saved = true;
  try {
    localStorage.setItem(storageKey, JSON.stringify(progress));
  } catch {
    saved = false;
  }
  playingSegment = true;
  celebrating = true;
  render();
  $('#goal-state').textContent = '✓ 铃铛响啦';
  audio.play('bell');
  let started = null;
  const celebrate = (now) => {
    if (started === null) started = now;
    const t = Math.min(1, (now - started) / 850);
    $('#animation').innerHTML =
      marble(ball.x, ball.y) +
      bellArt(level.goal, t) +
      `<g fill="#edbc63" opacity="${1 - t * 0.5}">${Array.from({ length: 9 }, (_, i) => `<circle cx="${level.goal[0] + Math.cos(i * 0.8) * t * 70}" cy="${level.goal[1] - t * 90 + Math.sin(i * 0.8) * t * 40}" r="3"/>`).join('')}</g>`;
    if (t < 1) {
      frame = requestAnimationFrame(celebrate);
      return;
    }
    playingSegment = false;
    celebrating = false;
    $('#result-art').innerHTML = squirrel(true);
    $('#result-stars').textContent =
      '★'.repeat(completed.stars) + '☆'.repeat(3 - completed.stars);
    $('#result-stars').setAttribute('aria-label', `获得${completed.stars}颗星`);
    $('#result-text').textContent =
      `小球经过了 ${completed.segments.length} 个机关，收集 ${completed.collected.length} 颗星星，敲响了小铃铛！${saved ? '' : '本次星星暂时无法保存。'}`;
    $('#next').textContent =
      level.id === 11 ? '看看工坊地图 ➜' : '下一间工坊 ➜';
    $('#result-dialog').showModal();
    audio.play('win');
    say(completed.message);
  };
  frame = requestAnimationFrame(celebrate);
}
$('#run').addEventListener('click', () => {
  if (running || playingSegment) {
    cancel();
    reset(false);
    say('暂停并回到起点了，机关没有改变。可以慢镜头再看一次。');
    return;
  }
  if (!prepare()) return;
  running = true;
  showBoard();
  animateSegment(true);
});
$('#step').addEventListener('click', () => {
  if (running || playingSegment) return;
  showBoard();
  animateSegment(false);
});
$('#reset').addEventListener('click', () => reset());
$('#slow').addEventListener('click', () => {
  speed = speed === 1 ? 0.5 : 1;
  $('#slow').setAttribute('aria-pressed', String(speed === 0.5));
  $('#slow').textContent = speed === 0.5 ? '◷ 慢镜头开' : '◷ 慢镜头';
});
$('#hint').addEventListener('click', () => {
  const start = level.slots[level.start];
  if (level.id < 2)
    say(
      level.id === 0
        ? '两个插槽依次往右下方排列，向右斜坡正好能接上它们。'
        : '下一个插槽更高，试试向右的弹簧。',
    );
  else
    say(
      '先点起点插槽，再看看不同工具的虚线落点。近处同高用平桥，远处同高用风扇，高处用弹簧，低处用斜坡。',
    );
});
function map() {
  if (running || playingSegment) reset(false);
  $('#levels').innerHTML = themes
    .map(
      (theme, i) =>
        `<div class="chapter-heading"><b>${theme.icon} ${theme.name}</b><small>${theme.subtitle}</small></div><div class="level-grid">${levels
          .slice(i * 4, i * 4 + 4)
          .map(
            (item) =>
              `<button class="level-button ${item.id === level.id ? 'current' : ''}" data-level="${item.id}" aria-label="第${item.id + 1}关 ${item.name}"><strong>${String(item.id + 1).padStart(2, '0')}</strong><span>${item.name}</span><em>${'★'.repeat(progress[item.id] || 0)}${'☆'.repeat(3 - (progress[item.id] || 0))}</em></button>`,
          )
          .join('')}</div>`,
    )
    .join('');
  $('#map-dialog').showModal();
}
$('#map').addEventListener('click', map);
$('#levels').addEventListener('click', (event) => {
  const button = event.target.closest('[data-level]');
  if (button) {
    $('#map-dialog').close();
    loadLevel(Number(button.dataset.level));
  }
});
$('#help').addEventListener('click', () => {
  if (running || playingSegment) reset(false);
  $('#help-dialog').showModal();
});
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
  if (level.id === 11) {
    reset(false);
    map();
  } else loadLevel(level.id + 1);
});
$('#result-dialog').addEventListener('cancel', () => reset());
function soundLabel() {
  $('#sound').textContent = audio.enabled ? '♫ 音效开' : '♫ 音效关';
  $('#sound').setAttribute('aria-pressed', String(audio.enabled));
}
$('#sound').addEventListener('click', () => {
  audio.toggle();
  soundLabel();
  audio.play('place');
});
document.addEventListener('pointerdown', () => audio.unlock(), {
  capture: true,
});
document.addEventListener('keydown', () => audio.unlock(), { capture: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if ((running || playingSegment) && !celebrating) reset(false);
    audio.stop();
  }
});
window.addEventListener('pagehide', cancel);
$('#mascot').innerHTML = squirrel();
soundLabel();
loadLevel(0);
