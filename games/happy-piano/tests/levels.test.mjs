import test from 'node:test';
import assert from 'node:assert/strict';
import {
  whites,
  blacks,
  allKeys,
  songs,
  noteByKey,
} from '../levels.js';
import { noteToMidi } from '../engine.js';

test('keyboard has 13 white keys and 9 black keys, each with a unique computer key', () => {
  assert.equal(whites.length, 13);
  assert.equal(blacks.length, 9);
  assert.equal(allKeys.length, 22);
  assert.equal(new Set(allKeys.map((k) => k.key)).size, 22);
  assert.equal(noteByKey.size, 22);
  for (const white of whites) {
    assert.match(white.solfege, /^(do|re|mi|fa|sol|la|si)$/);
    assert.match(white.key, /^[a-z]$/);
  }
  assert.equal(whites[0].solfege, 'do');
  assert.equal(whites[7].solfege, 'do');
});

test('black keys sit between their anchor white key and the next white key', () => {
  for (const black of blacks) {
    const anchor = whites.findIndex((white) => white.note === black.anchor);
    assert.ok(anchor >= 0, black.note);
    const next = whites[anchor + 1];
    assert.ok(next, `${black.note} 必须有右侧白键`);
    assert.equal(noteToMidi(black.note), noteToMidi(black.anchor) + 1);
    assert.equal(noteToMidi(black.note), noteToMidi(next.note) - 1);
  }
  assert.deepEqual(
    blacks.map((black) => black.note),
    ['C#4', 'D#4', 'F#4', 'G#4', 'A#4', 'C#5', 'D#5', 'F#5', 'G#5'],
  );
});

test('seven songs with unique names cover 8-16 bars and 20-60 in-range notes', () => {
  assert.equal(songs.length, 7);
  assert.equal(new Set(songs.map((song) => song.name)).size, 7);
  const playable = new Set(allKeys.map((k) => k.note));
  for (const song of songs) {
    assert.ok(Number.isInteger(song.bars), song.name);
    assert.ok(song.bars >= 8 && song.bars <= 16, `${song.name} ${song.bars} 小节`);
    assert.ok(song.notes.length >= 20 && song.notes.length <= 60, song.name);
    for (const note of song.notes) {
      assert.ok(playable.has(note.n), `${song.name} 的 ${note.n}`);
      assert.ok(Number.isFinite(note.b) && note.b > 0, `${song.name} 的时值`);
    }
    assert.ok(
      Math.abs(
        song.totalBeats - song.notes.reduce((sum, note) => sum + note.b, 0),
      ) < 1e-9,
    );
  }
});

test('every song ends on do and the quoted melodies match the well-known tunes', () => {
  for (const song of songs) assert.ok(song.notes.at(-1).n.startsWith('C'), song.name);
  const names = (id) => songs[id].notes.map((note) => note.n);
  // 小星星：一闪一闪亮晶晶 = C C G G A A G
  assert.deepEqual(names(0).slice(0, 7), ['C4', 'C4', 'G4', 'G4', 'A4', 'A4', 'G4']);
  assert.deepEqual(names(0).slice(7, 14), ['F4', 'F4', 'E4', 'E4', 'D4', 'D4', 'C4']);
  // 两只老虎：1 2 3 1 开头，结尾 1 5̣ 1（低音 sol 用 G4）
  assert.deepEqual(names(4).slice(0, 4), ['C5', 'D5', 'E5', 'C5']);
  assert.deepEqual(names(4).slice(-3), ['C5', 'G4', 'C5']);
  // 小蜜蜂：sol mi mi / fa re re
  assert.deepEqual(names(1).slice(0, 6), ['G4', 'E4', 'E4', 'F4', 'D4', 'D4']);
  // 粉刷匠：5 3 5 3 5 3 1 开头
  assert.deepEqual(names(2).slice(0, 7), ['G4', 'E4', 'G4', 'E4', 'G4', 'E4', 'C4']);
  // 欢乐颂：3 3 4 5 开头
  assert.deepEqual(names(3).slice(0, 4), ['E4', 'E4', 'F4', 'G4']);
  // 生日快乐：5 5 6 5 1̇ 7 开头，第 3 句 5 5 5̇ 3̇ 1̇ 7 6
  assert.deepEqual(names(6).slice(0, 6), ['G4', 'G4', 'A4', 'G4', 'C5', 'B4']);
  assert.deepEqual(names(6).slice(12, 19), ['G4', 'G4', 'G5', 'E5', 'C5', 'B4', 'A4']);
  // 找朋友：1 1 1 5 3 5 5 开头（教材常见版本）
  assert.deepEqual(names(5).slice(0, 7), ['C4', 'C4', 'C4', 'G4', 'E4', 'G4', 'G4']);
});
