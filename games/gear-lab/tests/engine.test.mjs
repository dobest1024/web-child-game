import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { solveGears, canMesh, calculateStars, sanitizeProgress, GEAR_TYPES } from '../engine.js';
import { LEVELS } from '../levels.js';

describe('Gear Lab Engine', () => {
  it('correctly calculates meshing distances between gear types', () => {
    const pegA = { x: 100, y: 100 };
    const pegB = { x: 175, y: 100 }; // dist = 75

    // S (30) + M (45) = 75 => should mesh
    assert.ok(canMesh(pegA, GEAR_TYPES.S, pegB, GEAR_TYPES.M));
    // S (30) + S (30) = 60 => should NOT mesh at 75
    assert.ok(!canMesh(pegA, GEAR_TYPES.S, pegB, GEAR_TYPES.S));
  });

  it('solves simple 3-gear transmission line', () => {
    const level1 = LEVELS[0];
    // Pegs: Motor (S at 180,200), Mid (at 255,200), Target (M at 345,200)
    // Placed: Mid = M
    const placed = { p_mid: 'M' };
    const result = solveGears(level1.pegs, placed);
    assert.equal(result.jammed, false);
    assert.equal(result.solved, true);

    // Motor rotates CW (dir: 1, speed: 1.0)
    assert.equal(result.gearStates['p_motor'].dir, 1);
    // Mid gear M rotates CCW (dir: -1, speed: 12/18 = 0.6667)
    assert.equal(result.gearStates['p_mid'].dir, -1);
    // Target gear M rotates CW (dir: 1, speed: 0.6667 * 18/18 = 0.6667)
    assert.equal(result.gearStates['p_target'].dir, 1);
  });

  it('detects mechanical gear jam when odd cycle of meshing gears is formed', () => {
    // Equilateral triangle of pegs with side 60
    // Three S gears (radius 30) placed at all 3 vertices
    const pegs = [
      { id: 'm', x: 100, y: 100, fixedGear: 'S', isMotor: true },
      { id: 'b', x: 160, y: 100, fixedGear: 'S' },
      { id: 'c', x: 130, y: 152, fixedGear: 'S' }, // dist ~ 60 to both m and b
    ];
    const result = solveGears(pegs, {});
    assert.equal(result.jammed, true);
    assert.equal(result.solved, false);
  });

  it('calculates stars based on gears used vs optimal budget', () => {
    assert.equal(calculateStars(false, 1, 1), 0);
    assert.equal(calculateStars(true, 1, 1), 3);
    assert.equal(calculateStars(true, 2, 1), 2);
    assert.equal(calculateStars(true, 4, 1), 1);
  });

  it('sanitizes saved progress records safely', () => {
    assert.deepEqual(sanitizeProgress(null), { cleared: {}, stars: {} });
    const raw = {
      cleared: { '1': true, 'bad': 'yes' },
      stars: { '1': 3, 'bad': -5 },
    };
    const clean = sanitizeProgress(raw);
    assert.deepEqual(clean.cleared, { '1': true });
    assert.deepEqual(clean.stars, { '1': 3 });
  });

  it('verifies all 12 levels have motor, target, and valid peg metadata', () => {
    assert.equal(LEVELS.length, 12);
    for (const lvl of LEVELS) {
      assert.ok(lvl.title, `Level ${lvl.id} has title`);
      assert.ok(lvl.tray.length > 0, `Level ${lvl.id} has tray gears`);
      assert.ok(lvl.optimalGears > 0, `Level ${lvl.id} has positive optimal gears`);

      const motor = lvl.pegs.find(p => p.isMotor);
      assert.ok(motor, `Level ${lvl.id} must have a motor peg`);
      const target = lvl.pegs.find(p => p.isTarget);
      assert.ok(target, `Level ${lvl.id} must have a target peg`);
    }
  });
});
