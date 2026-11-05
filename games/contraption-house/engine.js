import { tools, endpoint } from './levels.js';
export function trajectory(point, piece, t) {
  const end = endpoint(point, piece);
  return {
    x: point[0] + (end[0] - point[0]) * t,
    y:
      point[1] +
      (end[1] - point[1]) * t -
      (piece.type === 'spring'
        ? Math.sin(Math.PI * t) * 65
        : piece.type === 'fan'
          ? Math.sin(Math.PI * t) * 12
          : 0),
  };
}
export function simulate(level, arrangement) {
  const segments = [],
    seen = new Set(),
    collected = new Set();
  let slot = level.start;
  const fail = (message, point) => ({
    success: false,
    stars: 0,
    segments,
    collected: [...collected],
    message,
    point,
  });
  for (let turns = 0; turns < 30; turns++) {
    const source = level.slots[slot];
    const piece = arrangement[slot];
    if (!piece)
      return fail('这里还没有机关，小球停住了。把工具放到亮起的插槽上吧！', [
        source.x,
        source.y,
      ]);
    if (
      !tools[piece.type] ||
      !level.available.includes(piece.type) ||
      ![-1, 1].includes(piece.direction)
    )
      return fail('这个机关还不能使用，换一个试试。', [source.x, source.y]);
    if (seen.has(slot))
      return fail('小球绕回原来的机关了。换个方向，让它去找铃铛吧！', [
        source.x,
        source.y,
      ]);
    seen.add(slot);
    const from = [source.x, source.y],
      to = endpoint(from, piece);
    const segment = { from, to, ...piece, slot, endT: 1 };
    segments.push(segment);
    for (let sample = 0; sample <= 80; sample++) {
      const t = sample / 80;
      const p = trajectory(from, piece, t);
      if (p.x < 15 || p.x > 825 || p.y < 20 || p.y > 505) {
        segment.endT = t;
        return fail('小球跑出工作台啦！试试换方向或换一种机关。', [p.x, p.y]);
      }
      if (
        level.obstacles.some(
          (o) =>
            p.x > o.x - 9 &&
            p.x < o.x + o.w + 9 &&
            p.y > o.y - 9 &&
            p.y < o.y + o.h + 9,
        )
      ) {
        segment.endT = t;
        return fail('哎呀，碰到箱子了。让小球从上面绕过去吧！', [p.x, p.y]);
      }
      level.stars.forEach((star, i) => {
        if (Math.hypot(star.x - p.x, star.y - p.y) < 21) collected.add(i);
      });
    }
    if (Math.hypot(to[0] - level.goal[0], to[1] - level.goal[1]) < 2) {
      const efficient = Object.keys(arrangement).length <= level.budget;
      const collector = collected.size === level.stars.length;
      return {
        success: true,
        segments,
        collected: [...collected],
        collector,
        efficient,
        stars: 1 + Number(collector) + Number(efficient),
        message: '叮咚！小球推倒多米诺，铃铛响起来啦！',
        point: to,
      };
    }
    slot = level.slots.findIndex(
      (s) => Math.hypot(s.x - to[0], s.y - to[1]) < 2,
    );
    if (slot < 0)
      return fail('没有机关接住小球。看看下一站的高度和距离，再选工具。', to);
  }
  return fail('这条机关链太长啦，整理一下再试试。', level.goal);
}
