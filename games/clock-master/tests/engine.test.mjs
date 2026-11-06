import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  timeToAngles,
  addTime,
  isTimeMatch,
  calculateStars,
  sanitizeProgress,
} from '../engine.js';
import { LEVELS } from '../levels.js';

describe('Clock Master Engine', () => {
  it('converts time to accurate hour and minute dial angles', () => {
    // 12:00 -> both at 0 deg
    const t12 = timeToAngles(12, 0);
    assert.equal(t12.minuteAngle, 0);
    assert.equal(t12.hourAngle, 0);

    // 3:00 -> minute at 0, hour at 90 deg
    const t3 = timeToAngles(3, 0);
    assert.equal(t3.minuteAngle, 0);
    assert.equal(t3.hourAngle, 90);

    // 6:30 -> minute at 180, hour at 6*30 + 30*0.5 = 195 deg
    const t630 = timeToAngles(6, 30);
    assert.equal(t630.minuteAngle, 180);
    assert.equal(t630.hourAngle, 195);
  });

  it('calculates elapsed time and carries minutes over correctly', () => {
    // 7:25 + 45 min -> 8:10
    const t = addTime(7, 25, 45);
    assert.equal(t.hours, 8);
    assert.equal(t.minutes, 10);

    // 8:40 + 215 min (3h 35m) -> 12:15
    const t2 = addTime(8, 40, 215);
    assert.equal(t2.hours, 12);
    assert.equal(t2.minutes, 15);
  });

  it('determines if player dial time matches target with tolerance', () => {
    assert.ok(isTimeMatch(3, 0, 3, 0));
    assert.ok(isTimeMatch(3, 1, 3, 0, 2)); // within 1 min
    assert.ok(!isTimeMatch(3, 5, 3, 0, 2)); // 5 min off
    // wrap around 12:00 vs 11:59
    assert.ok(isTimeMatch(12, 0, 11, 59, 2));
  });

  it('calculates stars based on moves and optimal budget', () => {
    assert.equal(calculateStars(1, 1), 3);
    assert.equal(calculateStars(3, 1), 2);
    assert.equal(calculateStars(5, 1), 1);
  });

  it('sanitizes user progress data safely', () => {
    assert.deepEqual(sanitizeProgress(null), { cleared: {}, stars: {} });
    const clean = sanitizeProgress({
      cleared: { '1': true, 'bad': 'no' },
      stars: { '1': 3, 'bad': 5 },
    });
    assert.deepEqual(clean, {
      cleared: { '1': true },
      stars: { '1': 3 },
    });
  });

  it('verifies all 12 authored clock levels have valid times and metadata', () => {
    assert.equal(LEVELS.length, 12);
    for (const lvl of LEVELS) {
      assert.ok(lvl.title);
      assert.ok(lvl.targetH >= 1 && lvl.targetH <= 12);
      assert.ok(lvl.targetM >= 0 && lvl.targetM <= 59);
      assert.ok(lvl.optimalMoves > 0);
    }
  });
});
