import test from 'node:test';
import assert from 'node:assert/strict';
import {
  caesarShift,
  caesarDecrypt,
  morseEncode,
  morseDecode,
  atbash,
  verifyAnswer,
  calculateStars,
  sanitizeProgress,
} from '../engine.js';
import { LEVELS } from '../levels.js';

test('Cipher Breaker Engine', async (t) => {
  await t.test('Caesar cipher shifting and decrypting', () => {
    assert.equal(caesarShift('ABC', 1), 'BCD');
    assert.equal(caesarShift('XYZ', 3), 'ABC');
    assert.equal(caesarDecrypt('BCD', 1), 'ABC');
    assert.equal(caesarDecrypt('ABC', 3), 'XYZ');
  });

  await t.test('Morse code encoding and decoding', () => {
    assert.equal(morseEncode('SOS'), '... --- ...');
    assert.equal(morseDecode('... --- ...'), 'SOS');
    assert.equal(morseEncode('CAT'), '-.-. .- -');
    assert.equal(morseDecode('-.-. .- -'), 'CAT');
  });

  await t.test('Atbash mirror substitution', () => {
    assert.equal(atbash('ABC'), 'ZYX');
    assert.equal(atbash('ZYX'), 'ABC');
    assert.equal(atbash('BOY'), 'YLB');
  });

  await t.test('verifies answers case-insensitively with trimming', () => {
    assert.ok(verifyAnswer('cat', 'CAT'));
    assert.ok(verifyAnswer('  LION  ', 'LION'));
    assert.ok(!verifyAnswer('DOG', 'CAT'));
  });

  await t.test('calculates stars and sanitizes player progress', () => {
    assert.equal(calculateStars(1, 0), 3);
    assert.equal(calculateStars(2, 0), 2);
    assert.equal(calculateStars(4, 0), 1);

    const clean = sanitizeProgress({ 1: 3, 2: '2', 999: 1 });
    assert.equal(clean[1], 3);
    assert.equal(clean[2], 2);
    assert.equal(clean[999], undefined);
  });

  await t.test('verifies all 12 authored levels have valid encrypted messages', () => {
    assert.equal(LEVELS.length, 12);
    for (const lvl of LEVELS) {
      assert.ok(lvl.id >= 1 && lvl.id <= 12);
      assert.ok(lvl.plainText && lvl.cipherText);
      if (lvl.type === 'caesar') {
        assert.equal(caesarDecrypt(lvl.cipherText, lvl.shift), lvl.plainText);
      } else if (lvl.type === 'morse') {
        assert.equal(morseDecode(lvl.cipherText), lvl.plainText);
      } else if (lvl.type === 'atbash') {
        assert.equal(atbash(lvl.cipherText), lvl.plainText);
      }
    }
  });
});
