import { themes } from './levels.js';
import { edgeIndexOf, nextOptions, startNodes } from './engine.js';
// 画板固定 700×620 的坐标系，每一关的点按外框等比缩放并居中。
const WIDTH = 700;
const HEIGHT = 620;
const CANDY = ['#f472a0', '#fb923c', '#46c2af', '#a78bfa', '#fbbf24', '#60a5fa'];
export function fitted(level) {
  const xs = level.points.map(([x]) => x);
  const ys = level.points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const scale = Math.min(
    (WIDTH - 132) / Math.max(maxX - minX, 1),
    (HEIGHT - 132) / Math.max(maxY - minY, 1),
  );
  const offsetX = (WIDTH - (maxX - minX) * scale) / 2;
  const offsetY = (HEIGHT - (maxY - minY) * scale) / 2;
  return level.points.map(([x, y]) => [
    Math.round((x - minX) * scale + offsetX),
    Math.round((y - minY) * scale + offsetY),
  ]);
}
const line = (a, b, cls, stroke = '', width = '') =>
  `<line class="${cls}"${stroke ? ` stroke="${stroke}"` : ''}${width ? ` stroke-width="${width}"` : ''} x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;
// 画纸上的小装饰，按关卡编号确定位置，避免每次重绘乱跳。
function sprinkles(level, theme) {
  let svg = '';
  for (let y = 0; y < 6; y++)
    for (let x = 0; x < 7; x++) {
      const seed = (x * 7 + y * 13 + level.id * 5) % 11;
      const cx = x * 100 + 32 + (seed % 4) * 14;
      const cy = y * 103 + 42 + (seed % 3) * 22;
      if (seed === 2)
        svg += `<path d="M${cx} ${cy}l4 9 9 4-9 4-4 9-4-9-9-4 9-4Z" fill="${theme.accent}" opacity=".13"/>`;
      else if (seed === 5)
        svg += `<circle cx="${cx}" cy="${cy}" r="6" fill="${theme.accent}" opacity=".1"/>`;
      else if (seed === 7)
        svg += `<path d="M${cx - 8} ${cy}h16M${cx} ${cy - 8}v16" stroke="${theme.accent}" stroke-width="3" opacity=".12" stroke-linecap="round"/>`;
    }
  return svg;
}
export function drawScene(level, path, hintEdge = -1, hintNode = -1, complete = false) {
  const theme = themes[level.theme];
  const pts = fitted(level);
  const steps = [];
  for (let i = 1; i < path.length; i++)
    steps.push({
      edge: edgeIndexOf(level, path[i - 1], path[i]),
      a: pts[path[i - 1]],
      b: pts[path[i]],
    });
  const done = new Set(steps.map((step) => step.edge));
  let svg =
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="${theme.ground}"/>` +
    sprinkles(level, theme);
  level.edges.forEach(([a, b], index) => {
    if (!done.has(index))
      svg += line(pts[a], pts[b], index === hintEdge ? 'hint-edge' : 'idle');
  });
  steps.forEach((step, index) => {
    const color = CANDY[index % CANDY.length];
    svg += line(step.a, step.b, 'candy-shadow');
    svg += line(step.a, step.b, `candy-main${complete ? ' party' : ''}`, color);
    svg += line(step.a, step.b, 'flowline');
  });
  if (complete)
    svg += `<rect class="party-wash" width="${WIDTH}" height="${HEIGHT}" rx="18"/>`;
  const current = path.length ? path[path.length - 1] : -1;
  const options = new Set(nextOptions(level, path));
  const starts = path.length ? new Set() : new Set(startNodes(level));
  const visited = new Set(path);
  level.points.forEach((_, index) => {
    const [x, y] = pts[index];
    if (index === hintNode)
      svg += `<circle class="halo hint-halo" cx="${x}" cy="${y}" r="30"/>`;
    if (starts.has(index))
      svg += `<circle class="halo" cx="${x}" cy="${y}" r="28"/>`;
    if (index === current)
      svg += `<circle class="halo current-halo" cx="${x}" cy="${y}" r="31"/>`;
    svg += `<g class="node-g${options.has(index) && index !== current ? ' can-go' : ''}"><circle class="dot" cx="${x}" cy="${y}" r="${index === current ? 19 : 15}" stroke="${theme.accent}"/>${
      visited.has(index)
        ? `<circle class="dot-visit" cx="${x}" cy="${y}" r="${index === current ? 9 : 7}" fill="${theme.accent}"/>`
        : ''
    }</g>`;
  });
  return svg;
}
// 小铅笔向导「尖尖」。
export function pencilSvg(happy = true) {
  return `<svg viewBox="0 0 100 110" aria-hidden="true"><ellipse cx="50" cy="101" rx="30" ry="7" fill="#56a08a1f"/><g class="float"><g transform="rotate(16 50 55)"><rect x="37" y="16" width="26" height="14" rx="5" fill="#f2a0a0" stroke="#d98888" stroke-width="3"/><rect x="37" y="28" width="26" height="42" rx="3" fill="#f7ce68" stroke="#d9a944" stroke-width="3"/><path d="M37 70h26l-13 23Z" fill="#f2dcbc" stroke="#d9a944" stroke-width="3"/><path d="m45 85 5 8 5-8Z" fill="#5a6b66"/><circle cx="45.5" cy="47" r="2.6" fill="#4b5a55"/><circle cx="57.5" cy="47" r="2.6" fill="#4b5a55"/><ellipse cx="41" cy="54" rx="3" ry="2" fill="#f2a0a0" opacity=".7"/><ellipse cx="62" cy="54" rx="3" ry="2" fill="#f2a0a0" opacity=".7"/><path d="M46 55q5 ${happy ? 5 : -4} 11 0" fill="none" stroke="#4b5a55" stroke-width="2.5" stroke-linecap="round"/></g></g></svg>`;
}
