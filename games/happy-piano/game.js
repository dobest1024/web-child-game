import {
  songs,
  whites,
  blacks,
  noteByKey,
  infoByNote,
} from './levels.js';
import {
  createFollowGame,
  pressFollow,
  followStars,
  makeEarQuestions,
  createEarGame,
  answerEar,
  nextEar,
  earStars,
  sanitizeProgress,
  nextSuggestion,
} from './engine.js';
import { PianoAudio } from './audio.js';
const $ = (selector) => document.querySelector(selector);
const keyboard = $('#keyboard');
const audio = new PianoAudio();
const storageKey = 'happy-piano:progress';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let progress = { songs: {}, ear: 0, freeUnlocked: false };
try {
  progress = sanitizeProgress(JSON.parse(localStorage.getItem(storageKey)));
} catch {
  /* Optional storage. */
}
let mode = 'free';
let follow = { song: songs[0], game: createFollowGame() };
let ear = createEarGame(makeEarQuestions());
let earTimer = null;
let resultContext = { type: 'follow', songId: 0 };
const praise = [
  '真好听！继续往前走。',
  '就是这样，下一个音在等你。',
  '你的小手指真灵巧！',
  '真棒，音乐会越来越热闹了。',
];
const sayPraise = () =>
  say(praise[Math.floor(Math.random() * praise.length)]);
function saveProgress() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(progress));
  } catch {
    /* Optional storage. */
  }
}
function say(message, error = false) {
  $('#status').textContent = message;
  $('#status').classList.toggle('error', error);
}
function keyButton(note) {
  return keyboard.querySelector(`[data-note="${note}"]`);
}
function buildKeyboard() {
  keyboard.replaceChildren();
  for (const white of whites) {
    const button = document.createElement('button');
    button.className = 'white-key';
    button.dataset.note = white.note;
    button.setAttribute(
      'aria-label',
      `白键 唱作 ${white.solfege}，音名 ${white.note}，键盘字母 ${white.key.toUpperCase()}`,
    );
    button.innerHTML =
      `<span class="solfege">${white.solfege}</span>` +
      `<span class="pitch">${white.note}</span>` +
      `<kbd>${white.key.toUpperCase()}</kbd>`;
    keyboard.append(button);
  }
  const whiteWidth = (100 / whites.length).toFixed(4);
  for (const black of blacks) {
    const button = document.createElement('button');
    button.className = 'black-key';
    button.dataset.note = black.note;
    const anchor = whites.findIndex((white) => white.note === black.anchor);
    button.style.left = `calc(${whiteWidth}% * ${(anchor + 0.69).toFixed(2)})`;
    button.setAttribute(
      'aria-label',
      `黑键 音名 ${black.note.replace('#', '♯')}，键盘字母 ${black.key.toUpperCase()}`,
    );
    button.innerHTML =
      `<span class="pitch">${black.note.replace('#', '♯')}</span>` +
      `<kbd>${black.key.toUpperCase()}</kbd>`;
    keyboard.append(button);
  }
}
const flashTimers = new Map();
function flashKey(note, className = 'active', keep = 300) {
  const button = keyButton(note);
  if (!button) return;
  button.classList.add(className);
  clearTimeout(flashTimers.get(`${note}:${className}`));
  flashTimers.set(
    `${note}:${className}`,
    setTimeout(() => button.classList.remove(className), keep),
  );
}
function spawnRipple(note) {
  if (reducedMotion.matches) return;
  const stage = $('#stage');
  const key = keyButton(note);
  if (!key) return;
  const stageBox = stage.getBoundingClientRect();
  const keyBox = key.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  const size = 36 + Math.random() * 46;
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${keyBox.left + keyBox.width / 2 - stageBox.left}px`;
  ripple.style.top = `${stageBox.height - size / 2 - 12}px`;
  ripple.style.borderColor = `hsl(${(noteToHue(note))} 72% 68%)`;
  stage.append(ripple);
  if (stage.children.length > 24) stage.firstElementChild.remove();
  ripple.addEventListener('animationend', () => ripple.remove());
}
function noteToHue(note) {
  const octave = Number(note.slice(-1));
  const step = (octave * 12 + 'C D E F G A B'.split(' ').indexOf(note[0])) * 9;
  return 250 + (step % 100);
}
function renderProgress() {
  const done = songs.filter((song) => progress.songs[song.id]).length;
  $('#progress').textContent = `${done} / ${songs.length}`;
  $('#free-hint').textContent = progress.freeUnlocked
    ? '全部琴键都归你啦！黑键也来试一试，它们的声音亮晶晶的。'
    : '随便按按看！去跟灯弹儿歌拿一颗星星，黑键就会加入自由弹奏哦。';
}
function renderKeyLocks() {
  const locked = mode === 'free' && !progress.freeUnlocked;
  for (const black of blacks) {
    const button = keyButton(black.note);
    button.disabled = locked;
    button.classList.toggle('locked', locked);
  }
}
// ---------- 跟灯弹儿歌 ----------
function loadFollow(id) {
  follow = { song: songs[id], game: createFollowGame() };
  $('#follow-song').textContent = `${follow.song.emoji} ${follow.song.name}`;
  $('#follow-label').textContent = `第 ${id + 1} 首`;
  $('#follow-lyric').textContent = `歌词开头：${follow.song.firstLine}`;
  renderFollow();
  say('亮灯的琴键在呼吸，弹下它吧！');
}
function renderFollow() {
  const { song, game } = follow;
  for (const button of keyboard.querySelectorAll('[data-note]'))
    button.classList.remove('lamp', 'breathe');
  const note = song.notes[game.index]?.n;
  if (game.done || !note) {
    $('#follow-next').textContent = '🎉';
    $('#follow-progress').textContent = '整首弹完啦！';
    return;
  }
  const lamp = keyButton(note);
  lamp.classList.add('lamp');
  if (!reducedMotion.matches) lamp.classList.add('breathe');
  const info = infoByNote.get(note);
  $('#follow-next').textContent = info.solfege
    ? `${info.solfege} ${note}`
    : note;
  $('#follow-progress').textContent = `第 ${game.index + 1} / ${song.notes.length} 个音`;
  $('#follow-mistakes').textContent = game.mistakes
    ? `小走神 ${game.mistakes} 次`
    : '一次都没错哦';
  lamp.scrollIntoView({
    block: 'nearest',
    inline: 'center',
    behavior: reducedMotion.matches ? 'instant' : 'smooth',
  });
}
function handleFollowPress(note) {
  if (follow.game.done) return;
  const result = pressFollow(follow.song, follow.game, note);
  follow.game = result.game;
  renderFollow();
  if (!result.hit) {
    say('咦，不是这一颗。看看亮灯的琴键，再试一次！');
    audio.note('E4', 0.2);
    audio.note('C4', 0.26, 0.13);
    return;
  }
  if (result.finished) {
    finishFollow();
    return;
  }
  if (follow.game.index % 8 === 0) sayPraise();
}
function finishFollow() {
  const stars = followStars(follow.game.mistakes);
  const id = follow.song.id;
  progress.songs[id] = Math.max(progress.songs[id] || 0, stars);
  progress.freeUnlocked = true;
  saveProgress();
  renderProgress();
  resultContext = { type: 'follow', songId: id };
  const suggestion = nextSuggestion(id, progress.songs, songs.length);
  const perfect = follow.game.mistakes === 0;
  showResult({
    art: '🎊🎹🎊',
    title: '音乐会成功！',
    stars,
    text: `《${follow.song.name}》完整弹出啦！小走神 ${follow.game.mistakes} 次。`,
    badges: [
      `✓ 完整弹完整首曲子`,
      perfect ? '✓ 零走神小钢琴家' : '○ 零走神小钢琴家',
      stars === 3 ? '✓ 三星小明星' : '○ 三星小明星',
    ],
    againLabel: '再弹一次',
    nextLabel: `下一首：${songs[suggestion].name} ➜`,
  });
}
// ---------- 听音找键 ----------
function clearEarTimer() {
  if (!earTimer) return;
  clearTimeout(earTimer);
  earTimer = null;
  if (ear.phase === 'answered') ear = nextEar(ear);
}
function newEarRound() {
  clearEarTimer();
  ear = createEarGame(makeEarQuestions());
  askEarQuestion();
}
function askEarQuestion() {
  clearEarTimer();
  if (ear.phase === 'done') {
    newEarRound();
    return;
  }
  ear = { ...ear, phase: 'asking' };
  audio.note(ear.expected, 0.9);
  renderEar();
  say('听！是哪个键在唱歌？点一点它。');
}
function renderEar() {
  $('#ear-question').textContent = `第 ${ear.index + 1} / ${ear.questions.length} 题`;
  $('#ear-hint').textContent =
    ear.index < 10
      ? '这一题是白键，先听一听。'
      : '这一题可能藏着一个黑键，仔细听。';
  $('#ear-streak').textContent = ear.streak
    ? `连对 ${ear.streak} 题${ear.stars ? `，小星星 ${ear.stars} 颗` : ''}`
    : '连对 0 题';
}
function handleEarPress(note) {
  if (ear.phase !== 'asking') return;
  ear = answerEar(ear, note);
  if (ear.last.hit) {
    flashKey(ear.last.expected, 'active', 450);
    if (ear.streak % 3 === 0)
      say(`连对 ${ear.streak} 题，小星星 +1！你的耳朵真灵。`);
    else sayPraise();
  } else {
    const target = infoByNote.get(ear.last.expected);
    const label = ear.last.expected.replace('#', '♯');
    const name = target?.solfege ? `${target.solfege}（${label}）` : label;
    say(`刚才的音是 ${name}，亮绿光的键就是它。`);
    flashKey(ear.last.expected, 'reveal', 1500);
  }
  renderEar();
  earTimer = setTimeout(
    () => {
      earTimer = null;
      ear = nextEar(ear);
      if (ear.phase === 'done') finishEar();
      else askEarQuestion();
    },
    ear.last.hit ? 1000 : 1700,
  );
}
function finishEar() {
  const stars = earStars(ear.correct, ear.questions.length);
  progress.ear = Math.max(progress.ear, stars);
  if (stars > 0) progress.freeUnlocked = true;
  saveProgress();
  renderProgress();
  resultContext = { type: 'ear', songId: 0 };
  showResult({
    art: '👂✨🎹',
    title: '金耳朵音乐会！',
    stars,
    text: `一共 ${ear.questions.length} 题，你答对了 ${ear.correct} 题，最长连对 ${ear.bestStreak} 题。`,
    badges: [
      `✓ 听音找键小能手`,
      ear.bestStreak >= 3 ? '✓ 连对三题拿星星' : '○ 连对三题拿星星',
      stars === 3 ? '✓ 三星金耳朵' : '○ 三星金耳朵',
    ],
    againLabel: '再听一轮',
    nextLabel: '去弹儿歌 ➜',
  });
}
// ---------- 结算 dialog ----------
function showResult({
  art,
  title,
  stars,
  text,
  badges,
  againLabel,
  nextLabel,
}) {
  $('#result-art').textContent = art;
  $('#result-title').textContent = title;
  $('#stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  $('#stars').setAttribute('aria-label', `获得${stars}颗星`);
  $('#result-text').textContent = text;
  $('#result-badges').innerHTML = badges
    .map((badge) => `<span>${badge}</span>`)
    .join('');
  $('#again').textContent = againLabel;
  $('#next').textContent = nextLabel;
  $('#result-dialog').showModal();
  const fanfare =
    stars >= 3
      ? ['C5', 'E5', 'G5', 'C6', 'G5', 'C6']
      : stars === 2
        ? ['C5', 'E5', 'G5', 'E5', 'G5']
        : ['C5', 'E5', 'G5'];
  fanfare.forEach((name, i) => audio.note(name, 0.34, i * 0.16));
}
// ---------- 弹奏入口 ----------
function handleNote(note) {
  audio.unlock();
  audio.note(note);
  flashKey(note);
  if (mode === 'free') spawnRipple(note);
  if (mode === 'follow') handleFollowPress(note);
  if (mode === 'ear') handleEarPress(note);
}
// ---------- 模式切换 ----------
const MODES = {
  free: {
    eyebrow: '小小演奏家',
    title: '自由弹奏',
    story: '想弹哪个键，就弹哪个键，听听每个音的样子。',
    welcome: '想弹哪个键，就弹哪个键，屏幕上会开出小波纹。',
  },
  follow: {
    eyebrow: '小音乐家',
    title: '跟灯弹儿歌',
    story: '亮灯的琴键在呼吸，弹下它，儿歌就会往前走。',
    welcome: '亮灯的琴键在等你，弹下它吧！',
  },
  ear: {
    eyebrow: '小小金耳朵',
    title: '听音找键',
    story: '先听琴声，再找出它是哪个键。连对 3 题有一颗星星。',
    welcome: '竖起耳朵，第一题开始啦！',
  },
};
function applyMode(name) {
  mode = name;
  clearEarTimer();
  const texts = MODES[name];
  $('#eyebrow').textContent = texts.eyebrow;
  $('#title').textContent = texts.title;
  $('#story').textContent = texts.story;
  for (const button of document.querySelectorAll('.modes [data-mode]')) {
    const current = button.dataset.mode === mode;
    button.classList.toggle('current', current);
    button.setAttribute('aria-pressed', String(current));
  }
  $('#free-panel').hidden = mode !== 'free';
  $('#follow-panel').hidden = mode !== 'follow';
  $('#ear-panel').hidden = mode !== 'ear';
  for (const button of keyboard.querySelectorAll('[data-note]'))
    button.classList.remove('lamp', 'breathe', 'reveal');
  renderKeyLocks();
  if (mode === 'follow') renderFollow();
  if (mode === 'ear') {
    if (ear.phase === 'done') newEarRound();
    else askEarQuestion();
  }
  say(texts.welcome);
}
document.querySelectorAll('.modes [data-mode]').forEach((button) =>
  button.addEventListener('click', () => applyMode(button.dataset.mode)),
);
// ---------- 琴键：触屏 / 鼠标 ----------
let lastPointerAt = 0;
let slidingNote = null;
keyboard.addEventListener('pointerdown', (event) => {
  const button = event.target.closest('[data-note]');
  if (!button || button.disabled) return;
  lastPointerAt = performance.now();
  slidingNote = button.dataset.note;
  handleNote(slidingNote);
});
keyboard.addEventListener('pointermove', (event) => {
  if (!slidingNote) return;
  const button = document
    .elementFromPoint(event.clientX, event.clientY)
    ?.closest('[data-note]');
  if (button && !button.disabled && button.dataset.note !== slidingNote) {
    slidingNote = button.dataset.note;
    handleNote(slidingNote);
  }
});
window.addEventListener('pointerup', () => (slidingNote = null));
window.addEventListener('pointercancel', () => (slidingNote = null));
// 回车 / 空格操作聚焦琴键时，click 事件兜底（pointerdown 已处理触屏与鼠标）。
keyboard.addEventListener('click', (event) => {
  if (performance.now() - lastPointerAt < 500) return;
  const button = event.target.closest('[data-note]');
  if (button && !button.disabled) handleNote(button.dataset.note);
});
// ---------- 键盘字母 ----------
document.addEventListener('keydown', (event) => {
  if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
  if (document.querySelector('dialog[open]')) return;
  const note = noteByKey.get(event.key.toLowerCase());
  if (!note) return;
  const button = keyButton(note);
  if (!button || button.disabled) return;
  event.preventDefault();
  handleNote(note);
});
// ---------- 面板按钮 ----------
$('#follow-restart').addEventListener('click', () => {
  loadFollow(follow.song.id);
});
$('#ear-replay').addEventListener('click', () => {
  if (ear.phase === 'asking') audio.note(ear.expected, 0.9);
});
// ---------- 曲目单 ----------
function openSongs() {
  $('#song-list').innerHTML = songs
    .map((song) => {
      const stars = progress.songs[song.id] || 0;
      return (
        `<button data-song="${song.id}" class="song-button" ` +
        `aria-label="第${song.id + 1}首 ${song.name}，${stars}颗星">` +
        `<strong>${song.emoji} ${song.name}</strong>` +
        `<span>${song.firstLine}</span>` +
        `<em>${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</em></button>`
      );
    })
    .join('');
  $('#songs-dialog').showModal();
}
$('#songs').addEventListener('click', openSongs);
$('#song-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-song]');
  if (!button) return;
  $('#songs-dialog').close();
  applyMode('follow');
  loadFollow(Number(button.dataset.song));
});
// ---------- 帮助与结算 ----------
$('#help').addEventListener('click', () => $('#help-dialog').showModal());
document
  .querySelectorAll('[data-close]')
  .forEach((button) =>
    button.addEventListener('click', () => button.closest('dialog').close()),
  );
$('#again').addEventListener('click', () => {
  $('#result-dialog').close();
  if (resultContext.type === 'follow') loadFollow(resultContext.songId);
  else if (mode === 'ear') newEarRound();
  else applyMode('ear');
});
$('#next').addEventListener('click', () => {
  $('#result-dialog').close();
  applyMode('follow');
  if (resultContext.type === 'follow')
    loadFollow(
      nextSuggestion(resultContext.songId, progress.songs, songs.length),
    );
  else loadFollow(nextSuggestion(-1, progress.songs, songs.length));
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
  audio.note('C5', 0.4);
  audio.note('E5', 0.4, 0.12);
  audio.note('G5', 0.55, 0.24);
});
document.addEventListener('pointerdown', () => audio.unlock(), {
  capture: true,
});
document.addEventListener('keydown', () => audio.unlock(), { capture: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearEarTimer();
    audio.stop();
  } else if (mode === 'ear') {
    if (ear.phase === 'done') finishEar();
    else renderEar();
  }
});
window.addEventListener('pagehide', () => {
  clearEarTimer();
  audio.stop();
});
buildKeyboard();
renderProgress();
soundButton();
applyMode('free');
