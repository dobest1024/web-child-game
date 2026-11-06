// 七巧板小达人 · SVG 场景绘制：剪影、提示虚线、已锁定与待拼积木。
import { pieces } from './levels.js';
import { placementPolygon } from './engine.js';

export const PIECE_COLORS = {
  'large-1': '#ef8354',
  'large-2': '#f2c14e',
  medium: '#7fb069',
  square: '#e56b6f',
  'small-1': '#5da9e9',
  'small-2': '#9b7ede',
  para: '#f15bb5',
};

const pieceById = new Map(pieces.map((piece) => [piece.id, piece]));
const VIEW_W = 800;
const VIEW_H = 760;

// 版面：剪影居中在上半区，托盘两行放在下半区。返回 h 坐标到 SVG 的映射与托盘落点。
export function layout(level) {
  const bw = level.bounds.maxX - level.bounds.minX;
  const bh = level.bounds.maxY - level.bounds.minY;
  const s = Math.min(680 / bw, 360 / bh, 34);
  const ox = (VIEW_W - bw * s) / 2 - level.bounds.minX * s;
  const oy = 30 + (360 - bh * s) / 2 - level.bounds.minY * s;
  const toH = (svgX, svgY) => [(svgX - ox) / s, (svgY - oy) / s];
  const rowTop = [240, 560].map((x) => toH(x, 524));
  const rowBottom = [110, 265, 400, 535, 690].map((x) => toH(x, 644));
  return { s, ox, oy, tray: [...rowTop, ...rowBottom] };
}

function pointsOf(hPoints, s, ox, oy) {
  return hPoints
    .map(([x, y]) => `${(ox + x * s).toFixed(1)},${(oy + y * s).toFixed(1)}`)
    .join(' ');
}

// 让积木的外接框中心落在托盘落点上，返回托盘中的摆法。
export function trayPlacement(level, piece, rot, flip, slotIndex) {
  const { tray } = layout(level);
  const base = transformOffset(piece, rot, flip);
  return { tx: tray[slotIndex][0] - base[0], ty: tray[slotIndex][1] - base[1], rot, flip };
}

function transformOffset(piece, rot, flip) {
  const points = placementPolygon(piece, { tx: 0, ty: 0, rot, flip });
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}

export function drawScene(level, piecesState, selectedId, hintsOn) {
  const { s, ox, oy } = layout(level);
  const poly = (hPoints) => pointsOf(hPoints, s, ox, oy);
  const bw = (level.bounds.maxX - level.bounds.minX) * s;
  let svg = `<rect x="6" y="6" width="${VIEW_W - 12}" height="${VIEW_H - 12}" rx="26" fill="#fbf3df"/>`;
  svg += `<ellipse cx="400" cy="${(oy + level.bounds.maxY * s + 18).toFixed(1)}" rx="${(bw / 2 + 36).toFixed(1)}" ry="16" fill="#ecdfbd"/>`;
  svg += `<polygon points="${poly(level.silhouette)}" fill="#7a6a52" stroke="#7a6a52" stroke-width="4" stroke-linejoin="round"/>`;
  if (hintsOn)
    for (const slot of level.slots)
      svg += `<polygon points="${poly(slot.polygon)}" fill="none" stroke="#fff6dd" stroke-width="2.5" stroke-dasharray="7 7" stroke-linejoin="round" opacity=".75"/>`;
  for (const item of piecesState.filter((p) => p.locked)) svg += pieceSvg(level, item, false, poly);
  for (const item of piecesState.filter((p) => !p.locked)) svg += pieceSvg(level, item, item.pieceId === selectedId, poly);
  return svg;
}

function pieceSvg(level, item, selected, poly) {
  const piece = pieceById.get(item.pieceId);
  const points = poly(placementPolygon(piece, item.placement));
  const color = PIECE_COLORS[item.pieceId];
  const label = `${piece.name}${item.locked ? '，已经拼好' : selected ? '，已选中' : ''}`;
  return `<g class="piece${item.locked ? ' locked' : ''}${selected ? ' selected' : ''}" data-piece="${item.pieceId}" role="img" aria-label="${label}"><polygon points="${points}" fill="${color}" stroke="${selected ? '#fffdf2' : 'rgba(74,52,24,.4)'}" stroke-width="${selected ? 5 : 3}" stroke-linejoin="round"/></g>`;
}
