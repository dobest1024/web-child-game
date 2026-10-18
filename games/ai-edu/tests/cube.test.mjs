import assert from 'node:assert/strict';
import { Cube, daisyBase, puzzleFrom, randomCrossPuzzle, normalize, invertSeq } from '../js/cube.js';

// 每个面转 4 次回到原样
for (const f of 'UDLRFB') assert.ok(new Cube().moves([f, f, f, f]).isSolved(), f + ' x4');
assert.ok(!new Cube().move('R').isSolved());
assert.ok(new Cube().moves(["R", "R'"]).isSolved());

// 方向检查：R 把前面的贴纸送到上面；U 把前面送到左面；F 把上面送到右面
const c = new Cube().move('R');
assert.equal(c.colorAt([1, 1, 1], [0, 1, 0]), 'G', 'R: F→U');
assert.equal(new Cube().move('U').colorAt([-1, 1, 1], [-1, 0, 0]), 'G', 'U: F→L');
assert.equal(new Cube().move('F').colorAt([1, 1, 1], [1, 0, 0]), 'Y', 'F: U→R');

// 魔法咒语 R U R' U' 做 6 遍回到原样，做 1~5 遍都不是
const spell = ['R', 'U', "R'", "U'"];
const s = new Cube();
for (let i = 1; i <= 6; i++) { s.moves(spell); assert.equal(s.isSolved(), i === 6, 'spell round ' + i); }

// 小白花基础态
const d = daisyBase();
assert.ok(d.isDaisy() && !d.isWhiteCross());
assert.ok(d.clone().moves(['L2', 'B2', 'R2', 'F2']).isSolved());

// 第 3 关固定题目
for (const sol of [['F2'], ['R'], ['U', 'F']]) {
  const p = puzzleFrom(d, sol);
  assert.ok(!p.start.isDaisy(), 'puzzle not trivially done ' + sol);
  assert.ok(p.start.clone().moves(sol).isDaisy(), 'solution works ' + sol);
}
// [U, F] 必须先腾空位：直接 F 会碰掉花瓣
assert.ok(!puzzleFrom(d, ['U', 'F']).start.clone().move('F').isDaisy());

// 随机白十字题目
for (let i = 0; i < 300; i++) {
  const p = randomCrossPuzzle();
  assert.ok(p.start.isDaisy() && !p.start.isWhiteCross());
  assert.ok(p.start.clone().moves(p.solution).isWhiteCross());
}

// 记号工具
assert.deepEqual(normalize(['U', 'U', 'U']), ["U'"]);
assert.deepEqual(invertSeq(['R', "U'", 'F2']), ['F2', 'U', "R'"]);

console.log('all cube tests passed');
