// 场景绘制层：每个函数接收参数对象，返回 SVG 片段字符串（不含 <svg> 外壳）。
// 同样的参数永远输出同样的字符串；两幅图的差异完全由参数决定。

function garden(p) {
  let svg = `<rect width="400" height="300" fill="${p.sky}"/>`;
  if (p.cloud.present)
    svg += `<g fill="#ffffff" opacity=".92"><ellipse cx="${p.cloud.x}" cy="${p.cloud.y}" rx="30" ry="13"/><ellipse cx="${p.cloud.x - 20}" cy="${p.cloud.y + 5}" rx="18" ry="10"/><ellipse cx="${p.cloud.x + 21}" cy="${p.cloud.y + 4}" rx="17" ry="9"/></g>`;
  let rays = '';
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const cos = Math.cos(angle),
      sin = Math.sin(angle);
    rays += `<line x1="${(p.sun.x + cos * (p.sun.r + 5)).toFixed(1)}" y1="${(p.sun.y + sin * (p.sun.r + 5)).toFixed(1)}" x2="${(p.sun.x + cos * (p.sun.r + 12)).toFixed(1)}" y2="${(p.sun.y + sin * (p.sun.r + 12)).toFixed(1)}"/>`;
  }
  svg += `<g stroke="${p.sun.color}" stroke-width="4" stroke-linecap="round">${rays}</g><circle cx="${p.sun.x}" cy="${p.sun.y}" r="${p.sun.r}" fill="${p.sun.color}" stroke="#f0b429" stroke-width="3"/>`;
  svg += `<ellipse cx="70" cy="252" rx="190" ry="52" fill="${p.hill}"/><rect y="216" width="400" height="84" fill="${p.grass}"/>`;
  svg += `<g stroke="#6ba55c" stroke-width="2.5" stroke-linecap="round" fill="none"><path d="M148 258q2 -8 0 -12M154 258q3 -6 7 -9M342 268q2 -8 0 -12M348 268q3 -6 7 -9"/></g><g fill="#f6d55c"><circle cx="220" cy="270" r="4"/><circle cx="288" cy="262" r="4"/></g><g fill="#ffffff" opacity=".7"><circle cx="120" cy="272" r="3"/><circle cx="330" cy="282" r="3"/></g>`;
  const spots = [
    [-14, 8],
    [12, -8],
    [-2, -18],
    [15, 10],
  ];
  svg += `<rect x="53" y="176" width="14" height="66" rx="6" fill="#9a6b4f"/><circle cx="40" cy="184" r="20" fill="#7db463"/><circle cx="80" cy="184" r="20" fill="#8ec271"/><circle cx="60" cy="166" r="26" fill="#8cbb70"/>`;
  for (let i = 0; i < p.tree.apples; i++)
    svg += `<g transform="translate(${60 + spots[i][0]} ${170 + spots[i][1]})"><circle r="5" fill="#e2483d"/><circle cx="-1.5" cy="-1.5" r="1.4" fill="#ffffff" opacity=".7"/></g>`;
  svg += `<rect x="270" y="206" width="60" height="58" fill="${p.house.wall}" stroke="#d8b98e" stroke-width="2"/><path d="M262 208L300 170l38 38z" fill="${p.house.roof}"/><rect x="292" y="234" width="16" height="30" rx="7" fill="${p.house.door}"/><circle cx="303" cy="249" r="1.6" fill="#5a4632"/><circle cx="314" cy="222" r="7" fill="#bfe3f2" stroke="#ffffff" stroke-width="2"/><path d="M307 222h14M314 215v14" stroke="#ffffff" stroke-width="1.5"/>`;
  svg += `<g transform="translate(${p.flower.x} ${p.flower.y}) scale(${p.flower.s})"><path d="M0 44V16" stroke="#5da66b" stroke-width="4" stroke-linecap="round"/><path d="M0 30q-12 2 -14 -8q10 -2 14 8M0 24q12 2 14 -8q-10 -2 -14 8" fill="#7db463"/><g fill="${p.flower.color}"><ellipse cy="-9" rx="6" ry="9"/><ellipse cy="9" rx="6" ry="9"/><ellipse cx="-9" rx="9" ry="6"/><ellipse cx="9" rx="9" ry="6"/></g><circle r="5.5" fill="#f6d55c"/></g>`;
  const flip = p.butterfly.dir === 'right' ? ' scale(-1 1)' : '';
  svg += `<g transform="translate(${p.butterfly.x} ${p.butterfly.y})${flip}"><circle cx="-8" cy="-6" r="11" fill="#f2b23c"/><circle cx="-10" cy="-8" r="3" fill="#ffffff" opacity=".8"/><circle cx="9" cy="7" r="7.5" fill="#e2892f"/><path d="M-6 10L8 -8" stroke="#5a4632" stroke-width="4" stroke-linecap="round"/><circle cx="9" cy="-9" r="3" fill="#5a4632"/><path d="M10 -11q4 -6 9 -7M12 -13q6 -3 11 -2" stroke="#5a4632" stroke-width="1.8" fill="none" stroke-linecap="round"/></g>`;
  return svg;
}

function kidsRoom(p) {
  let svg = `<rect width="400" height="300" fill="${p.wall}"/>`;
  svg += `<rect x="16" y="30" width="92" height="80" rx="8" fill="#bfe3f2" stroke="#ffffff" stroke-width="5"/><path d="M62 30v80M16 70h92" stroke="#ffffff" stroke-width="4"/><circle cx="88" cy="48" r="9" fill="#f6d55c"/><g fill="#ffffff"><circle cx="36" cy="86" r="2.5"/><circle cx="46" cy="52" r="2"/><circle cx="80" cy="92" r="2"/></g>`;
  svg += `<g transform="translate(${p.kite.x} ${p.kite.y})"><path d="M0 -26L18 0 0 26 -18 0Z" fill="${p.kite.color}" stroke="#ffffff" stroke-width="2.5"/><path d="M0 -26V26M-18 0H18" stroke="#ffffff" stroke-width="1.5" opacity=".7"/><path d="M0 26q9 12 4 24" stroke="#8a7256" stroke-width="2" fill="none"/><path d="M3 33l7 -3 -1 7zM4 44l7 -3 -1 7z" fill="#e2685f"/></g>`;
  svg += `<rect y="210" width="400" height="90" fill="${p.floor}"/><path d="M0 240h400M0 272h400M120 210v30M280 240v32M60 272v28M340 272v28" stroke="#c69a6d" stroke-width="2" opacity=".6"/>`;
  svg += `<ellipse cx="${p.lamp.x}" cy="250" rx="16" ry="5" fill="#8a7256"/><rect x="${p.lamp.x - 3}" y="138" width="6" height="110" rx="3" fill="#8a7256"/><g transform="translate(${p.lamp.x} ${p.lamp.y}) scale(${p.lamp.s})"><path d="M-18 12L-10 -14h20l8 26z" fill="#f2b23c"/><path d="M-18 12h36" stroke="#d99a2b" stroke-width="4"/></g>`;
  svg += `<ellipse cx="${p.rug.x}" cy="${p.rug.y}" rx="64" ry="20" fill="${p.rug.color}"/><ellipse cx="${p.rug.x}" cy="${p.rug.y}" rx="40" ry="12" fill="#ffffff" opacity=".35"/><ellipse cx="${p.rug.x}" cy="${p.rug.y}" rx="14" ry="5" fill="#ffffff" opacity=".35"/>`;
  svg += `<rect x="68" y="238" width="22" height="22" rx="4" fill="#e2685f"/><circle cx="79" cy="249" r="4" fill="#ffffff" opacity=".6"/><rect x="94" y="238" width="22" height="22" rx="4" fill="#5f9ee2"/><circle cx="105" cy="249" r="4" fill="#ffffff" opacity=".6"/>`;
  if (p.blocks.count >= 3)
    svg += `<rect x="81" y="216" width="22" height="22" rx="4" fill="#f2b23c"/><circle cx="92" cy="227" r="4" fill="#ffffff" opacity=".6"/>`;
  if (p.ball.present)
    svg += `<g transform="translate(${p.ball.x} ${p.ball.y})"><circle r="16" fill="#e2685f"/><path d="M-16 0a16 16 0 0 1 32 0z" fill="#f2b23c"/><circle r="16" fill="none" stroke="#c2543f" stroke-width="2"/></g>`;
  svg += `<rect x="344" y="214" width="56" height="34" rx="6" fill="#c9a06a"/><rect x="344" y="204" width="56" height="12" rx="6" fill="#fff4e0"/><rect x="348" y="200" width="18" height="11" rx="5" fill="#ffffff"/><rect x="366" y="212" width="34" height="24" rx="4" fill="${p.bed.blanket}"/><path d="M366 220h34M366 228h34" stroke="#ffffff" stroke-width="2" opacity=".4"/><rect x="348" y="248" width="8" height="12" fill="#8a7256"/><rect x="388" y="248" width="8" height="12" fill="#8a7256"/>`;
  const flip = p.robot.dir === 'left' ? ' scale(-1 1)' : '';
  svg += `<g transform="translate(${p.robot.x} ${p.robot.y})${flip}"><rect x="12" y="-14" width="8" height="20" rx="4" fill="#9db3c9" transform="rotate(-24 16 -14)"/><rect x="-21" y="-6" width="8" height="17" rx="4" fill="#9db3c9"/><rect x="-14" y="-8" width="28" height="26" rx="5" fill="#7f9ec9"/><circle cy="6" r="5" fill="#f2b23c"/><rect x="-11" y="-30" width="22" height="20" rx="5" fill="#9db3c9"/><rect x="-8" y="-26" width="15" height="9" rx="4.5" fill="#31456b"/><circle cx="3" cy="-21.5" r="2.6" fill="#bfe3f2"/><path d="M0 -30v-7" stroke="#9db3c9" stroke-width="2.5"/><circle cy="-39" r="3" fill="#e2685f"/><rect x="-8" y="18" width="8" height="8" fill="#5a6b85"/><rect x="2" y="18" width="8" height="8" fill="#5a6b85"/></g>`;
  return svg;
}

function ocean(p) {
  let svg = `<rect width="400" height="300" fill="${p.water}"/><rect y="196" width="400" height="104" fill="${p.deep}" opacity=".45"/>`;
  svg += `<path d="M0 272q70 -16 150 -8t140 4 110 -6V300H0Z" fill="${p.sand}"/>`;
  svg += `<g stroke="#f2907f" stroke-width="6" stroke-linecap="round" fill="none"><path d="M352 286v-22M344 286v-14M360 286v-14M344 272q-6 -6 -6 -12M360 272q6 -6 6 -12"/></g><g fill="#f6c9a0"><ellipse cx="316" cy="286" rx="8" ry="5"/><path d="M308 286a8 8 0 0 1 16 0z" fill="#ffffff" opacity=".5"/></g><circle cx="180" cy="282" r="4" fill="#d9b98a"/>`;
  const spots = [
    [-13, -2],
    [1, 7],
    [11, -9],
    [0, -16],
  ];
  for (let i = 0; i < p.school.count; i++)
    svg += `<g transform="translate(${p.school.x + spots[i][0]} ${p.school.y + spots[i][1]})"><ellipse rx="9" ry="6" fill="#f2b23c"/><path d="M7 0l8 -5v10z" fill="#d99a2b"/><circle cx="-4" cy="-1.5" r="1.4" fill="#31456b"/></g>`;
  const flip = p.fishRed.dir === 'right' ? ' scale(-1 1)' : '';
  svg += `<g transform="translate(${p.fishRed.x} ${p.fishRed.y})${flip}"><path d="M14 0l16 -11v22z" fill="#d94f3f"/><ellipse rx="20" ry="13" fill="#f26d5a"/><path d="M-2 -12q6 -8 10 -2" stroke="#d94f3f" stroke-width="4" fill="none"/><path d="M-8 -8q10 8 0 16M0 -11q12 10 0 22" stroke="#f2907f" stroke-width="3" fill="none"/><circle cx="-11" cy="-3" r="3.4" fill="#ffffff"/><circle cx="-11" cy="-3" r="1.7" fill="#31456b"/></g>`;
  if (p.bubbles.present)
    svg += `<g fill="#e2f5fa" opacity=".85"><circle cx="${p.bubbles.x}" cy="${p.bubbles.y - 14}" r="6"/><circle cx="${p.bubbles.x + 7}" cy="${p.bubbles.y + 2}" r="4.5"/><circle cx="${p.bubbles.x - 4}" cy="${p.bubbles.y + 14}" r="3.5"/></g>`;
  svg += `<g transform="translate(${p.starfish.x} ${p.starfish.y})"><path d="M0 -15L4 -5 15 -4 7 4 9 15 0 9 -9 15 -7 4 -15 -4 -4 -5Z" fill="${p.starfish.color}" stroke="#b8543f" stroke-width="1.5" stroke-linejoin="round"/><circle cx="-2" cy="-1" r="1.2" fill="#b8543f" opacity=".5"/><circle cx="4" cy="2" r="1.2" fill="#b8543f" opacity=".5"/></g>`;
  svg += `<g transform="translate(${p.seaweed.x} ${p.seaweed.y}) scale(1 ${p.seaweed.s})"><path d="M0 0q-11 -12 0 -24q11 -12 0 -24" stroke="#4e8a5a" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M7 0q9 -10 1 -20" stroke="#6fb87d" stroke-width="5" fill="none" stroke-linecap="round"/></g>`;
  if (p.crab.present)
    svg += `<g transform="translate(${p.crab.x} ${p.crab.y})"><path d="M-14 -2q-8 -8 -12 -4M14 -2q8 -8 12 -4" stroke="#c2543f" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="-17" cy="-9" r="4.5" fill="#e2574b"/><circle cx="17" cy="-9" r="4.5" fill="#e2574b"/><path d="M-8 8l-4 5M-3 9v6M3 9v6M8 8l4 5" stroke="#c2543f" stroke-width="2.5" stroke-linecap="round"/><ellipse rx="13" ry="9" fill="#e2574b"/><path d="M-4 -13v-5M4 -13v-5" stroke="#c2543f" stroke-width="2"/><circle cx="-4" cy="-19" r="2.4" fill="#31456b"/><circle cx="4" cy="-19" r="2.4" fill="#31456b"/></g>`;
  return svg;
}

function farm(p) {
  let svg = `<rect width="400" height="300" fill="${p.sky}"/>`;
  svg += `<circle cx="350" cy="44" r="16" fill="#ffd94d"/><g fill="#ffffff" opacity=".9"><ellipse cx="236" cy="56" rx="24" ry="10"/><ellipse cx="252" cy="50" rx="14" ry="8"/></g>`;
  svg += `<rect y="182" width="400" height="118" fill="${p.field}"/><path d="M0 206h400M0 232h400M0 258h400" stroke="#8fb86a" stroke-width="3" opacity=".6"/>`;
  svg += `<rect x="56" y="172" width="76" height="60" fill="${p.barn.wall}" stroke="#7c3f33" stroke-width="2"/><path d="M48 174L94 138l46 36z" fill="${p.barn.roof}"/><rect x="82" y="198" width="24" height="34" rx="3" fill="#7c3f33"/><path d="M82 198l24 34M106 198l-24 34" stroke="${p.barn.wall}" stroke-width="3"/><circle cx="70" cy="188" r="6" fill="#ffffff" opacity=".85"/><circle cx="118" cy="188" r="6" fill="#ffffff" opacity=".85"/>`;
  svg += `<rect x="264" y="234" width="112" height="6" rx="3" fill="#b8905c"/><rect x="264" y="248" width="112" height="6" rx="3" fill="#b8905c"/>`;
  for (let i = 0; i < p.fence.posts; i++) {
    const x = 272 + i * 24;
    svg += `<rect x="${x - 4}" y="226" width="8" height="38" rx="3" fill="#c9a06a"/>`;
  }
  svg += `<g transform="translate(236 246) scale(${p.hay.s})"><ellipse rx="22" ry="15" fill="#e8c76f"/><path d="M-14 -6q14 8 28 0M-16 2q16 9 32 0M-12 -12q12 6 24 0" stroke="#c9a544" stroke-width="2.5" fill="none"/></g>`;
  if (p.chicken.present)
    svg += `<g transform="translate(172 252)"><path d="M-2 10v6M4 10v6" stroke="#e2892f" stroke-width="2.5" stroke-linecap="round"/><ellipse rx="12" ry="9.5" fill="#ffffff" stroke="#d8cbb8" stroke-width="2"/><circle cx="9" cy="-9" r="7" fill="#ffffff" stroke="#d8cbb8" stroke-width="2"/><path d="M5 -16q2 -4 5 -2" stroke="#e2574b" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M16 -9l6 2 -6 2z" fill="#e2892f"/><circle cx="10" cy="-10.5" r="1.4" fill="#31456b"/><path d="M-4 -3q4 4 8 0" stroke="#d8cbb8" stroke-width="1.6" fill="none"/></g>`;
  const flip = p.scarecrow.dir === 'right' ? ' scale(-1 1)' : '';
  svg += `<g transform="translate(348 150)${flip}"><rect x="-3" y="-4" width="6" height="72" rx="3" fill="#9a6b4f"/><path d="M-26 8h52" stroke="#9a6b4f" stroke-width="5" stroke-linecap="round"/><circle cy="-10" r="11" fill="#f6e2c8"/><circle cx="-3.5" cy="-12" r="1.6" fill="#5a4632"/><circle cx="3.5" cy="-12" r="1.6" fill="#5a4632"/><path d="M-3 -7q3 3 6 0" stroke="#5a4632" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M-15 -16h30l-4 -12h-22z" fill="#c9a06a"/><path d="M-19 -16h38" stroke="#b8905c" stroke-width="3" stroke-linecap="round"/><path d="M-2 -2q-9 2 -12 8" stroke="#e2685f" stroke-width="5" fill="none" stroke-linecap="round"/></g>`;
  if (p.cart.present)
    svg += `<g transform="translate(44 246)"><path d="M-22 -14h34l-8 16h-20z" fill="#5f9ee2"/><path d="M12 -14l10 -8" stroke="#5a4632" stroke-width="4" stroke-linecap="round"/><circle cx="8" cy="8" r="8" fill="#5a4632"/><circle cx="8" cy="8" r="3" fill="#8a7256"/></g>`;
  return svg;
}

function space(p) {
  let svg = `<rect width="400" height="300" fill="${p.sky}"/>`;
  const starSpots = [
    [26, 38],
    [74, 148],
    [132, 52],
    [188, 24],
    [252, 86],
    [64, 214],
    [118, 188],
    [258, 44],
    [36, 120],
  ];
  for (const [x, y] of starSpots)
    svg += `<circle cx="${x}" cy="${y}" r="2.2" fill="#ffffff" opacity=".9"/>`;
  if (p.stars.count > starSpots.length)
    svg += `<g transform="translate(356 44)"><path d="M0 -6L1.8 -1.8 6 0 1.8 1.8 0 6 -1.8 1.8 -6 0 -1.8 -1.8Z" fill="#ffffff"/></g>`;
  svg += `<g transform="translate(${p.planet.x} ${p.planet.y})"><ellipse rx="52" ry="12" fill="none" stroke="#e8b98a" stroke-width="5" opacity=".6" transform="rotate(-14)"/><circle r="${p.planet.r}" fill="${p.planet.color}"/><circle cx="-10" cy="-8" r="7" fill="#000000" opacity=".14"/><circle cx="8" cy="10" r="9" fill="#000000" opacity=".14"/><circle cx="12" cy="-12" r="4.5" fill="#000000" opacity=".14"/></g>`;
  svg += `<g transform="translate(${p.moon.x} ${p.moon.y}) scale(${p.moon.s})"><circle r="22" fill="#e8e3d5"/><circle cx="-8" cy="-6" r="5" fill="#c9c2ae"/><circle cx="7" cy="6" r="7" fill="#c9c2ae"/><circle cx="3" cy="-12" r="3" fill="#c9c2ae"/></g>`;
  if (p.alien.present)
    svg += `<g transform="translate(${p.alien.x} ${p.alien.y})"><ellipse cy="15" rx="12" ry="4" fill="#000000" opacity=".25"/><ellipse rx="11" ry="13" fill="#9ce07f"/><circle cx="-4" cy="-2" r="2.6" fill="#31456b"/><circle cx="4" cy="-2" r="2.6" fill="#31456b"/><path d="M-4 -11q-2 -6 -7 -9M4 -11q2 -6 7 -9" stroke="#7cc45f" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="-12" cy="-21" r="2.2" fill="#9ce07f"/><circle cx="12" cy="-21" r="2.2" fill="#9ce07f"/><path d="M-4 5q4 3 8 0" stroke="#5f8f49" stroke-width="1.8" fill="none" stroke-linecap="round"/></g>`;
  const flip = p.rocket.dir === 'left' ? ' scale(-1 1)' : '';
  svg += `<g transform="translate(${p.rocket.x} ${p.rocket.y})${flip}"><path d="M-34 0q8 -8 16 0q-8 8 -16 0z" fill="#f2b23c"/><path d="M-24 -10l-13 -9v16z" fill="#e2685f"/><path d="M-24 10l-13 9v-16z" fill="#e2685f"/><rect x="-24" y="-10" width="42" height="20" rx="10" fill="#e8edf5"/><path d="M14 -10q16 2 22 10q-6 8 -22 10z" fill="#e2685f"/><circle cx="-2" r="6.5" fill="#8fd0e8" stroke="#ffffff" stroke-width="2.5"/></g>`;
  svg += `<g transform="translate(${p.ufo.x} ${p.ufo.y})"><path d="M-10 -3a10 11 0 0 1 20 0z" fill="${p.ufo.color}"/><ellipse rx="21" ry="7" fill="#aab7d6"/><circle cx="-10" r="2.4" fill="#f2b23c"/><circle r="2.4" fill="#f2b23c"/><circle cx="10" r="2.4" fill="#f2b23c"/></g>`;
  return svg;
}

function picnic(p) {
  let svg = `<rect width="400" height="300" fill="${p.sky}"/>`;
  svg += `<circle cx="52" cy="46" r="16" fill="#ffd94d"/><g fill="#ffffff" opacity=".9"><ellipse cx="284" cy="38" rx="24" ry="10"/><ellipse cx="300" cy="32" rx="14" ry="8"/></g>`;
  svg += `<rect y="190" width="400" height="110" fill="${p.grass}"/>`;
  svg += `<g transform="translate(52 150) scale(${p.tree.s})"><rect x="-6" y="10" width="12" height="42" rx="5" fill="#9a6b4f"/><circle cy="-6" r="30" fill="#7db463"/><circle cx="-20" cy="8" r="19" fill="#8ec271"/><circle cx="20" cy="8" r="19" fill="#8ec271"/><circle cx="-8" cy="-12" r="4" fill="#e2483d"/><circle cx="12" cy="2" r="4" fill="#e2483d"/></g>`;
  const flip = p.kite.dir === 'left' ? ' scale(-1 1)' : '';
  svg += `<g transform="translate(316 72)${flip}"><path d="M0 -24L17 2 0 13 -17 2Z" fill="#7fbf8e" stroke="#ffffff" stroke-width="2.5"/><path d="M0 -24V13" stroke="#ffffff" stroke-width="1.5" opacity=".6"/><path d="M0 13q14 10 24 26" stroke="#8a7256" stroke-width="2" fill="none"/><path d="M8 17l8 -4v8zM16 27l8 -4v8z" fill="#e2685f"/><path d="M-14 8Q20 80 60 150" stroke="#ffffff" stroke-width="1.6" fill="none" opacity=".8"/></g>`;
  svg += `<g stroke="#6ba55c" stroke-width="2.5" stroke-linecap="round" fill="none"><path d="M368 262q2 -8 0 -12M374 262q3 -6 7 -9M30 284q2 -8 0 -12M36 284q3 -6 7 -9"/></g>`;
  svg += `<g transform="translate(200 238)"><path d="M-80 0l26 -15h108l26 15l-26 15h-108z" fill="${p.blanket.color}"/><path d="M-28 -11v30M28 -11v30M-54 0h108" stroke="#ffffff" stroke-width="2" opacity=".4"/></g>`;
  svg += `<g transform="translate(196 244)"><ellipse rx="20" ry="7" fill="#ffffff"/><path d="M-10 -3h20l-4 -7h-12z" fill="#f2b23c"/><path d="M-10 -3h20v3h-20z" fill="#7fbf8e"/></g>`;
  if (p.basket.present)
    svg += `<g transform="translate(128 232)"><path d="M-13 -12q13 -16 26 0" stroke="#8a6a42" stroke-width="4" fill="none"/><path d="M-20 -8h40l-6 24h-28z" fill="#b8905c"/><path d="M-20 -8h40M-18 0h36M-16 8h32" stroke="#8a6a42" stroke-width="2" opacity=".7"/></g>`;
  const spots = [
    [-10, 2],
    [10, 4],
    [-1, -14],
  ];
  for (let i = 0; i < p.apples.count; i++)
    svg += `<g transform="translate(${262 + spots[i][0]} ${250 + spots[i][1]})"><circle r="7" fill="#d94f3f"/><circle cx="-2" cy="-2" r="1.8" fill="#ffffff" opacity=".7"/><path d="M0 -7q1 -4 4 -5" stroke="#5da66b" stroke-width="2" fill="none" stroke-linecap="round"/></g>`;
  svg += `<g transform="translate(320 244)"><path d="M-10 -12h20l-3 24h-14z" fill="${p.cup.color}"/><path d="M-8 -4h16" stroke="#ffffff" stroke-width="2" opacity=".5"/><path d="M6 -12l7 -9" stroke="#5a4632" stroke-width="3" stroke-linecap="round"/><ellipse cy="12" rx="8" ry="2" fill="#000000" opacity=".12"/></g>`;
  return svg;
}

function kitchen(p) {
  let svg = `<rect width="400" height="300" fill="${p.wall}"/>`;
  svg += `<rect x="140" y="30" width="100" height="80" rx="8" fill="#bfe3f2" stroke="#ffffff" stroke-width="5"/><path d="M190 30v80M140 70h100" stroke="#ffffff" stroke-width="4"/><circle cx="166" cy="52" r="8" fill="#f6d55c"/><path d="M228 44l3 6 6 1 -4 5 1 6 -6 -3 -6 3 1 -6 -4 -5 6 -1z" fill="#ffffff" opacity=".9"/>`;
  if (p.clock.present)
    svg += `<g transform="translate(282 84)"><circle r="17" fill="#ffffff" stroke="#7f9ec9" stroke-width="4"/><path d="M0 0V-9M0 0h6" stroke="#31456b" stroke-width="2.5" stroke-linecap="round"/><circle r="2" fill="#31456b"/></g>`;
  svg += `<rect x="28" y="130" width="76" height="7" rx="3" fill="#b8905c"/><path d="M36 137v8M96 137v8" stroke="#8a7256" stroke-width="4"/>`;
  if (p.plant.present)
    svg += `<g transform="translate(60 130)"><path d="M-8 -10h16l-3 10h-10z" fill="#c96a4a"/><circle cy="-16" r="8" fill="#4e8a5a"/><circle cx="-7" cy="-21" r="6" fill="#6fb87d"/><circle cx="7" cy="-20" r="6" fill="#6fb87d"/></g>`;
  svg += `<rect y="200" width="400" height="70" fill="${p.counter}"/><rect y="196" width="400" height="9" rx="4" fill="#e8d5b0"/><path d="M90 209v61M200 209v61M310 209v61" stroke="#b8905c" stroke-width="3"/><circle cx="82" cy="238" r="2.5" fill="#7c5a3a"/><circle cx="192" cy="238" r="2.5" fill="#7c5a3a"/><circle cx="302" cy="238" r="2.5" fill="#7c5a3a"/>`;
  svg += `<rect y="270" width="400" height="30" fill="${p.floor}"/><path d="M0 272h400" stroke="#c69a6d" stroke-width="2"/>`;
  svg += `<rect x="366" y="120" width="34" height="150" rx="6" fill="#eef2f7" stroke="#c9d2df" stroke-width="2"/><path d="M366 168h34" stroke="#c9d2df" stroke-width="2"/><rect x="371" y="132" width="4" height="18" rx="2" fill="#8a97a8"/><rect x="371" y="176" width="4" height="18" rx="2" fill="#8a97a8"/>`;
  svg += `<g transform="translate(128 196)"><path d="M-6 -34q4 -5 0 -10M6 -34q4 -5 0 -10" stroke="#ffffff" stroke-width="2.5" fill="none" opacity=".7" stroke-linecap="round"/><rect x="-16" y="-24" width="32" height="24" rx="4" fill="${p.pot.color}"/><rect x="-19" y="-29" width="38" height="6" rx="3" fill="#8a4a3a"/><circle cy="-26" r="2.5" fill="#5a4632"/><path d="M-16 -16h-7M16 -16h7" stroke="#8a4a3a" stroke-width="4" stroke-linecap="round"/></g>`;
  svg += `<g transform="translate(48 184) scale(${p.jar.s})"><rect x="-11" y="-12" width="22" height="22" rx="4" fill="#bfe0f5" opacity=".95"/><circle cx="-4" r="3" fill="#c9a06a"/><circle cx="4" cy="-4" r="3" fill="#c9a06a"/><circle cx="3" cy="5" r="3" fill="#c9a06a"/><rect x="-13" y="-18" width="26" height="7" rx="3" fill="#8fb7d9"/></g>`;
  svg += `<g transform="translate(260 196)"><path d="M-22 -6h44q-2 13 -22 13t-22 -13z" fill="#5f9ee2"/>`;
  const spots = [
    [-12, -12],
    [0, -17],
    [12, -10],
  ];
  const colors = ['#e2685f', '#f2b23c', '#7fbf8e'];
  for (let i = 0; i < p.fruits.count; i++)
    svg += `<circle cx="${spots[i][0]}" cy="${spots[i][1]}" r="6" fill="${colors[i]}"/>`;
  svg += '</g>';
  const flip = p.cat.dir === 'right' ? ' scale(-1 1)' : '';
  svg += `<g transform="translate(336 272)${flip}"><path d="M10 6q15 -1 11 -15" stroke="#9aa0b5" stroke-width="5" fill="none" stroke-linecap="round"/><ellipse rx="14" ry="11" fill="#b8bdd0"/><path d="M-10 -6l-4 -9 8 2zM2 -8l1 -9 6 6z" fill="#b8bdd0"/><circle cx="-8" cy="-12" r="8.5" fill="#b8bdd0"/><path d="M-13 -20l-2 -7 6 3zM-4 -21l2 -7 4 6z" fill="#b8bdd0"/><path d="M-11 -12q2 2 4 0M-7 -12q2 2 4 0" stroke="#31456b" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M-12 -8h4" stroke="#e2892f" stroke-width="1.6"/><path d="M-16 -4q4 2 8 1M-16 -1q4 2 8 1" stroke="#ffffff" stroke-width="1.2"/><path d="M2 -4q6 1 6 6" stroke="#9aa0b5" stroke-width="2" fill="none"/></g>`;
  return svg;
}

function ski(p) {
  let svg = `<rect width="400" height="300" fill="${p.sky}"/>`;
  svg += `<path d="M0 192L92 64l92 128z" fill="${p.mountain}"/><path d="M156 192L262 54l138 138z" fill="#cddff0"/><path d="M78 84l14 18h-28zM248 78l13 16h-26z" fill="#ffffff"/>`;
  svg += `<rect y="188" width="400" height="112" fill="${p.snow}"/><ellipse cx="140" cy="196" rx="90" ry="10" fill="#ffffff" opacity=".8"/><ellipse cx="330" cy="200" rx="80" ry="9" fill="#ffffff" opacity=".7"/>`;
  svg += `<circle cx="352" cy="40" r="14" fill="#ffe9a8"/>`;
  svg += `<rect x="34" y="118" width="60" height="48" rx="4" fill="#b8905c"/><path d="M28 120L64 90l36 30z" fill="#8a5a3a"/><path d="M30 118q34 12 68 0l2 6q-36 12 -72 0z" fill="#ffffff"/><rect x="56" y="138" width="16" height="28" rx="7" fill="${p.cabin.door}"/><circle cx="84" cy="134" r="6" fill="#ffe9a8" stroke="#8a5a3a" stroke-width="2"/><rect x="76" y="96" width="10" height="18" fill="#9aa0b5"/><circle cx="81" cy="94" r="4" fill="#ffffff" opacity=".8"/>`;
  svg += `<g transform="translate(96 226) scale(${p.snowman.s})"><circle cy="10" r="16" fill="#ffffff" stroke="#d5e0ea" stroke-width="2"/><circle cy="-10" r="11" fill="#ffffff" stroke="#d5e0ea" stroke-width="2"/><path d="M-14 -2l-13 -8M14 -2l13 -8" stroke="#8a6a42" stroke-width="3" stroke-linecap="round"/><circle cx="-3.5" cy="-12" r="1.4" fill="#31456b"/><circle cx="3.5" cy="-12" r="1.4" fill="#31456b"/><path d="M0 -9l7 2 -7 2z" fill="#e2892f"/><path d="M-8 -20q8 6 16 0" stroke="#e2a23c" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="-4" cy="8" r="1.8" fill="#5a4632"/><circle cx="2" cy="12" r="1.8" fill="#5a4632"/><circle cx="-1" cy="16" r="1.8" fill="#5a4632"/></g>`;
  if (p.bird.present)
    svg += `<g transform="translate(160 84)"><path d="M-11 0q11 -11 22 -1q-11 9 -22 1z" fill="#e2685f"/><path d="M-2 -2q4 -7 9 -3" stroke="#c2543f" stroke-width="3" fill="none"/><path d="M11 -2l6 2 -6 2z" fill="#f2b23c"/><circle cx="7" cy="-3" r="1.3" fill="#31456b"/></g>`;
  svg += `<g transform="translate(236 168)"><path d="M-26 18h24M4 18h26" stroke="#5a4632" stroke-width="4" stroke-linecap="round"/><path d="M-7 16l3 -12M7 16l-1 -13" stroke="#31456b" stroke-width="5" stroke-linecap="round"/><path d="M-6 6q1 -12 13 -15" stroke="${p.skier.coat}" stroke-width="10" stroke-linecap="round" fill="none"/><circle cx="11" cy="-16" r="6.5" fill="#f6d7b8"/><path d="M4.5 -17a6.5 6.5 0 0 1 13 0z" fill="#4a6fa5"/><path d="M-4 -1l-9 5" stroke="${p.skier.coat}" stroke-width="5" stroke-linecap="round"/><path d="M-13 4l-7 14" stroke="#5a4632" stroke-width="2.5" stroke-linecap="round"/></g>`;
  const spots = [
    [296, 242],
    [322, 228],
    [348, 244],
    [368, 232],
  ];
  for (let i = 0; i < p.pines.count; i++)
    svg += `<g transform="translate(${spots[i][0]} ${spots[i][1]})"><rect x="-3" y="-6" width="6" height="12" fill="#8a6a42"/><path d="M0 -36L11 -16h-22zM0 -26L14 -4h-28z" fill="#4e8a5a"/><path d="M-6 -14q6 -4 12 0M-8 -2q8 -5 16 0" stroke="#ffffff" stroke-width="3" fill="none" stroke-linecap="round"/></g>`;
  const flagPath =
    p.flag.dir === 'right' ? 'M354 99l14 6 -14 6z' : 'M351 99l-14 6 14 6z';
  svg += `<rect x="350" y="96" width="3" height="46" rx="1.5" fill="#5a4632"/><path d="${flagPath}" fill="#e2685f"/><path d="M348 142h8" stroke="#5a4632" stroke-width="4" stroke-linecap="round"/>`;
  return svg;
}

const painters = [garden, kidsRoom, ocean, farm, space, picnic, kitchen, ski];

export const drawScene = (id, params) => painters[id](params);

// 已找到的差异：两幅图上都盖一面小旗。
export function flagSvg(x, y) {
  return `<g transform="translate(${x} ${y})"><g class="flag-pop"><circle cy="11" r="4" fill="#c2543f"/><rect x="-1.5" y="-17" width="3" height="30" rx="1.5" fill="#7c5a3a"/><path d="M1.5 -16l15 5.5 -15 5.5z" fill="#e2483d" stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round"/></g></g>`;
}

// 提示：虚线圈住一处差异。
export function hintRing(x, y, r) {
  return `<circle class="hint-ring" cx="${x}" cy="${y}" r="${r + 8}" fill="none" stroke="#ffb020" stroke-width="4" stroke-dasharray="7 7" opacity=".95"/>`;
}

// 侦探徽章：金色星章里藏着一枚放大镜。
export function badgeSvg() {
  return `<svg viewBox="0 0 100 110" aria-hidden="true"><g class="float"><path d="M50 8l10 12 15-4 2 16 15 6-9 13 9 13-15 6-2 16-15-4-10 12-10-12-15 4-2-16-15-6 9-13-9-13 15-6 2-16 15 4z" fill="#f0c14b" stroke="#c89530" stroke-width="3"/><circle cx="50" cy="50" r="24" fill="#fff6dd"/><circle cx="44" cy="58" r="15" fill="none" stroke="#4a6fa5" stroke-width="5"/><circle cx="44" cy="58" r="6.5" fill="#bfe0f5" stroke="#4a6fa5" stroke-width="3"/><path d="M54 68l12 12" stroke="#4a6fa5" stroke-width="5" stroke-linecap="round"/><circle cx="41" cy="55" r="2" fill="#31456b"/></g></svg>`;
}

// 放大镜队长·圆圆，侧边栏的小向导。
export function mascotSvg() {
  return `<svg viewBox="0 0 100 110" aria-hidden="true"><g class="float"><circle cx="46" cy="44" r="30" fill="#bfe0f5" stroke="#4a6fa5" stroke-width="7"/><circle cx="38" cy="40" r="4" fill="#31456b"/><circle cx="54" cy="40" r="4" fill="#31456b"/><path d="M40 52q6 5 12 0" fill="none" stroke="#31456b" stroke-width="3" stroke-linecap="round"/><path d="M66 66l20 26" stroke="#7c5a3a" stroke-width="11" stroke-linecap="round"/><path d="M69 62q3 5 0 8" stroke="#8b6a47" stroke-width="4" fill="none" stroke-linecap="round"/></g></svg>`;
}
