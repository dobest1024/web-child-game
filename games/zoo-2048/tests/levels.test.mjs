import test from 'node:test';
import assert from 'node:assert/strict';
import { ANIMALS, MAX_LEVEL, animalByValue } from '../levels.js';

test('进化链共 11 级且数据完整', () => {
  assert.equal(ANIMALS.length, 11);
  assert.equal(MAX_LEVEL, 11);
  ANIMALS.forEach((animal, index) => {
    assert.equal(animal.level, index + 1);
    assert.equal(animal.value, 2 ** animal.level);
    assert.ok(animal.name.trim().length > 0, `第 ${animal.level} 级名称为空`);
    assert.match(animal.background, /^#[0-9a-f]{6}$/i);
    assert.ok(animal.svg.includes('<svg'), `第 ${animal.level} 级缺少 SVG`);
    assert.ok(animal.svg.includes('</svg>'), `第 ${animal.level} 级 SVG 未闭合`);
  });
  const values = new Set(ANIMALS.map((animal) => animal.value));
  assert.equal(values.size, 11);
});

test('进化顺序符合设计：蛋到神秘独角兽', () => {
  assert.deepEqual(
    ANIMALS.map((animal) => animal.name),
    ['蛋', '小鸡', '小鸭', '兔子', '小猫', '小狗', '山羊', '绵羊', '小鹿', '狮子', '神秘独角兽'],
  );
  assert.equal(ANIMALS[0].value, 2);
  assert.equal(ANIMALS.at(-1).value, 2048);
});

test('animalByValue 按分值返回对应动物', () => {
  assert.equal(animalByValue(2).name, '蛋');
  assert.equal(animalByValue(64).name, '小狗');
  assert.equal(animalByValue(2048).name, '神秘独角兽');
  assert.equal(animalByValue(2048).level, 11);
  assert.equal(animalByValue(3), null);
  assert.equal(animalByValue(0), null);
});
