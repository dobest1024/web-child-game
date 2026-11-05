import { tools, themes, endpoint } from './levels.js';
import { trajectory } from './engine.js';
export function squirrel(happy = false) {
  return `<svg viewBox="0 0 100 110" aria-hidden="true"><path d="M67 86q40-4 22-44Q76 16 64 49q-7 17 7 24" fill="#cba471"/><ellipse cx="48" cy="82" rx="25" ry="25" fill="#d6b282"/><circle cx="24" cy="28" r="12" fill="#c49a67"/><circle cx="68" cy="28" r="12" fill="#c49a67"/><ellipse cx="46" cy="49" rx="32" ry="30" fill="#d6b282"/><ellipse cx="46" cy="63" rx="21" ry="16" fill="#f1d9ad"/>${happy ? '<path d="m28 47 5-4 5 4m16 0 5-4 5 4" stroke="#5d5b41" stroke-width="3" stroke-linecap="round" fill="none"/>' : '<circle cx="33" cy="45" r="4" fill="#5d5b41"/><circle cx="59" cy="45" r="4" fill="#5d5b41"/>'}<ellipse cx="46" cy="56" rx="5" ry="4" fill="#8d7252"/><path d="M40 65q6 6 12 0" stroke="#8d7252" stroke-width="2" fill="none"/><ellipse cx="23" cy="57" rx="6" ry="4" fill="#df9f7c"/><ellipse cx="69" cy="57" rx="6" ry="4" fill="#df9f7c"/><path d="M23 78h46v10H23z" fill="#87a17a"/><path d="m59 84 8 18 8-7-7-15" fill="#87a17a"/></svg>`;
}
export function marble(x, y, rotation = 0) {
  return `<g transform="translate(${x} ${y})"><ellipse cy="17" rx="17" ry="5" fill="#40614b25"/><g transform="rotate(${rotation})"><circle r="14" fill="#edb66c" stroke="#c38e50" stroke-width="2"/><path d="M-10-9q14 2 20 18" stroke="#fff3bd" stroke-width="7" fill="none"/><circle cx="-4" cy="-4" r="4" fill="#fff9dc" opacity=".7"/></g></g>`;
}
export function pieceArt(point, piece, active = false) {
  const [x, y] = point,
    end = endpoint(point, piece),
    sign = piece.direction;
  const opacity = active ? 1 : 0.95;
  if (piece.type === 'ramp' || piece.type === 'bridge') {
    const angle = (Math.atan2(end[1] - y, end[0] - x) * 180) / Math.PI;
    const length = Math.hypot(end[0] - x, end[1] - y);
    return `<g opacity="${opacity}"><path d="M${x} ${y + 14}v48M${end[0]} ${end[1] + 14}v48" stroke="#b6976a" stroke-width="8"/><g transform="translate(${x} ${y}) rotate(${angle})"><rect x="-8" y="10" width="${length + 16}" height="15" rx="5" fill="#b98f5c"/><rect x="-8" y="8" width="${length + 16}" height="7" rx="3" fill="#e9cc91"/><path d="M20 10v14M55 10v14M90 10v14M125 10v14" stroke="#a58154" stroke-width="2"/></g><circle cx="${x}" cy="${y + 33}" r="8" fill="#f4d590"/><text x="${x}" y="${y + 36}" text-anchor="middle" font-size="10" fill="#9b7b4e">${sign === 1 ? '→' : '←'}</text></g>`;
  }
  if (piece.type === 'spring')
    return `<g transform="translate(${x} ${y})"><ellipse cy="58" rx="30" ry="7" fill="#627b5120"/><rect x="-27" y="43" width="54" height="13" rx="5" fill="#9d9b87"/><path d="m-14 15 28 6-28 6 28 6-28 6 28 6" fill="none" stroke="#6c8f8c" stroke-width="5" stroke-linecap="round"/><path d="M-30 12h60" stroke="#df8f79" stroke-width="13" stroke-linecap="round"/><path d="M-24 9h48" stroke="#f7baa0" stroke-width="4" stroke-linecap="round"/><path d="m${sign * 6}-10 ${sign * 17}-10-2 14" stroke="#9cbb91" stroke-width="3" fill="none" stroke-linecap="round"/></g>`;
  return `<g transform="translate(${x - sign * 30} ${y + 8})"><path d="M0 20v33" stroke="#6f9294" stroke-width="9"/><rect x="-22" y="48" width="44" height="10" rx="5" fill="#8bb4b3"/><circle r="25" fill="#e0eddf" stroke="#6e999a" stroke-width="5"/><g ${active ? 'class="spin"' : ''} fill="#9ac4bd"><path d="M0 0q-28-25-4-20Q9-16 0 0M0 0q35-10 19 8Q9 17 0 0M0 0q-9 35-19 11Q-18-2 0 0"/></g><circle r="6" fill="#eac97d"/><path d="M${sign * 33} -10h${sign * 28}M${sign * 36} 0h${sign * 36}M${sign * 33} 10h${sign * 28}" stroke="#b3d1c2" stroke-width="3" stroke-linecap="round"/></g>`;
}
export function bellArt(goal, celebration = 0) {
  const [x, y] = goal;
  return `<g transform="translate(${x} ${y})"><path d="M-17 27h105" stroke="#b99a68" stroke-width="9" stroke-linecap="round"/>${[0, 20, 40].map((offset, i) => `<g transform="translate(${offset} 20) rotate(${Math.min(1, Math.max(0, celebration * 3 - i * 0.4)) * 68})"><rect x="-6" y="-36" width="12" height="38" rx="3" fill="${['#a7b886', '#dfa28b', '#a1bec6'][i]}"/><circle cy="-24" r="2" fill="#fff6d9"/><circle cy="-12" r="2" fill="#fff6d9"/></g>`).join('')}<g transform="translate(79 0) rotate(${celebration > 0.5 ? Math.sin(celebration * 22) * 16 : 0} 0 -40)"><path d="M0-53v-10" stroke="#aa8a50" stroke-width="5"/><path d="M-20-12q7-10 7-25a13 13 0 0 1 26 0q0 15 7 25z" fill="#efc56e" stroke="#bd9a52" stroke-width="3"/><ellipse cy="-12" rx="22" ry="5" fill="#f8dc91"/><circle cy="-8" r="5" fill="#b09252"/></g><rect x="-18" y="37" width="107" height="19" rx="8" fill="#fff5d9"/><text x="35" y="50" text-anchor="middle" font-size="10" fill="#9a8a62">叮当终点站</text></g>`;
}
export function scene(
  level,
  arrangement,
  selected,
  selectedPiece,
  collected = [],
  activeSlot = -1,
) {
  const theme = themes[level.theme];
  let svg = `<rect width="840" height="520" fill="${theme.sky}"/><path d="M0 470q170-40 330 0t510-8v58H0Z" fill="${theme.ground}"/><path d="M0 495h840" stroke="#fff" stroke-opacity=".3" stroke-width="3"/><g opacity=".2" fill="${theme.ink}"><circle cx="745" cy="64" r="35"/><circle cx="745" cy="64" r="17" fill="${theme.sky}"/><path d="M713 64h64M745 32v64" stroke="${theme.sky}" stroke-width="4"/></g><g fill="#fff9e5" opacity=".6"><circle cx="170" cy="40" r="5"/><circle cx="540" cy="55" r="4"/><path d="m650 380 3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/></g>`;
  level.obstacles.forEach((o) => {
    svg += `<g transform="translate(${o.x} ${o.y})"><rect width="${o.w}" height="${o.h}" rx="7" fill="#bc9a71"/><path d="M5 5 ${o.w - 5} ${o.h - 5}M${o.w - 5} 5 5 ${o.h - 5}" stroke="#d6b58a" stroke-width="6"/><rect x="6" y="6" width="${o.w - 12}" height="${o.h - 12}" rx="3" fill="none" stroke="#a98b66" stroke-width="3"/></g>`;
  });
  level.slots.forEach((s, i) => {
    svg += `<ellipse cx="${s.x}" cy="${s.y + 60}" rx="31" ry="8" fill="${theme.ink}" opacity=".08"/>`;
    if (arrangement[i])
      svg += pieceArt([s.x, s.y], arrangement[i], activeSlot === i);
    else
      svg += `<path d="M${s.x - 24} ${s.y + 30}h48" stroke="#a9b896" stroke-width="5" stroke-linecap="round" stroke-dasharray="3 7"/>`;
  });
  if (selected !== null && selectedPiece) {
    const s = level.slots[selected];
    const points = Array.from({ length: 21 }, (_, i) =>
      trajectory([s.x, s.y], selectedPiece, i / 20),
    );
    const end = points.at(-1);
    svg += `<path d="${points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ')}" stroke="#d6a24b" stroke-width="3" stroke-dasharray="5 7" opacity=".65" fill="none"/><circle cx="${end.x}" cy="${end.y}" r="20" stroke="#d6a24b" stroke-width="2" stroke-dasharray="4 5" fill="#fff6c555"/><text x="${Math.max(55, Math.min(780, end.x))}" y="${end.y - 28}" text-anchor="middle" font-size="12" fill="#ad894f">预计落点</text>`;
  }
  level.stars.forEach((p, i) => {
    if (!collected.includes(i))
      svg += `<g transform="translate(${p.x} ${p.y})"><circle r="19" fill="#fff9d3" opacity=".65"/><path class="twinkle" d="m0-15 5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2z" fill="#efc464" stroke="#cda94f" stroke-width="1.5"/></g>`;
  });
  svg += bellArt(level.goal);
  return svg;
}
