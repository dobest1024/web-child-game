'use strict';
// ===== 原创图形：钱币和钟表 =====
// 钱只用颜色 + 数字 + "元/角"区分，不临摹真实纸币图案；每张都印着"玩具钱"

const COIN_STYLE = {
  j1: { r: 24, fill: '#e3e8ee', rim: '#97a3b1' },
  j5: { r: 26, fill: '#f4c75a', rim: '#b8862b' },
  y1: { r: 30, fill: '#eef1f5', rim: '#8a96a5' },
};
const NOTE_STYLE = {
  y5: { fill: '#c3a3e6', dark: '#7a54a8' },
  y10: { fill: '#8fb7e6', dark: '#3f6ea8' },
  y20: { fill: '#d9b48a', dark: '#8a5f33' },
};

function moneySvg(id) {
  const m = MONEY[id];
  if (m.kind === 'coin') {
    const s = COIN_STYLE[id];
    const size = s.r * 2 + 6;
    const num = m.label.slice(0, -1);
    const unit = m.label.slice(-1);
    return `<svg class="money coin ${id}" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">`
      + `<circle cx="${size / 2}" cy="${size / 2}" r="${s.r}" fill="${s.fill}" stroke="${s.rim}" stroke-width="3"/>`
      + `<circle cx="${size / 2}" cy="${size / 2}" r="${s.r - 5}" fill="none" stroke="${s.rim}" stroke-width="1.4" stroke-dasharray="2 3"/>`
      + `<text x="${size / 2}" y="${size / 2 + 2}" text-anchor="middle" font-size="${s.r * 0.9}" font-weight="900" fill="#3b2f2a">${num}</text>`
      + `<text x="${size / 2}" y="${size / 2 + s.r * 0.62}" text-anchor="middle" font-size="${s.r * 0.42}" font-weight="700" fill="#3b2f2a">${unit}</text></svg>`;
  }
  const s = NOTE_STYLE[id];
  const num = m.label.slice(0, -1);
  return `<svg class="money note ${id}" viewBox="0 0 120 64" width="120" height="64" aria-hidden="true">`
    + `<rect x="2" y="2" width="116" height="60" rx="8" fill="${s.fill}" stroke="${s.dark}" stroke-width="3"/>`
    + `<rect x="8" y="8" width="104" height="48" rx="5" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="4 3" opacity=".8"/>`
    + `<circle cx="88" cy="32" r="16" fill="#ffffff" opacity=".35"/><circle cx="88" cy="32" r="9" fill="none" stroke="${s.dark}" stroke-width="2" opacity=".5"/>`
    + `<text x="40" y="44" text-anchor="middle" font-size="34" font-weight="900" fill="${s.dark}">${num}</text>`
    + `<text x="88" y="38" text-anchor="middle" font-size="17" font-weight="900" fill="${s.dark}">元</text>`
    + `<text x="108" y="57" text-anchor="end" font-size="7" fill="${s.dark}">玩具钱</text></svg>`;
}

// 钟面：短针（时针）在半时会走到两个数中间，和真钟一样
function clockSvg(h, half) {
  const nums = Array.from({ length: 12 }, (_, i) => {
    const n = i + 1;
    const a = (n * 30 - 90) * Math.PI / 180;
    return `<text x="${(100 + Math.cos(a) * 70).toFixed(1)}" y="${(100 + Math.sin(a) * 70 + 8).toFixed(1)}" text-anchor="middle" font-size="22" font-weight="800" fill="#3b2f2a">${n}</text>`;
  }).join('');
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const a = i * 6 * Math.PI / 180;
    const r1 = i % 5 ? 86 : 82;
    return `<line x1="${(100 + Math.sin(a) * r1).toFixed(1)}" y1="${(100 - Math.cos(a) * r1).toFixed(1)}" x2="${(100 + Math.sin(a) * 90).toFixed(1)}" y2="${(100 - Math.cos(a) * 90).toFixed(1)}" stroke="#c9b79c" stroke-width="${i % 5 ? 1.5 : 3}"/>`;
  }).join('');
  const hourAngle = ((h % 12) + (half ? 0.5 : 0)) * 30;
  const minuteAngle = half ? 180 : 0;
  return `<svg class="clock" viewBox="0 0 200 200" aria-hidden="true">`
    + `<circle cx="100" cy="100" r="96" fill="#fffdf5" stroke="#ff9f43" stroke-width="8"/>${ticks}${nums}`
    + `<line x1="100" y1="100" x2="100" y2="50" stroke="#3b2f2a" stroke-width="10" stroke-linecap="round" transform="rotate(${hourAngle} 100 100)"/>`
    + `<line x1="100" y1="100" x2="100" y2="24" stroke="#e8743b" stroke-width="6" stroke-linecap="round" transform="rotate(${minuteAngle} 100 100)"/>`
    + `<circle cx="100" cy="100" r="8" fill="#3b2f2a"/></svg>`;
}
