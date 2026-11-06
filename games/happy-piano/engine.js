// 纯逻辑模块：音名换算、跟灯状态机、听音状态机、星级与存档清洗。
// 不出现 window / document / localStorage / AudioContext，可在 Node 中直接测试。
import { whites, blacks, songs } from './levels.js';
const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function noteToMidi(name) {
  const match = /^([A-G])(#?)(-?\d+)$/.exec(name);
  if (!match) throw new Error(`无法识别的音名：${name}`);
  const [, letter, sharp, octave] = match;
  return 12 * (Number(octave) + 1) + SEMITONES[letter] + (sharp ? 1 : 0);
}
// A4 = 440Hz，相邻半音相差 2^(1/12) 倍。
export function noteToFrequency(name) {
  return 440 * Math.pow(2, (noteToMidi(name) - 69) / 12);
}
// ---------- 跟灯弹儿歌 ----------
export function createFollowGame() {
  return { index: 0, mistakes: 0, done: false };
}
export function pressFollow(song, game, note) {
  if (game.done) return { game, hit: false, finished: false };
  const expected = song.notes[game.index].n;
  if (note !== expected)
    return {
      game: { ...game, mistakes: game.mistakes + 1 },
      hit: false,
      finished: false,
      expected,
    };
  const index = game.index + 1;
  const next = { index, mistakes: game.mistakes, done: index >= song.notes.length };
  return { game: next, hit: true, finished: next.done, expected };
}
// 星级只看错键次数：弹完就有星星，错得越少星越多，不惩罚重试。
export function followStars(mistakes) {
  return mistakes <= 2 ? 3 : mistakes <= 8 ? 2 : 1;
}
// ---------- 听音找键 ----------
// 先 10 题只考白键，后 10 题加入黑键；random 可注入以便测试。
export function makeEarQuestions(random = Math.random, whiteRounds = 10, mixedRounds = 10) {
  const questions = [];
  const pick = (pool) => {
    let note;
    do {
      note = pool[Math.floor(random() * pool.length)].note;
    } while (note === questions[questions.length - 1]);
    return note;
  };
  for (let i = 0; i < whiteRounds; i++) questions.push(pick(whites));
  for (let i = 0; i < mixedRounds; i++) questions.push(pick([...whites, ...blacks]));
  return questions;
}
export function createEarGame(questions) {
  return {
    questions,
    index: 0,
    correct: 0,
    streak: 0,
    bestStreak: 0,
    stars: 0,
    phase: 'asking',
    expected: questions[0],
    last: null,
  };
}
export function answerEar(game, note) {
  if (game.phase !== 'asking') return null;
  const hit = note === game.expected;
  const last = { expected: game.expected, given: note, hit };
  const streak = hit ? game.streak + 1 : 0;
  const stars = hit && streak % 3 === 0 ? game.stars + 1 : game.stars;
  return {
    ...game,
    correct: game.correct + (hit ? 1 : 0),
    streak,
    bestStreak: Math.max(game.bestStreak, streak),
    stars,
    phase: 'answered',
    last,
  };
}
export function nextEar(game) {
  if (game.phase !== 'answered') return game;
  const index = game.index + 1;
  return index >= game.questions.length
    ? { ...game, index, phase: 'done', expected: null }
    : { ...game, index, phase: 'asking', expected: game.questions[index] };
}
export function earStars(correct, total) {
  if (!total) return 0;
  const ratio = correct / total;
  return ratio >= 0.9 ? 3 : ratio >= 0.7 ? 2 : ratio >= 0.5 ? 1 : 0;
}
// ---------- 星级汇总与建议 ----------
export function totalStars(songs) {
  return Object.values(songs).reduce((sum, stars) => sum + stars, 0);
}
export function nextSuggestion(songId, songs, count) {
  for (let step = 1; step <= count; step++) {
    const id = (songId + step) % count;
    if (songs[id] !== 3) return id;
  }
  return (songId + 1) % count;
}
// ---------- 存档清洗 ----------
// 只保留 1-3 的整数星数、0-3 的听音星数；全键盘解锁可由星星自动推导。
export function sanitizeProgress(raw) {
  const progress = { songs: {}, ear: 0, freeUnlocked: false };
  if (!raw || typeof raw !== 'object') return progress;
  if (raw.songs && typeof raw.songs === 'object')
    for (const [id, stars] of Object.entries(raw.songs)) {
      const value = Number(stars);
      if (!songs.some((song) => String(song.id) === id)) continue;
      if (Number.isInteger(value) && value >= 1 && value <= 3) progress.songs[id] = value;
    }
  const ear = Number(raw.ear);
  if (Number.isInteger(ear) && ear >= 0 && ear <= 3) progress.ear = ear;
  progress.freeUnlocked =
    raw.freeUnlocked === true || totalStars(progress.songs) > 0 || progress.ear > 0;
  return progress;
}
