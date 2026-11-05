import { themes, key } from './levels.js';
export function animal(kind, happy = false) {
  const colors = ['#fff4e4', '#c58c5a', '#f4b16a', '#526e85'];
  const ears =
    kind === 0
      ? '<ellipse cx="36" cy="24" rx="9" ry="22" fill="#fff4e4"/><ellipse cx="64" cy="24" rx="9" ry="22" fill="#fff4e4"/><ellipse cx="36" cy="23" rx="4" ry="14" fill="#eeb4ac"/><ellipse cx="64" cy="23" rx="4" ry="14" fill="#eeb4ac"/>'
      : kind === 1
        ? '<circle cx="28" cy="32" r="13" fill="#b77c4b"/><circle cx="72" cy="32" r="13" fill="#b77c4b"/><circle cx="28" cy="32" r="7" fill="#e4b58b"/><circle cx="72" cy="32" r="7" fill="#e4b58b"/>'
        : kind === 2
          ? '<path d="M20 46 24 14 45 33M55 33 76 14 80 46" fill="#f4b16a" stroke="#d19459" stroke-width="2"/><path d="m27 32 1-9 10 11m24 0 10-11 1 9" fill="#e9a097"/>'
          : '';
  return `<g>${ears}<ellipse cx="50" cy="78" rx="26" ry="20" fill="${colors[kind]}"/><ellipse cx="50" cy="52" rx="33" ry="30" fill="${colors[kind]}"/>${kind === 3 ? '<ellipse cx="50" cy="58" rx="26" ry="25" fill="#fff5dc"/>' : ''}<ellipse cx="31" cy="61" rx="7" ry="4" fill="#e89d91" opacity=".7"/><ellipse cx="69" cy="61" rx="7" ry="4" fill="#e89d91" opacity=".7"/>${happy ? '<path d="m35 52 4-3 4 3m14 0 4-3 4 3" fill="none" stroke="#394839" stroke-width="3" stroke-linecap="round"/>' : '<ellipse cx="39" cy="51" rx="3" ry="4" fill="#394839"/><ellipse cx="61" cy="51" rx="3" ry="4" fill="#394839"/><circle cx="40" cy="50" r="1" fill="white"/><circle cx="62" cy="50" r="1" fill="white"/>'}<path d="m47 59 3 3 3-3" fill="#9b6857" stroke="#9b6857" stroke-linejoin="round"/><path d="M44 66q6 6 12 0" stroke="#805e4a" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M27 77q23 10 46 0v9q-23 9-46 0Z" fill="#df795e"/><path d="m61 82 6 15 8-6-6-11" fill="#df795e"/></g>`;
}
export const animalSvg = (kind, happy = false) =>
  `<svg viewBox="0 0 100 105" aria-hidden="true">${animal(kind, happy)}</svg>`;
export function robotSvg(direction = 0, happy = false) {
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="87" rx="32" ry="8" fill="#34556122"/><g class="breathe"><path d="M50 22V12" stroke="#557985" stroke-width="4"/><circle cx="50" cy="10" r="6" fill="#edc763"/><rect x="28" y="68" width="12" height="19" rx="5" fill="#53747d"/><rect x="60" y="68" width="12" height="19" rx="5" fill="#53747d"/><path d="m24 55-9 13m61-13 9 13" stroke="#719d9d" stroke-width="9" stroke-linecap="round"/><rect x="28" y="53" width="44" height="27" rx="11" fill="#e0eed0" stroke="#6b9992" stroke-width="3"/><circle cx="50" cy="67" r="6" fill="#edc763"/><rect x="18" y="21" width="64" height="40" rx="16" fill="#e0eed0" stroke="#6b9992" stroke-width="3"/><rect x="25" y="29" width="50" height="24" rx="10" fill="#365e68"/>${happy ? '<path d="m33 41 5-5 5 5m14 0 5-5 5 5" stroke="#bbe7d9" stroke-width="3" fill="none" stroke-linecap="round"/>' : '<rect x="34" y="35" width="8" height="10" rx="4" fill="#a6e1ce"/><rect x="58" y="35" width="8" height="10" rx="4" fill="#a6e1ce"/>'}<path d="M46 45q4 4 8 0" fill="none" stroke="#a6e1ce" stroke-width="2"/></g><g transform="translate(50 92) rotate(${direction * 90})"><path d="m-8-3h10v-5l9 8-9 8V3H-8Z" fill="#e4aa4f" stroke="#fff5d0" stroke-width="2"/></g></svg>`;
}
function home(x, y) {
  return `<g transform="translate(${x} ${y})"><ellipse cy="33" rx="40" ry="10" fill="#577d7025"/><rect x="-32" y="-17" width="64" height="48" rx="8" fill="#fff3d2"/><path d="m-39-14 39-31 39 31z" fill="#d78f74"/><rect x="-11" y="2" width="22" height="29" rx="9" fill="#5e8290"/><rect x="-25" y="-5" width="10" height="12" rx="3" fill="#acd8d2"/><rect x="15" y="-5" width="10" height="12" rx="3" fill="#acd8d2"/><circle cy="-20" r="9" fill="#fff2c9"/><path d="M0-26v12m-6-6h12" stroke="#d28c6d" stroke-width="3"/><path d="M30-30v-26" stroke="#8f9677" stroke-width="2"/><path d="M30-56h18l-5 8 5 8H30z" fill="#f0ca6c"/></g>`;
}
export function scene(level, state) {
  const theme = themes[level.theme];
  let svg = `<defs><pattern id="water" width="40" height="24" patternUnits="userSpaceOnUse"><rect width="40" height="24" fill="#88cbd5"/><path d="M3 15q7 5 14 0m10-7h7" stroke="#e5f8ef" stroke-width="2" fill="none" opacity=".65"/></pattern></defs><rect width="700" height="600" fill="${theme.floor}"/>`;
  for (let y = 0; y < 6; y++)
    for (let x = 0; x < 7; x++) {
      if ((x + y) % 2 === 0)
        svg += `<rect x="${x * 100}" y="${y * 100}" width="100" height="100" fill="${theme.light}" opacity=".5"/>`;
      svg += `<path d="m${x * 100 + 13} ${y * 100 + 82} 3-5 3 5m57-60 3-4 2 4" stroke="${theme.accent}" opacity=".14" stroke-width="2" fill="none"/>`;
    }
  for (const id of [...level.water, ...level.gates]) {
    const [x, y] = id.split(',').map(Number);
    svg += `<rect x="${x * 100}" y="${y * 100}" width="100" height="100" fill="url(#water)"/>`;
    if (level.gates.includes(id))
      svg += state.bridgeOpen
        ? `<g transform="translate(${x * 100} ${y * 100})"><rect y="20" width="100" height="60" rx="5" fill="#c6a572"/><path d="M15 20v60M35 20v60M55 20v60M75 20v60M95 20v60" stroke="#ad8a5b" stroke-width="3"/><path d="M0 18h100M0 82h100" stroke="#ebcf99" stroke-width="7"/></g>`
        : `<rect x="${x * 100 + 7}" y="${y * 100 + 22}" width="86" height="56" rx="8" stroke="#fff4c5" stroke-width="3" stroke-dasharray="7 5" fill="#c8ab7844"/>`;
  }
  for (const id of level.rocks) {
    const [x, y] = id.split(',').map(Number);
    const tree = level.theme === 0 || (x + y) % 2 === 0;
    svg += `<g transform="translate(${x * 100 + 50} ${y * 100 + 48})"><ellipse cy="31" rx="34" ry="10" fill="#486e5220"/>${level.theme === 2 ? '<path d="m-31 25 8-36L0-32 25-8 33 25Z" fill="#9698bd"/><path d="m0-32-2 57h35L25-8Z" fill="#a8aacd"/><circle class="twinkle" cx="-15" cy="-12" r="4" fill="#f6eab0"/>' : tree ? '<path d="M-4 12h8v24h-8z" fill="#af936c"/><circle cy="-15" r="25" fill="#83ae75"/><circle cx="-18" cy="3" r="23" fill="#77a36c"/><circle cx="18" cy="3" r="23" fill="#91b980"/><circle cx="6" cy="-11" r="18" fill="#9fc78a"/>' : '<path d="m-32 26 9-30 31-14 23 21 3 23z" fill="#c7b491"/><path d="m-23-4 31-14 2 44H-32Z" fill="#d6c5a4"/>'}</g>`;
  }
  if (level.switchAt) {
    const [x, y] = level.switchAt;
    svg += `<g transform="translate(${x * 100 + 50} ${y * 100 + 60})"><ellipse cy="12" rx="28" ry="11" fill="#9d986a"/><ellipse rx="28" ry="15" fill="${state.bridgeOpen ? '#8cc393' : '#e7c16c'}" stroke="#b29657" stroke-width="3"/><path d="m2-12-10 13h8l-2 10L10-3H2Z" fill="#fff6d7"/></g>`;
  }
  svg += home(level.goal[0] * 100 + 50, level.goal[1] * 100 + 45);
  svg += `<rect x="${level.start[0] * 100 + 12}" y="${level.start[1] * 100 + 67}" width="76" height="20" rx="10" fill="#e9f4d4" opacity=".9"/><text x="${level.start[0] * 100 + 50}" y="${level.start[1] * 100 + 81}" text-anchor="middle" font-size="10" fill="#76946d">豆豆出发站</text>`;
  for (const p of level.crystals)
    if (!state.collected.includes(key(p)))
      svg += `<g transform="translate(${p[0] * 100 + 50} ${p[1] * 100 + 46})"><circle r="23" fill="#fff6d1" opacity=".7"/><path class="twinkle" d="m0-20 7 13 14 2-10 11 3 15-14-7-14 7 3-15-10-11 14-2z" fill="#eabe5a" stroke="#cba64b" stroke-width="2"/><circle cx="-4" cy="1" r="1.5" fill="#9d854d"/><circle cx="4" cy="1" r="1.5" fill="#9d854d"/></g>`;
  for (const a of level.animals)
    if (!state.rescued.includes(key(a.at)))
      svg += `<g transform="translate(${a.at[0] * 100 + 16} ${a.at[1] * 100 + 8})"><ellipse cx="34" cy="78" rx="25" ry="7" fill="#44663d22"/><g class="breathe"><g transform="scale(.68)">${animal(a.kind)}</g></g><path d="M64 10h16v13H68l-4 4z" fill="#fff7dd"/><text x="72" y="20" text-anchor="middle" font-size="9" fill="#c4956c">♡</text></g>`;
  return svg;
}
