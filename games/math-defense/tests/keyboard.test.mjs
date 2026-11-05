import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function keyboard(labels) {
  const answers = [];
  let question = {};
  let pending;
  const source = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
  const context = {
    game: { typed: '', currentQ: () => question, choiceLabels: () => labels, answerValue: (v) => answers.push(v) },
    $: () => ({ hidden: true, classList: { contains: () => true } }),
    document: { addEventListener: (_, callback) => { context.key = callback; } },
    setTimeout: (callback) => { pending = callback; return 1; }, clearTimeout() { pending = null; }, pause() {},
  };
  vm.createContext(context);
  // 运行真实页面输入处理；其余 DOM 不参与此回归。
  vm.runInContext(source.slice(source.indexOf('let typedTimer'), source.indexOf('// ---------- 通用跳转')), context);
  return { answers, context, changeQuestion: () => { question = {}; }, fire: () => pending?.(), type: (value) => {
    for (const key of value) context.key({ key, code: key, preventDefault() {} });
  } };
}

test('小数与分数可以完整键入，不误当成比较符号或提前提交整数前缀', () => {
  const decimal = keyboard(['10', '10.1', '10.2', '10.3']);
  decimal.type('10.2');
  assert.deepEqual(decimal.answers, ['10.2']);
  const fraction = keyboard(['1/4', '11/36', '5/18', '13/36']);
  fraction.type('1/4');
  assert.deepEqual(fraction.answers, ['1/4']);
});

test('比大小仍支持句号快捷键', () => {
  const input = keyboard(['<', '=', '>']);
  input.type('.');
  assert.deepEqual(input.answers, ['>']);
});


test('输入等待期间换题不把旧数字交给新题，下一次输入也不沿用旧前缀', () => {
  const input = keyboard(['1', '12']);
  input.type('1');
  input.changeQuestion();
  input.fire();
  assert.deepEqual(input.answers, []);
  input.type('1');
  input.changeQuestion();
  input.type('2');
  assert.deepEqual(input.answers, []);
});

test('暂停或离开时取消数字等待，不提交延迟答案', () => {
  const input = keyboard(['1', '12']);
  input.type('1');
  input.context.resetTyped();
  input.fire();
  assert.deepEqual(input.answers, []);
  assert.equal(input.context.game.typed, '');
});
