import { cols, rows, directions, key, same, commands } from './levels.js';
export const programSize = (program) =>
  program.reduce(
    (n, command) =>
      n + (command.type === 'repeat' ? 1 + command.body.length : 1),
    0,
  );
export function compile(program) {
  if (!Array.isArray(program) || !program.length)
    return { error: '先在指令区放几个动作吧。' };
  if (program.length > 40) return { error: '指令太多啦，试试用重复口袋。' };
  const steps = [];
  for (const [i, command] of program.entries()) {
    if (command?.type === 'repeat') {
      if (
        !Number.isInteger(command.times) ||
        command.times < 2 ||
        command.times > 4 ||
        !Array.isArray(command.body) ||
        !command.body.length ||
        command.body.length > 12
      )
        return { error: '重复口袋需要 1–12 个动作，重复 2–4 次。' };
      for (let n = 0; n < command.times; n++)
        for (const [j, child] of command.body.entries()) {
          if (!commands[child?.type])
            return { error: '重复口袋里只能放普通动作。' };
          steps.push({
            type: child.type,
            source: `${i}:${j}`,
            parent: i,
            iteration: n + 1,
          });
        }
    } else {
      if (!commands[command?.type])
        return { error: '发现不认识的指令，请删除后重试。' };
      steps.push({ type: command.type, source: String(i), parent: i });
    }
  }
  if (steps.length > 160)
    return { error: '执行动作超过 160 步了，缩短一点再试吧。' };
  return { steps };
}
export function initialState(level) {
  return {
    position: [...level.start],
    direction: level.direction,
    rescued: [],
    collected: [],
    bridgeOpen: false,
    moves: 0,
    failure: null,
    event: 'ready',
  };
}
export function obstruction(level, state, point) {
  if (point[0] < 0 || point[0] >= cols || point[1] < 0 || point[1] >= rows)
    return '地图边缘';
  const id = key(point);
  if (level.rocks.includes(id)) return '大树或岩石';
  if (level.water.includes(id)) return '水面';
  if (level.gates.includes(id) && !state.bridgeOpen) return '还没升起的桥';
  return null;
}
export function step(level, previous, action) {
  const state = structuredClone(previous);
  state.failure = null;
  state.moves++;
  state.event = action;
  const [dx, dy] = directions[state.direction];
  const ahead = [state.position[0] + dx, state.position[1] + dy];
  const obstacle = obstruction(level, state, ahead);
  if (action === 'left') state.direction = (state.direction + 3) % 4;
  else if (action === 'right') state.direction = (state.direction + 1) % 4;
  else if (action === 'probe' && obstacle) {
    state.direction = (state.direction + 1) % 4;
    state.event = 'turn-probe';
  } else if (action === 'forward' || action === 'probe') {
    if (obstacle)
      state.failure = `前方是${obstacle}。豆豆停住了，试试先转个弯${obstacle.includes('桥') ? '，或先到黄色开关上按机关' : ''}。`;
    else {
      state.position = ahead;
      if (
        level.crystals.some((p) => same(p, ahead)) &&
        !state.collected.includes(key(ahead))
      ) {
        state.collected.push(key(ahead));
        state.event = 'crystal';
      }
    }
  } else if (action === 'rescue') {
    const animal = level.animals.find(
      (a) => same(a.at, state.position) && !state.rescued.includes(key(a.at)),
    );
    if (!animal)
      state.failure =
        '这里没有等待救援的朋友。要先走到动物所在的格子，再执行救援。';
    else state.rescued.push(key(animal.at));
  } else if (action === 'switch') {
    if (!level.switchAt || !same(level.switchAt, state.position))
      state.failure = '要站在黄色开关上，才能启动机关。';
    else {
      state.bridgeOpen = true;
      state.event = 'bridge';
    }
  } else state.failure = '这条指令暂时不认识。';
  return state;
}
export function result(level, state, program) {
  const arrived = same(state.position, level.goal);
  const rescued = state.rescued.length === level.animals.length;
  const success = !state.failure && arrived && rescued;
  const collector = state.collected.length === level.crystals.length;
  const efficient = programSize(program) <= level.budget;
  return {
    success,
    collector,
    efficient,
    stars: success ? 1 + Number(collector) + Number(efficient) : 0,
    message:
      state.failure ||
      (success
        ? '所有朋友都平安回家啦！'
        : !rescued
          ? `还有 ${level.animals.length - state.rescued.length} 位朋友在等你。记得走到它身边执行救援。`
          : '朋友都接到了，再把豆豆带到救援站吧！'),
  };
}
export function simulate(level, program) {
  const compiled = compile(program);
  if (compiled.error) return { error: compiled.error };
  let state = initialState(level);
  for (const command of compiled.steps) {
    state = step(level, state, command.type);
    if (state.failure || result(level, state, program).success) break;
  }
  return { state, ...result(level, state, program) };
}
