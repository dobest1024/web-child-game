import { vectors, key, rotatePorts } from './levels.js';
export function portsOf(tile) {
  return rotatePorts(tile.ports, tile.rotation);
}
export function turnTile(tiles, at) {
  return tiles.map((tile) =>
    tile.at === at && tile.kind === 'pipe'
      ? { ...tile, rotation: (tile.rotation + 1) % 4 }
      : tile,
  );
}
export function toggleValve(tiles, at) {
  return tiles.map((tile) =>
    tile.at === at && tile.kind === 'valve'
      ? { ...tile, open: !tile.open }
      : tile,
  );
}
// Breadth-first flow: every reachable outlet must connect. Each tile is visited once,
// so a closed ring cannot create an endless water animation.
export function flow(level, tiles) {
  const map = new Map(tiles.map((tile) => [tile.at, tile]));
  const source = map.get(level.source);
  if (!source)
    return {
      success: false,
      order: [],
      leaks: [],
      watered: [],
      blocked: [],
      message: '水源不见了，请重新开始。',
    };
  const queue = [{ at: source.at, distance: 0 }],
    seen = new Set([source.at]);
  const order = [],
    leaks = [],
    watered = [],
    blocked = [];
  const leakKeys = new Set();
  while (queue.length) {
    const current = queue.shift();
    const tile = map.get(current.at);
    order.push(current);
    if (tile.kind === 'flower') watered.push(tile.at);
    if (tile.kind === 'valve' && !tile.open) {
      blocked.push(tile.at);
      continue;
    }
    const [x, y] = tile.at.split(',').map(Number);
    for (const direction of portsOf(tile)) {
      const [dx, dy] = vectors[direction];
      const nextKey = key([x + dx, y + dy]);
      const next = map.get(nextKey);
      if (!next || !portsOf(next).includes((direction + 2) % 4)) {
        const leakKey = `${tile.at}:${direction}`;
        if (!leakKeys.has(leakKey)) {
          leaks.push({ at: tile.at, direction });
          leakKeys.add(leakKey);
        }
        continue;
      }
      if (!seen.has(nextKey)) {
        seen.add(nextKey);
        queue.push({ at: nextKey, distance: current.distance + 1 });
      }
    }
  }
  const missing = level.flowers.filter((at) => !watered.includes(at));
  const success = !missing.length && !leaks.length;
  const message = success
    ? '每一朵花都喝到水啦！花园重新开花了。'
    : blocked.length
      ? `水停在红色阀门前啦。把阀门打开，再试试！${leaks.length ? '红圈处也有漏水，记得接好管口。' : ''}`
      : leaks.length
        ? `有 ${leaks.length} 处管口没有接好。红圈标出了漏水处，转一转旁边的水管吧。`
        : `还有 ${missing.length} 朵花没喝到水。看看分岔后的水管有没有接通。`;
  return { success, order, leaks, watered, blocked, missing, message };
}
export function score(level, outcome, moves, attempts) {
  return outcome.success
    ? 1 + Number(moves <= level.budget) + Number(attempts <= 2)
    : 0;
}
