import { levels, themes, animals } from './levels.js';
import {
  colorIds,
  colorNames,
  countDrops,
  mix,
  toHex,
  addDrop,
  judge,
  score,
  minimalDrops,
  loadStars,
  saveStars,
} from './engine.js';
import { customerSvg, cauldronSvg, bottleSvg, grannySvg, flaskSvg } from './art.js';
import { PotionAudio } from './audio.js';

const $ = (selector) => document.querySelector(selector);
const storageKey = 'potion-shop:stars:v1';
// Reading window.localStorage itself can throw when storage is blocked.
const storage = (() => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
})();
const audio = new PotionAudio(storage);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const paint = (id) => toHex(mix({ [id]: 1 }));
let progress = loadStars(storage, storageKey, levels.length);

let level = levels[0],
  customerIndex = 0,
  drops = [],
  misses = 0,
  serves = 0,
  results = [],
  // brewing → celebrating → (next customer: brewing) or done
  phase = 'brewing',
  mood = 'wait',
  transformed = false,
  outcome = null,
  timers = [];

const customer = () => level.customers[customerIndex];
const targetHex = (order = customer()) => toHex(mix(order.recipe));

function say(message, warn = false) {
  $('#status').textContent = message;
  $('#status').classList.toggle('warn', warn);
}
function speak(message) {
  $('#say').textContent = message;
}
function describe(counts) {
  return colorIds
    .filter((id) => counts[id])
    .map((id) => `${counts[id]}${colorNames[id]}`)
    .join(' ');
}
function restart(element, className) {
  element.classList.remove(className);
  void element.getBoundingClientRect();
  element.classList.add(className);
}
function later(ms, task) {
  timers.push(setTimeout(task, ms));
}
function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}

function load(id) {
  if (phase === 'celebrating') return;
  clearTimers();
  level = levels[id];
  customerIndex = 0;
  drops = [];
  misses = 0;
  serves = 0;
  results = [];
  phase = 'brewing';
  mood = 'wait';
  transformed = false;
  outcome = null;
  const theme = themes[level.theme];
  document.body.dataset.theme = String(level.theme);
  $('#chapter').textContent = `第 ${id + 1} 关 · ${theme.icon} ${theme.name} · ${theme.concept}`;
  $('#title').textContent = level.name;
  $('#story').textContent = theme.story;
  $('#guide-text').textContent =
    id === 0
      ? '欢迎来帮忙！点颜料瓶往锅里滴颜料，颜色和“想要”一样了，就交给顾客。'
      : level.mystery
        ? '这位客人的配方是秘密，只能看颜色猜一猜。'
        : '先看看顾客想要什么颜色，再一滴一滴地调。';
  $('#bottles').innerHTML = level.bottles
    .map(
      (id) =>
        `<button class="bottle bottle-${id}" data-color="${id}" aria-label="滴一滴${colorNames[id]}色">${bottleSvg(paint(id))}<span>${colorNames[id]}</span></button>`,
    )
    .join('');
  $('#flask').hidden = true;
  render();
  greet();
}

function greet() {
  const order = customer();
  speak(order.reason);
  say(
    `${animals[order.animal].name}想要一瓶${level.mystery ? '神秘药水' : order.potion}。锅里最多 ${level.capacity} 滴。`,
  );
}

function renderCustomer() {
  const order = customer();
  $('#customer').innerHTML = customerSvg(order.animal, {
    color: transformed ? targetHex() : animals[order.animal].base,
    mood,
    potion: targetHex(),
    transformed,
  });
}

function render() {
  const order = customer();
  const counts = countDrops(drops);
  const hex = toHex(mix(counts));
  const brewing = phase === 'brewing';
  const full = drops.length >= level.capacity;
  $('#liquid').style.fill = hex;
  $('#now').style.background = hex;
  $('#now-name').textContent = drops.length ? describe(counts) : '清水';
  $('#want').style.background = targetHex();
  $('#potion').textContent = level.mystery ? '？？？' : order.potion;
  $('#count').textContent = `${drops.length} / ${level.capacity} 滴`;
  $('#dots').innerHTML =
    drops.map((id) => `<i class="dot-${id}" style="background:${paint(id)}"></i>`).join('') +
    '<i></i>'.repeat(level.capacity - drops.length);
  $('#customer-name').textContent = animals[order.animal].name;
  $('#queue').hidden = level.customers.length < 2;
  $('#queue').innerHTML = level.customers
    .map(
      (item, i) =>
        `<li class="${i < customerIndex || (i === customerIndex && transformed) ? 'served' : i === customerIndex ? 'current' : ''}">${i < customerIndex || (i === customerIndex && transformed) ? '✓' : i + 1} ${animals[item.animal].name}</li>`,
    )
    .join('');
  renderCustomer();
  for (const button of $('#bottles').querySelectorAll('button')) {
    button.disabled = !brewing;
    button.setAttribute('aria-disabled', String(!brewing || full));
    button.classList.toggle('full', full);
  }
  $('#undo').disabled = !brewing || !drops.length;
  $('#pour').disabled = !brewing || !drops.length;
  $('#serve').disabled = phase === 'celebrating' || (brewing && !drops.length);
  $('#serve').innerHTML = phase === 'done' ? '看看成绩 <span>★</span>' : '交给顾客 <span>➜</span>';
  $('#map').disabled = phase === 'celebrating';
  $('#hint').disabled = phase === 'celebrating';
  $('#progress').textContent = `${Object.keys(progress).length} / ${levels.length}`;
}

function drip(color) {
  if (phase !== 'brewing') return;
  if (drops.length >= level.capacity) {
    audio.play('full');
    say(`锅满啦！最多 ${level.capacity} 滴。撤回一滴或者倒掉再调吧。`, true);
    return;
  }
  drops = addDrop(drops, color, level.capacity);
  mood = 'wait';
  audio.play('drop', colorIds.indexOf(color));
  $('#fall').style.background = paint(color);
  restart($('#fall'), 'falling');
  restart($('.ripple'), 'rippling');
  render();
  say(
    drops.length === level.capacity
      ? `滴进一滴${colorNames[color]}色，锅满啦。`
      : `滴进一滴${colorNames[color]}色。`,
  );
}

$('#bottles').addEventListener('click', (event) => {
  const button = event.target.closest('[data-color]');
  if (button) drip(button.dataset.color);
});
$('#bottles').addEventListener('keydown', (event) => {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
  const buttons = [...$('#bottles').querySelectorAll('button')];
  const index = buttons.indexOf(document.activeElement);
  if (!step || index < 0) return;
  event.preventDefault();
  buttons[(index + step + buttons.length) % buttons.length].focus();
});

$('#undo').addEventListener('click', () => {
  if (phase !== 'brewing' || !drops.length) return;
  const removed = drops.at(-1);
  drops = drops.slice(0, -1);
  mood = 'wait';
  audio.play('undo');
  render();
  say(`撤回了一滴${colorNames[removed]}色。`);
});
$('#pour').addEventListener('click', () => {
  if (phase !== 'brewing' || !drops.length) return;
  drops = [];
  mood = 'wait';
  audio.play('pour');
  restart($('.ripple'), 'rippling');
  render();
  say('锅倒干净啦，重新调吧。');
});

$('#serve').addEventListener('click', () => {
  if (phase === 'done') {
    showResult();
    return;
  }
  if (phase !== 'brewing' || !drops.length) return;
  const order = customer();
  const verdict = judge(drops, order.recipe, level.capacity);
  serves++;
  if (!verdict.correct) {
    misses++;
    mood = 'think';
    audio.play('oops');
    render();
    speak(verdict.hint.text);
    say(`${animals[order.animal].name}：${verdict.hint.text}`, true);
    return;
  }
  results[customerIndex] = { firstTry: misses === 0, minimal: verdict.minimal };
  const last = customerIndex === level.customers.length - 1;
  if (last) {
    // Save before any animation, so a click or tab switch during the celebration keeps the stars.
    const stars = score(results);
    progress = { ...progress, [level.id]: Math.max(progress[level.id] || 0, stars) };
    outcome = { stars, saved: saveStars(storage, storageKey, progress), results: [...results], serves };
  }
  phase = 'celebrating';
  const potion = targetHex();
  drops = [];
  render();
  say('调对啦！药水装瓶，送给顾客～');
  celebrate(potion, last);
});

function thanks(order) {
  if (order.animal === 'frog') return '嘘——我藏进草丛里啦，你还找得到我吗？';
  if (order.animal === 'snowman') return '哇！我变成天空蓝啦，像一小片天空！';
  if (order.animal === 'ghost') return '大家终于看见我啦！谢谢你，小学徒！';
  return `太棒啦！我变成${order.potion}啦，谢谢你！`;
}

function flyPotion(hex) {
  const flask = $('#flask');
  flask.innerHTML = flaskSvg(hex);
  if (reducedMotion.matches || !flask.animate) return;
  const shop = $('#shop').getBoundingClientRect();
  const from = $('#cauldron').getBoundingClientRect();
  const to = $('#customer').getBoundingClientRect();
  const x0 = from.left + from.width / 2 - shop.left,
    y0 = from.top + from.height * 0.3 - shop.top;
  const x1 = to.left + to.width / 2 - shop.left,
    y1 = to.top + to.height * 0.5 - shop.top;
  const at = (x, y, s) => `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -50%) scale(${s})`;
  flask.hidden = false;
  flask.animate(
    [
      { transform: at(x0, y0, 0.4), opacity: 0 },
      { transform: at((x0 + x1) / 2, Math.min(y0, y1) - 50, 1.1), opacity: 1, offset: 0.5 },
      { transform: at(x1, y1, 0.8), opacity: 0.2 },
    ],
    { duration: 720, easing: 'ease-in-out', fill: 'forwards' },
  );
}

// Timers, not animationend: reduced motion turns CSS animations off, but the win must still land.
function celebrate(potion, last) {
  const quick = reducedMotion.matches;
  const order = customer();
  flyPotion(potion);
  audio.play('pour');
  later(quick ? 150 : 700, () => {
    $('#flask').hidden = true;
    mood = 'drink';
    renderCustomer();
    speak('咕嘟咕嘟……');
    audio.play('gulp');
  });
  later(quick ? 300 : 1500, () => {
    mood = 'happy';
    transformed = true;
    render();
    restart($('#customer'), 'poof');
    speak(thanks(order));
    say(`${animals[order.animal].name}变身成功！`);
    audio.play('magic');
  });
  later(quick ? 1300 : 3300, () => {
    if (last) {
      phase = 'done';
      render();
      say('这一关完成啦！可以再调一次，或者去下一关。');
      showResult();
      return;
    }
    customerIndex++;
    misses = 0;
    mood = 'wait';
    transformed = false;
    phase = 'brewing';
    render();
    greet();
    say(`下一位顾客：${animals[customer().animal].name}。锅已经洗干净啦。`);
    if (document.activeElement === document.body) $('#bottles button')?.focus();
  });
}

function showResult() {
  if (!outcome) return;
  const { stars, saved, results: done } = outcome;
  const order = level.customers.at(-1);
  const firstTry = done.every((item) => item.firstTry);
  const minimal = done.every((item) => item.minimal);
  const fewest = level.customers.map((item) => minimalDrops(item.recipe));
  $('#result-art').innerHTML = customerSvg(order.animal, {
    color: targetHex(order),
    mood: 'happy',
    transformed: true,
  });
  $('#result-eyebrow').textContent = `第 ${level.id + 1} 关 · ${level.name}`;
  $('#result-stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  $('#result-stars').setAttribute('aria-label', `获得${stars}颗星`);
  const names = level.customers.map((item) => animals[item.animal].name).join('、');
  $('#result-text').textContent =
    `${names}都拿到了喜欢的药水！一共交了 ${outcome.serves} 次。` +
    (minimal ? '' : `最少只要 ${fewest.join('、')} 滴就能调好哦。`) +
    (saved ? '' : '浏览器暂时不能保存星星。');
  $('#badges').innerHTML = `<span>✓ 调色成功</span><span class="${firstTry ? '' : 'off'}">${firstTry ? '✓' : '○'} 一次就对</span><span class="${minimal ? '' : 'off'}">${minimal ? '✓' : '○'} 最省药水</span>`;
  $('#next').textContent = level.id === levels.length - 1 ? '看看顾客簿 ➜' : '下一关 ➜';
  if (!$('#result-dialog').open) $('#result-dialog').showModal();
  audio.play('win');
}

function openMap() {
  if (phase === 'celebrating') return;
  $('#level-list').innerHTML = themes
    .map(
      (theme, t) =>
        `<div class="chapter-heading"><b>${theme.icon} ${theme.name} · ${theme.concept}</b><small>${theme.story}</small></div><div class="level-grid">${levels
          .filter((item) => item.theme === t)
          .map((item) => {
            const got = progress[item.id] || 0;
            return `<button data-level="${item.id}" class="level-button ${item.id === level.id ? 'current' : ''}" aria-label="第${item.id + 1}关 ${item.name}，${got}颗星"><span class="level-swatches">${item.customers.map((order) => `<i style="background:${targetHex(order)}"></i>`).join('')}</span><strong>${String(item.id + 1).padStart(2, '0')}</strong><span>${item.name}</span><em>${'★'.repeat(got)}${'☆'.repeat(3 - got)}</em></button>`;
          })
          .join('')}</div>`,
    )
    .join('');
  $('#map-dialog').showModal();
}

$('#map').addEventListener('click', openMap);
$('#level-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-level]');
  if (!button) return;
  $('#map-dialog').close();
  load(Number(button.dataset.level));
});
$('#help').addEventListener('click', () => $('#help-dialog').showModal());
$('#hint').addEventListener('click', () => {
  $('#guide-text').textContent = level.hint;
  say(`猫婆婆：${level.hint}`);
  audio.play('click');
});
document
  .querySelectorAll('[data-close]')
  .forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));
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
  audio.play('click');
});
// Touch pointerdown is not a user activation for audio; pointerup and keydown are.
for (const type of ['pointerdown', 'pointerup', 'keydown'])
  document.addEventListener(type, () => audio.unlock(), { capture: true });
// Hiding the tab only silences sound. A running celebration keeps its timers and still ends in the result dialog.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) audio.pause();
});
window.addEventListener('pagehide', () => audio.stop());

$('#cauldron').innerHTML = cauldronSvg(toHex(null));
$('#granny').innerHTML = grannySvg();
soundButton();
load(0);
