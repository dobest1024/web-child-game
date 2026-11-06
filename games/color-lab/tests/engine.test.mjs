import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mixLight,
  mixPigment,
  colorDistance,
  isColorMatch,
  calculateStars,
  sanitizeProgress,
} from '../engine.js';
import { LEVELS } from '../levels.js';

describe('Color Lab Engine', () => {
  it('correctly calculates additive RGB light beam mixing', () => {
    // Red + Green = Yellow (#ffff00)
    const yellow = mixLight(1.0, 1.0, 0.0);
    assert.equal(yellow.hex, '#ffff00');

    // Green + Blue = Cyan (#00ffff)
    const cyan = mixLight(0.0, 1.0, 1.0);
    assert.equal(cyan.hex, '#00ffff');

    // Red + Blue = Magenta (#ff00ff)
    const magenta = mixLight(1.0, 0.0, 1.0);
    assert.equal(magenta.hex, '#ff00ff');

    // Red + Green + Blue = White (#ffffff)
    const white = mixLight(1.0, 1.0, 1.0);
    assert.equal(white.hex, '#ffffff');
  });

  it('correctly calculates subtractive CMY pigment droplet mixing', () => {
    // Empty palette is white canvas
    assert.equal(mixPigment({}).hex, '#ffffff');

    // Cyan + Yellow -> Green (Red and Blue absorbed)
    const green = mixPigment({ c: 2, y: 2 });
    assert.ok(green.g > green.r && green.g > green.b);

    // Magenta + Yellow -> Red (Green and Blue absorbed)
    const red = mixPigment({ m: 2, y: 2 });
    assert.ok(red.r > red.g && red.r > red.b);

    // Cyan + Magenta -> Blue (Red and Green absorbed)
    const blue = mixPigment({ c: 2, m: 2 });
    assert.ok(blue.b > blue.r && blue.b > blue.g);
  });

  it('accurately computes perceptual color distance and match thresholds', () => {
    const c1 = { r: 255, g: 255, b: 0 };
    const c2 = { r: 255, g: 250, b: 5 };
    const dist = colorDistance(c1, c2);
    assert.ok(dist < 15);
    assert.ok(isColorMatch(c1, c2, 20));
  });

  it('calculates stars based on distance and moves', () => {
    assert.equal(calculateStars(30, 2, 2), 0);
    assert.equal(calculateStars(10, 2, 2), 3);
    assert.equal(calculateStars(18, 2, 3), 2);
    assert.equal(calculateStars(22, 2, 4), 1);
  });

  it('sanitizes progress data safely', () => {
    assert.deepEqual(sanitizeProgress(null), { cleared: {}, stars: {} });
    const clean = sanitizeProgress({
      cleared: { '1': true, 'bad': 'no' },
      stars: { '1': 3, 'bad': 10 },
    });
    assert.deepEqual(clean.cleared, { '1': true });
    assert.deepEqual(clean.stars, { '1': 3 });
  });

  it('validates all 12 authored levels for both light and pigment modes', () => {
    assert.equal(LEVELS.length, 12);
    for (const lvl of LEVELS) {
      assert.ok(lvl.title);
      assert.ok(lvl.target && typeof lvl.target.hex === 'string');
      assert.ok(lvl.optimalMoves > 0);
      if (lvl.mode === 'light') {
        assert.ok(Array.isArray(lvl.inputs));
      } else {
        assert.ok(Array.isArray(lvl.palette));
      }
    }
  });
});
