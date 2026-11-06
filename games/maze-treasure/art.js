// 迷宫寻宝队 · 内联 SVG 绘图（纯字符串函数，不碰 DOM）。
import { themes, parse } from './levels.js';
// 小狐狸皮皮：尾巴用 .fox-tail 类做摆动的 idle 动画（reduced-motion 下由 CSS 关闭）。
export function foxSvg() {
  return `<svg viewBox="0 0 100 110" aria-hidden="true"><ellipse cx="50" cy="101" rx="30" ry="7" fill="#3d5c3320"/><g class="fox-idle"><g class="fox-tail"><path d="M36 84Q8 84 8 62Q8 44 24 46Q15 54 18 64Q21 76 40 76Z" fill="#e58a3d"/><path d="M8 62Q9 48 22 46Q15 53 16 61Q17 68 22 72Q10 72 8 62Z" fill="#fdf3e3"/></g><path d="M50 96C31 96 24 86 24 74C24 60 35 52 50 52C65 52 76 60 76 74C76 86 69 96 50 96Z" fill="#ef9440"/><ellipse cx="50" cy="81" rx="14" ry="12" fill="#fdeed7"/><path d="M30 34L26 8L48 20Z" fill="#ef9440"/><path d="M31 27L29 15L41 21Z" fill="#8a5330"/><path d="M70 34L74 8L52 20Z" fill="#ef9440"/><path d="M69 27L71 15L59 21Z" fill="#8a5330"/><circle cx="50" cy="36" r="23" fill="#ef9440"/><ellipse cx="42" cy="44" rx="11" ry="8" fill="#fdeed7"/><ellipse cx="58" cy="44" rx="11" ry="8" fill="#fdeed7"/><circle cx="41" cy="33" r="3.2" fill="#47301f"/><circle cx="59" cy="33" r="3.2" fill="#47301f"/><circle cx="42.2" cy="31.8" r="1.1" fill="#fff"/><circle cx="60.2" cy="31.8" r="1.1" fill="#fff"/><path d="M47 42L53 42L50 46Z" fill="#47301f"/><path d="M46 50Q50 53 54 50" stroke="#47301f" stroke-width="2" fill="none" stroke-linecap="round"/></g></svg>`;
}
export function starBadgeSvg() {
  return `<svg viewBox="0 0 40 40" aria-hidden="true"><polygon points="${starPoints(20, 21, 15, 6.3)}" fill="#f3c64f" stroke="#d9a63e" stroke-width="2" stroke-linejoin="round"/><circle cx="14.5" cy="15.5" r="2.4" fill="#fff2c9"/></svg>`;
}
export function keyBadgeSvg() {
  return `<svg viewBox="0 0 40 40" aria-hidden="true"><g transform="translate(2 2) scale(.9)"><circle cx="15" cy="13" r="7" fill="none" stroke="#e0a63e" stroke-width="5"/><path d="M20 18L30 28M27 25l4.5-4.5M30 28l4-4" stroke="#e0a63e" stroke-width="5" fill="none" stroke-linecap="round"/></g></svg>`;
}
const starPoints = (cx, cy, outer, inner) => {
  const points = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? outer : inner;
    points.push(
      `${(cx + Math.cos(angle) * radius).toFixed(1)},${(cy + Math.sin(angle) * radius).toFixed(1)}`,
    );
  }
  return points.join(' ');
};
const unit = 50;
// 画整座迷宫：格子地板、圆头墙、狐狸窝、家门（可上锁）、没被捡走的星星和钥匙。
export function drawScene(level, collected = new Set(), won = false) {
  const theme = themes[level.theme];
  const n = level.size;
  let svg = `<rect width="${n * unit}" height="${n * unit}" fill="${theme.background}"/>`;
  const special = new Set([
    level.start,
    level.exit,
    ...level.stars,
    ...level.keys,
  ]);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const at = `${x},${y}`;
      if ((x + y) % 2 === 0)
        svg += `<rect x="${x * unit}" y="${y * unit}" width="${unit}" height="${unit}" fill="${theme.ground}" opacity=".55"/>`;
      if (!special.has(at) && (x * 7 + y * 13 + level.id * 5) % 7 === 0)
        svg += `<path d="M${x * unit + 16} ${y * unit + 38}q2 -8 4 0m6 0q2 -6 4 0" stroke="${theme.accent}" stroke-width="2" fill="none" opacity=".3" stroke-linecap="round"/>`;
    }
  let walls = '';
  const seg = (x1, y1, x2, y2) => {
    walls += `M${x1} ${y1}L${x2} ${y2}`;
  };
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const mask = level.masks[y * n + x];
      if (y === 0) seg(x * unit, 0, x * unit + unit, 0);
      if (x === 0) seg(0, y * unit, 0, y * unit + unit);
      if (y === n - 1) seg(x * unit, n * unit, x * unit + unit, n * unit);
      if (x === n - 1) seg(n * unit, y * unit, n * unit, y * unit + unit);
      if (!(mask & 4) && y + 1 < n)
        seg(x * unit, (y + 1) * unit, x * unit + unit, (y + 1) * unit);
      if (!(mask & 2) && x + 1 < n)
        seg((x + 1) * unit, y * unit, (x + 1) * unit, y * unit + unit);
    }
  svg += `<path d="${walls}" stroke="#ffffff66" stroke-width="13" fill="none" stroke-linecap="round"/><path d="${walls}" stroke="${theme.wall}" stroke-width="8" fill="none" stroke-linecap="round"/>`;
  for (const at of level.stars)
    if (!collected.has(at)) {
      const [x, y] = parse(at);
      svg += `<g transform="translate(${x * unit} ${y * unit})"><polygon points="${starPoints(25, 25, 11, 4.6)}" fill="#f3c64f" stroke="#d9a63e" stroke-width="1.5" stroke-linejoin="round"/><circle cx="21" cy="21" r="1.8" fill="#fff2c9"/></g>`;
    }
  for (const at of level.keys)
    if (!collected.has(at)) {
      const [x, y] = parse(at);
      svg += `<g transform="translate(${x * unit} ${y * unit})"><circle cx="19" cy="19" r="6.5" fill="none" stroke="#e0a63e" stroke-width="4.5"/><path d="M23.5 23.5L33 33M30 30l4-4M33 33l3.5-3.5" stroke="#e0a63e" stroke-width="4.5" fill="none" stroke-linecap="round"/></g>`;
    }
  const [sx, sy] = parse(level.start);
  svg += `<g transform="translate(${sx * unit} ${sy * unit})"><ellipse cx="25" cy="29" rx="16" ry="11" fill="#c59a67"/><ellipse cx="25" cy="27" rx="12" ry="7.5" fill="#8f6a45"/><path d="M13 27q-3 -7 3 -9m21 9q3 -7 -3 -9" stroke="#c59a67" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="10" y="38" width="30" height="9" rx="4.5" fill="#fff8e3"/><text x="25" y="45" text-anchor="middle" font-size="7.5" fill="#8a7a52">狐狸窝</text></g>`;
  const [ex, ey] = parse(level.exit);
  const gotKeys = level.keys.filter((at) => collected.has(at)).length;
  const locked = level.keys.length > gotKeys && !won;
  svg += `<g transform="translate(${ex * unit} ${ey * unit})"><path d="M14 36V21a11 11 0 0 1 22 0v15Z" fill="${locked ? '#cf9a68' : '#a8c98a'}" stroke="#7c5c3e" stroke-width="2"/>${
    locked
      ? `<rect x="20" y="24" width="10" height="8" rx="2" fill="#eec25a" stroke="#c79a34" stroke-width="1.5"/><path d="M22 24v-2.5a3 3 0 0 1 6 0V24" fill="none" stroke="#eec25a" stroke-width="2.2"/>`
      : `<circle cx="25" cy="27" r="2.2" fill="#5d7a44"/><path d="M25 24.5V18" stroke="#5d7a44" stroke-width="2" stroke-linecap="round"/>`
  }${
    won
      ? `<g class="cheer-spark"><circle cx="9" cy="10" r="2.5" fill="#f3c64f"/><circle cx="41" cy="12" r="2" fill="#f3c64f"/><circle cx="25" cy="4" r="1.8" fill="#fff2c9"/></g>`
      : ''
  }<rect x="9" y="37" width="32" height="9" rx="4.5" fill="#fff8e3"/><text x="25" y="44" text-anchor="middle" font-size="7.5" fill="#8a7a52">${locked ? '锁着的门' : '回家的门'}</text></g>`;
  return svg;
}
