import { themes, vectors } from './levels.js';
import { portsOf } from './engine.js';
export function dropSvg(happy = true) {
  return `<svg viewBox="0 0 100 110" aria-hidden="true"><ellipse cx="50" cy="98" rx="31" ry="8" fill="#417b8220"/><g class="float"><path d="M50 7C42 28 17 48 17 67a33 33 0 0 0 66 0C83 48 58 28 50 7Z" fill="#83cbd8" stroke="#62acbf" stroke-width="3"/><path d="M38 34Q25 51 27 63" stroke="#c2e9e6" stroke-width="7" fill="none" stroke-linecap="round"/><ellipse cx="35" cy="75" rx="6" ry="4" fill="#efb7b0"/><ellipse cx="65" cy="75" rx="6" ry="4" fill="#efb7b0"/><circle cx="38" cy="64" r="4" fill="#386376"/><circle cx="62" cy="64" r="4" fill="#386376"/><path d="M42 78q8 ${happy ? 8 : -5} 16 0" fill="none" stroke="#386376" stroke-width="3" stroke-linecap="round"/></g></svg>`;
}
export function flowerSvg(theme, watered = false) {
  return `<svg viewBox="0 0 100 110" aria-hidden="true">${flower(theme, watered)}</svg>`;
}
function flower(theme, watered) {
  const color = ['#e8a795', '#d8b1d8', '#bbb6e8'][theme];
  return `<path d="M50 85V46" stroke="#82ab72" stroke-width="6" stroke-linecap="round"/><path d="M49 75Q21 79 22 60Q41 57 49 75M52 66Q77 70 77 50Q57 48 52 66" fill="#a0c184"/><path d="m28 83 6 23h32l6-23z" fill="#dba47c"/><path d="M26 81h48v8H26z" fill="#e8bb8e"/>${watered ? `<g class="bloom"><g fill="${color}"><ellipse cx="50" cy="27" rx="13" ry="20"/><ellipse cx="50" cy="61" rx="13" ry="20"/><ellipse cx="32" cy="43" rx="20" ry="13"/><ellipse cx="68" cy="43" rx="20" ry="13"/></g><circle cx="50" cy="44" r="17" fill="#f3d57c"/><circle cx="44" cy="42" r="2.5" fill="#8f794d"/><circle cx="56" cy="42" r="2.5" fill="#8f794d"/><path d="M45 51q5 5 10 0" fill="none" stroke="#8f794d" stroke-width="2" stroke-linecap="round"/></g>` : `<g transform="rotate(12 50 60)"><path d="M50 23C23 25 27 57 50 61C73 57 77 25 50 23Z" fill="${color}"/><path d="M41 32q-2 14 9 24" fill="none" stroke="#fff5df" stroke-width="4" opacity=".4"/><path d="m40 46 5 2m10 0 5-2" stroke="#866d69" stroke-width="2" stroke-linecap="round"/></g>`}`;
}
const end = (direction) => [
  50 + vectors[direction][0] * 50,
  50 + vectors[direction][1] * 50,
];
export function drawScene(level, tiles, wet, leaks, blocked) {
  const theme = themes[level.theme];
  let svg = `<rect width="700" height="600" fill="${theme.background}"/>`;
  const occupied = new Set(tiles.map((tile) => tile.at));
  for (let y = 0; y < 6; y++)
    for (let x = 0; x < 7; x++) {
      if ((x + y) % 2 === 0)
        svg += `<rect x="${x * 100}" y="${y * 100}" width="100" height="100" fill="${theme.ground}" opacity=".4"/>`;
      if (!occupied.has(`${x},${y}`) && (x * 7 + y * 13 + level.id) % 4 === 0)
        svg += `<g transform="translate(${x * 100 + 50} ${y * 100 + 56})"><ellipse cy="22" rx="26" ry="7" fill="${theme.accent}" opacity=".12"/>${level.theme === 0 ? '<path d="M-3 7h6v16h-6Z" fill="#ac9568"/><circle cy="-8" r="20" fill="#9cba7c"/><circle cx="-15" cy="5" r="17" fill="#8eaf72"/><circle cx="15" cy="5" r="17" fill="#acc68a"/>' : level.theme === 1 ? '<path d="M-27 13Q-28-18 0-21Q28-18 27 13L0 25Z" fill="#e1b99a"/><path d="M0-20v43M-18-10 0 23M18-10 0 23" stroke="#f6ddbd" stroke-width="3"/>' : '<path d="M-7 22V0h14v22" fill="#b0acbb"/><path d="M-31 0Q-25-37 0-37Q25-37 31 0Z" fill="#aba7cc"/><circle cx="-10" cy="-16" r="5" fill="#eee5cf"/><circle cx="12" cy="-11" r="6" fill="#eee5cf"/>'}</g>`;
      else if (!occupied.has(`${x},${y}`))
        svg += `<path d="m${x * 100 + 26} ${y * 100 + 74} 3-5 3 5m39-48 3-5 3 5" stroke="${theme.accent}" stroke-width="2" opacity=".2" fill="none"/>`;
    }
  for (const tile of tiles) {
    const [x, y] = tile.at.split(',').map(Number);
    const ports = portsOf(tile);
    const isWet = wet.has(tile.at);
    svg += `<g transform="translate(${x * 100} ${y * 100})">`;
    const pipes = ports
      .map((direction) => {
        const [ex, ey] = end(direction);
        return `M50 50L${ex} ${ey}`;
      })
      .join(' ');
    svg += `<path d="${pipes}" stroke="#768c7c22" stroke-width="38" fill="none" stroke-linecap="round"/><path d="${pipes}" stroke="#8caa9d" stroke-width="30" fill="none" stroke-linecap="round"/><path d="${pipes}" stroke="#f9fcdf" stroke-width="23" fill="none" stroke-linecap="round"/><path d="${pipes}" stroke="${isWet ? '#62b8cf' : '#c3d5b8'}" stroke-width="15" fill="none" stroke-linecap="round"/>`;
    if (isWet)
      svg += `<path class="flowline" d="${pipes}" stroke="#d8f5ef" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    for (const direction of ports) {
      const [ex, ey] = end(direction);
      const nearX = 50 + (ex - 50) * 0.74,
        nearY = 50 + (ey - 50) * 0.74;
      svg += `<path d="M${nearX + (direction % 2 ? 0 : -16)} ${nearY + (direction % 2 ? -16 : 0)}l${direction % 2 ? 0 : 32} ${direction % 2 ? 32 : 0}" stroke="#94af9f" stroke-width="5" stroke-linecap="round"/>`;
    }
    if (tile.kind === 'source')
      svg += `<ellipse cx="50" cy="56" rx="36" ry="31" fill="#87c6d5" stroke="#faf7db" stroke-width="6"/><path d="M50 14C45 29 31 38 31 51a19 19 0 0 0 38 0C69 38 55 29 50 14Z" fill="#b6e3e4" stroke="#72b6c7" stroke-width="2"/><circle cx="43" cy="50" r="2.5" fill="#4c8090"/><circle cx="57" cy="50" r="2.5" fill="#4c8090"/><path d="M45 59q5 5 10 0" fill="none" stroke="#4c8090" stroke-width="2"/><rect x="29" y="82" width="42" height="14" rx="7" fill="#fff8dc"/><text x="50" y="92" text-anchor="middle" font-size="9" fill="#7c9b89">水源</text>`;
    if (tile.kind === 'flower')
      svg += `<g transform="translate(7 -7) scale(.86)">${flower(level.theme, isWet)}</g>`;
    if (tile.kind === 'valve')
      svg += `<circle cx="50" cy="50" r="24" fill="${tile.open ? '#96c6a0' : '#e5a08e'}" stroke="${blocked.includes(tile.at) ? '#bb7159' : '#fff3d5'}" stroke-width="4"/><circle cx="50" cy="50" r="13" fill="none" stroke="#fff6df" stroke-width="5"/><path d="M50 31v38M31 50h38" stroke="#fff6df" stroke-width="5" stroke-linecap="round"/><rect x="29" y="79" width="42" height="15" rx="7" fill="#fff7db"/><text x="50" y="90" text-anchor="middle" font-size="9" fill="#7d8c77">${tile.open ? '已打开' : '点我开'}</text>`;
    if (tile.kind === 'pipe')
      svg += `<circle cx="50" cy="50" r="3" fill="${isWet ? '#d3f3eb' : '#a4bc9b'}"/>`;
    for (const leak of leaks.filter((item) => item.at === tile.at)) {
      const [ex, ey] = end(leak.direction);
      svg += `<circle class="leak" cx="${50 + (ex - 50) * 0.87}" cy="${50 + (ey - 50) * 0.87}" r="12" fill="#f3c7ac77" stroke="#d88568" stroke-width="4"/>`;
    }
    svg += '</g>';
  }
  return svg;
}
