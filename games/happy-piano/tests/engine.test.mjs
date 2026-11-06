import test from 'node:test';
import assert from 'node:assert/strict';
import { whites, blacks, songs } from '../levels.js';
import {
  noteToFrequency,
  noteToMidi,
  createFollowGame,
  pressFollow,
  followStars,
  makeEarQuestions,
  createEarGame,
  answerEar,
  nextEar,
  earStars,
  sanitizeProgress,
  totalStars,
  nextSuggestion,
} from '../engine.js';

test('note names map to frequencies with A4=440 and equal-tempered semitones', () => {
  assert.equal(noteToMidi('A4'), 69);
  assert.equal(noteToMidi('C4'), 60);
  assert.equal(noteToMidi('C#4'), 61);
  assert.equal(noteToFrequency('A4'), 440);
  assert.ok(Math.abs(noteToFrequency('C4') - 261.6256) < 0.001);
  assert.ok(Math.abs(noteToFrequency('C5') - 523.2511) < 0.001);
  assert.ok(Math.abs(noteToFrequency('G5') - 783.9909) < 0.001);
  assert.ok(Math.abs(noteToFrequency('C#4') - 277.1826) < 0.001);
  assert.ok(
    Math.abs(noteToFrequency('C5') / noteToFrequency('C4') - 2) < 1e-9,
  );
  const semitone = Math.pow(2, 1 / 12);
  assert.ok(
    Math.abs(noteToFrequency('C#4') / noteToFrequency('C4') - semitone) <
      1e-9,
  );
  assert.throws(() => noteToFrequency('H4'));
});

test('follow-the-lamp: right notes advance, wrong notes stay, finishing marks done', () => {
  const song = songs[0];
  let game = createFollowGame();
  assert.equal(game.index, 0);
  assert.equal(game.done, false);
  const wrong = pressFollow(song, game, 'B4');
  assert.equal(wrong.hit, false);
  assert.equal(wrong.game.index, 0);
  assert.equal(wrong.game.mistakes, 1);
  game = wrong.game;
  const right = pressFollow(song, game, song.notes[0].n);
  assert.equal(right.hit, true);
  assert.equal(right.game.index, 1);
  assert.equal(right.game.mistakes, 1);
  game = right.game;
  for (const note of song.notes.slice(1)) game = pressFollow(song, game, note.n).game;
  assert.equal(game.done, true);
  assert.equal(game.index, song.notes.length);
  const after = pressFollow(song, game, 'C4');
  assert.equal(after.game.mistakes, game.mistakes);
  assert.equal(after.finished, false);
});

test('follow stars only depend on wrong presses and never drop below one', () => {
  assert.equal(followStars(0), 3);
  assert.equal(followStars(2), 3);
  assert.equal(followStars(3), 2);
  assert.equal(followStars(8), 2);
  assert.equal(followStars(9), 1);
  assert.equal(followStars(50), 1);
});

test('ear questions: 10 white-only rounds then 10 mixed rounds without repeats', () => {
  let seed = 20260101;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const questions = makeEarQuestions(random);
  assert.equal(questions.length, 20);
  const whiteNotes = new Set(whites.map((white) => white.note));
  const allNotes = new Set([...whites, ...blacks].map((k) => k.note));
  for (const [i, note] of questions.entries()) {
    assert.ok(allNotes.has(note), note);
    assert.ok(i < 10 ? whiteNotes.has(note) : true, `${i}: ${note}`);
    assert.notEqual(note, questions[i - 1]);
  }
  assert.ok(questions.slice(10).some((note) => !whiteNotes.has(note)));
});

test('ear game: ask, answer, judge, and award a star every 3 in a row', () => {
  const questions = ['C4', 'E4', 'G4', 'C4', 'F4', 'A4', 'C4'];
  let game = createEarGame(questions);
  assert.equal(game.phase, 'asking');
  assert.equal(game.expected, 'C4');
  // 出题 → 作答 → 判定：答错停留在本题
  game = answerEar(game, 'E4');
  assert.equal(game.last.hit, false);
  assert.equal(game.streak, 0);
  assert.equal(game.correct, 0);
  assert.equal(game.phase, 'answered');
  assert.equal(answerEar(game, 'C4'), null);
  game = nextEar(game);
  assert.equal(game.index, 1);
  assert.equal(game.expected, 'E4');
  // 连对 3 题 → 第一颗星星
  game = nextEar(answerEar(game, 'E4'));
  assert.equal(game.index, 2);
  game = nextEar(answerEar(game, 'G4'));
  assert.equal(game.index, 3);
  game = answerEar(game, 'C4');
  assert.equal(game.correct, 3);
  assert.equal(game.streak, 3);
  assert.equal(game.stars, 1);
  game = nextEar(game);
  // 再连对 3 题 → 第二颗星星，最后一题答完判完成
  game = nextEar(answerEar(game, 'F4'));
  game = nextEar(answerEar(game, 'A4'));
  assert.equal(game.streak, 5);
  game = answerEar(game, 'C4');
  assert.equal(game.correct, 6);
  assert.equal(game.bestStreak, 6);
  assert.equal(game.stars, 2);
  game = nextEar(game);
  assert.equal(game.phase, 'done');
  assert.equal(game.expected, null);
  assert.equal(answerEar(game, 'C4'), null);
});

test('ear stars follow the accuracy bands', () => {
  assert.equal(earStars(18, 20), 3);
  assert.equal(earStars(14, 20), 2);
  assert.equal(earStars(10, 20), 1);
  assert.equal(earStars(9, 20), 0);
  assert.equal(earStars(0, 0), 0);
});

test('sanitizeProgress keeps only valid stars and derives the free-play unlock', () => {
  assert.deepEqual(sanitizeProgress(null), {
    songs: {},
    ear: 0,
    freeUnlocked: false,
  });
  assert.deepEqual(sanitizeProgress('nonsense'), {
    songs: {},
    ear: 0,
    freeUnlocked: false,
  });
  const cleaned = sanitizeProgress({
    songs: { 0: 3, 1: '2', 2: 0, 3: 4, 4: -1, 5: 2, 6: 2.5, 9: 1, x: 3 },
    ear: 5,
    freeUnlocked: false,
  });
  assert.deepEqual(cleaned.songs, { 0: 3, 1: 2, 5: 2 });
  assert.equal(cleaned.ear, 0);
  assert.equal(cleaned.freeUnlocked, true);
  const kept = sanitizeProgress({ songs: { 2: 2 }, ear: 3 });
  assert.deepEqual(kept.songs, { 2: 2 });
  assert.equal(kept.ear, 3);
  assert.equal(kept.freeUnlocked, true);
  assert.equal(sanitizeProgress({ songs: {}, ear: 0 }).freeUnlocked, false);
  assert.equal(totalStars(cleaned.songs), 7);
});

test('next suggestion points to the first song without three stars', () => {
  const songs4 = { 0: 3, 1: 3, 2: 1 };
  assert.equal(nextSuggestion(0, songs4, 7), 2);
  assert.equal(nextSuggestion(2, songs4, 7), 3);
  assert.equal(nextSuggestion(6, songs4, 7), 2);
  assert.equal(nextSuggestion(1, { 0: 3, 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3 }, 7), 2);
  assert.equal(nextSuggestion(-1, {}, 7), 0);
});
