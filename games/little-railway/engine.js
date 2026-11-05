import { cols, rows, key, same, sandboxLevel } from './levels.js';
export function isInside(p) {
  return (
    Array.isArray(p) &&
    p.length === 2 &&
    p.every(Number.isInteger) &&
    p[0] >= 0 &&
    p[0] < cols &&
    p[1] >= 0 &&
    p[1] < rows
  );
}
export function blocked(level, p) {
  return level.rocks.includes(key(p)) || level.water.includes(key(p));
}
export function extendRoute(level, route, point) {
  if (!isInside(point)) return { route, error: '铁路要铺在地图里面哦。' };
  const oldIndex = route.findIndex((p) => same(p, point));
  if (oldIndex !== -1) return { route: route.slice(0, oldIndex + 1) };
  if (blocked(level, point))
    return {
      route,
      error: level.water.includes(key(point))
        ? '这里是水面，找找木桥吧！'
        : '这里有树或石头，绕一下路吧！',
    };
  if (same(route.at(-1), level.goal))
    return { route, error: '已经到终点啦！可以发车，或点之前的轨道修改。' };
  const last = route.at(-1);
  if (Math.abs(last[0] - point[0]) + Math.abs(last[1] - point[1]) !== 1)
    return { route, error: '从闪光的轨道末端，一格一格往旁边铺。' };
  return { route: [...route, point] };
}
export function validateRoute(level, route) {
  if (!Array.isArray(route) || !route.length || !same(route[0], level.start))
    return false;
  const seen = new Set();
  return route.every((p, i) => {
    if (!isInside(p) || blocked(level, p) || seen.has(key(p))) return false;
    seen.add(key(p));
    return (
      i === 0 ||
      (!same(route[i - 1], level.goal) &&
        Math.abs(p[0] - route[i - 1][0]) + Math.abs(p[1] - route[i - 1][1]) ===
          1)
    );
  });
}
export function evaluateRoute(level, route) {
  if (!validateRoute(level, route))
    return {
      success: false,
      message: '这条铁路有断开的地方，重新铺一下吧。',
      stars: 0,
    };
  const seen = new Set(route.map(key));
  const missing = level.passengers.filter((p) => !seen.has(key(p.at)));
  if (!same(route.at(-1), level.goal))
    return {
      success: false,
      message: '轨道还没到红屋顶车站，继续往前铺吧！',
      stars: 0,
    };
  if (missing.length)
    return {
      success: false,
      message: `${missing.map((p) => p.name).join('、')}还在等车！点之前的轨道退回，绕过去接它们吧。`,
      stars: 0,
    };
  const souvenir = level.tokens.every((p) => seen.has(key(p)));
  const efficient = route.length - 1 <= level.budget;
  return {
    success: true,
    stars: 1 + Number(souvenir) + Number(efficient),
    souvenir,
    efficient,
  };
}
export function readSandbox(value) {
  try {
    const data = JSON.parse(value);
    const base = sandboxLevel();
    if (!data || !data.level) return null;
    const level = data.level;
    for (const field of ['rocks', 'water', 'bridges']) {
      if (
        !Array.isArray(level[field]) ||
        level[field].length > 48 ||
        !level[field].every(
          (p) => typeof p === 'string' && /^[0-7],[0-5]$/.test(p),
        )
      )
        return null;
      base[field] = [...new Set(level[field])];
    }
    if (![0, 1, 2].includes(level.theme)) return null;
    base.theme = level.theme;
    if (
      !Array.isArray(level.passengers) ||
      level.passengers.length > 4 ||
      !level.passengers.every(
        (p) =>
          isInside(p.at) &&
          Number.isInteger(p.kind) &&
          p.kind >= 0 &&
          p.kind <= 3,
      )
    )
      return null;
    base.passengers = level.passengers.map((p) => ({
      at: p.at,
      kind: p.kind,
      name: ['兔兔', '小熊', '小猫', '企鹅'][p.kind],
    }));
    if (
      !Array.isArray(level.tokens) ||
      level.tokens.length > 4 ||
      !level.tokens.every(isInside)
    )
      return null;
    base.tokens = level.tokens;
    if (blocked(base, base.start) || blocked(base, base.goal)) return null;
    return {
      level: base,
      route: validateRoute(base, data.route) ? data.route : [base.start],
    };
  } catch {
    return null;
  }
}
