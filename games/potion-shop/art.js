// Original inline SVG art. Every function returns a string so tests can check the paths.
const ink = '#4d3b57';
const cream = '#fffaf2';
const r1 = (value) => Math.round(value * 10) / 10;
const line = (d, color = ink, width = 3) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
const shape = (d, fill, width = 3) =>
  `<path d="${d}" fill="${fill}" stroke="${ink}" stroke-width="${width}" stroke-linejoin="round"/>`;
// Thick limb or neck: an ink outline under a body-colored stroke.
const limb = (d, color, width = 11) =>
  line(d, ink, width + 6) + line(d, color, width);

export const moods = ['wait', 'think', 'drink', 'happy'];

function eye(x, y, mood, r = 5, color = ink) {
  if (mood === 'happy')
    return line(`M${r1(x - r)} ${r1(y + 1)}q${r} ${r1(-r - 2)} ${r1(r * 2)} 0`, color, 3);
  if (mood === 'drink')
    return line(`M${r1(x - r)} ${r1(y - 1)}q${r} ${r} ${r1(r * 2)} 0`, color, 3);
  const cy = mood === 'think' ? y - 2 : y;
  return `<circle cx="${x}" cy="${cy}" r="${r}" fill="${color}"/><circle cx="${r1(x + r * 0.35)}" cy="${r1(cy - r * 0.35)}" r="${r1(r * 0.38)}" fill="${color === ink ? '#fff' : ink}"/>`;
}

function mouth(x, y, mood, w = 7, color = ink) {
  if (mood === 'drink') return '';
  if (mood === 'happy')
    return `<path d="M${x - w - 2} ${y - 2}q${w + 2} ${w + 7} ${2 * w + 4} 0z" fill="#c75b6b" stroke="${color}" stroke-width="2.5" stroke-linejoin="round"/>`;
  if (mood === 'think')
    return line(`M${x - w + 1} ${y + 2}q${r1((w - 1) / 2)} -4 ${w - 1} 0t${w - 1} 0`, color, 2.5);
  return line(`M${x - w} ${y}q${w} ${w - 1} ${2 * w} 0`, color, 3);
}

const blush = (x, y, rx = 7) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${r1(rx * 0.55)}" fill="#f29aa6" opacity=".6"/>`;

function star(x, y, s) {
  const a = r1(s * 0.3),
    b = r1(s * 0.7);
  return `M${x} ${y - s}l${a} ${b} ${b} ${a} ${-b} ${a} ${-a} ${b} ${-a} ${-b} ${-b} ${-a} ${b} ${-a}z`;
}

function flask(color) {
  return `<path d="M-6 -21h12v6h-12z" fill="#c9955c" stroke="${ink}" stroke-width="2"/><path d="M-5 -15h10v8q10 4 10 14q0 13 -15 13q-15 0 -15 -13q0 -10 10 -14z" fill="${color}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/><path d="M-9 4q0 5 3 8" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>`;
}

export function flaskSvg(color) {
  return `<svg viewBox="-22 -24 44 48" aria-hidden="true">${flask(color)}</svg>`;
}

const fox = (body, mood) => ({
  mouth: [100, 117],
  svg:
    shape('M126 176q50 -4 48 -50q-2 -30 -24 -34q10 26 -6 46q-10 14 -26 20z', body) +
    shape('M150 92q24 2 24 34q-14 -6 -20 -18q-4 -8 -4 -16z', cream) +
    shape('M66 186q-8 -58 34 -66q42 8 34 66z', body) +
    `<path d="M84 184q-2 -36 16 -46q18 10 16 46z" fill="${cream}"/>` +
    shape('M58 82l-2 -44 34 24z', body) +
    shape('M142 82l2 -44 -34 24z', body) +
    '<path d="M62 74l-1 -24 17 13zM138 74l1 -24 -17 13z" fill="#f2b3b6"/>' +
    shape('M52 96q0 -36 48 -38q48 2 48 38q0 30 -48 38q-48 -8 -48 -38z', body) +
    `<path d="M80 106q20 -10 40 0q-4 20 -20 22q-16 -2 -20 -22z" fill="${cream}"/>` +
    `<ellipse cx="100" cy="108" rx="5" ry="3.5" fill="${ink}"/>` +
    eye(80, 94, mood) +
    eye(120, 94, mood) +
    mouth(100, 118, mood, 6) +
    blush(68, 110) +
    blush(132, 110),
});

function frog(body, mood, transformed) {
  const figure =
    `<ellipse cx="62" cy="184" rx="20" ry="7" fill="${body}" stroke="${ink}" stroke-width="3"/><ellipse cx="138" cy="184" rx="20" ry="7" fill="${body}" stroke="${ink}" stroke-width="3"/>` +
    shape('M50 180q-10 -42 22 -58q28 -12 56 0q32 16 22 58z', body) +
    `<ellipse cx="100" cy="160" rx="30" ry="18" fill="${cream}" opacity=".45"/>` +
    `<circle cx="68" cy="76" r="20" fill="${body}" stroke="${ink}" stroke-width="3"/><circle cx="132" cy="76" r="20" fill="${body}" stroke="${ink}" stroke-width="3"/>` +
    shape('M38 112q0 -38 62 -40q62 2 62 40q0 32 -62 34q-62 -2 -62 -34z', body) +
    '<circle cx="68" cy="76" r="12" fill="#fff"/><circle cx="132" cy="76" r="12" fill="#fff"/>' +
    eye(68, 76, mood, 6) +
    eye(132, 76, mood, 6) +
    mouth(100, 116, mood, 16) +
    blush(58, 112, 8) +
    blush(142, 112, 8);
  if (!transformed) return { mouth: [100, 118], svg: figure };
  // The green frog sinks into the grass so only its eyes peek out.
  return {
    mouth: [100, 148],
    svg:
      `<g transform="translate(0 30)">${figure}</g>` +
      '<path d="M8 200l10 -64 12 64zM30 200l12 -80 12 80zM54 200l10 -62 12 62zM120 200l12 -76 12 76zM146 200l10 -64 12 64zM166 200l14 -82 10 82z" fill="#4f9a45"/>' +
      '<path d="M0 200l16 -50 10 50zM20 200l14 -60 12 60zM44 200l12 -68 14 68zM70 200l12 -56 12 56zM92 200l12 -64 12 64zM114 200l12 -58 12 58zM136 200l12 -68 12 68zM158 200l12 -54 14 54zM180 200l12 -62 8 62z" fill="#6cbf55" stroke="#3f8a3a" stroke-width="2" stroke-linejoin="round"/>',
  };
}

const bear = (body, mood) => ({
  mouth: [100, 117],
  svg:
    `<circle cx="62" cy="58" r="17" fill="${body}" stroke="${ink}" stroke-width="3"/><circle cx="138" cy="58" r="17" fill="${body}" stroke="${ink}" stroke-width="3"/>` +
    `<circle cx="62" cy="58" r="8" fill="${ink}" opacity=".18"/><circle cx="138" cy="58" r="8" fill="${ink}" opacity=".18"/>` +
    shape('M56 186q-6 -62 44 -68q50 6 44 68z', body) +
    `<ellipse cx="100" cy="164" rx="25" ry="19" fill="${cream}" opacity=".55"/>` +
    limb('M64 142q-14 14 -4 30', body) +
    limb('M136 142q14 14 4 30', body) +
    `<circle cx="100" cy="94" r="46" fill="${body}" stroke="${ink}" stroke-width="3"/>` +
    '<ellipse cx="100" cy="110" rx="19" ry="14" fill="#fff3e6"/>' +
    `<ellipse cx="100" cy="104" rx="6.5" ry="4.5" fill="${ink}"/>` +
    eye(82, 88, mood) +
    eye(118, 88, mood) +
    mouth(100, 116, mood, 6) +
    blush(68, 106) +
    blush(132, 106),
});

const bunny = (body, mood) => ({
  mouth: [100, 118],
  svg:
    shape('M76 70q-16 -60 4 -64q18 4 10 64z', body) +
    shape('M124 70q16 -60 -4 -64q-18 4 -10 64z', body) +
    '<path d="M79 62q-9 -42 2 -48q9 4 5 48zM121 62q9 -42 -2 -48q-9 4 -5 48z" fill="#f4b6c2"/>' +
    `<circle cx="142" cy="172" r="11" fill="${cream}" stroke="${ink}" stroke-width="3"/>` +
    shape('M62 186q-4 -56 38 -62q42 6 38 62z', body) +
    `<ellipse cx="100" cy="164" rx="20" ry="16" fill="${cream}" opacity=".6"/>` +
    `<ellipse cx="100" cy="100" rx="42" ry="38" fill="${body}" stroke="${ink}" stroke-width="3"/>` +
    '<path d="M95 107h10l-5 5z" fill="#e78ea0"/>' +
    eye(84, 96, mood) +
    eye(116, 96, mood) +
    mouth(100, 118, mood, 5) +
    blush(72, 110) +
    blush(128, 110),
});

const chick = (body, mood) => ({
  mouth: [100, 126],
  svg:
    line('M86 184l-7 7m7 -7v8m0 -8l7 7M114 184l-7 7m7 -7v8m0 -8l7 7', '#e59a3a', 3.5) +
    shape('M52 136q-18 4 -14 26q12 0 18 -10z', body) +
    shape('M148 136q18 4 14 26q-12 0 -18 -10z', body) +
    shape('M50 136q0 -64 50 -66q50 2 50 66q0 48 -50 48q-50 0 -50 -48z', body) +
    shape('M94 72q-8 -18 4 -22q2 10 6 4q8 10 -4 18z', body, 2.5) +
    `<ellipse cx="100" cy="158" rx="28" ry="20" fill="${cream}" opacity=".45"/>` +
    eye(82, 104, mood) +
    eye(118, 104, mood) +
    (mood === 'happy'
      ? shape('M89 117l11 -3 11 3 -11 15z', '#f2a03d', 2.5)
      : shape('M89 118l11 12 11 -12z', '#f2a03d', 2.5)) +
    blush(70, 120) +
    blush(130, 120),
});

const owl = (body, mood) => ({
  mouth: [100, 122],
  svg:
    line('M8 190q92 -12 184 0', '#8d6a4b', 9) +
    shape('M64 70l-8 -30 26 16z', body) +
    shape('M136 70l8 -30 -26 16z', body) +
    shape('M54 124q0 -72 46 -74q46 2 46 74q0 60 -46 60q-46 0 -46 -60z', body) +
    shape('M56 118q-16 34 6 56q6 -28 -6 -56z', body) +
    shape('M144 118q16 34 -6 56q-6 -28 6 -56z', body) +
    `<ellipse cx="100" cy="150" rx="28" ry="28" fill="${cream}" opacity=".4"/>` +
    `<path d="M88 140q4 4 8 0m8 0q4 4 8 0M94 154q4 4 8 0" fill="none" stroke="${ink}" stroke-width="2" opacity=".45"/>` +
    `<circle cx="80" cy="98" r="19" fill="${cream}" stroke="${ink}" stroke-width="2.5"/><circle cx="120" cy="98" r="19" fill="${cream}" stroke="${ink}" stroke-width="2.5"/>` +
    shape('M93 112l7 13 7 -13z', '#e9a23c', 2) +
    line('M86 184v6m6 -6v6m16 -6v6m6 -6v6', '#e9a23c', 4) +
    eye(80, 98, mood, 8) +
    eye(120, 98, mood, 8) +
    blush(66, 118, 6) +
    blush(134, 118, 6),
});

const chameleon = (body, mood) => ({
  mouth: [162, 140],
  svg:
    line('M8 184q92 -14 184 0', '#8d6a4b', 9) +
    limb('M60 160q-36 4 -38 -24q0 -22 20 -22q16 2 14 16q-2 12 -14 10', body) +
    limb('M82 164l-8 18m48 -18l8 18', body, 6) +
    shape('M52 166q0 -58 62 -60q34 0 44 16q24 0 30 20q2 16 -16 18q-14 2 -30 4q-36 4 -90 2z', body) +
    line('M74 112l6 -10 6 9 6 -10 6 9 6 -10 6 9', ink, 2.5) +
    `<path d="M84 128q4 14 0 30m20 -32q4 16 0 32m20 -30q4 14 0 26" fill="none" stroke="${ink}" stroke-width="2.5" opacity=".22"/>` +
    `<circle cx="150" cy="126" r="14" fill="${body}" stroke="${ink}" stroke-width="3"/>` +
    eye(150, 126, mood, 6) +
    (mood === 'happy'
      ? `<path d="M154 141q12 8 24 -4z" fill="#c75b6b" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>`
      : mood === 'think'
        ? line('M156 142q5 -3 10 0t10 -2', ink, 2.5)
        : mood === 'drink'
          ? ''
          : line('M154 141q11 6 22 -3', ink, 3)) +
    blush(132, 136, 6),
});

const flamingo = (body, mood) => ({
  mouth: [44, 44],
  svg:
    line('M100 186v-56m12 56v-34l16 -12', '#d9868f', 4) +
    shape('M146 112l20 -8 -6 16z', body) +
    shape('M64 120q6 -32 50 -28q40 6 36 32q-6 26 -48 24q-34 -2 -38 -28z', body) +
    '<path d="M86 112q22 -16 48 0q-20 20 -48 0z" fill="#fff" opacity=".35"/>' +
    limb('M76 110q-28 -22 -10 -52q14 -22 4 -34', body) +
    `<circle cx="66" cy="32" r="16" fill="${body}" stroke="${ink}" stroke-width="3"/>` +
    shape('M52 30q-16 2 -16 18q4 2 8 -4q2 -8 10 -8z', '#fff4e6', 2.5) +
    `<path d="M37 44q0 4 4 4l3 -4z" fill="${ink}"/>` +
    eye(70, 28, mood, 4) +
    blush(76, 38, 5),
});

const snowman = (body, mood, transformed) => ({
  mouth: [100, 98],
  svg:
    line('M64 142l-28 -20m10 7l-8 3M136 142l28 -20m-10 7l8 3', '#8d6a4b', 4) +
    `<circle cx="100" cy="148" r="42" fill="${body}" stroke="${ink}" stroke-width="3"/>` +
    `<circle cx="100" cy="84" r="30" fill="${body}" stroke="${ink}" stroke-width="3"/>` +
    shape('M72 104q28 12 56 0l2 10q-30 14 -60 0z', '#e2574c', 2.5) +
    shape('M110 114l4 26h12l-6 -28z', '#e2574c', 2.5) +
    `<path d="M74 60h52v7h-52zM84 60v-28h32v28z" fill="${ink}"/>` +
    '<path d="M84 52h32v6h-32z" fill="#e2574c"/>' +
    shape('M100 84l22 5 -22 5z', '#f2903a', 2) +
    `<circle cx="100" cy="134" r="4" fill="${ink}"/><circle cx="100" cy="150" r="4" fill="${ink}"/><circle cx="100" cy="166" r="4" fill="${ink}"/>` +
    eye(89, 76, mood, 4) +
    eye(111, 76, mood, 4) +
    mouth(100, 98, mood, 5) +
    blush(80, 90, 5) +
    blush(120, 90, 5) +
    (transformed
      ? line('M30 40v18m-8 -13 16 8m-16 0 16 -8M170 56v14m-6 -10 12 6m-12 0 12 -6M38 124v12m-5 -9 10 6m-10 0 10 -6', '#7fb2e5', 2.5)
      : ''),
});

const wool = [
  [70, 132, 22],
  [100, 120, 26],
  [130, 132, 22],
  [76, 156, 22],
  [124, 156, 22],
  [100, 160, 24],
];
const tuft = [
  [90, 78, 10],
  [110, 78, 10],
  [100, 72, 11],
];
const puffs = (list, fill, outline) =>
  list
    .map(
      ([cx, cy, r]) =>
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${outline ? ` stroke="${ink}" stroke-width="6"` : ''}/>`,
    )
    .join('');

const sheep = (body, mood) => ({
  mouth: [100, 116],
  svg:
    line('M82 168v20m36 -20v20', ink, 7) +
    puffs(wool, body, true) +
    puffs(wool, body, false) +
    shape('M80 92q-20 -4 -22 8q12 6 24 -2z', '#6f5b66', 2.5) +
    shape('M120 92q20 -4 22 8q-12 6 -24 -2z', '#6f5b66', 2.5) +
    `<ellipse cx="100" cy="102" rx="22" ry="26" fill="#6f5b66" stroke="${ink}" stroke-width="3"/>` +
    puffs(tuft, body, true) +
    puffs(tuft, body, false) +
    eye(92, 100, mood, 4, cream) +
    eye(108, 100, mood, 4, cream) +
    mouth(100, 116, mood, 4, cream) +
    blush(85, 111, 4) +
    blush(115, 111, 4),
});

const ghost = (body, mood, transformed) => ({
  mouth: [100, 122],
  svg:
    `<path d="M60 182v-82q0 -46 40 -48q40 2 40 48v82l-13 -10 -14 10 -13 -10 -13 10 -14 -10z" fill="${body}" fill-opacity="${transformed ? 1 : 0.55}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"${transformed ? '' : ' stroke-dasharray="7 6"'}/>` +
    line('M62 124q-16 4 -16 18M138 124q16 4 16 18', ink, 3) +
    eye(86, 104, mood, 5.5) +
    eye(114, 104, mood, 5.5) +
    mouth(100, 121, mood, 6) +
    blush(76, 116) +
    blush(124, 116),
});

const drawers = {
  fox,
  frog,
  bear,
  bunny,
  chick,
  owl,
  chameleon,
  flamingo,
  snowman,
  sheep,
  ghost,
};

const sparkles = `<g class="twinkle" fill="#f6c94c" stroke="#e0a43a" stroke-width="1.5" stroke-linejoin="round"><path d="${star(28, 30, 11)}"/><path d="${star(176, 40, 9)}"/><path d="${star(170, 150, 8)}"/><path d="${star(24, 140, 7)}"/><path d="${star(150, 14, 6)}"/></g>`;
const question = `<g class="wonder"><circle cx="164" cy="40" r="17" fill="#fff" stroke="${ink}" stroke-width="2.5"/><circle cx="146" cy="62" r="4" fill="#fff" stroke="${ink}" stroke-width="2"/><text x="164" y="48" text-anchor="middle" font-size="24" font-weight="800" fill="#8a64b8">?</text></g>`;

export function customerSvg(animal, { color, mood = 'wait', potion = '#fff', transformed = false } = {}) {
  const art = drawers[animal](color, mood, transformed);
  const [mx, my] = art.mouth;
  const drink =
    mood === 'drink'
      ? `<g transform="translate(${mx + 6} ${my - 4}) rotate(-35)">${flask(potion)}</g>`
      : '';
  return `<svg viewBox="0 0 200 200" aria-hidden="true"><ellipse cx="100" cy="190" rx="64" ry="8" fill="${ink}" opacity=".12"/>${transformed ? sparkles : ''}<g class="${transformed ? 'changed' : 'bob'}">${art.svg}</g>${drink}${mood === 'think' ? question : ''}</svg>`;
}

export function cauldronSvg(color) {
  return `<svg viewBox="0 0 240 212" aria-hidden="true"><ellipse cx="120" cy="204" rx="90" ry="6" fill="${ink}" opacity=".14"/>${line('M60 164l-12 32M180 164l12 32', '#3a3049', 10)}<path d="M28 64q-8 116 92 118q100 -2 92 -118z" fill="#4c4060" stroke="#352b45" stroke-width="4" stroke-linejoin="round"/>${line('M50 92q0 52 36 74', '#8a7aa4', 9)}${line('M36 116q84 26 168 0', '#625378', 5)}<ellipse cx="120" cy="64" rx="96" ry="24" fill="#62547a" stroke="#352b45" stroke-width="4"/><ellipse cx="120" cy="66" rx="85" ry="18" fill="#2e2540"/><ellipse id="liquid" cx="120" cy="67" rx="81" ry="15" fill="${color}"/><ellipse class="ripple" cx="120" cy="67" rx="60" ry="11" fill="none" stroke="#fff" stroke-width="2.5" opacity="0"/><g class="bubbles" fill="#fff" opacity=".55"><circle cx="88" cy="66" r="3.5"/><circle cx="150" cy="70" r="2.5"/><circle cx="120" cy="61" r="2"/></g>${line('M78 204l84 -10M78 194l84 10', '#9a6a45', 9)}<g transform="translate(120 202) scale(.82) translate(-120 -202)"><g class="flame"><path d="M96 200q-12 -18 4 -32q0 12 8 14q0 -14 12 -22q0 18 10 20q4 -8 2 -16q16 12 8 36z" fill="#f49a3c" stroke="#e07a2c" stroke-width="2" stroke-linejoin="round"/><path d="M108 200q-4 -10 6 -18q2 8 7 10q5 -5 5 -12q9 10 2 20z" fill="#ffd25e"/></g></g></svg>`;
}

export function bottleSvg(color) {
  return `<svg viewBox="0 0 60 76" aria-hidden="true"><path d="M23 3h14v11h-14z" fill="#c9955c" stroke="${ink}" stroke-width="2.5"/><path d="M24 14h12v12q17 7 17 26q0 20 -23 20q-23 0 -23 -20q0 -19 17 -26z" fill="#fff" fill-opacity=".8" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/><path d="M10 50q1 -9 8 -13h24q7 4 8 13q0 17 -20 17q-20 0 -20 -17z" fill="${color}"/><path d="M15 50q0 7 4 11" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/></svg>`;
}

export function grannySvg() {
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="95" rx="30" ry="4" fill="${ink}" opacity=".12"/>${shape('M22 96q0 -26 28 -28q28 2 28 28z', '#8e6fbf', 2.5)}${shape('M24 52l0 -22 18 10z', '#f1e4d0', 2.5)}${shape('M76 52l0 -22 -18 10z', '#f1e4d0', 2.5)}<ellipse cx="50" cy="58" rx="28" ry="24" fill="#f1e4d0" stroke="${ink}" stroke-width="2.5"/>${shape('M30 36l24 -33 14 33z', '#6b4f96', 2.5)}<ellipse cx="49" cy="37" rx="27" ry="6" fill="#6b4f96" stroke="${ink}" stroke-width="2.5"/><path d="${star(52, 22, 5)}" fill="#f6c94c"/><circle cx="39" cy="57" r="8" fill="#fff" fill-opacity=".5" stroke="${ink}" stroke-width="2"/><circle cx="61" cy="57" r="8" fill="#fff" fill-opacity=".5" stroke="${ink}" stroke-width="2"/>${line('M47 57h6M35 58q4 -4 8 0M57 58q4 -4 8 0', ink, 2)}<path d="M47 66l3 3 3 -3z" fill="#e78ea0"/>${line('M50 69q-3 4 -6 2M50 69q3 4 6 2M18 64h12M18 70l12 -3M82 64h-12M82 70l-12 -3', ink, 1.6)}${blush(32, 68, 5)}${blush(68, 68, 5)}</svg>`;
}
