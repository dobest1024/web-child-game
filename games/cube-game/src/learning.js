import knowledge from './knowledge.json';
import { TwistyPlayer } from 'cubing/twisty';
import { puzzles } from 'cubing/puzzles';
import { Alg } from 'cubing/alg';
import { cubeArt } from './art.js';
import { cfopLessons } from './cfop.js';
import { caseDiagram } from './teaching.js';
import { baseOrientation } from './mechanics.js';
import { journeyPuzzles } from './journey-model.js';
import { openJourney, readJourney } from './journey.js';

const progressKey = 'cube-island-learning-v1';
function learnedIds() {
  try {
    const ids = JSON.parse(localStorage.getItem(progressKey) || '[]');
    return Array.isArray(ids) ? ids.filter(id => knowledge.items.some(q => q.id === id)) : [];
  } catch { return []; }
}
const colorNames = { W:'白', Y:'黄', G:'绿', B:'蓝', R:'红', O:'橙' };
const colorHex = { W:'#fffef7', Y:'#f8d849', G:'#38a776', B:'#528cd5', R:'#ed6a66', O:'#f5a14a' };
function pieceCard(colors, label) {
  return `<figure class="whole-piece"><div>${colors.map(c => `<span style="background:${colorHex[c]}">${colorNames[c]}</span>`).join('')}</div><figcaption>${label} · 这些颜色属于同一块</figcaption></figure>`;
}

export function renderLearning(hooks) {
  const learned = learnedIds();
  hooks.container.innerHTML = `<div class="page-heading"><span class="eyebrow">一步一步，真的学会</span><h1>魔方小学堂</h1><p>先认识，再动手。会做小练习后，挑战从打乱到完整复原。</p></div>
    <div class="learning-overview"><span>✦ 已获得 <strong>${learned.length}/${knowledge.items.length}</strong> 枚知识印章</span><span>不计时 · 答错可重试 · 语音陪你学</span></div>
    <h2>① 先把知识变成本领</h2><div class="learning-topics">${knowledge.topics.map((topic, i) => {
      const items = knowledge.items.filter(q => q.topic === topic.id);
      return `<article class="learning-topic"><span class="topic-number">0${i+1}</span><h3>${topic.title}</h3><p>${topic.goal}</p><div class="knowledge-lessons">${items.map(q => `<button data-knowledge="${q.id}"><span>${learned.includes(q.id)?'✓':'○'}</span>${q.title}<span aria-hidden="true">→</span></button>`).join('')}</div></article>`;
    }).join('')}</div>
    <section class="journey-catalog"><h2>② 用同一颗魔方，走完全程</h2><p>每小关都接着刚才的局面继续，不会换一颗已经准备好的魔方。自己转错了也没关系，小方可以重新找路。</p>
    <label class="difficulty-choice">这次打乱多少步？ <select id="journey-difficulty"><option value="5">先试 5 步</option><option value="15" selected>练习 15 步</option><option value="25">挑战 25 步</option></select></label>
    <div class="journey-cards">${journeyPuzzles.map(p => `<article><div class="journey-art">${cubeArt(p.id)}</div><h3>${p.title}</h3><p>${p.description}</p><small>${p.stages} 个连续检查点 · 中途自动保存</small><button class="button primary full" data-journey="${p.id}">开始新的完整复原</button>${readJourney(p.id)?`<button class="button secondary full" data-resume="${p.id}">接着上次的魔方</button>`:''}</article>`).join('')}</div></section>
    <section class="f2l-practice"><h2>③ 角棱配对，动手试试</h2><p>先找配色相同的伙伴，在顶层配对，再一起入槽。做完一组，检查白十字与已经完成的伙伴。</p><div class="knowledge-lessons">${cfopLessons.map((q,i) => q.chapter==='f2l'?`<button data-f2l="${i}">${q.name}<span aria-hidden="true">→</span></button>`:'').join('')}</div></section>
    <p class="catalog-note">完整路线针对网站内的合法打乱。三阶采用逐层复原，先学会判断和检查，再练速度。知识印章与原有关卡星星分别记录。</p>`;
  hooks.container.querySelectorAll('[data-knowledge]').forEach(b => b.onclick = () => openKnowledge(b.dataset.knowledge, hooks));
  hooks.container.querySelectorAll('[data-journey]').forEach(b => b.onclick = () => openJourney(b.dataset.journey, Number(document.querySelector('#journey-difficulty').value), hooks));
  hooks.container.querySelectorAll('[data-resume]').forEach(b => b.onclick = () => openJourney(b.dataset.resume, 15, hooks, true));
  hooks.container.querySelectorAll('[data-f2l]').forEach(b => b.onclick = () => hooks.startGame('cfop', Number(b.dataset.f2l)));
}

async function openKnowledge(id, hooks) {
  const q = knowledge.items.find(item => item.id === id);
  const topic = knowledge.topics.find(t => t.id === q.topic);
  let active = true, player = null, answered = false;
  const narration = q.explanation + q.question;
  hooks.mountModal(`<div class="game-header"><div><span class="eyebrow">${topic.title}</span><h2 id="modal-title">${q.title}</h2></div><button class="icon-button" id="close-modal" aria-label="离开小学堂">×</button></div>
    <div class="knowledge-body"><p class="knowledge-explanation">${q.explanation}</p><button class="button secondary" id="knowledge-listen">听小方讲一遍</button>
    ${q.pieceColors?pieceCard(q.pieceColors,q.pieceLabel):''}${q.partnerColors?pieceCard(q.partnerColors,q.partnerLabel):''}
    ${q.caseId?'<div id="knowledge-case"></div>':''}
    ${q.alg?`<div class="knowledge-demo"><div id="knowledge-cube"><span class="loading">小方正在准备示范…</span></div><p>${q.demoHint}</p><button class="button secondary" id="knowledge-demo" disabled>看一次动作示范</button></div>`:''}
    <h3 id="knowledge-question">${q.question}</h3><div class="knowledge-choices" role="group" aria-labelledby="knowledge-question">${q.choices.map((choice,i)=>`<button data-answer="${i}"><b>${['A','B','C'][i]}</b><span>${choice}</span></button>`).join('')}</div>
    <div id="knowledge-feedback" role="status" aria-live="polite"></div><button id="knowledge-next" class="button primary full" disabled>答对后，继续下一题</button></div>`, 'knowledge-modal');
  hooks.setCleanup(() => { active = false; player?.pause(); });
  document.querySelector('#knowledge-listen').onclick = () => hooks.speak(narration, true);
  document.querySelectorAll('[data-answer]').forEach(button => button.onclick = () => {
    if (answered) return;
    const answer = Number(button.dataset.answer), correct = answer === q.answer;
    const message = correct ? q.success : q.wrongFeedback[answer];
    document.querySelector('#knowledge-feedback').className = correct ? 'answer-feedback correct' : 'answer-feedback retry';
    document.querySelector('#knowledge-feedback').textContent = `${correct?'✓ 答对啦！':'再想一想：'}${message}`;
    button.classList.add(correct?'correct':'retry');
    player?.pause(); hooks.speak(message);
    if (!correct) return;
    answered = true;
    document.querySelectorAll('[data-answer]').forEach(b => b.disabled = true);
    const ids = learnedIds();
    if (!ids.includes(q.id)) {
      try { localStorage.setItem(progressKey, JSON.stringify([...ids, q.id])); }
      catch { hooks.toast('当前浏览器不能保存印章，仍可以继续学习。'); }
    }
    const next = document.querySelector('#knowledge-next'); next.disabled = false; next.textContent = '学会了，继续下一题 →';
    hooks.refresh();
  });
  document.querySelector('#knowledge-next').onclick = () => {
    const index = knowledge.items.indexOf(q), next = knowledge.items[index+1];
    if (next) openKnowledge(next.id, hooks); else { hooks.closeModal(); hooks.refresh(); }
  };
  if (q.alg || q.caseId) {
    try {
      const k = await puzzles[q.puzzle || "3x3x3"].kpuzzle();
      if (!active) return;
      if (q.alg) {
      const setup = `${baseOrientation(q.puzzle)} ${new Alg(q.alg).invert()}`;
      player = new TwistyPlayer({ puzzle:q.puzzle, experimentalSetupAlg:setup, alg:q.alg, controlPanel:'none', background:'none', hintFacelets:'none', experimentalMovePressInput:'none', cameraLatitude:28, cameraLongitude:30, tempoScale:.65 });
      player.setAttribute('role','img'); player.setAttribute('aria-label',q.demoHint);
      document.querySelector('#knowledge-cube').replaceChildren(player);
      const demo = document.querySelector('#knowledge-demo'); demo.disabled = false;
      demo.onclick = () => { player.jumpToStart(); player.play(); };
      }
      if(q.caseId) {
        const lesson = cfopLessons.find(s=>s.id===q.caseId);
        document.querySelector('#knowledge-case').innerHTML = caseDiagram(k.defaultPattern().applyAlg(`${baseOrientation(q.puzzle || "3x3x3")} ${new Alg(lesson.alg).invert()}`),q.caseCaption || '观察这一局面');
      }
    } catch { if(active && document.querySelector('#knowledge-cube')) document.querySelector('#knowledge-cube').textContent='示范暂时没准备好。可以先听讲解、做选择题，再关闭重试。'; }
  }
  if (active && !answered) hooks.speak(narration);
}
