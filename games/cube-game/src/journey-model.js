import { baseOrientation, normalizedMoves, inverseMoves } from './mechanics.js';

export const journeyPuzzles = [
  { id: '3x3x3', title: '三阶 · 完整层先法', description: '同一颗魔方，走完十字、一层、二层和顶层。', stages: 16 },
  { id: '2x2x2', title: '二阶 · 八个角块回家', description: '先拼完整底层，再翻顶面、排好顶角。', stages: 6 },
  { id: 'pyraminx', title: '金字塔 · 四面大团圆', description: '对尖角、调轴角、拼底面、整理最后三棱。', stages: 6 },
];
export const journeyWords = {
  cross: { title: '白十字', why: '先找带白色的棱块。它的另一种颜色要对上同色中心。把目标送到底层，完成这一小关后，检查已经送回家的白棱。', check: '白色朝下，侧色对上中心。' },
  'first-corners': { title: '第一层角块', why: '找带白色的角块，再看另外两种颜色。它的家在三个同色中心之间。先转顶层找位置，再做开门、送入、关门的小动作。', check: '白色底面和第一层的侧色都对齐，白十字仍完整。' },
  'middle-edges': { title: '第二层棱块', why: '找不带黄色的棱块。先在顶层对准中心，再送到左边或右边的槽。如果目标卡在错误的槽，先请它出来，再重新对齐送回家。', check: '目标棱块两色都对齐，第一层保持完整。' },
  'yellow-cross': { title: '黄色十字', why: '这一关先只看顶层四条棱块的黄色，不管角块。观察是黄点、小拐角还是横线。先用顶层调整拿法，再做对应的翻色动作。', check: '四条顶棱黄色朝上，前两层保持完整。' },
  'yellow-corners': { title: '顶面翻色', why: '现在看黄色角块的朝向。先调整顶层，再完成整组翻色动作。黄色面完整时，侧面可能还没有排齐，那是下一步要做的事。', check: '顶面全部同色，底层已经完成的部分保持完整。' },
  'pll-corners': { title: '顶角找对邻居', why: '顶面同色，还要给角块找对家。看同一侧的两端有没有同色车灯。转顶层调整位置，再整组交换角块，完成后对照侧面检查。', check: '四个顶角都在正确位置，颜色方向也正确。' },
  'pll-edges': { title: '最后的顶棱', why: '角块已经排好，现在只整理顶层棱块。观察哪几条需要换位置，跟着整组动作走。最后对齐顶层，再看六个面是不是都同色。', check: '六面同色，完成整颗魔方。' },
  'bottom-corners': { title: '二阶第一层', why: '二阶没有中心块。记住白色在下，绿色朝自己。按目标角块的三种颜色找家，拼好底面时也要让四个侧面的底层颜色连起来。', check: '目标角块位置和朝向都正确，已经完成的底角也正确。' },
  tips: { title: '小尖角对齐', why: '先看四个小尖角。小写字母只转尖角，让它的三种颜色对上紧挨着的大角块。此时不用急着看棱块。', check: '每个小尖角与相邻轴角的颜色对齐。' },
  axes: { title: '轴角找方向', why: '这次转大层。围着四个顶点看，让每个大角的三种颜色回到目标方向。小尖角会跟着大层一起走，仍然和旁边颜色相接。', check: '四个轴角和小尖角都回到正确方向。' },
  'bottom-edges': { title: '金字塔底面棱', why: '找底面的目标棱块，对照两边颜色。用开门、送入、关门、顶层回来的四步小动作调整。整组做完再看，轴角和尖角仍然对齐。', check: '目标底棱位置和方向正确，轴角和尖角保持对齐。' },
  'last-edges': { title: '最后三条棱', why: '底面已经完整。看剩下三条棱：有的要循环换家，有的需要翻转方向。先做完当前整组，再重新观察，最后检查四个大面和小尖角。', check: '四面同色，小尖角也对齐。' },
};
export const journeySpeech = {
  ready: '先观察目标，听懂这一步要做什么。可以跟着提示转，也可以自己试。做完一整组，再检查结果。',
  complete: '你完成了一整颗魔方！从打乱到复原，都是同一颗。再换一种打乱试试，看看能不能少看一点提示。',
  passed: '这一小关检查通过！已经完成的部分也保持好了。准备好后，继续下一小关。',
  retry: '还差一点点。看看目标块的位置和颜色，也可以撤回刚才的一步，或者请小方重新看局面。',
};
export function phaseWords(id) {
  const key = id.replace(/-\d+$/, '');
  return journeyWords[key];
}
export function goalSatisfied(pattern, target, goal) {
  if (goal.solved) return pattern.isIdentical(target);
  if (goal.tipAlignment) return pattern.patternData.CORNERS.orientation.every((x, i) => x === pattern.patternData.CORNERS2.orientation[i]);
  return Object.entries(goal).every(([orbit, slots]) => {
    if (orbit === 'edgeOrientation' || orbit === 'cornerOrientation') {
      const name = orbit === 'edgeOrientation' ? 'EDGES' : 'CORNERS';
      return slots.every(i => pattern.patternData[name].orientation[i] === 0);
    }
    return slots.every(i => pattern.patternData[orbit].pieces[i] === target.patternData[orbit].pieces[i] && pattern.patternData[orbit].orientation[i] === target.patternData[orbit].orientation[i]);
  });
}
export function randomSetup(puzzle, length, random = Math.random) {
  const faces = puzzle === 'pyraminx' ? ['U','R','L','B'] : ['U','R','L','F','B','D'];
  const suffixes = puzzle === 'pyraminx' ? ['', "'"] : ['', "'", '2'];
  const moves = []; let previous = '';
  for (let i = 0; i < length; i++) {
    const options = faces.filter(f => f !== previous);
    const face = options[Math.floor(random() * options.length)]; previous = face;
    moves.push(face + suffixes[Math.floor(random() * suffixes.length)]);
  }
  if (puzzle === 'pyraminx') for (const tip of ['u','r','l','b']) {
    const turn = Math.floor(random() * 3);
    if (turn) moves.push(tip + (turn === 2 ? "'" : ''));
  }
  return [baseOrientation(puzzle), ...moves].filter(Boolean).join(' ');
}
export function validJourneySave(value, puzzle) {
  if (!value || value.puzzle !== puzzle || typeof value.setup !== 'string' || !Array.isArray(value.history) || value.history.length > 3000) return false;
  const token = puzzle === 'pyraminx' ? /^[URLBurlb]'?$/ : /^[URFDLB](2'?|')?$/;
  const setup = value.setup.trim().split(/\s+/);
  if (puzzle !== 'pyraminx' && setup.shift() !== 'z2') return false;
  return setup.length > 0 && setup.length <= 40 && setup.every(m => token.test(m)) && value.history.every(m => typeof m === 'string' && token.test(m));
}

// Keep the teaching sequence intact even when consecutive macros share a face.
// Only off-route moves are folded, so undoing a detour always converges.
export function routeWalk(history, solution, puzzle) {
  let index = 0, detour = [];
  for (const move of history) {
    if (!detour.length && move === solution[index]) index++;
    else detour = normalizedMoves([...detour, move], puzzle);
  }
  return { index, detour, remaining: [...inverseMoves(detour), ...solution.slice(index)] };
}
