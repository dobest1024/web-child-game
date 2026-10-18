import { puzzles } from 'cubing/puzzles';
import { createLayerSolver } from './layer-solver.js';
import { planSmall } from './small-solvers.js';
let layerSolver;
self.onmessage = async ({ data }) => {
  try {
    const k = await puzzles[data.puzzle].kpuzzle();
    const pattern = k.defaultPattern().applyAlg(data.alg);
    const phases = data.puzzle === '3x3x3'
      ? (await (layerSolver ??= createLayerSolver())).solve(pattern).stages
      : (await planSmall(data.puzzle, pattern)).phases;
    self.postMessage({ request: data.request, phases });
  } catch {
    self.postMessage({ request: data.request, error: '小方这次没找到路线，请重试。' });
  }
};
