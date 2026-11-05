import { cols, rows, directions, key, same } from './levels.js';
export function initialState(level) {
  return { players: level.starts.map((p) => [...p]), carried: [[], []], delivered: [], picked: [], moves: 0, bumps: 0, event: 'ready', message: '' };
}
export function gateOpen(level, state) {
  return level.plates.some((plate) => state.players.some((p) => same(p, plate)));
}
export function complete(level, state) {
  return state.delivered.length === level.packages.length;
}
export function move(level, previous, player, direction) {
  const state = structuredClone(previous);
  if (![0, 1].includes(player) || !directions[direction] || complete(level, state)) return state;
  const [dx, dy] = directions[direction];
  const target = [state.players[player][0] + dx, state.players[player][1] + dy];
  const id = key(target);
  let blocked = '';
  if (target[0] < 0 || target[0] >= cols || target[1] < 0 || target[1] >= rows) blocked = '到地图边缘啦，换个方向试试。';
  else if (level.walls.includes(id)) blocked = '这里有树木或石头，绕一下吧。';
  else if (same(target, state.players[1 - player])) blocked = '伙伴在这里，先让出一个位置吧。';
  else if (level.gates.includes(id) && !gateOpen(level, state)) blocked = '门还关着！请伙伴站到金色踏板上，保持踩住再过门。';
  else if (level.terrain.some((tile) => same(tile.at, target) && tile.player !== player)) blocked = player === 0 ? '暖石太热啦！冰冰要走蓝色或普通地面。' : '水洼太凉啦！暖暖要走橙色或普通地面。';
  if (blocked) { state.bumps++; state.event = 'blocked'; state.message = blocked; return state; }
  const wasOpen = gateOpen(level, state);
  state.players[player] = target;
  state.moves++;
  state.event = 'move';
  state.message = `${player === 0 ? '冰冰' : '暖暖'}前进了一格。`;
  for (const parcel of level.packages) {
    if (parcel.player === player && same(parcel.at, target) && !state.picked.includes(parcel.id)) {
      state.picked.push(parcel.id); state.carried[player].push(parcel.id); state.event = 'pickup'; state.message = '包裹拿好啦！送到同色邮筒吧。';
    }
  }
  if (same(target, level.goals[player]) && state.carried[player].length) {
    state.delivered.push(...state.carried[player]); state.carried[player] = []; state.event = 'deliver'; state.message = '叮咚，快递送到啦！看看伙伴还需不需要帮忙。';
  }
  const open = gateOpen(level, state);
  if (!wasOpen && open && state.event === 'move') { state.event = 'gate'; state.message = '踏板踩住了，门打开啦！让伙伴先通过。'; }
  if (wasOpen && !open && state.event === 'move') state.message = '踏板松开了，门合上啦。站在门口的伙伴仍可以走出来。';
  if (complete(level, state)) { state.event = 'win'; state.message = '所有快递都送达啦！你们真是默契的小伙伴。'; }
  return state;
}
export function score(level, state) {
  return complete(level, state) ? 1 + Number(state.bumps === 0) + Number(state.moves <= level.budget) : 0;
}
export function simulate(level, actions = level.solution) {
  let state = initialState(level);
  for (const action of actions) state = move(level, state, action.player, action.direction);
  return state;
}
