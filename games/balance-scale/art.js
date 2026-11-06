// All scale artwork is inline SVG: no image files, no network.
const PIVOT_X = 350;
const PIVOT_Y = 190;
const BEAM_HALF = 230;
const PAN_RX = 95;
const WEIGHT_SIZES = { 200: [50, 38], 100: [44, 34], 50: [38, 29], 20: [32, 24] };
const WEIGHT_TONES = {
  200: ['#e0a566', '#b37c44'],
  100: ['#e3b96f', '#b98a4e'],
  50: ['#dcb26b', '#ad844a'],
  20: ['#e8c98a', '#b9925a'],
};
export function weightShape(value, cx, baseY) {
  const [bottom, height] = WEIGHT_SIZES[value] || WEIGHT_SIZES[100];
  const [fill, edge] = WEIGHT_TONES[value] || WEIGHT_TONES[100];
  const topWidth = Math.round(bottom * 0.58);
  const top = baseY - height;
  return `<g><rect x="${cx - 7}" y="${top - 8}" width="14" height="9" rx="3.5" fill="${fill}" stroke="${edge}" stroke-width="2"/><path d="M${cx - topWidth / 2} ${top}L${cx + topWidth / 2} ${top}L${cx + bottom / 2} ${baseY}L${cx - bottom / 2} ${baseY}Z" fill="${fill}" stroke="${edge}" stroke-width="2.5" stroke-linejoin="round"/><text x="${cx}" y="${baseY - height / 2 + 4}" text-anchor="middle" font-size="${height >= 34 ? 13 : height >= 29 ? 12 : 10}" font-weight="700" fill="#6d4a20">${value}</text></g>`;
}
export function weightSvg(value) {
  return `<svg viewBox="0 0 64 52" aria-hidden="true">${weightShape(value, 32, 47)}</svg>`;
}
function signBoard(tag) {
  const width = Math.min(330, Math.max(150, tag.length * 16 + 36));
  return `<g><rect x="26" y="20" width="${width}" height="50" rx="12" fill="#fff6df" stroke="#d8c08a" stroke-width="3"/><circle cx="26" cy="45" r="4" fill="#c9ab72"/><text x="${26 + width / 2}" y="52" text-anchor="middle" font-size="16" font-weight="700" fill="#8a6a3a">${tag}</text></g>`;
}
function standSvg() {
  return `<ellipse cx="350" cy="472" rx="98" ry="8" fill="#a87c4f18"/><rect x="272" y="448" width="156" height="22" rx="10" fill="#c99b6a" stroke="#a87c4f" stroke-width="2.5"/><rect x="341" y="196" width="18" height="258" rx="7" fill="#c99b6a" stroke="#a87c4f" stroke-width="2.5"/>`;
}
function beamSvg() {
  return `<rect x="112" y="181" width="476" height="17" rx="8.5" fill="#c99b6a" stroke="#a87c4f" stroke-width="2.5"/><circle cx="120" cy="190" r="11" fill="#b98a4e" stroke="#a87c4f" stroke-width="2.5"/><circle cx="580" cy="190" r="11" fill="#b98a4e" stroke="#a87c4f" stroke-width="2.5"/><circle cx="350" cy="190" r="14" fill="#a87c4f"/><circle cx="350" cy="190" r="5" fill="#f8f1df"/>`;
}
function itemLabel(item) {
  return item.count > 1
    ? `${item.count} 个${item.name}共 ${item.weight * item.count} 克`
    : `${item.name} ${item.hidden ? '?' : item.weight} 克`;
}
function panContents(items, weights, cx) {
  const slots = [];
  for (const item of items)
    for (let i = 0; i < (item.count || 1); i++)
      slots.push({ kind: 'item', icon: item.icon });
  for (const weight of weights) slots.push({ kind: 'weight', value: weight.value });
  const widths = slots.map((slot) =>
    slot.kind === 'item' ? 54 : (WEIGHT_SIZES[slot.value] || WEIGHT_SIZES[100])[0] + 4,
  );
  const total = widths.reduce((sum, width) => sum + width, 0);
  let x = cx - total / 2;
  let svg = '';
  for (const [i, slot] of slots.entries()) {
    const center = x + widths[i] / 2;
    svg +=
      slot.kind === 'item'
        ? `<text x="${center}" y="264" text-anchor="middle" font-size="42">${slot.icon}</text>`
        : weightShape(slot.value, center, 266);
    x += widths[i];
  }
  return svg;
}
function panSvg(items, weights, side) {
  const cx = side === 'left' ? PIVOT_X - BEAM_HALF : PIVOT_X + BEAM_HALF;
  let svg = `<line x1="${cx}" y1="190" x2="${cx - 78}" y2="268" stroke="#9a7b4f" stroke-width="3"/><line x1="${cx}" y1="190" x2="${cx + 78}" y2="268" stroke="#9a7b4f" stroke-width="3"/><path d="M${cx - PAN_RX} 272A${PAN_RX} 46 0 0 0 ${cx + PAN_RX} 272Z" fill="#cf9f57" stroke="#a87c4f" stroke-width="3"/><ellipse cx="${cx}" cy="272" rx="${PAN_RX}" ry="15" fill="#d9b36a" stroke="#b98a4e" stroke-width="3"/>`;
  svg += panContents(items, weights, cx);
  const parts = items.map(itemLabel);
  if (weights.length)
    parts.push(`砝码 ${weights.reduce((sum, w) => sum + w.value, 0)} 克`);
  if (parts.length)
    svg += `<text x="${cx}" y="344" text-anchor="middle" font-size="16" font-weight="700" fill="#6b5a3a" paint-order="stroke" stroke="#f8f1df" stroke-width="5">${parts.join(' + ')}</text>`;
  return svg;
}
export function drawScene(level, state, tilt) {
  const deg =
    tilt.side === 'right' ? tilt.deg : tilt.side === 'left' ? -tilt.deg : 0;
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  let svg = `<rect width="700" height="520" fill="#f8f1df"/><circle cx="350" cy="310" r="215" fill="#f1e6cc"/><rect y="468" width="700" height="52" fill="#ecdfc2"/><path d="M84 468q12-17 24 0M596 468q12-17 24 0" stroke="#cbb98c" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="150" cy="488" r="3" fill="#dccfa8"/><circle cx="540" cy="492" r="3" fill="#dccfa8"/>`;
  svg += signBoard(level.tag);
  svg += standSvg();
  svg += `<g class="beam" style="transform:rotate(${deg}deg);transform-origin:${PIVOT_X}px ${PIVOT_Y}px">${beamSvg()}</g>`;
  for (const side of ['left', 'right']) {
    const baseX = side === 'left' ? PIVOT_X - BEAM_HALF : PIVOT_X + BEAM_HALF;
    const endX = side === 'left' ? PIVOT_X - BEAM_HALF * cos : PIVOT_X + BEAM_HALF * cos;
    const endY = side === 'left' ? PIVOT_Y - BEAM_HALF * sin : PIVOT_Y + BEAM_HALF * sin;
    svg += `<g class="pan" style="transform:translate(${(endX - baseX).toFixed(2)}px,${(endY - PIVOT_Y).toFixed(2)}px)">${panSvg(level[side], state[side], side)}</g>`;
  }
  return svg;
}
export function mascotSvg(happy = true) {
  return `<svg viewBox="0 0 100 112" aria-hidden="true"><ellipse cx="50" cy="104" rx="30" ry="6" fill="#b98a4e22"/><g class="float"><path d="M30 17q-9-11 5-13q4-9 15-4q11-5 15 4q14 2 5 13z" fill="#fffdf4" stroke="#d8c9a8" stroke-width="2.5"/><rect x="43" y="15" width="14" height="8" rx="3" fill="#b98a4e"/><path d="M36 23h28l12 62q2 13-11 13H35q-13 0-11-13Z" fill="#e3b96f" stroke="#b98a4e" stroke-width="3" stroke-linejoin="round"/><circle cx="39" cy="56" r="4" fill="#6b4a1f"/><circle cx="61" cy="56" r="4" fill="#6b4a1f"/><ellipse cx="33" cy="65" rx="5" ry="3.5" fill="#efb7b055"/><ellipse cx="67" cy="65" rx="5" ry="3.5" fill="#efb7b055"/><path d="M42 66q8 ${happy ? 8 : -5} 16 0" fill="none" stroke="#6b4a1f" stroke-width="3" stroke-linecap="round"/></g></svg>`;
}
