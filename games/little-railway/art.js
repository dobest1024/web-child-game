import { cols, rows, themes, key, same } from './levels.js';
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
function tree(x, y, theme, variant) {
  if (theme === 1 && variant % 2)
    return `<g transform="translate(${x} ${y})"><ellipse cy="31" rx="31" ry="10" fill="#c4aa6d" opacity=".3"/><path d="m-3 30 6-52" stroke="#b28e59" stroke-width="10"/><path d="M3-20Q-32-52-34-8Q-14-25 3-20M3-20Q36-53 38-8Q15-24 3-20M3-20Q7-61-14-45Q-2-38 3-20" fill="#68a678"/><circle cx="5" cy="-14" r="7" fill="#bb9563"/></g>`;
  return `<g transform="translate(${x} ${y})"><ellipse cy="33" rx="33" ry="10" fill="#4a7750" opacity=".16"/><path d="M-4 9h8v26h-8z" fill="#a38556"/>${theme === 2 ? '<path d="m0-42-30 42h13l-24 23h82L17 0h13z" fill="#73a391"/><path d="m0-42-20 28h40zM-21 5l-13 15h68L21 5 9 10-9 4z" fill="#f9fbef"/>' : '<circle cy="-16" r="25" fill="#76a66c"/><circle cx="-18" cy="4" r="23" fill="#699b61"/><circle cx="18" cy="3" r="24" fill="#7aa96a"/><circle cx="5" cy="-9" r="18" fill="#8bb774"/>'}${variant % 3 === 0 && theme === 0 ? '<circle cx="-15" cy="4" r="5" fill="#df8b67"/><circle cx="14" cy="-13" r="5" fill="#df8b67"/>' : ''}</g>`;
}
function station(x, y, start) {
  return `<g transform="translate(${x} ${y})"><ellipse cy="30" rx="39" ry="12" fill="#466448" opacity=".2"/><rect x="-32" y="-20" width="64" height="47" rx="5" fill="#fff4d3"/><path d="m-39-17 10-22h58l10 22z" fill="${start ? '#4d8c76' : '#d87961'}"/><path d="M-28-32h56M-33-24h66" stroke="${start ? '#397663' : '#be6652'}" stroke-width="2"/><rect x="-10" y="-3" width="20" height="30" rx="9" fill="#776647"/><rect x="-25" y="-5" width="10" height="12" rx="2" fill="#acd7d5"/><rect x="15" y="-5" width="10" height="12" rx="2" fill="#acd7d5"/><rect x="-21" y="-19" width="42" height="13" rx="4" fill="#fffbe7"/><text y="-9" text-anchor="middle" font-size="9" font-weight="bold" fill="#626c4a">${start ? '出发站' : '终点站'}</text><path d="M30-37v-18" stroke="#8c886b" stroke-width="2"/><path d="M31-55h15l-5 6 5 6H31z" fill="${start ? '#f0d777' : '#e89572'}"/></g>`;
}
function star(x, y) {
  return `<g transform="translate(${x} ${y})"><circle r="20" fill="#fff8cf" opacity=".7"/><path class="sparkle" d="m0-17 5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z" fill="#f4c35b" stroke="#dcab43" stroke-width="2"/><circle cx="-4" cy="1" r="1.5" fill="#8b713a"/><circle cx="4" cy="1" r="1.5" fill="#8b713a"/></g>`;
}
export function locomotive(color = '#df8062') {
  return `<g><ellipse cx="-3" cy="14" rx="35" ry="15" fill="#324e4325"/><rect x="-30" y="-23" width="48" height="46" rx="11" fill="#385b51"/><g fill="#e3be74" stroke="#657568" stroke-width="3"><circle cx="-19" cy="-23" r="7"/><circle cx="12" cy="-23" r="7"/><circle cx="-19" cy="23" r="7"/><circle cx="12" cy="23" r="7"/></g><rect x="-29" y="-21" width="27" height="42" rx="6" fill="#f3d68d"/><rect x="-22" y="-14" width="13" height="28" rx="3" fill="#a7d9d6"/><rect x="-3" y="-16" width="32" height="32" rx="9" fill="${color}"/><path d="M0-9h23M0 9h23" stroke="#f1ad82" stroke-width="3"/><rect x="24" y="-11" width="9" height="22" rx="4" fill="#f4d375"/><circle cx="15" cy="0" r="7" fill="#655945"/><circle cx="15" cy="0" r="4" fill="#3d4d43"/><path d="m34-13 7 7v12l-7 7z" fill="#426b59"/><circle class="train-smoke" cx="17" cy="-5" r="10" fill="#fffcdf" opacity=".6"/></g>`;
}
export function drawScene(level, route, collected = [], running = false) {
  const theme = themes[level.theme];
  const occupied = new Set([
    ...level.passengers.map((p) => key(p.at)),
    ...level.tokens.map(key),
    key(level.start),
    key(level.goal),
  ]);
  let svg = `<defs><pattern id="grass" width="100" height="100" patternUnits="userSpaceOnUse"><path d="m17 78 3-5 3 5m48-61 2-4 2 4" fill="none" stroke="${theme.dark}" stroke-opacity=".12" stroke-width="2" stroke-linecap="round"/></pattern><pattern id="waves" width="40" height="30" patternUnits="userSpaceOnUse"><path d="M5 16q7 5 14 0m8-9h7" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="2" stroke-linecap="round"/></pattern></defs><rect width="800" height="600" fill="${theme.ground}"/>`;
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      if ((x + y) % 2 === 0)
        svg += `<rect x="${x * 100}" y="${y * 100}" width="100" height="100" fill="${theme.tile}" opacity=".43"/>`;
      const p = `${x},${y}`;
      if (
        !occupied.has(p) &&
        !level.rocks.includes(p) &&
        !level.water.includes(p) &&
        !level.bridges.includes(p)
      ) {
        const flower = (x * 13 + y * 7 + Number(level.theme)) % 4 === 0;
        if (flower)
          svg += `<g transform="translate(${x * 100 + 23} ${y * 100 + 72})" opacity=".8"><path d="M0 8V0m0 6 5-3" stroke="#87a468" stroke-width="2"/><circle cy="-3" r="5" fill="${level.theme === 2 ? '#fff' : '#fff2bd'}"/><circle cy="-3" r="2" fill="#e4a46e"/></g>`;
      }
    }
  svg += '<rect width="800" height="600" fill="url(#grass)"/>';
  for (const p of [...level.water, ...level.bridges]) {
    const [x, y] = p.split(',').map(Number);
    svg += `<rect x="${x * 100}" y="${y * 100}" width="100" height="100" fill="${theme.water}"/><rect x="${x * 100}" y="${y * 100}" width="100" height="100" fill="url(#waves)"/>`;
  }
  for (const p of level.bridges) {
    const [x, y] = p.split(',').map(Number);
    svg += `<g transform="translate(${x * 100} ${y * 100})"><rect y="18" width="100" height="64" rx="5" fill="#c4a16d"/>${[5, 22, 39, 56, 73, 90].map((v) => `<path d="M${v} 20v60" stroke="#a68150" stroke-width="2"/>`).join('')}<path d="M0 17h100M0 83h100" stroke="#f1d3a0" stroke-width="7"/><path d="M10 10v22M90 10v22M10 69v22M90 69v22" stroke="#ac8659" stroke-width="6"/></g>`;
  }
  for (const p of level.rocks) {
    const [x, y] = p.split(',').map(Number);
    svg += tree(x * 100 + 50, y * 100 + 45, level.theme, x + y);
  }
  if (route.length > 1) {
    const path = route
      .map(([x, y], i) => `${i ? 'L' : 'M'}${x * 100 + 50} ${y * 100 + 50}`)
      .join(' ');
    svg += `<path d="${path}" fill="none" stroke="#67745530" stroke-width="38" stroke-linecap="round" stroke-linejoin="round"/>`;
    for (let i = 1; i < route.length; i++) {
      const [a, b] = [route[i - 1], route[i]];
      for (let j = 0; j < 5; j++) {
        const x = (a[0] + ((b[0] - a[0]) * j) / 5) * 100 + 50;
        const y = (a[1] + ((b[1] - a[1]) * j) / 5) * 100 + 50;
        svg += `<rect x="-4" y="-19" width="8" height="38" rx="2" fill="#ac8c5e" transform="translate(${x} ${y}) rotate(${a[0] === b[0] ? 90 : 0})"/>`;
      }
    }
    svg += `<path d="${path}" fill="none" stroke="#586f68" stroke-width="23" stroke-linecap="round" stroke-linejoin="round"/><path d="${path}" fill="none" stroke="#d3d7b2" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/><path d="${path}" fill="none" stroke="#9aa78c" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  svg += station(level.start[0] * 100 + 50, level.start[1] * 100 + 45, true);
  svg += station(level.goal[0] * 100 + 50, level.goal[1] * 100 + 45, false);
  level.tokens.forEach((p) => {
    if (!collected.includes(key(p)))
      svg += `<g data-token="${key(p)}">${star(p[0] * 100 + 50, p[1] * 100 + 45)}</g>`;
  });
  level.passengers.forEach((p) => {
    if (!collected.includes(key(p.at)))
      svg += `<g data-passenger="${key(p.at)}" transform="translate(${p.at[0] * 100 + 15} ${p.at[1] * 100 + 4})"><ellipse cx="35" cy="80" rx="25" ry="7" fill="#476a4825"/><g class="float"><g transform="scale(.7)">${animal(p.kind)}</g></g></g>`;
  });
  if (!running)
    svg += `<g transform="translate(${level.start[0] * 100 + 50} ${level.start[1] * 100 + 65}) scale(.68)">${locomotive()}</g>`;
  return svg;
}
