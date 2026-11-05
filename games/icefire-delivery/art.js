import { themes, key } from './levels.js';
import { gateOpen } from './engine.js';
export function character(player, carried = 0, happy = false) {
  const blue = player === 0;
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="87" rx="28" ry="8" fill="#49654c22"/><g class="float"><ellipse cx="37" cy="83" rx="12" ry="7" fill="${blue ? '#679db8' : '#c78c67'}"/><ellipse cx="63" cy="83" rx="12" ry="7" fill="${blue ? '#679db8' : '#c78c67'}"/>${blue ? '<path d="m50 8 29 22 8 29-12 22H25L13 59l8-29z" fill="#acd9e7" stroke="#72a9c1" stroke-width="2"/><path d="m50 8-8 24H21z" fill="#dcf5ef"/><path d="m50 8 29 22H58z" fill="#caecf0"/>' : '<path d="M50 8q-4 21 13 25l7-13q25 25 17 48-7 20-37 20T15 67q-8-19 12-39l4 12Q49 29 50 8Z" fill="#edb37b" stroke="#d29165" stroke-width="2"/><path d="M50 35q6 10 2 15l12-6q17 28-14 35-27-4-17-27l5 6z" fill="#f8d28d"/>'}<ellipse cx="50" cy="57" rx="25" ry="22" fill="${blue ? '#dff2e9' : '#fff0ce'}"/>${happy ? '<path d="m35 55 5-4 5 4m10 0 5-4 5 4" fill="none" stroke="#4e6263" stroke-width="3" stroke-linecap="round"/>' : '<ellipse cx="40" cy="54" rx="3" ry="4" fill="#4e6263"/><ellipse cx="60" cy="54" rx="3" ry="4" fill="#4e6263"/>'}<ellipse cx="31" cy="61" rx="6" ry="3" fill="#e6b0a0"/><ellipse cx="69" cy="61" rx="6" ry="3" fill="#e6b0a0"/><path d="M45 65q5 5 10 0" fill="none" stroke="#9f8570" stroke-width="2" stroke-linecap="round"/><path d="M26 74q24 10 48 0v8q-24 10-48 0z" fill="${blue ? '#7cb39f' : '#c88e76'}"/>${carried ? `<g transform="translate(69 64)"><rect x="-14" y="-12" width="28" height="25" rx="5" fill="${blue ? '#80b5cc' : '#de9e70'}" stroke="#fff7da" stroke-width="2"/><path d="M0-12v25M-14-4h28" stroke="#fff0c4" stroke-width="4"/><circle cx="12" cy="-11" r="8" fill="#fff7d7"/><text x="12" y="-8" text-anchor="middle" font-size="9" fill="#8a8566">${carried}</text></g>` : ''}</g></svg>`;
}
function mailbox(x, y, player, delivered) {
  const color = player === 0 ? '#7caec2' : '#dba078';
  return `<g transform="translate(${x} ${y})"><ellipse cy="32" rx="33" ry="9" fill="#456b4222"/><path d="M-5 8h10v26h-10Z" fill="#a6906a"/><rect x="-29" y="-30" width="58" height="48" rx="14" fill="${color}"/><rect x="-24" y="-21" width="48" height="25" rx="9" fill="#f8f2da"/><path d="M-15-12h30" stroke="${color}" stroke-width="5" stroke-linecap="round"/><path d="M27-24v-20h13v11H27" fill="#f2d287" stroke="#9e926d" stroke-width="2"/><text y="14" font-size="9" fill="#fff8de" text-anchor="middle">${delivered ? '已送达 ✓' : player === 0 ? '冰冰邮筒' : '暖暖邮筒'}</text></g>`;
}
export function scene(level, state) {
  const theme = themes[level.theme];
  const open = gateOpen(level, state);
  let svg = `<rect width="800" height="600" fill="${theme.ground}"/>`;
  for (let y = 0; y < 6; y++) for (let x = 0; x < 8; x++) {
    if ((x + y) % 2 === 0) svg += `<rect x="${x * 100}" y="${y * 100}" width="100" height="100" fill="${theme.tile}" opacity=".55"/>`;
    svg += `<path d="m${x * 100 + 13} ${y * 100 + 80} 3-4 3 4m60-60 2-4 2 4" stroke="${theme.accent}" stroke-width="2" opacity=".15" fill="none"/>`;
  }
  for (const id of level.walls) {
    const [x, y] = id.split(',').map(Number);
    svg += `<g transform="translate(${x * 100 + 50} ${y * 100 + 50})"><ellipse cy="28" rx="33" ry="10" fill="#456b4220"/>${level.theme === 0 ? '<path d="M-4 8h8v23h-8z" fill="#b39b73"/><circle cy="-18" r="25" fill="#8fb77b"/><circle cx="-18" cy="1" r="23" fill="#81a96d"/><circle cx="18" cy="1" r="24" fill="#a1c48a"/><circle cx="4" cy="-12" r="19" fill="#afce95"/>' : level.theme === 1 ? '<path d="m-33 25 8-30 27-15 27 18 5 27z" fill="#c8b898"/><path d="m2-20 27 18 5 27H1Z" fill="#d8c8a8"/><path d="m-19 4 13-7" stroke="#e7d9b8" stroke-width="3"/>' : '<path d="m-30 26 7-39 25-19 25 24 6 34z" fill="#9c9dbb"/><path d="m2-32 25 24 6 34H1Z" fill="#b4b4cf"/><circle class="twinkle" cx="-13" cy="-9" r="4" fill="#f6e9ac"/>'}</g>`;
  }
  for (const tile of level.terrain) svg += `<g transform="translate(${tile.at[0] * 100 + 50} ${tile.at[1] * 100 + 50})"><rect x="-44" y="-35" width="88" height="70" rx="22" fill="${tile.player === 0 ? '#95d3df' : '#f0be83'}"/><path d="M-28 5q10 7 20 0m9-14q10 7 20 0m-15 30h15" stroke="${tile.player === 0 ? '#e0f6ee' : '#ffe2aa'}" stroke-width="4" fill="none"/><text y="7" text-anchor="middle" font-size="21" fill="#ffffffb0">${tile.player === 0 ? '❄' : '♨'}</text></g>`;
  for (const p of level.plates) {
    const pressed = state.players.some((position) => key(position) === key(p));
    svg += `<g transform="translate(${p[0] * 100 + 50} ${p[1] * 100 + 59})"><ellipse cy="8" rx="34" ry="17" fill="#b6a369"/><ellipse rx="34" ry="17" fill="${pressed ? '#b1ca84' : '#eed58b'}" stroke="#c4ae6d" stroke-width="3"/><ellipse rx="19" ry="9" fill="none" stroke="#fff7c8" stroke-width="3"/><path d="M0-7v14m-7-7H7" stroke="#fff7c8" stroke-width="2"/></g>`;
  }
  for (const id of level.gates) {
    const [x, y] = id.split(',').map(Number);
    svg += `<g transform="translate(${x * 100} ${y * 100})"><rect x="9" y="11" width="82" height="78" rx="9" fill="#b3bca533" stroke="#a5b494" stroke-width="2" stroke-dasharray="7 5"/><rect x="9" y="12" width="10" height="76" rx="4" fill="#b49a71"/><rect x="81" y="12" width="10" height="76" rx="4" fill="#b49a71"/>${open ? '<path d="M24 20h52" stroke="#a5c28f" stroke-width="9" stroke-linecap="round"/><text x="50" y="60" text-anchor="middle" font-size="13" fill="#749262">打开啦</text>' : '<path d="M24 28h52M24 48h52M24 68h52" stroke="#ccad7d" stroke-width="11" stroke-linecap="round"/><circle cx="50" cy="49" r="13" fill="#f6dc93"/><path d="M45 48v-5a5 5 0 0 1 10 0v5m-10 0h10v8H45z" fill="none" stroke="#ad8c59" stroke-width="2"/>'}</g>`;
  }
  for (const [player, goal] of level.goals.entries()) svg += mailbox(goal[0] * 100 + 50, goal[1] * 100 + 51, player, level.packages.filter((p) => p.player === player).every((p) => state.delivered.includes(p.id)));
  for (const parcel of level.packages) if (!state.picked.includes(parcel.id)) svg += `<g class="parcel" transform="translate(${parcel.at[0] * 100 + 50} ${parcel.at[1] * 100 + 53})"><ellipse cy="24" rx="26" ry="7" fill="#456b4220"/><g class="float"><rect x="-23" y="-24" width="46" height="43" rx="7" fill="${parcel.player === 0 ? '#8abfd0' : '#e7ad7a'}" stroke="${parcel.player === 0 ? '#6ba4ba' : '#ca956b'}" stroke-width="2"/><path d="M0-24v43M-23-10h46" stroke="#fff1c4" stroke-width="7"/><path d="M0-23q-22-22-16-7 2 9 16 7m0 0q22-22 16-7-2 9-16 7" stroke="#fff1c4" stroke-width="3" fill="none"/><path d="m6 1 8 8-8 5-8-8z" fill="#fffcdf"/></g></g>`;
  return svg;
}
