import { TwistyPlayer } from 'cubing/twisty';
import { puzzles } from 'cubing/puzzles';
import { baseOrientation, puzzleSolved } from './mechanics.js';
import { moveWords } from './content.js';
import { caseDiagram } from './teaching.js';
import { journeyPuzzles, phaseWords, journeySpeech, goalSatisfied, randomSetup, validJourneySave, routeWalk } from './journey-model.js';

const saveKey = puzzle => `cube-island-journey-${puzzle}`;
export function readJourney(puzzle) {
  try {
    const value = JSON.parse(localStorage.getItem(saveKey(puzzle)) || 'null');
    return validJourneySave(value, puzzle) ? value : null;
  } catch { return null; }
}
const positions = {
  EDGES: ['上前','上右','上后','上左','下前','下右','下后','下左','前右中层','前左中层','后右中层','后左中层'],
  CORNERS: ['上前右','上后右','上后左','上前左','下前右','下前左','下后左','下后右'],
};
const targetNames = {
  cross: ['白绿','白橙','白蓝','白红'],
  'first-corners': ['白绿橙','白绿红','白蓝红','白蓝橙'],
  'bottom-corners': ['白绿橙','白绿红','白蓝红','白蓝橙'],
  'middle-edges': ['绿橙','绿红','蓝橙','蓝红'],
};
function phaseTitle(phase) {
  const words = phaseWords(phase.id), number = Number(phase.id.split('-').at(-1));
  const key = phase.id.replace(/-\d+$/, '');
  return words.title + (number ? ` · 第 ${number} 块${targetNames[key]?`（${targetNames[key][number-1]}）`:''}` : '');
}

export async function openJourney(puzzle, difficulty, hooks, resume = false) {
  const info = journeyPuzzles.find(p=>p.id===puzzle);
  const saved = resume ? readJourney(puzzle) : null;
  const g = { active:true, busy:false, planning:true, auto:false, run:0, request:0, done:false, phases:[], phase:null,
    setup:saved?.setup || randomSetup(puzzle, difficulty), history:saved?.history || [], offset:0, player:null, k:null, timer:null, resolveMove:null };
  const $ = s => document.querySelector(s);
  hooks.mountModal(`<div class="game-header"><div><span class="eyebrow">同一颗魔方 · 连续复原</span><h2 id="modal-title">${info.title}</h2></div><button class="icon-button" id="close-modal" aria-label="保存并离开完整复原">×</button></div>
    <div class="continuous-layout"><div class="journey-play"><div class="canvas-top"><span>拖动观察 · 按按钮转层</span><strong id="journey-count">0 次转动</strong></div><div id="journey-cube"><span class="loading">小方正在准备魔方和路线…</span></div><p class="journey-hold">${puzzle==='pyraminx'?'保持初始拿法。正对要转的顶点判断方向；小写只转尖角，大写转大层。':'白色在下，黄色在上，绿色朝自己。拖动画面只改变观察视角，R / U / F 仍指原来的面。'}</p>
    <details class="journey-manual"><summary>自己动手转（可选）</summary><div class="move-pad" id="journey-moves"></div></details>
    <div class="play-toolbar"><button id="journey-undo" disabled>↶ 撤回一步</button><button id="journey-camera" disabled>回到正面</button></div><p class="save-note" id="journey-save">练习会自动保存，关掉后可以继续。</p></div>
    <aside class="journey-teaching"><p class="eyebrow" id="journey-progress">正在观察当前局面</p><details class="journey-map"><summary>查看完整复原路线</summary><ol id="journey-phases"></ol></details><h3 id="journey-title">先准备一下</h3><p class="knowledge-explanation" id="journey-why">小方正在看每一块的位置，找到这次的分步路线。</p><button class="text-link" id="journey-listen" disabled>听小方讲这一步</button><div id="journey-target"></div><div id="journey-case"></div>
    <div class="journey-group" id="journey-group"></div><div class="alg-steps" id="journey-alg"></div><div class="next-move" id="journey-next-move" aria-live="polite"></div>
    <button class="button primary full" id="journey-step" disabled>跟着转这一步</button><button class="button secondary full" id="journey-auto" disabled>演示这一组</button>
    <div class="journey-check"><strong>做完后看什么？</strong><p id="journey-check-text">先观察，再动手。</p><button class="button secondary full" id="journey-check" disabled>我来检查</button></div>
    <div id="journey-feedback" role="status" aria-live="polite"></div><button class="button primary full" id="journey-next" hidden>检查通过，继续下一小关 →</button><button class="text-link full" id="journey-replan" disabled>转了另一条路？请小方重新找路</button><p class="case-note">中途颜色暂时变乱很正常。做完本小关的动作，再检查；这条路线帮助你学会步骤，不追求最少转动次数。</p></aside></div>`, 'journey-modal');
  const worker = new Worker(new URL('./journey-worker.js', import.meta.url), { type:'module' });
  const stopAuto = () => { g.auto=false; g.run++; hooks.stopSpeech(); };
  hooks.setCleanup(() => { g.active=false; stopAuto(); clearTimeout(g.timer); g.resolveMove?.(); worker.terminate(); g.player?.pause(); });
  function save() {
    try { localStorage.setItem(saveKey(puzzle), JSON.stringify({puzzle,setup:g.setup,history:g.history,done:g.done})); }
    catch { if(g.active) $('#journey-save').textContent='当前浏览器不能保存。离开前请记住自己的进度。'; }
  }
  function currentPattern() { return g.k.defaultPattern().applyAlg(`${g.setup} ${g.history.join(' ')}`); }
  function solved() { return puzzleSolved(g.k,g.setup,g.history,baseOrientation(puzzle)); }
  function phasePassed() { return g.phase && goalSatisfied(currentPattern(), g.target, g.phase.goal); }
  function walk() { return routeWalk(g.history.slice(g.offset),g.phase.alg.split(" ").filter(Boolean),puzzle); }
  function remaining() { return g.phase ? walk().remaining : []; }
  function groupInfo() {
    const { index, detour } = walk();
    if (detour.length) return null;
    let offset=0;
    for(let i=0;i<g.phase.groups.length;i++) {
      const group=g.phase.groups[i], tokens=group.alg.split(' ');
      if(index<offset+tokens.length) return {index:i,within:index-offset,end:offset+tokens.length,tokens};
      offset+=tokens.length;
    }
    return null;
  }
  function finish(announce = true) {
    if(g.done) return;
    g.done=true; g.auto=false; g.run++; save(); hooks.refresh();
    $('#journey-title').textContent='一整颗，复原成功啦！';
    $('#journey-why').textContent=journeySpeech.complete;
    $('#journey-feedback').className='answer-feedback correct';
    $('#journey-feedback').textContent='✦ 从打乱到复原完成！可以拖动魔方，检查每一个面。';
    $('#journey-next').hidden=false; $('#journey-next').textContent='带着本领，回到小学堂';
    $('#journey-progress').textContent='全部阶段完成';
    $('#journey-phases').innerHTML=g.phases.map(p=>`<li class="complete">✓ ${phaseTitle(p)}</li>`).join('');
    if (announce) hooks.speak(journeySpeech.complete);
  }
  function paint() {
    if(!g.active || !g.k || !g.player) return;
    const ready=!g.busy&&!g.planning&&!g.done;
    const passed=!!phasePassed(), rest=remaining(), group=g.phase?groupInfo():null;
    $('#journey-count').textContent=`${g.history.length} 次转动`;
    $('#journey-moves').querySelectorAll('button').forEach(b=>b.disabled=!ready||g.auto);
    $('#journey-undo').disabled=g.busy||g.planning||!g.history.length||g.auto;
    $('#journey-camera').disabled=g.planning;
    $('#journey-step').disabled=!ready||passed||g.auto||!rest.length;
    $('#journey-auto').disabled=!g.auto&&(!ready||passed||!rest.length);
    $('#journey-auto').textContent=g.auto?'暂停演示':'演示这一组';
    $('#journey-check').disabled=!ready||g.auto;
    $('#journey-listen').disabled=g.planning||!g.phase;
    $('#journey-replan').disabled=g.busy||g.planning||g.done;
    $('#journey-next').hidden=!(g.done||(passed&&!g.busy));
    if(g.done) {
      $('#journey-next-move').textContent='整颗复原成功！'; $('#journey-alg').innerHTML=''; $('#journey-group').textContent=''; return;
    }
    if(!g.phase) return;
    $('#journey-next-move').textContent=passed?'这一小关的目标已经达成，检查后继续。':rest.length?`${rest[0]} · ${moveWords(rest[0],puzzle)}`:'请检查当前局面。';
    $('#journey-group').textContent=passed?'小关完成':group?`动作组 ${group.index+1}/${g.phase.groups.length} · 组内第 ${group.within+1}/${group.tokens.length} 步`:'走了另一条路。提示会先撤回偏离动作；也可以重新找路。';
    $('#journey-alg').innerHTML=group?group.tokens.map((m,i)=>`<span class="alg-token ${i<group.within?'finished':''}">${m}</span>`).join(''):'';
    if(g.phase.id.match(/^(cross|first-corners|middle-edges|bottom-corners)-/)) {
      const orbit=g.phase.id.includes('corners')?'CORNERS':'EDGES', slot=g.phase.goal[orbit].at(-1);
      const where=currentPattern().patternData[orbit].pieces.indexOf(g.target.patternData[orbit].pieces[slot]);
      $('#journey-target').textContent=`找一找：这颗目标块现在在${positions[orbit][where]}，要回到${positions[orbit][slot]}。`;
    } else $('#journey-target').textContent='';
  }
  function plan() {
    if(!g.active||g.busy||!g.k) return;
    stopAuto(); g.planning=true; g.done=false; g.phase=null;
    $('#journey-feedback').textContent=''; $('#journey-next').hidden=true;
    $('#journey-title').textContent='小方重新看一看'; $('#journey-why').textContent='魔方保持现在的样子，小方正在根据每一块的位置找路。';
    $('#journey-case').innerHTML=''; $('#journey-alg').innerHTML=''; $('#journey-group').textContent=''; $('#journey-target').textContent='';
    if(solved()) { g.planning=false; finish(); paint(); return; }
    paint(); worker.postMessage({request:++g.request,puzzle,alg:`${g.setup} ${g.history.join(' ')}`});
  }
  worker.onmessage=({data})=>{
    if(!g.active||data.request!==g.request) return;
    g.planning=false;
    if(data.error) { $('#journey-title').textContent='小方需要再想一想'; $('#journey-why').textContent=data.error; paint(); return; }
    g.phases=data.phases; g.phase=g.phases.find(p=>p.alg.trim()); g.offset=g.history.length;
    if(!g.phase) { if(solved())finish(); else $('#journey-why').textContent='路线暂时没准备好，请重新找路。'; paint(); return; }
    const index=g.phases.indexOf(g.phase), words=phaseWords(g.phase.id);
    $('#journey-progress').textContent=`第 ${index+1}/${g.phases.length} 个检查点 · 已完成的阶段自动跳过`;
    $('#journey-phases').innerHTML=g.phases.map((p,i)=>`<li class="${i<index?'complete':i===index?'current':''}">${i<index?'✓':i===index?'→':'○'} ${phaseTitle(p)}</li>`).join('');
    $('#journey-title').textContent=phaseTitle(g.phase); $('#journey-why').textContent=words.why; $('#journey-check-text').textContent=words.check;
    $('#journey-next').textContent='检查通过，继续下一小关 →';
    if(puzzle==='3x3x3'&&['yellow-cross','yellow-corners','pll-corners','pll-edges'].includes(g.phase.id)) $('#journey-case').innerHTML=caseDiagram(currentPattern(),'这一小关开始时 · 看顶面和侧色');
    save(); paint(); hooks.speak(words.why);
  };
  worker.onerror=()=>{if(g.active){g.planning=false;$('#journey-why').textContent='路线加载失败，请离开后重试。';paint();}};
  async function turn(move, guided=false) {
    if(!g.active||g.busy||g.planning||g.done) return false;
    const actionRun = g.run;
    g.busy=true; g.history.push(move); g.player.experimentalAddMove(move); save(); paint();
    const voice=guided?hooks.speak(moveWords(move,puzzle)):Promise.resolve();
    await Promise.all([voice,new Promise(resolve=>{g.resolveMove=resolve;g.timer=setTimeout(()=>{g.resolveMove=null;resolve();},700);})]);
    if(!g.active) return false;
    g.busy=false; paint();
    // Finish only after the spoken move, so the reward cannot cut the instruction off.
    if(solved()) { finish(g.run === actionRun); paint(); }
    return true;
  }
  $('#journey-step').onclick=()=>{const move=remaining()[0];if(move)turn(move,true);};
  $('#journey-auto').onclick=async()=>{
    if(g.auto){stopAuto();paint();return;}
    g.auto=true; const token=++g.run; const group=groupInfo();
    const limit=group?group.end:walk().index+1;
    paint();
    do {
      const next=remaining()[0]; if(!next)break;
      await turn(next,true);
    } while(g.active&&g.auto&&token===g.run&&!g.done&&!phasePassed()&&walk().index<limit);
    if(g.active&&token===g.run){g.auto=false;paint();}
  };
  $('#journey-undo').onclick=()=>{
    if(g.busy||g.planning||!g.history.length)return;
    stopAuto();g.history.pop();g.done=false;g.player.alg=g.history.join(' ');g.player.jumpToEnd();save();plan();
  };
  $('#journey-camera').onclick=()=>{g.player.cameraLatitude=28;g.player.cameraLongitude=30;};
  $('#journey-listen').onclick=()=>{stopAuto();paint();hooks.speak(g.done?journeySpeech.complete:phaseWords(g.phase.id).why,true);};
  $('#journey-check').onclick=()=>{
    const passed=phasePassed(); $('#journey-feedback').className=`answer-feedback ${passed?'correct':'retry'}`;
    $('#journey-feedback').textContent=passed?journeySpeech.passed:journeySpeech.retry;
    hooks.speak(passed?journeySpeech.passed:journeySpeech.retry);paint();
  };
  $('#journey-next').onclick=()=>{if(g.done){hooks.closeModal();hooks.refresh();}else if(!g.busy&&phasePassed())plan();};
  $('#journey-replan').onclick=()=>plan();
  const faces=puzzle==='pyraminx'?['U','R','L','B','u','r','l','b']:['R','U','F','L','D','B'];
  $('#journey-moves').innerHTML=faces.map(face=>`<div class="move-pair">${(puzzle==='pyraminx'?['',"'"]:['',"'",'2']).map(s=>`<button disabled data-journey-move="${face+s}" aria-label="${moveWords(face+s,puzzle)}">${face+s}</button>`).join('')}</div>`).join('');
  $('#journey-moves').querySelectorAll('button').forEach(b=>b.onclick=()=>{if(!g.auto)turn(b.dataset.journeyMove);});
  try {
    g.k=await puzzles[puzzle].kpuzzle();if(!g.active)return;
    g.target=g.k.defaultPattern().applyAlg(baseOrientation(puzzle));
    g.player=new TwistyPlayer({puzzle,experimentalSetupAlg:g.setup,alg:g.history.join(' '),controlPanel:'none',background:'none',hintFacelets:'none',experimentalMovePressInput:'none',cameraLatitude:28,cameraLongitude:30,tempoScale:.7});
    g.player.setAttribute('role','img');g.player.setAttribute('aria-label',`${info.title}三维模型，可拖动观察`);
    $('#journey-cube').replaceChildren(g.player);g.player.jumpToEnd();save();plan();
  } catch {if(g.active){$('#journey-cube').textContent='魔方暂时没准备好，请离开后重试。';g.planning=true;}}
}
