import { buildLevels, findIdiom, CHAPTERS } from './levels.js';
import {
  starsFor,
  normalizeProgress,
  recordStars,
  addCollected,
  resolveQuestionIdiom,
  collectableWords,
} from './engine.js';
import { IdiomAudio } from './audio.js';

const $ = (selector) => document.querySelector(selector);
const levels = buildLevels();
const audio = new IdiomAudio();
const storageKey = 'idiom-quest:progress';
let progress = { stars: {}, collected: [] };
try {
  progress = normalizeProgress(JSON.parse(localStorage.getItem(storageKey)));
} catch {
  /* Optional storage. */
}
let level = levels[0],
  qIndex = 0,
  missed = new Set(),
  lights = new Set(),
  tries = 0,
  answered = false,
  selected = null,
  done = new Set();
function say(message, error = false) {
  $('#status').textContent = message;
  $('#status').classList.toggle('error', error);
}
function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}
function lanternSvg(lit) {
  return `<svg class="lantern-svg ${lit ? 'lit' : ''}" viewBox="0 0 40 54" aria-hidden="true"><path class="tassel" d="M20 46v7" stroke-width="2"/><circle class="glow" cx="20" cy="24" r="3" opacity="0"/><rect class="cap" x="12" y="4" width="16" height="4" rx="2"/><ellipse class="body" cx="20" cy="25" rx="14" ry="17"/><path class="rib" d="M6 25h28" stroke-width="1.4"/><rect class="cap" x="12" y="42" width="16" height="4" rx="2"/></svg>`;
}
function renderProgress() {
  $('#progress').textContent = `${Object.keys(progress.stars).length} / ${levels.length}`;
  $('#book-count').textContent = progress.collected.length;
}
function renderLights() {
  $('#lights').innerHTML = [0, 1, 2, 3]
    .map((i) => lanternSvg(lights.has(i)))
    .join('');
  $('#q-index').textContent = `第 ${qIndex + 1} 题 / 共 4 题`;
}
function meaningHtml(idiom) {
  if (!idiom) return '';
  return `<div class="pair-line"><b>${idiom.word}</b><span class="pinyin">${idiom.pinyin}</span></div><p>${idiom.word}的意思是：${idiom.meaning}</p>${idiom.example ? `<p class="example">例：${idiom.example}</p>` : ''}`;
}
function showMeaning(html) {
  if (!html) return;
  const panel = document.createElement('div');
  panel.className = 'meaning-panel';
  panel.innerHTML = html;
  $('#question-display').after(panel);
}
function finishPick(button, correct) {
  answered = true;
  lights.add(qIndex);
  const question = level.questions[qIndex];
  const answerWord =
    question.tail ||
    question.options?.[question.answer] ||
    (typeof question.answer === 'string' ? question.answer : undefined);
  const idiom =
    findIdiom(question.word || answerWord || question.head) ||
    resolveQuestionIdiom(question);
  if (correct) {
    const words =
      question.type === 'chain'
        ? [question.head, answerWord]
        : [question.word];
    progress = addCollected(progress, words);
  } else {
    progress = addCollected(progress, collectableWords(question));
  }
  save();
  renderLights();
  renderProgress();
  button?.classList.add(correct ? 'correct' : 'reveal');
  if (!correct) $('#options').children[question.answer]?.classList.add('reveal');
  for (const option of $('#options').querySelectorAll('button'))
    option.disabled = true;
  const html =
    question.type === 'chain'
      ? [findIdiom(question.head), findIdiom(answerWord)]
          .filter((item, idx, list) => item && list.indexOf(item) === idx)
          .map(meaningHtml)
          .join('')
      : meaningHtml(idiom);
  showMeaning(html);
  $('#next').disabled = false;
  $('#next').focus({ preventScroll: true });
  if (correct) {
    audio.play('right');
    say('答对啦！这一盏灯亮起来了。');
  } else {
    audio.play('reveal');
    say('没关系，看看正确答案，把它记住就好。', true);
  }
}
function pickOption(button) {
  if (answered || !button || button.disabled) return;
  const question = level.questions[qIndex];
  const index = [...$('#options').children].indexOf(button);
  if (index === question.answer) return finishPick(button, true);
  tries++;
  missed.add(qIndex);
  audio.play('wrong');
  button.disabled = true;
  button.classList.add('shake', 'wrong');
  button.addEventListener('animationend', () => button.classList.remove('shake'), {
    once: true,
  });
  if (tries >= 2) return finishPick(null, false);
  say(
    question.type === 'chain'
      ? '接不上哦，再想一想，还有一次机会！'
      : '不是这个字哦，再想一想，还有一次机会！',
    true,
  );
}
function renderFill(question) {
  $('#question-type').textContent = '火眼金睛 · 补字';
  $('#question-prompt').textContent = '成语里有一个字走丢了，帮它找回家！';
  $('#question-display').innerHTML =
    `<div class="idiom-line" role="img" aria-label="成语共四个字，缺少第${question.blank + 1}个字">${[...question.word]
      .map(
        (ch, i) =>
          `<span class="char ${i === question.blank ? 'blank' : ''}">${i === question.blank ? '？' : ch}</span>`,
      )
      .join('')}</div>`;
  $('#options').className = 'keygrid';
  $('#options').replaceChildren(
    ...question.options.map((ch, i) => {
      const button = document.createElement('button');
      button.className = 'option';
      button.innerHTML = `<i>${i + 1}</i>${ch}`;
      button.setAttribute('aria-label', `第${i + 1}个选项：${ch}`);
      return button;
    }),
  );
}
function renderChain(question) {
  $('#question-type').textContent = '成语接龙';
  $('#question-prompt').textContent = '哪个成语能接在它后面？';
  $('#question-display').innerHTML =
    `<div class="chain-head"><span class="chain-note">上一条是</span><div class="idiom-line" role="img" aria-label="上一条成语：${question.head}">${[...question.head]
      .map((ch, i) => `<span class="char ${i === 3 ? 'tail' : ''}">${ch}</span>`)
      .join('')}</div><span class="chain-arrow">➜ ?</span><p class="chain-note">${
      question.homophone
        ? `尾字读 ${question.headPinyin.split(' ')[3]}，首字同音或同字都可以接`
        : `尾字是「${question.head[3]}」，用同样的字接上`
    }</p></div>`;
  $('#options').className = 'keygrid chain-options';
  $('#options').replaceChildren(
    ...question.options.map((word, i) => {
      const button = document.createElement('button');
      button.className = 'option';
      button.innerHTML = `<i>${i + 1}</i><span class="word">${word}</span>`;
      button.setAttribute('aria-label', `第${i + 1}个选项：${word}`);
      return button;
    }),
  );
}
function renderMatch(question) {
  $('#question-type').textContent = '心有灵犀 · 配对';
  $('#question-prompt').textContent = '把成语和它的意思配成对。';
  $('#options').innerHTML = '';
  const idiomButtons = question.pairs.map((pair, index) => {
    const button = document.createElement('button');
    button.innerHTML = `<i>${'①②③④'[index]}</i>${pair.word}`;
    button.dataset.word = pair.word;
    button.setAttribute('aria-label', `成语 ${pair.word}`);
    return button;
  });
  const meaningButtons = question.right.map((meaning) => {
    const button = document.createElement('button');
    button.textContent = meaning;
    button.dataset.meaning = meaning;
    return button;
  });
  $('#question-display').innerHTML =
    '<div class="match-grid"><div class="match-col idioms keygrid" role="group" aria-label="成语列表，先选一个"></div><div class="match-col meanings keygrid" role="group" aria-label="意思列表，再选一个"></div></div>';
  $('.match-col.idioms').replaceChildren(...idiomButtons);
  $('.match-col.meanings').replaceChildren(...meaningButtons);
}
function showQuestion() {
  answered = false;
  tries = 0;
  selected = null;
  done = new Set();
  $('#options').innerHTML = '';
  $('#next').disabled = true;
  $('#next').innerHTML =
    qIndex === 3 ? '看看结果 <span>➜</span>' : '下一题 <span>➜</span>';
  const question = level.questions[qIndex];
  $('.meaning-panel')?.remove();
  if (question.type === 'fill') renderFill(question);
  else if (question.type === 'chain') renderChain(question);
  else renderMatch(question);
  renderLights();
  $('#guide-text').textContent =
    level.id === 0 && qIndex === 0
      ? '嗨！帮成语找回走丢的字，就能点亮小灯笼！'
      : question.type === 'match'
        ? '先点成语，再点意思。配好一对亮一对！'
        : question.type === 'chain'
          ? '看清楚尾巴上的字，读音一样的也能接哦。'
          : '先读一读成语，再从下面选字。';
  say('读一读题目，再点下面的选项吧。');
}
function completeMatch() {
  answered = true;
  lights.add(qIndex);
  const question = level.questions[qIndex];
  progress = addCollected(progress, question.pairs.map((pair) => pair.word));
  save();
  renderLights();
  renderProgress();
  showMeaning(question.pairs.map((pair) => meaningHtml(findIdiom(pair.word))).join(''));
  $('#next').disabled = false;
  $('#next').focus({ preventScroll: true });
  audio.play('right');
  say('四对全部配好，真厉害！');
}
function onIdiomClick(button) {
  if (answered || button.classList.contains('done')) return;
  selected = button;
  for (const item of $('.match-col.idioms').children)
    item.classList.toggle('selected', item === button);
  audio.play('pick');
  say('好，再点它对应的意思。');
}
function onMeaningClick(button) {
  if (answered || button.classList.contains('done')) return;
  if (!selected) {
    say('先点上面的成语，再点下面的意思。');
    return;
  }
  const word = selected.dataset.word;
  const idiom = findIdiom(word);
  if (idiom.meaning === button.dataset.meaning) {
    selected.classList.remove('selected');
    selected.classList.add('done');
    button.classList.add('done');
    selected.disabled = true;
    button.disabled = true;
    selected = null;
    done.add(button.dataset.meaning);
    audio.play('pair');
    if (done.size === 4) return completeMatch();
    say(`配对成功！还剩 ${4 - done.size} 对。`);
    return;
  }
  missed.add(qIndex);
  audio.play('wrong');
  for (const item of [selected, button]) {
    item.classList.add('shake');
    item.addEventListener('animationend', () => item.classList.remove('shake'), {
      once: true,
    });
  }
  selected.classList.remove('selected');
  selected = null;
  say('这两个对不上，再想一想。', true);
}
function finishLevel() {
  const stars = starsFor(missed.size);
  progress = recordStars(progress, level.id, stars);
  save();
  renderProgress();
  $('#result-lantern').innerHTML = lanternSvg(true);
  $('#stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  $('#stars').setAttribute('aria-label', `获得${stars}颗星`);
  $('#result-text').textContent =
    missed.size === 0
      ? '一次都没错，四盏灯全亮，太棒了！'
      : missed.size === 1
        ? '只错了一题，也很厉害！'
        : '闯关成功！再闯一次会更快的。';
  $('#result-words').innerHTML = level.questions
    .flatMap((question) =>
      question.type === 'match'
        ? question.pairs.map((pair) => pair.word)
        : question.type === 'chain'
          ? [question.head, question.tail]
          : [question.word],
    )
    .filter((word, index, list) => list.indexOf(word) === index)
    .map((word) => `<span>🏮 ${word}</span>`)
    .join('');
  $('#next-level').textContent =
    level.id === levels.length - 1 ? '看看灯笼地图 ➜' : '下一站 ➜';
  $('#result-dialog').showModal();
  audio.play('win');
}
function loadLevel(id) {
  level = levels[id];
  qIndex = 0;
  missed = new Set();
  lights = new Set();
  const chapter = CHAPTERS[level.chapter];
  $('#title').textContent = level.name;
  $('#story').textContent = level.story;
  $('#chapter').textContent = `第 ${id + 1} 站 · ${chapter.name}篇`;
  $('#theme').textContent = `${chapter.icon} ${chapter.name}灯会`;
  $('#cheer').textContent = ['慢慢看，别着急', '越闯越厉害啦', '最后一程，加油'][
    level.chapter
  ];
  $('#hint-text').textContent =
    '接龙就是成语手拉手：前一个的尾巴，撞上后一个的开头。';
  renderProgress();
  showQuestion();
}
$('#options').addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (button && $('#options').contains(button)) pickOption(button);
});
document.addEventListener('click', (event) => {
  const idiomButton = event.target.closest('.match-col.idioms button');
  if (idiomButton) return onIdiomClick(idiomButton);
  const meaningButton = event.target.closest('.match-col.meanings button');
  if (meaningButton) return onMeaningClick(meaningButton);
});
document.addEventListener('keydown', (event) => {
  if (document.querySelector('dialog[open]')) return;
  const number = ['1', '2', '3', '4'].indexOf(event.key);
  if (number >= 0) {
    const question = level.questions[qIndex];
    if (question.type === 'match') {
      const button = $('.match-col.idioms').children[number];
      if (button && !button.disabled) onIdiomClick(button);
    } else {
      const button = $('#options').children[number];
      if (button && !button.disabled) pickOption(button);
    }
    return;
  }
  const delta =
    { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }[event.key];
  if (delta === undefined) return;
  event.preventDefault();
  const grid = document.activeElement?.closest('.keygrid');
  const buttons = grid
    ? [...grid.querySelectorAll('button:not(:disabled)')]
    : [...$('#options').querySelectorAll('button:not(:disabled)')];
  if (!buttons.length) return;
  const current = buttons.indexOf(document.activeElement);
  const next =
    current === -1
      ? 0
      : (current + delta + buttons.length) % buttons.length;
  buttons[next].focus();
});
$('#next').addEventListener('click', () => {
  if (!answered) return;
  if (qIndex < 3) {
    qIndex++;
    showQuestion();
  } else finishLevel();
});
$('#restart').addEventListener('click', () => {
  loadLevel(level.id);
  say('回到这一关的开头啦，换个思路再试试。');
});
function openMap() {
  $('#level-list').innerHTML = CHAPTERS.map((chapter, index) => {
    const start = index * 4;
    return `<div class="chapter-heading"><b>${chapter.icon} ${chapter.name}</b><small>${chapter.story}</small></div><div class="level-grid">${levels
      .slice(start, start + 4)
      .map((item) => {
        const stars = progress.stars[item.id] || 0;
        return `<button data-level="${item.id}" class="level-button ${item.id === level.id ? 'current' : ''}" aria-label="第${item.id + 1}关 ${item.name}，${stars}颗星"><span class="lantern">${lanternSvg(stars > 0)}</span><strong>${String(item.id + 1).padStart(2, '0')}</strong><span>${item.name}</span><em>${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</em></button>`;
      })
      .join('')}</div>`;
  }).join('');
  $('#map-dialog').showModal();
}
$('#map').addEventListener('click', openMap);
$('#level-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-level]');
  if (button) {
    $('#map-dialog').close();
    loadLevel(Number(button.dataset.level));
  }
});
function openBook() {
  $('#book-list').innerHTML = progress.collected.length
    ? progress.collected
        .map(
          (word, index) =>
            `<div class="book-entry"><div class="book-top"><b>${word}</b><span class="pinyin">${findIdiom(word).pinyin}</span><small>第 ${index + 1} 个</small></div><p>${findIdiom(word).meaning}</p>${findIdiom(word).example ? `<p class="example">例：${findIdiom(word).example}</p>` : ''}</div>`,
        )
        .join('')
    : '<p class="book-empty">收集册还空空的，快去闯关收集成语吧！</p>';
  $('#book-dialog').showModal();
}
$('#book').addEventListener('click', openBook);
$('#help').addEventListener('click', () => $('#help-dialog').showModal());
document
  .querySelectorAll('[data-close]')
  .forEach((button) =>
    button.addEventListener('click', () => button.closest('dialog').close()),
  );
$('#retry').addEventListener('click', () => {
  $('#result-dialog').close();
  loadLevel(level.id);
});
$('#next-level').addEventListener('click', () => {
  $('#result-dialog').close();
  if (level.id === levels.length - 1) openMap();
  else loadLevel(level.id + 1);
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
  audio.play('right');
});
document.addEventListener('pointerdown', () => audio.unlock(), {
  capture: true,
});
document.addEventListener('keydown', () => audio.unlock(), { capture: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) audio.stop();
});
window.addEventListener('pagehide', () => audio.stop());
soundButton();
loadLevel(Math.max(0, levels.findIndex((item) => !progress.stars[item.id])));
