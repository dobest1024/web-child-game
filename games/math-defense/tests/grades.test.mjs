import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { WORLDS } = require('../js/levels.js');
const { makeQuestion, makeChoices } = require('../js/questions.js');
const calc = s => {
  assert.match(s, /^[\d\s.+*/()−×÷-]+$/);
  return Function(`return (${s.replace(/(\d+)\/(\d+)/g,'($1/$2)').replaceAll('−','-').replaceAll('×','*').replaceAll('÷','/')})`)();
};
const answerValue = v => typeof v === 'string' ? calc(v) : v;
function fromPrompt(q) {
  const p = q.prompt;
  const n = (p.match(/\d+(?:\.\d+)?/g) || []).map(Number);
  if (/^[\d\s.+*/()−×÷-]+ = \?$/.test(p)) return calc(p.slice(0,-4));
  if (p.includes('余数')) return n[0] % n[1];
  if (/× □/.test(p)) return n[1] / n[0];
  if (p.includes('平均数')) return n.reduce((a,b)=>a+b,0)/n.length;
  if (p.includes('长方形面积')) return n[0]*n[1];
  if (p.includes('长方形周长')) return (n[0]+n[1])*2;
  if (p.includes('公因数')) { for (let v=Math.min(...n);v>0;v--) if(n.every(x=>x%v===0))return v; }
  if (p.includes('公倍数')) { for(let v=Math.max(...n);;v++)if(n.every(x=>v%x===0))return v; }
  if (p.includes('三角形面积')) return n[0]*n[1]/2;
  if (p.includes('%')) return n[0]*n[1]/100;
  if (p.includes('□ :')) return n[0]*n[1]/n[2];
  if (p.includes('长方体体积')) return n[0]*n[1]*n[2];
  if (p.includes('x +')) return (n[2]-n[1])/n[0];
  throw Error(p);
}
test('高年级题目从显示的题干独立验算，选项完整且数值不重复', () => {
  const kinds = new Set(WORLDS.slice(1).flatMap(w=>w.levels.flatMap(l=>l.kinds)));
  for (const kind of kinds) for(let i=0;i<300;i++) {
    const q=makeQuestion(kind);
    assert.ok(Math.abs(answerValue(q.answer)-fromPrompt(q))<1e-8, `${kind}: ${q.prompt} -> ${q.answer}`);
    for(const count of [2,3,4]) {
      const choices=makeChoices(q,count);
      assert.equal(choices.length,count,q.prompt);
      assert.ok(choices.includes(q.answer),q.prompt);
      assert.equal(new Set(choices.map(answerValue)).size,count,q.prompt);
    }
  }
});
