import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NOTE_DEFINITIONS,
  NOTE_MAP,
  getStaffPosition,
  checkNoteMatch,
  calculateStars,
  sanitizeProgress,
} from '../engine.js';
import { LEVELS } from '../levels.js';

test('Melody Hopper Engine', async (t) => {
  await t.test('defines valid musical notes and staff positions', () => {
    assert.equal(NOTE_DEFINITIONS.length, 11);
    assert.equal(NOTE_MAP['C4'].freq, 261.63);
    assert.equal(NOTE_MAP['A4'].freq, 440.00);
    assert.equal(getStaffPosition('C4'), -1);
    assert.equal(getStaffPosition('E4'), 0);
    assert.equal(getStaffPosition('G4'), 1);
  });

  await t.test('checks note matching accurately', () => {
    assert.ok(checkNoteMatch('C4', 'C4'));
    assert.ok(!checkNoteMatch('C4', 'D4'));
  });

  await t.test('calculates stars based on performance', () => {
    assert.equal(calculateStars(0, 0), 3);
    assert.equal(calculateStars(1, 0), 2);
    assert.equal(calculateStars(2, 0), 2);
    assert.equal(calculateStars(4, 0), 1);
  });

  await t.test('sanitizes saved player progress safely', () => {
    const raw = { 1: 3, 2: '2', 3: 0, bad: 99, 105: 3 };
    const clean = sanitizeProgress(raw);
    assert.equal(clean[1], 3);
    assert.equal(clean[2], 2);
    assert.equal(clean[3], 1);
    assert.equal(clean.bad, undefined);
    assert.equal(clean[105], undefined);
  });

  await t.test('verifies all 12 authored levels have valid melodies', () => {
    assert.equal(LEVELS.length, 12);
    for (const lvl of LEVELS) {
      assert.ok(lvl.id >= 1 && lvl.id <= 12);
      assert.ok(lvl.title && lvl.title.length > 0);
      assert.ok(Array.isArray(lvl.melody) && lvl.melody.length >= 3);
      for (const noteId of lvl.melody) {
        assert.ok(NOTE_MAP[noteId], `Level ${lvl.id} note ${noteId} must exist in NOTE_MAP`);
      }
    }
  });
});
