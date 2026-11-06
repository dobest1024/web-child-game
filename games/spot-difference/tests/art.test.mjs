import test from 'node:test';
import assert from 'node:assert/strict';
import { scenes } from '../levels.js';
import { applyDiff, applyDiffs } from '../engine.js';
import { drawScene, flagSvg, hintRing, badgeSvg, mascotSvg } from '../art.js';

test('scene painting is deterministic for identical parameters', () => {
  for (const scene of scenes) {
    assert.equal(
      drawScene(scene.id, scene.params),
      drawScene(scene.id, scene.params),
      `${scene.name} 基线绘制不确定`,
    );
    const changed = applyDiffs(scene.params, scene.diffs);
    assert.equal(
      drawScene(scene.id, changed),
      drawScene(scene.id, changed),
      `${scene.name} 差异图绘制不确定`,
    );
  }
});

test('applying all six diffs produces a visibly different picture', () => {
  for (const scene of scenes) {
    const base = drawScene(scene.id, scene.params);
    const changed = drawScene(scene.id, applyDiffs(scene.params, scene.diffs));
    assert.notEqual(base, changed, `${scene.name} 的差异图没有变化`);
  }
});

test('each single diff changes the painted scene on its own', () => {
  for (const scene of scenes) {
    const base = drawScene(scene.id, scene.params);
    for (const diff of scene.diffs) {
      const single = drawScene(scene.id, applyDiff(scene.params, diff));
      assert.notEqual(
        single,
        base,
        `${scene.name} 的差异 ${diff.path} 在画面上不可见`,
      );
    }
  }
});

test('markers and badges are self-contained deterministic svg snippets', () => {
  assert.match(flagSvg(120, 80), /^<g transform="translate\(120 80\)">/);
  assert.match(hintRing(120, 80, 18), /<circle[^>]*cx="120"[^>]*cy="80"/);
  assert.match(badgeSvg(), /^<svg/);
  assert.match(mascotSvg(), /^<svg/);
  assert.equal(flagSvg(50, 60), flagSvg(50, 60));
  assert.equal(hintRing(50, 60, 14), hintRing(50, 60, 14));
  assert.notEqual(flagSvg(50, 60), flagSvg(80, 60));
});
