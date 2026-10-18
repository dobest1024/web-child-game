'use strict';
// ===== 画图工具 =====
function rr(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); }
function starPath(c, x, y, r1, r2, n, rot) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? r2 : r1, a = (rot || 0) + (i * Math.PI) / n - Math.PI / 2;
    c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  c.closePath();
}
// (x, y) 为心形顶部中点
function heartPath(c, x, y, s) {
  c.beginPath();
  c.moveTo(x, y + s / 4);
  c.bezierCurveTo(x, y, x - s / 2, y, x - s / 2, y + s / 4);
  c.bezierCurveTo(x - s / 2, y + s / 2, x, y + s * 0.75, x, y + s);
  c.bezierCurveTo(x, y + s * 0.75, x + s / 2, y + s / 2, x + s / 2, y + s / 4);
  c.bezierCurveTo(x + s / 2, y, x, y, x, y + s / 4);
  c.closePath();
}
function snowflake(c, x, y, r, color, lw) {
  c.save(); c.translate(x, y); c.strokeStyle = color; c.lineWidth = lw || 2; c.lineCap = 'round';
  c.beginPath();
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI) / 3;
    const ux = Math.cos(a) * r, uy = Math.sin(a) * r;
    c.moveTo(-ux, -uy); c.lineTo(ux, uy);
    for (const s of [1, -1]) {
      const bx = ux * 0.55 * s, by = uy * 0.55 * s;
      const p1 = a + 0.8, p2 = a - 0.8;
      c.moveTo(bx, by); c.lineTo(bx + Math.cos(p1) * r * 0.3 * s, by + Math.sin(p1) * r * 0.3 * s);
      c.moveTo(bx, by); c.lineTo(bx + Math.cos(p2) * r * 0.3 * s, by + Math.sin(p2) * r * 0.3 * s);
    }
  }
  c.stroke(); c.restore();
}
function boltPath(c, s) {
  c.beginPath();
  c.moveTo(2 * s, -11 * s); c.lineTo(-7 * s, 2 * s); c.lineTo(-1 * s, 2 * s);
  c.lineTo(-3 * s, 11 * s); c.lineTo(7 * s, -3 * s); c.lineTo(1 * s, -3 * s);
  c.closePath();
}
function txt(c, s, x, y, size, color, align, stroke) {
  c.font = `900 ${size}px ${FONT}`;
  c.textAlign = align || 'center'; c.textBaseline = 'middle';
  if (stroke) { c.lineWidth = Math.max(3, size / 6); c.strokeStyle = stroke; c.lineJoin = 'round'; c.strokeText(s, x, y); }
  c.fillStyle = color; c.fillText(s, x, y);
}

// ===== 地面（按主题预先画好）=====
const groundCache = {};
function getGround(theme) {
  if (groundCache[theme]) return groundCache[theme];
  const th = THEMES[theme];
  const cv = document.createElement('canvas');
  cv.width = MAP_W * 2; cv.height = MAP_H * 2;
  const c = cv.getContext('2d');
  c.scale(2, 2);
  for (let r = 0; r < ROWS; r++) for (let q = 0; q < COLS; q++) {
    c.fillStyle = (r + q) % 2 ? th.g2 : th.g1;
    c.fillRect(q * T, r * T, T, T);
  }
  const R = mulberry32(theme.length * 99 + 7);
  for (let i = 0; i < 150; i++) {
    const x = R() * MAP_W, y = R() * MAP_H;
    c.strokeStyle = th.deco; c.fillStyle = th.deco; c.lineWidth = 2; c.lineCap = 'round';
    if (theme === 'grass') {
      if (R() < 0.15) { c.fillStyle = R() < 0.5 ? '#FFFFFF' : '#FFE66D'; circle(c, x, y, 2.5); c.fill(); }
      else { c.beginPath(); c.moveTo(x - 3, y); c.lineTo(x - 4, y - 5); c.moveTo(x, y); c.lineTo(x, y - 7); c.moveTo(x + 3, y); c.lineTo(x + 4, y - 5); c.stroke(); }
    } else if (theme === 'snow') {
      if (R() < 0.3) snowflake(c, x, y, 4, '#FFFFFF', 1.3); else { circle(c, x, y, 2); c.fill(); }
    } else if (theme === 'desert') {
      if (R() < 0.5) { circle(c, x, y, 2 + R() * 2); c.fill(); }
      else { c.beginPath(); c.arc(x, y + 6, 8, Math.PI * 1.2, Math.PI * 1.8); c.stroke(); }
    } else if (theme === 'candy') {
      c.save(); c.translate(x, y); c.rotate(R() * 6);
      c.fillStyle = pickR(R, ['#FF6FAE', '#7FD6FF', '#FFE14D', '#8EF0A0', '#C59BFF']);
      rr(c, -4, -1.5, 8, 3, 1.5); c.fill(); c.restore();
    } else groundDeco(c, theme, R, x, y, th);
  }
  groundCache[theme] = cv;
  return cv;
}
function pickR(R, a) { return a[Math.floor(R() * a.length)]; }

// ===== 地图块 =====
function drawCellBrick(c, th, px, py, cy) {
  const b = th.brick;
  c.fillStyle = b[0]; c.fillRect(px, py, C, C);
  c.fillStyle = b[1];
  if (cy % 2) { c.fillRect(px + 1, py + 1, 22, 10); c.fillRect(px + 1, py + 13, 10, 10); c.fillRect(px + 13, py + 13, 10, 10); }
  else { c.fillRect(px + 1, py + 1, 10, 10); c.fillRect(px + 13, py + 1, 10, 10); c.fillRect(px + 1, py + 13, 22, 10); }
  c.fillStyle = b[2]; c.fillRect(px + 2, py + 2, 8, 2); c.fillRect(px + 2, py + 14, 8, 2);
}
function drawCellSteel(c, th, px, py) {
  const s = th.steel;
  c.fillStyle = s[0]; c.fillRect(px, py, C, C);
  c.fillStyle = s[1]; c.fillRect(px + 2, py + 2, 20, 20);
  c.fillStyle = s[2]; c.fillRect(px + 4, py + 4, 12, 4);
  c.fillStyle = s[0]; circle(c, px + 17, py + 17, 2); c.fill();
}
function drawTiles(c, time) {
  const g = G, th = THEMES[g.theme], grid = g.grid;
  const blinkRing = g.wallT > 0 && g.wallT < 2 && Math.floor(time * 6) % 2 === 0;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const i = y * GW + x, v = grid[i], px = x * C, py = y * C;
    if (v >= SAND && drawCellNew(c, g, v, x, y, px, py, time)) continue;
    if (v === WATER) {
      c.fillStyle = th.water[0]; c.fillRect(px, py, C, C);
      c.strokeStyle = th.water[1]; c.lineWidth = 2;
      const o = Math.sin(time * 2 + (x + y) * 0.9) * 3;
      c.beginPath();
      c.moveTo(px + 3 + o, py + 8); c.quadraticCurveTo(px + 7 + o, py + 4, px + 11 + o, py + 8);
      c.moveTo(px + 11 - o, py + 18); c.quadraticCurveTo(px + 15 - o, py + 14, px + 19 - o, py + 18);
      c.stroke();
    } else if (v === ICE) {
      c.fillStyle = 'rgba(214,244,255,.92)'; c.fillRect(px, py, C, C);
      c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 2; c.beginPath();
      if ((x + y) % 2) { c.moveTo(px + 4, py + 17); c.lineTo(px + 11, py + 10); } else { c.moveTo(px + 12, py + 20); c.lineTo(px + 20, py + 12); }
      c.stroke();
    } else if (v === BRICK) drawCellBrick(c, th, px, py, y);
    else if (v === STEEL) {
      if (blinkRing && g.ringSet.has(i)) drawCellBrick(c, th, px, py, y);
      else drawCellSteel(c, th, px, py);
    }
  }
}
function drawGrass(c, time) {
  const g = G, th = THEMES[g.theme], grid = g.grid;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    if (grid[y * GW + x] !== GRASS) continue;
    const px = x * C, py = y * C, sw = Math.sin(time * 2 + x * 0.7 + y) * 1.5;
    c.fillStyle = th.bush[0];
    circle(c, px + 6 + sw, py + 8, 9); c.fill();
    circle(c, px + 18 + sw, py + 7, 9); c.fill();
    circle(c, px + 12 + sw, py + 18, 10); c.fill();
    c.fillStyle = th.bush[1];
    circle(c, px + 5 + sw, py + 6, 3); c.fill();
    circle(c, px + 16 + sw, py + 5, 3); c.fill();
  }
}

// ===== 坦克零件 =====
function drawHull(c, s, body, dark, dist, flash) {
  const h = s / 2, tw = s * 0.27;
  c.lineWidth = 2.5; c.strokeStyle = OUT; c.lineJoin = 'round';
  c.fillStyle = '#3A4152';
  rr(c, -h, -h, tw, s, 6); c.fill(); c.stroke();
  rr(c, h - tw, -h, tw, s, 6); c.fill(); c.stroke();
  c.strokeStyle = '#6B7488'; c.lineWidth = 2;
  const ph = ((dist * 0.8) % 7 + 7) % 7;
  c.beginPath();
  for (let y = -h + 3 + ph; y < h - 2; y += 7) {
    c.moveTo(-h + 3, y); c.lineTo(-h + tw - 3, y);
    c.moveTo(h - tw + 3, y); c.lineTo(h - 3, y);
  }
  c.stroke();
  c.fillStyle = flash ? '#FFFFFF' : body; c.strokeStyle = OUT; c.lineWidth = 2.5;
  rr(c, -h + tw - 4, -h * 0.8, s - 2 * tw + 8, h * 1.6, 8); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.3)';
  rr(c, -h + tw - 1, -h * 0.72, (s - 2 * tw) * 0.5, h * 0.45, 5); c.fill();
}
function drawBarrel(c, s, gun, dark, recoil) {
  const h = s / 2, rec = recoil * 5, tip = (WEAPONS[gun] || WEAPONS.normal).color;
  c.lineWidth = 2.5; c.strokeStyle = OUT;
  const one = (w, len, ang) => {
    c.save(); c.rotate(ang || 0);
    c.fillStyle = dark; rr(c, -w / 2, -len + rec, w, len, 4); c.fill(); c.stroke();
    c.fillStyle = gun === 'normal' ? dark : tip; rr(c, -w / 2 - 2, -len - 3 + rec, w + 4, 7, 3); c.fill(); c.stroke();
    c.restore();
  };
  switch (gun) {
    case 'big': one(s * 0.32, h + 8); break;
    case 'scatter': one(s * 0.15, h + 3, -0.4); one(s * 0.15, h + 3, 0.4); one(s * 0.17, h + 7); break;
    case 'pierce': one(s * 0.14, h + 14); break;
    case 'bomb': one(s * 0.3, h + 4); break;
    case 'double': c.save(); c.translate(-s * 0.12, 0); one(s * 0.15, h + 6); c.restore(); c.save(); c.translate(s * 0.12, 0); one(s * 0.15, h + 6); c.restore(); break;
    case 'homing': one(s * 0.2, h + 8); c.fillStyle = '#FF8A3D'; c.beginPath(); c.moveTo(-s * 0.18, -h + 2); c.lineTo(0, -h - 8); c.lineTo(s * 0.18, -h + 2); c.closePath(); c.fill(); c.stroke(); break;
    case 'rainbow': one(s * 0.26, h + 8); break;
    case 'flame': one(s * 0.3, h + 2); break;
    case 'none': break;
    default: one(s * 0.22, h + 6);
  }
}
function drawHpBar(c, x, y, w, k) {
  c.fillStyle = OUT; rr(c, x - w / 2 - 1, y - 1, w + 2, 7, 3); c.fill();
  c.fillStyle = k > 0.5 ? '#5BE37D' : k > 0.25 ? '#FFC93C' : '#FF5C6C';
  rr(c, x - w / 2, y, Math.max(2, w * k), 5, 2.5); c.fill();
}
function drawIceBlock(c, s, time) {
  const h = s / 2 + 3;
  c.fillStyle = 'rgba(180,235,255,.55)'; c.strokeStyle = '#FFFFFF'; c.lineWidth = 2;
  rr(c, -h, -h, h * 2, h * 2, 10); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.moveTo(-h + 6, -h + 14); c.lineTo(-h + 14, -h + 6); c.stroke();
  snowflake(c, h - 9, -h + 9, 5, '#FFFFFF', 1.5);
}

function drawPlayerHead(c, t, sty, time) {
  const r = t.size * 0.32;
  c.fillStyle = t.flashT > 0 ? '#FFFFFF' : sty.top; c.strokeStyle = OUT; c.lineWidth = 2.5;
  circle(c, 0, 0, r); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.55)';
  c.beginPath(); c.ellipse(-r * 0.35, -r * 0.5, r * 0.35, r * 0.18, -0.5, 0, Math.PI * 2); c.fill();
  const lx = DX[t.dir] * 1.8, ly = DY[t.dir] * 1.8;
  const dizzy = t.hurtT > 0, blink = ((time + t.blink) % 3.2) < 0.12;
  c.lineCap = 'round';
  for (const sx of [-1, 1]) {
    const ex = sx * r * 0.38, ey = -r * 0.1;
    if (dizzy) {
      c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath();
      c.moveTo(ex - 3, ey - 3); c.lineTo(ex + 3, ey + 3); c.moveTo(ex + 3, ey - 3); c.lineTo(ex - 3, ey + 3); c.stroke();
    } else if (blink) {
      c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(ex - 3.5, ey); c.lineTo(ex + 3.5, ey); c.stroke();
    } else {
      c.fillStyle = '#FFFFFF'; c.strokeStyle = OUT; c.lineWidth = 1.5;
      c.beginPath(); c.ellipse(ex, ey, r * 0.26, r * 0.32, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = OUT; circle(c, ex + lx, ey + ly, r * 0.15); c.fill();
      c.fillStyle = '#FFFFFF'; circle(c, ex + lx - 1, ey + ly - 1.3, r * 0.06); c.fill();
    }
  }
  c.fillStyle = 'rgba(255,110,140,.55)';
  circle(c, -r * 0.64, r * 0.32, r * 0.15); c.fill();
  circle(c, r * 0.64, r * 0.32, r * 0.15); c.fill();
  c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath();
  if (dizzy) c.arc(0, r * 0.62, r * 0.18, Math.PI * 1.15, Math.PI * 1.85);
  else c.arc(0, r * 0.22, r * 0.24, 0.15 * Math.PI, 0.85 * Math.PI);
  c.stroke();
}

function drawRobotHead(c, t, sty, time) {
  const w = t.size * 0.6, hh = w * 0.88;
  c.lineWidth = 2.5; c.strokeStyle = OUT; c.lineCap = 'round';
  c.beginPath(); c.moveTo(0, -hh / 2); c.lineTo(0, -hh / 2 - 7); c.stroke();
  c.fillStyle = Math.floor(time * 3 + t.x * 0.1) % 2 ? '#FF5A5F' : '#FFD23F';
  circle(c, 0, -hh / 2 - 8, 3.5); c.fill(); c.stroke();
  c.fillStyle = t.flashT > 0 ? '#FFFFFF' : sty.head || '#E3E8F0';
  rr(c, -w / 2, -hh / 2, w, hh, w * 0.24); c.fill(); c.stroke();
  c.fillStyle = '#2E3550';
  rr(c, -w / 2 + 3, -hh / 2 + 3, w - 6, hh * 0.52, w * 0.16); c.fill();
  const lx = DX[t.dir] * 1.5, ly = DY[t.dir] * 1;
  const ey = -hh / 2 + 3 + hh * 0.26 + ly;
  const k = t.hp / t.maxHp;
  const scared = t.maxHp >= 3 && k <= 0.34, hurt = t.maxHp >= 3 && k < 1 && !scared;
  c.fillStyle = sty.eye; c.strokeStyle = sty.eye; c.lineWidth = 2;
  for (const sx of [-1, 1]) {
    const ex = sx * w * 0.2 + lx;
    if (scared) {
      c.beginPath(); c.moveTo(ex - 3 * sx, ey - 3); c.lineTo(ex + 2 * sx, ey); c.lineTo(ex - 3 * sx, ey + 3); c.stroke();
    } else if (hurt) {
      circle(c, ex, ey, 3.5); c.stroke();
    } else {
      rr(c, ex - w * 0.09, ey - 2.5, w * 0.18, 5, 2); c.fill();
    }
  }
  // 坏坏的眉毛
  c.strokeStyle = '#FFFFFF'; c.lineWidth = 2;
  c.beginPath();
  c.moveTo(-w * 0.34, ey - 6); c.lineTo(-w * 0.08, ey - 4);
  c.moveTo(w * 0.34, ey - 6); c.lineTo(w * 0.08, ey - 4);
  c.stroke();
  // 嘴巴
  c.strokeStyle = OUT; c.lineWidth = 2;
  const my = hh * 0.27;
  c.beginPath();
  if (scared) { for (let i = 0; i <= 4; i++) c.lineTo(-w * 0.22 + i * w * 0.11, my + (i % 2 ? 2 : -2)); }
  else if (hurt) { circle(c, 0, my, 3); }
  else { c.moveTo(-w * 0.24, my - 2); c.quadraticCurveTo(0, my + 5, w * 0.24, my - 2); }
  c.stroke();
  if (scared) { c.fillStyle = '#7FD6FF'; c.beginPath(); c.ellipse(w * 0.45, -hh * 0.2, 2.5, 4, 0, 0, Math.PI * 2); c.fill(); }
}

function drawShield(c, t, time) {
  if (t.shieldT < 2 && Math.floor(time * 8) % 2 === 0) return;
  const r = t.size * 0.72 + Math.sin(time * 6) * 1.5;
  c.fillStyle = 'rgba(130,220,255,.25)'; c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 3;
  circle(c, t.x, t.y, r); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 3;
  c.beginPath(); c.arc(t.x, t.y, r - 6, Math.PI * 1.1, Math.PI * 1.45); c.stroke();
}

function drawBee(c, x, y, time, s) {
  s = s || 1;
  c.save(); c.translate(x, y); c.scale(s, s);
  const flap = Math.sin(time * 40) * 0.5;
  c.fillStyle = 'rgba(255,255,255,.85)'; c.strokeStyle = OUT; c.lineWidth = 1.5;
  c.beginPath(); c.ellipse(-4, -8, 5, 7, -0.6 + flap, 0, Math.PI * 2); c.fill(); c.stroke();
  c.beginPath(); c.ellipse(4, -8, 5, 7, 0.6 - flap, 0, Math.PI * 2); c.fill(); c.stroke();
  c.fillStyle = '#FFD23F'; c.lineWidth = 2;
  c.beginPath(); c.ellipse(0, 0, 10, 8, 0, 0, Math.PI * 2); c.fill(); c.stroke();
  c.fillStyle = OUT; c.fillRect(-3, -7, 3, 14); c.fillRect(3, -6, 2.5, 12);
  c.fillStyle = '#FFFFFF'; circle(c, -6, -2, 2.8); c.fill();
  c.fillStyle = OUT; circle(c, -6.5, -2, 1.4); c.fill();
  c.restore();
}

// ===== 坦克 =====
function drawTank(c, t, time, env) {
  env = env || {};
  if (t.type === 'boss') { drawBoss(c, t, time, env); return; }
  if (t.still) { drawStill(c, t, time); return; }
  const isP = t.kind === 'player';
  const sty = isP ? playerStyle(t, time) : ENEMIES[t.type];
  const s = t.size, h = s / 2;
  let jh = t.jump ? Math.sin(Math.min(1, t.jump.t / t.jump.dur) * Math.PI) * 36 : 0;
  if (!isP && t.fly) jh = 8 + Math.sin(time * 4 + t.blink) * 2;
  // 分身：半透明的自己
  if (isP && t.cloneT > 0 && !t.dead) {
    c.save(); c.globalAlpha = t.cloneT < 2 && Math.floor(time * 8) % 2 ? 0.15 : 0.4;
    const ghost = Object.assign({}, t, { x: t.x - DY[t.dir] * 44, y: t.y + DX[t.dir] * 44, cloneT: 0, shieldT: 0, mirrorT: 0, helperT: 0, magnetT: 0, trapT: 0 });
    drawTank(c, ghost, time, {}); c.restore();
  }
  c.save();
  if (isP && t.invT > 0 && t.shieldT <= 0 && Math.floor(time * 14) % 2 === 0) c.globalAlpha = 0.4;
  if (!isP && sty.stealth && t.seenT <= 0) c.globalAlpha = 0.38 + 0.06 * Math.sin(time * 6);
  let oy = t.moving ? Math.sin(t.dist * 0.3) * 1.2 : 0;
  if (env.won && isP) oy -= Math.abs(Math.sin(time * 7)) * 10;
  if (env.lost && !isP) oy -= Math.abs(Math.sin(time * 6 + t.x)) * 6;
  c.translate(t.x, t.y + oy);
  c.fillStyle = 'rgba(20,40,20,.16)';
  c.beginPath(); c.ellipse(3, 5, h * (1 - jh / 90), h * 0.92 * (1 - jh / 90), 0, 0, Math.PI * 2); c.fill();
  if (jh) { c.translate(0, -jh); const k = 1 + jh / 120; c.scale(k, k); }
  if (t.carrier || t.gold) {
    c.save(); c.strokeStyle = `hsl(${(time * 300) % 360},95%,60%)`; c.lineWidth = 5;
    rr(c, -h - 5, -h - 5, s + 10, s + 10, 14); c.stroke(); c.restore();
  }
  c.save(); c.rotate(t.dir * Math.PI / 2);
  if (!isP && t.type === 'd') drawEnemyHullDeco(c, t, sty, s, time);
  drawBarrel(c, s, isP ? t.weapon : sty.gun, sty.dark, t.recoil);
  if (!isP && t.type === 'f') drawEnemyHullDeco(c, t, sty, s, time);
  drawHull(c, s, sty.body, sty.dark, t.dist, t.flashT > 0);
  if (!isP && t.type === 'z') drawEnemyHullDeco(c, t, sty, s, time);
  if (isP && t.skin) drawPaintDeco(c, s, t.skin.paint, time);
  if (!isP && t.type === 'h') {
    c.fillStyle = sty.dark;
    for (const [x, y] of [[-h * 0.35, -h * 0.6], [h * 0.35, -h * 0.6], [-h * 0.35, h * 0.6], [h * 0.35, h * 0.6]]) { circle(c, x, y, 2.5); c.fill(); }
  }
  c.restore();
  if (isP) {
    drawPlayerHead(c, t, sty, time);
    if (t.skin && t.skin.sticker !== 'none') drawSticker(c, t.skin.sticker, t.size * 0.22, t.size * 0.2, 5);
    if (t.skin && t.skin.hat !== 'none') drawHat(c, t.skin.hat, t.size * 0.4, time);
  } else { drawRobotHead(c, t, sty, time); drawEnemyHeadDeco(c, t, sty, s, time); }
  if (!isP && t.type === 'b') snowflake(c, h * 0.55, h * 0.55, 5, '#FFFFFF', 1.6);
  if (!isP && t.frozenT > 0) { if (t.bubble) drawBubbleOver(c, t, time); else drawIceBlock(c, s, time); }
  if (!isP && t.flameWarn > 0) txt(c, '!', 0, -h - 18, 24, '#FF3B3B', 'center', '#FFFFFF');
  if (isP && t.trapT > 0) drawBubbleOver(c, t, time);
  if (isP && t.mirrorT > 0 && !(t.mirrorT < 2 && Math.floor(time * 8) % 2)) {
    c.strokeStyle = `hsl(${(time * 200) % 360},90%,75%)`; c.lineWidth = 3; c.setLineDash([8, 5]); c.lineDashOffset = time * 30;
    circle(c, 0, 0, s * 0.68); c.stroke(); c.setLineDash([]);
  }
  if (isP && t.magnetT > 0) { c.save(); c.translate(-h - 2, -h - 2); c.rotate(-0.5); c.strokeStyle = '#E53935'; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 6, Math.PI, 0, true); c.stroke(); c.restore(); }
  if (isP && t.rocketT > 0) { c.save(); c.rotate(t.dir * Math.PI / 2); drawFlameLick(c, 0, h + 14, 14, time); c.restore(); }
  if (isP && t.slowT > 0) { c.fillStyle = 'rgba(120,200,255,.35)'; circle(c, 0, 0, h + 2); c.fill(); snowflake(c, h - 2, -h + 2, 5, '#FFFFFF', 1.5); }
  if (isP && t.hurtT > 0) {
    for (let i = 0; i < 3; i++) {
      const a = time * 6 + (i * Math.PI * 2) / 3;
      c.fillStyle = '#FFE14D'; c.strokeStyle = OUT; c.lineWidth = 1.2;
      starPath(c, Math.cos(a) * 14, -h - 4 + Math.sin(a) * 4, 5, 2.2, 5, a); c.fill(); c.stroke();
    }
  }
  c.restore();
  if (isP && t.shieldT > 0) drawShield(c, t, time);
  if (isP && t.helperT > 0 && !t.dead) {
    const a = time * 3;
    drawBee(c, t.x + Math.cos(a) * 36, t.y + Math.sin(a) * 30 - 6, time);
  }
  if (!isP && t.maxHp > 2 && t.hp < t.maxHp) drawHpBar(c, t.x, t.y - h - 12, s, t.hp / t.maxHp);
  if (isP && env.twoP) {
    const hat = t.skin && t.skin.hat !== 'none' ? 12 : 0;
    txt(c, t.pid ? '2P' : '1P', t.x, t.y - h - 12 - hat - jh, 12, '#FFFFFF', 'center', t.pid ? '#3EC1F3' : '#FF8A3D');
  }
}

// ===== 皮肤 =====
function playerStyle(t, time) {
  const base = PLAYER_TANKS[t.tankIdx], p = t.skin && t.skin.paint;
  if (p === 'gold') return Object.assign({}, base, { body: '#FFCF33', top: '#FFE88A', dark: '#B8860B' });
  if (p === 'stars') return Object.assign({}, base, { body: '#3A3F9E', top: '#8C92FF', dark: '#1E2266' });
  if (p === 'camo') return Object.assign({}, base, { body: '#7FA65A', top: '#B5D18F', dark: '#4E6B34' });
  if (p === 'candy') return Object.assign({}, base, { body: '#FF8CC6', top: '#FFD1E8', dark: '#C9509A' });
  if (p === 'lava') return Object.assign({}, base, { body: '#4A3A3A', top: '#FF9A3D', dark: '#2A1E1E' });
  if (p === 'galaxy') return Object.assign({}, base, { body: '#2E2A6B', top: '#C9A5FF', dark: '#16134A' });
  if (p === 'rainbow') {
    const hh = Math.floor(time * 90 + t.tankIdx * 50) % 360;
    return Object.assign({}, base, { body: `hsl(${hh},85%,60%)`, top: `hsl(${(hh + 40) % 360},90%,76%)`, dark: `hsl(${hh},70%,35%)` });
  }
  return base;
}
function drawPaintDeco(c, s, paint, time) {
  if (!paint || paint === 'none' || paint === 'rainbow') return;
  const h = s / 2, tw = s * 0.27;
  c.save();
  rr(c, -h + tw - 4, -h * 0.8, s - 2 * tw + 8, h * 1.6, 8); c.clip();
  if (paint === 'stripes') {
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 4; c.beginPath();
    for (let x = -h * 2; x < h * 2; x += 10) { c.moveTo(x, -h); c.lineTo(x + h, h); }
    c.stroke();
  } else if (paint === 'stars') {
    c.fillStyle = '#FFFFFF';
    for (const [x, y] of [[-6, -12], [7, -9], [-8, 9], [6, 12], [0, -15]]) { starPath(c, x, y, 2.6 + Math.sin(time * 4 + x) * 0.8, 1.1, 5, 0); c.fill(); }
  } else if (paint === 'camo') {
    c.fillStyle = '#4E6B34'; for (const [x, y, rx] of [[-6, -10, 6], [6, 4, 7], [-4, 12, 5], [8, -14, 4]]) { c.beginPath(); c.ellipse(x, y, rx, rx * 0.7, 0.5, 0, Math.PI * 2); c.fill(); }
  } else if (paint === 'candy') {
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 5; c.beginPath();
    for (let x = -h * 2; x < h * 2; x += 12) { c.moveTo(x, h); c.lineTo(x + h, -h); }
    c.stroke();
  } else if (paint === 'lava') {
    c.strokeStyle = `rgba(255,${130 + 60 * Math.sin(time * 4)},40,.9)`; c.lineWidth = 2.5; c.beginPath();
    c.moveTo(-8, -h); c.lineTo(-2, -4); c.lineTo(-7, 6); c.lineTo(0, h); c.moveTo(6, -h); c.lineTo(3, -2); c.lineTo(8, 8); c.stroke();
  } else if (paint === 'galaxy') {
    for (const [x, y, r] of [[-6, -12, 1.5], [7, -6, 2], [-8, 6, 1.2], [5, 13, 1.8], [0, 0, 1]]) { c.fillStyle = `rgba(255,255,255,${0.6 + 0.4 * Math.sin(time * 5 + x)})`; circle(c, x, y, r); c.fill(); }
    c.fillStyle = 'rgba(201,165,255,.35)'; c.beginPath(); c.ellipse(0, 2, 10, 5, 0.6, 0, Math.PI * 2); c.fill();
  } else if (paint === 'gold') {
    const k = (time * 0.8) % 1;
    c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath();
    c.moveTo(-h + k * s * 2, -h); c.lineTo(-h + k * s * 2 + 6, -h); c.lineTo(-h + k * s * 2 - h + 6, h); c.lineTo(-h + k * s * 2 - h, h); c.closePath(); c.fill();
  }
  c.restore();
}
function drawSticker(c, id, x, y, r) {
  c.save(); c.translate(x, y);
  c.strokeStyle = OUT; c.lineWidth = 1.3;
  if (id === 'star') { c.fillStyle = '#FFE14D'; starPath(c, 0, 0, r * 1.2, r * 0.55, 5, 0); c.fill(); c.stroke(); }
  else if (id === 'heart') { c.fillStyle = '#FF5C8A'; heartPath(c, 0, -r * 0.8, r * 1.8); c.fill(); c.stroke(); }
  else if (id === 'bolt') { c.fillStyle = '#FFE14D'; boltPath(c, r / 10); c.fill(); c.stroke(); }
  else if (id === 'flower') {
    c.fillStyle = '#FF9AD5';
    for (let i = 0; i < 5; i++) { const a = (i * Math.PI * 2) / 5; circle(c, Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6, r * 0.45); c.fill(); }
    c.fillStyle = '#FFE14D'; circle(c, 0, 0, r * 0.35); c.fill();
  } else if (id === 'smile') {
    c.fillStyle = '#FFE14D'; circle(c, 0, 0, r); c.fill(); c.stroke();
    c.fillStyle = OUT; circle(c, -r * 0.35, -r * 0.2, r * 0.13); c.fill(); circle(c, r * 0.35, -r * 0.2, r * 0.13); c.fill();
    c.beginPath(); c.arc(0, r * 0.05, r * 0.45, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke();
  } else if (id === 'fish') {
    c.fillStyle = '#FF9E6B'; c.beginPath(); c.ellipse(-1, 0, r, r * 0.6, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(r * 0.8, 0); c.lineTo(r * 1.5, -r * 0.6); c.lineTo(r * 1.5, r * 0.6); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = OUT; circle(c, -r * 0.45, -r * 0.1, r * 0.15); c.fill();
  } else if (id === 'mushroom') {
    c.fillStyle = '#FF5D5D'; c.beginPath(); c.arc(0, 0, r, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#FFF3E0'; c.fillRect(-r * 0.35, 0, r * 0.7, r * 0.7); c.strokeRect(-r * 0.35, 0, r * 0.7, r * 0.7);
    c.fillStyle = '#FFFFFF'; circle(c, -r * 0.4, -r * 0.45, r * 0.2); c.fill();
  } else if (id === 'rocket') {
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.moveTo(0, -r * 1.2); c.quadraticCurveTo(r * 0.7, -r * 0.2, r * 0.5, r * 0.7); c.lineTo(-r * 0.5, r * 0.7); c.quadraticCurveTo(-r * 0.7, -r * 0.2, 0, -r * 1.2); c.fill(); c.stroke();
    c.fillStyle = '#FF5D5D'; circle(c, 0, -r * 0.2, r * 0.25); c.fill();
  } else if (id === 'moon') {
    c.fillStyle = '#FFE14D'; c.beginPath(); c.arc(0, 0, r, 0.5, Math.PI * 2 - 0.5 + 0.0); c.arc(r * 0.45, -r * 0.2, r * 0.75, Math.PI * 2 - 0.9, 0.9, true); c.closePath(); c.fill(); c.stroke();
  }
  c.restore();
}
function drawHat(c, hat, r, time) {
  const y = -r * 0.75;
  c.save(); c.strokeStyle = OUT; c.lineWidth = 2; c.lineJoin = 'round';
  switch (hat) {
    case 'party':
      c.fillStyle = '#FF6FAE';
      c.beginPath(); c.moveTo(-r * 0.5, y + 3); c.lineTo(r * 0.5, y + 3); c.lineTo(r * 0.1, y - r * 1.25); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = '#FFE14D'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-r * 0.32, y - 2); c.lineTo(r * 0.34, y - 2); c.moveTo(-r * 0.12, y - r * 0.55); c.lineTo(r * 0.24, y - r * 0.55); c.stroke();
      c.fillStyle = '#7FD6FF'; c.strokeStyle = OUT; c.lineWidth = 1.5; circle(c, r * 0.1, y - r * 1.3, r * 0.2); c.fill(); c.stroke();
      break;
    case 'bow':
      c.fillStyle = '#FF5C8A';
      c.beginPath(); c.moveTo(r * 0.35, y); c.lineTo(-r * 0.15, y - r * 0.4); c.lineTo(-r * 0.15, y + r * 0.35); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(r * 0.35, y); c.lineTo(r * 0.85, y - r * 0.4); c.lineTo(r * 0.85, y + r * 0.35); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#FFD1E0'; circle(c, r * 0.35, y, r * 0.17); c.fill(); c.stroke();
      break;
    case 'tophat':
      c.fillStyle = '#2B2D42';
      rr(c, -r * 0.8, y - 2, r * 1.6, 5, 2.5); c.fill(); c.stroke();
      rr(c, -r * 0.48, y - r * 1.05, r * 0.96, r * 1.05, 3); c.fill(); c.stroke();
      c.fillStyle = '#FF5D5D'; c.fillRect(-r * 0.48 + 1, y - r * 0.38, r * 0.96 - 2, r * 0.22);
      break;
    case 'cowboy':
      c.fillStyle = '#B5793E';
      c.beginPath(); c.moveTo(-r * 1.05, y - 4); c.quadraticCurveTo(0, y + 6, r * 1.05, y - 4); c.quadraticCurveTo(0, y + 1, -r * 1.05, y - 4); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(-r * 0.55, y); c.quadraticCurveTo(-r * 0.6, y - r * 0.9, -r * 0.2, y - r * 0.85); c.lineTo(0, y - r * 0.65); c.lineTo(r * 0.2, y - r * 0.85); c.quadraticCurveTo(r * 0.6, y - r * 0.9, r * 0.55, y); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#7A4A22'; c.fillRect(-r * 0.54, y - r * 0.3, r * 1.08, r * 0.18);
      break;
    case 'crown':
      c.fillStyle = '#FFD23F';
      c.beginPath(); c.moveTo(-r * 0.6, y + 2); c.lineTo(-r * 0.6, y - r * 0.7); c.lineTo(-r * 0.3, y - r * 0.3); c.lineTo(0, y - r * 0.95); c.lineTo(r * 0.3, y - r * 0.3); c.lineTo(r * 0.6, y - r * 0.7); c.lineTo(r * 0.6, y + 2); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#FF4D6D'; circle(c, 0, y - r * 0.2, r * 0.13); c.fill();
      c.fillStyle = '#4CB8FF'; circle(c, -r * 0.38, y - r * 0.1, r * 0.09); c.fill(); circle(c, r * 0.38, y - r * 0.1, r * 0.09); c.fill();
      break;
    case 'chick': {
      const bob = Math.abs(Math.sin(time * 4)) * 2;
      c.fillStyle = '#FFE14D';
      c.beginPath(); c.ellipse(0, y - r * 0.35 - bob, r * 0.5, r * 0.42, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      circle(c, r * 0.18, y - r * 0.8 - bob, r * 0.3); c.fill(); c.stroke();
      c.fillStyle = OUT; circle(c, r * 0.26, y - r * 0.86 - bob, r * 0.06); c.fill();
      c.fillStyle = '#FF9A3D'; c.beginPath(); c.moveTo(r * 0.44, y - r * 0.82 - bob); c.lineTo(r * 0.66, y - r * 0.74 - bob); c.lineTo(r * 0.44, y - r * 0.68 - bob); c.closePath(); c.fill();
      c.strokeStyle = '#E0B000'; c.beginPath(); c.arc(-r * 0.12, y - r * 0.35 - bob, r * 0.22, 0.2, 2.2); c.stroke();
      break;
    }
    case 'halo': {
      const bob = Math.sin(time * 3) * 2;
      c.strokeStyle = '#FFD23F'; c.lineWidth = 3.5; c.shadowColor = '#FFF3B0'; c.shadowBlur = 8;
      c.beginPath(); c.ellipse(0, y - r * 0.6 + bob, r * 0.62, r * 0.2, 0, 0, Math.PI * 2); c.stroke();
      break;
    }
    case 'snailHat':
      c.fillStyle = '#C98BFF'; circle(c, 0, y - r * 0.4, r * 0.55); c.fill(); c.stroke();
      c.strokeStyle = '#8A4FD0'; c.lineWidth = 2; c.beginPath(); for (let a = 0; a < 10; a += 0.4) { const q = r * 0.45 * (1 - a / 10); c.lineTo(Math.cos(a) * q, y - r * 0.4 + Math.sin(a) * q); } c.stroke();
      break;
    case 'iceCrown':
      c.fillStyle = '#BFF3FF';
      c.beginPath(); c.moveTo(-r * 0.6, y + 2); for (let i = 0; i <= 4; i++) { c.lineTo(-r * 0.6 + i * r * 0.3, y - (i % 2 ? r * 0.45 : r * 0.95)); } c.lineTo(r * 0.6, y + 2); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#FFFFFF'; circle(c, 0, y - r * 0.5, r * 0.12); c.fill();
      break;
    case 'dinoHorn':
      c.fillStyle = '#5DD39E';
      for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * r * 0.32 - r * 0.15, y + 2); c.lineTo(i * r * 0.32, y - r * (i ? 0.6 : 0.85)); c.lineTo(i * r * 0.32 + r * 0.15, y + 2); c.closePath(); c.fill(); c.stroke(); }
      break;
    case 'jellyHat': {
      const w = Math.sin(time * 6) * 1.5;
      c.fillStyle = '#7CF2C8'; c.beginPath(); c.ellipse(0, y - r * 0.3, r * 0.6 + w, r * 0.5 - w, 0, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.7)'; circle(c, -r * 0.25, y - r * 0.5, r * 0.1); c.fill();
      break;
    }
    case 'goggles':
      c.fillStyle = '#80DEEA'; c.lineWidth = 2;
      for (const sx of [-1, 1]) { circle(c, sx * r * 0.32, y + r * 0.35, r * 0.26); c.fill(); c.stroke(); }
      c.strokeStyle = '#FF7043'; c.lineWidth = 3; c.beginPath(); c.moveTo(-r * 0.9, y + r * 0.3); c.lineTo(r * 0.9, y + r * 0.3); c.stroke();
      break;
    case 'bearEars':
      for (const sx of [-1, 1]) { c.fillStyle = '#B07A4A'; circle(c, sx * r * 0.62, y - r * 0.05, r * 0.32); c.fill(); c.stroke(); c.fillStyle = '#FFC1A1'; circle(c, sx * r * 0.62, y - r * 0.05, r * 0.15); c.fill(); }
      break;
    case 'fireHelm':
      c.fillStyle = '#FF7043'; c.beginPath(); c.arc(0, y + 2, r * 0.62, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
      for (let i = -1; i <= 1; i++) drawFlameLick(c, i * r * 0.3, y - r * 0.45, r * 0.3, time + i);
      break;
    case 'windKey':
      c.save(); c.translate(0, y - r * 0.2); c.rotate(time * 2);
      c.fillStyle = '#FFD23F'; c.fillRect(-r * 0.08, 0, r * 0.16, r * 0.4);
      circle(c, -r * 0.28, -r * 0.1, r * 0.25); c.fill(); c.stroke(); circle(c, r * 0.28, -r * 0.1, r * 0.25); c.fill(); c.stroke();
      c.restore();
      break;
    case 'spaceHelm':
      c.fillStyle = 'rgba(200,240,255,.35)'; c.strokeStyle = '#FFFFFF'; c.lineWidth = 3;
      circle(c, 0, y + r * 0.75, r * 1.05); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.arc(0, y + r * 0.75, r * 0.85, Math.PI * 1.15, Math.PI * 1.4); c.stroke();
      break;
    case 'devilHorn':
      c.fillStyle = '#FF5A5F';
      for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * r * 0.25, y + 2); c.quadraticCurveTo(sx * r * 0.75, y - r * 0.2, sx * r * 0.6, y - r * 0.75); c.quadraticCurveTo(sx * r * 0.5, y - r * 0.2, sx * r * 0.05, y + 2); c.closePath(); c.fill(); c.stroke(); }
      break;
  }
  c.restore();
}

// ===== 新地形 =====
function drawCrate(c, k) {
  const x = k.x - 23, y = k.y - 23, w = 46;
  c.fillStyle = k.flashT > 0 ? '#FFFFFF' : '#D9A066'; c.strokeStyle = '#7A4A22'; c.lineWidth = 2.5;
  rr(c, x, y, w, w, 6); c.fill(); c.stroke();
  c.strokeStyle = '#B07A42'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(x + 3, y + 15); c.lineTo(x + w - 3, y + 15); c.moveTo(x + 3, y + 31); c.lineTo(x + w - 3, y + 31); c.stroke();
  c.strokeStyle = '#7A4A22'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(x + 6, y + 6); c.lineTo(x + w - 6, y + w - 6); c.moveTo(x + w - 6, y + 6); c.lineTo(x + 6, y + w - 6); c.stroke();
  c.strokeStyle = '#4A2A10'; c.lineWidth = 1.5; c.beginPath();
  if (k.hp <= 2) { c.moveTo(x + 30, y + 4); c.lineTo(x + 26, y + 12); c.lineTo(x + 32, y + 18); }
  if (k.hp <= 1) { c.moveTo(x + 8, y + 30); c.lineTo(x + 16, y + 34); c.lineTo(x + 12, y + 42); }
  c.stroke();
}
function drawSpring(c, s, time) {
  const comp = s.t > 0 ? Math.sin(((0.4 - s.t) / 0.4) * Math.PI) * -8 : Math.sin(time * 4 + s.x) * 1.5;
  c.strokeStyle = OUT; c.lineWidth = 2.5; c.lineJoin = 'round';
  c.fillStyle = '#9AA5B8'; rr(c, s.x - 18, s.y + 8, 36, 10, 4); c.fill(); c.stroke();
  c.strokeStyle = '#5E6E80'; c.lineWidth = 3; c.beginPath();
  const top = s.y - 6 + comp;
  for (let i = 0; i <= 6; i++) c.lineTo(s.x + (i % 2 ? 9 : -9), s.y + 8 + ((top - s.y - 8) * i) / 6);
  c.stroke();
  c.fillStyle = '#FF5D5D'; c.strokeStyle = OUT; c.lineWidth = 2.5;
  rr(c, s.x - 16, top - 8, 32, 9, 4); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.75)';
  c.beginPath(); c.moveTo(s.x, top - 22); c.lineTo(s.x - 6, top - 14); c.lineTo(s.x + 6, top - 14); c.closePath(); c.fill();
}
function drawPortal(c, P, time) {
  c.save(); c.translate(P.x, P.y);
  c.fillStyle = P.color; c.globalAlpha = 0.35; circle(c, 0, 0, 22); c.fill();
  c.globalAlpha = 1; c.lineWidth = 3; c.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    c.save(); c.rotate(time * (2 + i) * (i % 2 ? -1 : 1));
    c.strokeStyle = i === 1 ? '#FFFFFF' : P.color;
    c.beginPath(); c.arc(0, 0, 20 - i * 6, 0, Math.PI * 1.3); c.stroke();
    c.restore();
  }
  c.fillStyle = '#FFFFFF'; circle(c, 0, 0, 3); c.fill();
  c.restore();
}
function drawCoin(c, x, y, time, r) {
  const k = Math.max(0.2, Math.abs(Math.cos(time * 5)));
  c.save(); c.translate(x, y); c.scale(k, 1);
  c.fillStyle = '#FFD23F'; c.strokeStyle = '#C98A00'; c.lineWidth = 2;
  circle(c, 0, 0, r); c.fill(); c.stroke();
  c.fillStyle = '#FFF0A0'; starPath(c, 0, 0, r * 0.55, r * 0.25, 5, 0); c.fill();
  c.restore();
}

// ===== Boss =====
function drawTentacles(c, s, color, time) {
  c.strokeStyle = OUT; c.lineWidth = 2.5;
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI * 2) / 6 + 0.5;
    c.save(); c.rotate(a);
    c.fillStyle = color;
    c.beginPath();
    const L = s * 0.62;
    for (let k = 0; k <= 10; k++) {
      const x = s * 0.3 + (k / 10) * L * 0.6, y = Math.sin(time * 4 + k * 0.7 + i) * 4;
      if (k === 0) c.moveTo(x, y - 7); else c.lineTo(x, y - 7 * (1 - k / 11));
    }
    for (let k = 10; k >= 0; k--) {
      const x = s * 0.3 + (k / 10) * L * 0.6, y = Math.sin(time * 4 + k * 0.7 + i) * 4;
      c.lineTo(x, y + 7 * (1 - k / 11));
    }
    c.closePath(); c.fill(); c.stroke();
    c.restore();
  }
}
function drawBoss(c, e, time, env) {
  const bd = e.bd, s = e.size;
  c.save();
  let alpha = 1;
  if (e.invisT > 0) alpha = 0.35 + 0.1 * Math.sin(time * 10);
  if (e.teleT > 0) alpha = e.teleT > 0.4 ? (e.teleT - 0.4) / 0.4 : (0.4 - e.teleT) / 0.4;
  if (bd.deco === 'ghost') alpha *= 0.88;
  c.globalAlpha = clamp(alpha, 0.05, 1);
  let ox = 0, oy = 0;
  if (e.dashWarn > 0) { ox = rand(-2.5, 2.5); oy = rand(-2.5, 2.5); }
  if (env.lost) oy -= Math.abs(Math.sin(time * 5)) * 8;
  c.translate(e.x + ox, e.y + oy);
  if (drawBossState(c, e, time)) { c.restore(); return; }
  // 飞起来：地上留影子，身体在空中
  let lift = 0;
  if (e.fly) { const k = e.fly.t / e.fly.dur; lift = Math.sin(k * Math.PI) * (e.fly.big ? 120 : 60); }
  c.fillStyle = 'rgba(20,40,20,.18)';
  c.beginPath(); c.ellipse(4, 7, s / 2 * (1 - lift / 300), s * 0.46 * (1 - lift / 300), 0, 0, Math.PI * 2); c.fill();
  if (lift) c.translate(0, -lift);
  if (e.guardKind === 'puff') { const k = 1.35 + Math.sin(time * 20) * 0.04; c.scale(k, k); }
  if (bd.deco === 'tentacle') drawTentacles(c, s, bd.body, time);
  c.save(); c.rotate(e.dir * Math.PI / 2);
  drawHull(c, s, bd.body, bd.dark, e.dist, e.flashT > 0);
  c.restore();
  c.save(); c.rotate(e.aim + Math.PI / 2);
  drawBarrel(c, s * 0.78, 'big', bd.dark, e.recoil);
  c.restore();
  drawBossDeco(c, e, bd, time, true);
  drawBossHead(c, e, bd, time);
  drawBossDeco(c, e, bd, time, false);
  if (bd.frontShield && bd.deco === 'knight' && e.shieldOffT <= 0 && e.stunT <= 0) {
    c.save(); c.rotate(e.dir * Math.PI / 2);
    c.fillStyle = '#C9D3E3'; c.strokeStyle = OUT; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(-s * 0.42, -s * 0.52); c.lineTo(s * 0.42, -s * 0.52); c.lineTo(s * 0.36, -s * 0.66); c.lineTo(-s * 0.36, -s * 0.66); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#FF4D6D'; circle(c, 0, -s * 0.59, 4); c.fill();
    c.restore();
  }
  if (e.weakT > 0 && !bd.armored) { c.fillStyle = '#7FD6FF'; c.beginPath(); c.ellipse(s * 0.32, -s * 0.36, 4, 6, 0, 0, Math.PI * 2); c.fill(); }
  if (e.frozenT > 0) { if (e.bubble) drawBubbleOver(c, e, time); else drawIceBlock(c, s, time); }
  if (e.dashWarn > 0) txt(c, '!', 0, -s / 2 - 30, 34, '#FF3B3B', 'center', '#FFFFFF');
  c.restore();
}
function drawBossHead(c, e, bd, time) {
  const s = e.size, w = s * 0.54, hh = w * 0.86, top = -hh / 2;
  const angry = e.angry;
  c.lineWidth = 2.5; c.strokeStyle = OUT; c.lineJoin = 'round';
  // 头后面的装饰
  if (bd.deco === 'ice') {
    c.fillStyle = '#DDF6FF';
    for (let i = -2; i <= 2; i++) {
      c.beginPath(); c.moveTo(i * w * 0.18 - 6, top + 4); c.lineTo(i * w * 0.18, top - 14 - (2 - Math.abs(i)) * 6); c.lineTo(i * w * 0.18 + 6, top + 4); c.closePath(); c.fill(); c.stroke();
    }
  } else if (bd.deco === 'mohawk') {
    c.fillStyle = '#FF3FA4';
    for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 6 - 5, top + 3); c.lineTo(i * 6 + Math.sin(time * 5 + i) * 2, top - 16); c.lineTo(i * 6 + 5, top + 3); c.closePath(); c.fill(); c.stroke(); }
  } else if (bd.deco === 'spikes') {
    c.fillStyle = '#FFB84D';
    for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * w * 0.2 - 7, top + 4); c.lineTo(i * w * 0.2, top - 14); c.lineTo(i * w * 0.2 + 7, top + 4); c.closePath(); c.fill(); c.stroke(); }
  } else if (bd.deco === 'mega') {
    c.fillStyle = '#FF5A5F';
    for (const sx of [-1, 1]) {
      c.beginPath(); c.moveTo(sx * w * 0.25, top + 4); c.quadraticCurveTo(sx * w * 0.75, top - 6, sx * w * 0.62, top - 30); c.quadraticCurveTo(sx * w * 0.5, top - 8, sx * w * 0.42, top + 6); c.closePath(); c.fill(); c.stroke();
    }
  } else if (bd.deco === 'rocket') {
    for (const sx of [-1, 1]) {
      c.save(); c.translate(sx * (w / 2 + 8), 0);
      c.fillStyle = '#FFFFFF'; rr(c, -6, -14, 12, 26, 6); c.fill(); c.stroke();
      c.fillStyle = '#FF5A5F'; c.beginPath(); c.moveTo(-6, -8); c.lineTo(0, -22); c.lineTo(6, -8); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = Math.floor(time * 12) % 2 ? '#FFE14D' : '#FF9A3D';
      c.beginPath(); c.moveTo(-4, 12); c.lineTo(0, 22 + Math.random() * 4); c.lineTo(4, 12); c.closePath(); c.fill();
      c.restore();
    }
  }
  // 头
  const headColor = bd.deco === 'ghost' ? '#FFFFFF' : bd.deco === 'mega' ? '#9EA3C8' : '#E3E8F0';
  c.fillStyle = e.flashT > 0 ? '#FFFFFF' : headColor;
  if (bd.deco === 'ghost') {
    c.beginPath(); c.moveTo(-w / 2, hh / 2);
    c.lineTo(-w / 2, 0); c.arc(0, 0, w / 2, Math.PI, 0); c.lineTo(w / 2, hh / 2);
    for (let i = 0; i < 4; i++) c.quadraticCurveTo(w / 2 - (i + 0.5) * (w / 4), hh / 2 + 8 * Math.sin(time * 6 + i), w / 2 - (i + 1) * (w / 4), hh / 2);
    c.closePath(); c.fill(); c.stroke();
  } else {
    rr(c, -w / 2, top, w, hh, w * 0.22); c.fill(); c.stroke();
  }
  // 脸
  c.fillStyle = '#2E3550';
  rr(c, -w / 2 + 4, top + 4, w - 8, hh * 0.5, w * 0.14); c.fill();
  const eyeC = angry ? '#FF3B3B' : bd.eye;
  const ey = top + 4 + hh * 0.25, lx = Math.cos(e.aim) * 2, ly = Math.sin(e.aim) * 1.5;
  c.fillStyle = eyeC;
  for (const sx of [-1, 1]) { circle(c, sx * w * 0.2 + lx, ey + ly, w * 0.09 * (angry ? 1.15 : 1)); c.fill(); }
  c.fillStyle = '#FFFFFF';
  for (const sx of [-1, 1]) { circle(c, sx * w * 0.2 + lx - 1.5, ey + ly - 1.5, w * 0.03); c.fill(); }
  c.strokeStyle = '#FFFFFF'; c.lineWidth = 3; c.lineCap = 'round';
  c.beginPath();
  const bt = angry ? 7 : 4;
  c.moveTo(-w * 0.36, ey - w * 0.13 - bt * 0.3); c.lineTo(-w * 0.08, ey - w * 0.13 + bt * 0.6);
  c.moveTo(w * 0.36, ey - w * 0.13 - bt * 0.3); c.lineTo(w * 0.08, ey - w * 0.13 + bt * 0.6);
  c.stroke();
  // 嘴（大牙齿）
  const my = top + hh * 0.72;
  c.fillStyle = '#FFFFFF'; c.strokeStyle = OUT; c.lineWidth = 2;
  rr(c, -w * 0.28, my - 5, w * 0.56, 10, 4); c.fill(); c.stroke();
  c.beginPath();
  for (let i = 1; i < 4; i++) { c.moveTo(-w * 0.28 + i * w * 0.14, my - 5); c.lineTo(-w * 0.28 + i * w * 0.14, my + 5); }
  c.stroke();
  // 头前面的装饰
  c.lineWidth = 2.5; c.strokeStyle = OUT;
  if (bd.deco === 'crown' || bd.deco === 'mega') {
    const cw = w * (bd.deco === 'mega' ? 0.5 : 0.7), cy = top - 2;
    c.fillStyle = '#FFD23F';
    c.beginPath(); c.moveTo(-cw / 2, cy); c.lineTo(-cw / 2, cy - 14); c.lineTo(-cw / 4, cy - 6); c.lineTo(0, cy - 18); c.lineTo(cw / 4, cy - 6); c.lineTo(cw / 2, cy - 14); c.lineTo(cw / 2, cy); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#FF4D6D'; circle(c, 0, cy - 6, 3); c.fill();
  } else if (bd.deco === 'helmet') {
    c.fillStyle = '#6B778D';
    c.beginPath(); c.arc(0, top + 2, w * 0.5, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#FFD23F'; c.beginPath(); c.moveTo(-5, top - w * 0.45); c.lineTo(0, top - w * 0.45 - 12); c.lineTo(5, top - w * 0.45); c.closePath(); c.fill(); c.stroke();
  } else if (bd.deco === 'ghost') {
    c.fillStyle = 'rgba(255,120,180,.6)'; circle(c, -w * 0.32, my - 2, 4); c.fill(); circle(c, w * 0.32, my - 2, 4); c.fill();
  }
  if (bd.deco === 'mega') {
    const pulse = 0.6 + 0.4 * Math.sin(time * 6);
    c.fillStyle = `rgba(255,60,60,${pulse})`; circle(c, 0, hh / 2 + 10, 7); c.fill(); c.stroke();
  }
}

// ===== 宝宝蛋 =====
function drawEgg(c, e, time) {
  const x = e.x, y = e.y;
  c.lineWidth = 2.5; c.strokeStyle = OUT;
  c.fillStyle = '#B07842';
  c.beginPath(); c.ellipse(x, y + 13, 22, 9, 0, 0, Math.PI * 2); c.fill(); c.stroke();
  c.strokeStyle = '#E0A866'; c.lineWidth = 2;
  c.beginPath();
  for (let i = -3; i <= 3; i++) { c.moveTo(x + i * 6 - 4, y + 9); c.lineTo(x + i * 6 + 4, y + 17); }
  c.stroke();
  c.save(); c.translate(x, y + 4);
  const wob = e.hitT > 0 ? Math.sin(time * 40) * 0.15 * e.hitT : Math.sin(time * 1.5) * 0.04;
  c.rotate(wob);
  c.strokeStyle = OUT; c.lineWidth = 2.5;
  if (e.broken) {
    c.fillStyle = '#FFF7E6';
    c.beginPath(); c.moveTo(-15, -4);
    for (let i = 0; i <= 6; i++) c.lineTo(-15 + i * 5, -4 + (i % 2 ? -5 : 0));
    c.lineTo(15, -4); c.ellipse(0, -4, 15, 13, 0, 0, Math.PI); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#FFE14D'; circle(c, 0, -12, 9); c.fill(); c.stroke();
    c.fillStyle = OUT; circle(c, -3, -13, 1.5); c.fill(); circle(c, 3, -13, 1.5); c.fill();
    c.fillStyle = '#FF9A3D'; c.beginPath(); c.moveTo(-2, -10); c.lineTo(2, -10); c.lineTo(0, -7); c.closePath(); c.fill();
    c.fillStyle = '#7FD6FF'; circle(c, -6, -8 + ((time * 20) % 8), 2); c.fill(); circle(c, 6, -8 + ((time * 20 + 4) % 8), 2); c.fill();
  } else {
    c.fillStyle = '#FFF7E6';
    c.beginPath(); c.ellipse(0, -6, 15, 19, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#FFB3C7'; circle(c, -7, -15, 3); c.fill();
    c.fillStyle = '#9EE2FF'; circle(c, 8, -5, 2.5); c.fill();
    c.fillStyle = '#C7F59E'; circle(c, -5, 5, 2.2); c.fill();
    c.strokeStyle = OUT; c.lineWidth = 1.8; c.lineCap = 'round';
    if (e.hitT > 0) {
      c.fillStyle = OUT; circle(c, -5, -7, 2); c.fill(); circle(c, 5, -7, 2); c.fill();
      c.beginPath(); c.arc(0, 0, 3, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#7FD6FF'; circle(c, -7, -3 + ((time * 25) % 10), 2); c.fill(); circle(c, 7, -3 + ((time * 25 + 5) % 10), 2); c.fill();
    } else {
      c.beginPath(); c.arc(-5, -7, 2.5, 0.1 * Math.PI, 0.9 * Math.PI); c.moveTo(7.5, -7); c.arc(5, -7, 2.5, 0.1 * Math.PI, 0.9 * Math.PI); c.stroke();
      c.beginPath(); c.arc(0, -2, 2.5, 0.1 * Math.PI, 0.9 * Math.PI); c.stroke();
      c.fillStyle = 'rgba(255,120,150,.5)'; circle(c, -9, -3, 2.5); c.fill(); circle(c, 9, -3, 2.5); c.fill();
    }
    c.strokeStyle = OUT; c.lineWidth = 1.8;
    if (e.hp <= 3) { c.beginPath(); c.moveTo(4, -24); c.lineTo(8, -18); c.lineTo(5, -14); c.lineTo(10, -10); c.stroke(); }
    if (e.hp <= 2) { c.beginPath(); c.moveTo(-12, -14); c.lineTo(-7, -11); c.lineTo(-11, -6); c.lineTo(-6, -2); c.stroke(); }
  }
  c.restore();
  if (!e.broken && e.hitT <= 0) {
    const k = (time * 0.6) % 1;
    c.globalAlpha = 1 - k;
    txt(c, 'z', x + 14 + k * 8, y - 20 - k * 14, 10 + k * 6, '#6C7AA0');
    c.globalAlpha = 1;
  }
}

// ===== 道具图标（40 号格子里设计，按 s 缩放）=====
function drawPupIcon(c, type, x, y, s, time) {
  const P = PUPS[type];
  c.save(); c.translate(x, y);
  c.fillStyle = P.color; c.strokeStyle = OUT; c.lineWidth = 2.5; c.lineJoin = 'round';
  rr(c, -s / 2, -s / 2, s, s, s * 0.28); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2;
  rr(c, -s / 2 + 3, -s / 2 + 3, s - 6, s - 6, s * 0.22); c.stroke();
  const k = s / 40; c.scale(k, k);
  drawPupGlyph(c, type, time || 0);
  c.restore();
}
function drawPupGlyph(c, type, time) {
  c.strokeStyle = OUT; c.lineWidth = 2; c.lineCap = 'round'; c.lineJoin = 'round';
  const W = '#FFFFFF';
  switch (type) {
    case 'big':
      c.fillStyle = W; circle(c, 0, 0, 11); c.fill(); c.stroke();
      c.fillStyle = '#FFD0BF'; circle(c, -3, -3, 4); c.fill(); break;
    case 'scatter':
      c.fillStyle = W;
      for (const [px, py] of [[-9, 5], [0, -7], [9, 5]]) { circle(c, px, py, 5); c.fill(); c.stroke(); } break;
    case 'pierce':
      c.fillStyle = W;
      c.beginPath(); c.moveTo(-13, -3); c.lineTo(4, -3); c.lineTo(4, -9); c.lineTo(14, 0); c.lineTo(4, 9); c.lineTo(4, 3); c.lineTo(-13, 3); c.closePath(); c.fill(); c.stroke(); break;
    case 'ice': snowflake(c, 0, 0, 12, W, 3); break;
    case 'bomb':
      c.fillStyle = OUT; circle(c, -2, 3, 10); c.fill();
      c.fillStyle = '#7A7FA0'; circle(c, -5, 0, 3); c.fill();
      c.strokeStyle = '#E0B070'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(4, -5); c.quadraticCurveTo(8, -12, 12, -10); c.stroke();
      c.fillStyle = Math.floor(time * 10) % 2 ? '#FFE14D' : '#FF7043'; starPath(c, 12, -11, 5, 2, 5, time * 4); c.fill(); break;
    case 'shield':
      c.fillStyle = 'rgba(255,255,255,.45)'; c.strokeStyle = W; c.lineWidth = 3; circle(c, 0, 0, 12); c.fill(); c.stroke();
      c.beginPath(); c.arc(0, 0, 7, Math.PI * 1.1, Math.PI * 1.5); c.stroke(); break;
    case 'heart':
      c.fillStyle = W; heartPath(c, 0, -10, 22); c.fill(); c.stroke(); break;
    case 'speed':
      c.fillStyle = '#FFE14D'; c.save(); boltPath(c, 1.1); c.fill(); c.stroke(); c.restore(); break;
    case 'freeze':
      c.fillStyle = W; circle(c, 0, 0, 12); c.fill(); c.stroke();
      c.strokeStyle = OUT; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -8); c.moveTo(0, 0); c.lineTo(6, 3); c.stroke();
      snowflake(c, 10, -10, 5, '#B3F0FF', 2); break;
    case 'wall':
      c.fillStyle = '#CFD8DC';
      for (const [px, py] of [[-11, -11], [1, -11], [-11, 1], [1, 1]]) { c.fillRect(px, py, 10, 10); c.strokeRect(px, py, 10, 10); } break;
    case 'starbomb':
      c.fillStyle = '#FFF59D'; starPath(c, 0, 1, 14, 6, 5, Math.sin(time * 3) * 0.2); c.fill(); c.stroke(); break;
    case 'helper': drawBee(c, 1, 3, time, 1.05); break;
    case 'energy':
      c.fillStyle = W; rr(c, -8, -11, 16, 24, 4); c.fill(); c.stroke();
      c.fillRect(-3, -14, 6, 4);
      c.fillStyle = '#00C853'; c.fillRect(-5, -2, 10, 12);
      c.fillStyle = '#FFE14D'; c.save(); c.translate(0, 1); boltPath(c, 0.55); c.fill(); c.restore(); break;
    case 'life':
      c.fillStyle = W; rr(c, -11, -7, 16, 16, 4); c.fill(); c.stroke();
      c.fillRect(-5, -13, 4, 7); c.strokeRect(-5, -13, 4, 7);
      c.fillStyle = '#FFE14D'; c.fillRect(6, -2, 10, 4); c.fillRect(9, -5, 4, 10); break;
    case 'homing':
      c.strokeStyle = W; c.lineWidth = 4; c.beginPath(); c.moveTo(-12, 9); c.quadraticCurveTo(-6, -8, 8, -8); c.stroke();
      c.fillStyle = W; c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(14, -8); c.lineTo(5, -14); c.lineTo(5, -2); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#FF3B3B'; circle(c, -11, 10, 4.5); c.fill(); c.stroke(); break;
    case 'double':
      c.fillStyle = W; circle(c, -6, 0, 7); c.fill(); c.stroke(); circle(c, 7, 0, 7); c.fill(); c.stroke(); break;
    case 'rainbow':
      for (let i = 0; i < 4; i++) { c.strokeStyle = ['#FF5D5D', '#FFE14D', '#4CD964', '#3EC1F3'][i]; c.lineWidth = 3; c.beginPath(); c.arc(0, 8, 14 - i * 3.2, Math.PI, 0); c.stroke(); } break;
    case 'magnet':
      c.strokeStyle = W; c.lineWidth = 7; c.lineCap = 'butt'; c.beginPath(); c.arc(0, -2, 9, Math.PI, 0, false); c.lineTo(9, 10); c.moveTo(-9, -2); c.lineTo(-9, 10); c.stroke();
      c.fillStyle = '#B0BEC5'; c.fillRect(-12.5, 6, 7, 6); c.fillRect(5.5, 6, 7, 6); break;
    case 'mirror':
      c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.ellipse(0, 0, 10, 13, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.strokeStyle = '#80DEEA'; c.lineWidth = 2; c.beginPath(); c.moveTo(-4, -6); c.lineTo(3, -9); c.moveTo(-5, 0); c.lineTo(5, -4); c.stroke(); break;
    case 'bubble':
      c.fillStyle = 'rgba(255,255,255,.5)'; c.strokeStyle = W; c.lineWidth = 2.5; circle(c, 0, 0, 12); c.fill(); c.stroke();
      c.fillStyle = W; circle(c, -4, -5, 3); c.fill(); circle(c, 9, 9, 3); c.stroke(); break;
    case 'clone':
      c.fillStyle = 'rgba(255,255,255,.5)'; circle(c, 5, 2, 9); c.fill(); c.fillStyle = W; circle(c, -4, -2, 9); c.fill(); c.stroke();
      c.fillStyle = OUT; circle(c, -7, -3, 1.6); c.fill(); circle(c, -1, -3, 1.6); c.fill(); break;
    case 'turret':
      c.fillStyle = W; rr(c, -11, 0, 22, 10, 3); c.fill(); c.stroke(); circle(c, 0, 0, 7); c.fill(); c.stroke(); c.fillRect(-2, -14, 4, 10); c.strokeRect(-2, -14, 4, 10); break;
    case 'rocket':
      c.fillStyle = W; c.beginPath(); c.moveTo(0, -14); c.quadraticCurveTo(8, -4, 6, 8); c.lineTo(-6, 8); c.quadraticCurveTo(-8, -4, 0, -14); c.fill(); c.stroke();
      c.fillStyle = '#FFE14D'; c.beginPath(); c.moveTo(-4, 9); c.lineTo(0, 16); c.lineTo(4, 9); c.fill(); c.fillStyle = '#7FD6FF'; circle(c, 0, -3, 3); c.fill(); break;
    case 'firefly':
      c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(-6, -6, 5, 7, -0.6, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(6, -6, 5, 7, 0.6, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#FFFF8A'; c.shadowColor = '#FFFF8A'; c.shadowBlur = 10; circle(c, 0, 4, 7); c.fill(); c.shadowBlur = 0; c.stroke(); break;
  }
}

// ===== 特效 =====
function drawParts(c) {
  for (const p of G.parts) {
    const a = clamp(1 - p.t / p.life, 0, 1);
    c.globalAlpha = p.type === 'conf' ? clamp((p.life - p.t) * 2, 0, 1) : a;
    c.fillStyle = p.color;
    switch (p.type) {
      case 'circ': circle(c, p.x, p.y, Math.max(0.1, p.size)); c.fill(); break;
      case 'ring': c.strokeStyle = p.color; c.lineWidth = 4 * a + 0.5; circle(c, p.x, p.y, Math.max(0.1, p.size)); c.stroke(); break;
      case 'star': starPath(c, p.x, p.y, p.size, p.size * 0.45, 5, p.rot); c.fill(); break;
      case 'sq': c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); c.restore(); break;
      case 'conf': c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(1, Math.cos(p.t * 8)); c.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6); c.restore(); break;
      case 'snow': snowflake(c, p.x, p.y, p.size, p.color, 1.5); break;
    }
  }
  c.globalAlpha = 1;
}
const FLOWER_COLS = ['#FF7AB6', '#FFD23F', '#7FD6FF', '#C59BFF', '#FF9A5C', '#FFFFFF'];
function drawFlower(c, f) {
  const k = f.t / f.life;
  const hop = Math.abs(Math.sin(f.t * 9)) * 12 * (1 - k);
  const sc = (f.t < 0.15 ? f.t / 0.15 : 1) * (f.scale || 1);
  c.save();
  c.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
  c.translate(f.x, f.y - hop); c.scale(sc, sc); c.rotate(Math.sin(f.t * 6) * 0.3);
  c.strokeStyle = OUT; c.lineWidth = 1.5;
  if (f.heart) { c.fillStyle = f.color; heartPath(c, 0, -8, 18); c.fill(); c.stroke(); c.restore(); return; }
  c.fillStyle = '#4CAF50'; c.beginPath(); c.ellipse(6, 10, 6, 3, 0.5, 0, Math.PI * 2); c.fill(); c.stroke();
  c.fillStyle = f.color;
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    circle(c, Math.cos(a) * 7, Math.sin(a) * 7, 6); c.fill(); c.stroke();
  }
  c.fillStyle = '#FFD23F'; circle(c, 0, 0, 5.5); c.fill(); c.stroke();
  c.fillStyle = OUT; circle(c, -2, -1, 1); c.fill(); circle(c, 2, -1, 1); c.fill();
  c.beginPath(); c.arc(0, 1, 2, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke();
  c.restore();
}

function drawBullet(c, b, time) {
  if (b.kind === 'giant') {
    c.fillStyle = 'rgba(255,120,60,.3)'; circle(c, b.x, b.y, b.r + 8); c.fill();
  }
  const tail = 0.025;
  c.globalAlpha = 0.35; c.fillStyle = b.color;
  circle(c, b.x - b.vx * tail, b.y - b.vy * tail, b.r * 0.75); c.fill();
  c.globalAlpha = 1;
  c.strokeStyle = OUT; c.lineWidth = 2;
  if (b.kind === 'bomb') {
    c.fillStyle = OUT; circle(c, b.x, b.y, b.r); c.fill();
    c.fillStyle = Math.floor(time * 14) % 2 ? '#FFE14D' : '#FF5A5F'; circle(c, b.x, b.y - b.r, 3.5); c.fill();
    c.fillStyle = b.player ? '#B994FF' : '#FF8A8A'; circle(c, b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.3); c.fill();
    return;
  }
  if (b.kind === 'snowball') { c.fillStyle = '#FFFFFF'; circle(c, b.x, b.y, b.r); c.fill(); c.stroke(); c.fillStyle = '#DDF0FF'; circle(c, b.x + 4, b.y + 4, b.r * 0.5); c.fill(); for (let i = 0; i < 3 - (b.hp || 1); i++) { c.strokeStyle = '#9CC3E0'; c.beginPath(); c.moveTo(b.x - 8 + i * 6, b.y - 8); c.lineTo(b.x - 4 + i * 6, b.y); c.stroke(); } return; }
  if (b.kind === 'bubbleT') { c.fillStyle = 'rgba(190,240,255,.4)'; c.strokeStyle = '#FFFFFF'; circle(c, b.x, b.y, b.r + Math.sin(time * 8) * 1.5); c.fill(); c.stroke(); c.fillStyle = '#FFFFFF'; circle(c, b.x - 5, b.y - 6, 3); c.fill(); return; }
  if (b.kind === 'torpedo' || b.kind === 'missile') {
    c.save(); c.translate(b.x, b.y); c.rotate(Math.atan2(b.vy, b.vx));
    drawFlameLick(c, -b.r * 1.6, 0, 6, time);
    c.fillStyle = b.kind === 'missile' ? '#FF8A3D' : '#9AA5B8'; rr(c, -b.r * 1.3, -b.r * 0.6, b.r * 2.6, b.r * 1.2, b.r * 0.6); c.fill(); c.stroke();
    c.fillStyle = '#FFFFFF'; circle(c, b.r * 0.6, 0, b.r * 0.3); c.fill();
    c.restore(); return;
  }
  c.fillStyle = b.kind === 'rainbow' ? `hsl(${(time * 600 + b.x) % 360},95%,62%)` : b.color;
  if (b.kind === 'ice') { circle(c, b.x, b.y, b.r); c.fill(); c.stroke(); snowflake(c, b.x, b.y, b.r * 0.7, '#FFFFFF', 1.5); return; }
  if (b.player && (b.kind === 'normal' || b.kind === 'scatter')) {
    starPath(c, b.x, b.y, b.r + 2, b.r * 0.6, 5, time * 10); c.fill(); c.stroke(); return;
  }
  circle(c, b.x, b.y, b.r); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.7)'; circle(c, b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.35); c.fill();
}

// ===== HUD 顶栏 =====
function drawMiniRobot(c, x, y, color) {
  c.fillStyle = color; c.strokeStyle = OUT; c.lineWidth = 2;
  rr(c, x - 10, y - 8, 20, 17, 5); c.fill(); c.stroke();
  c.fillStyle = '#2E3550'; rr(c, x - 7, y - 5, 14, 7, 3); c.fill();
  c.fillStyle = '#FF4D6D'; c.fillRect(x - 5, y - 3, 3, 3); c.fillRect(x + 2, y - 3, 3, 3);
  c.beginPath(); c.moveTo(x, y - 8); c.lineTo(x, y - 13); c.stroke();
}
function drawMiniTank(c, x, y, sty) {
  c.fillStyle = '#3A4152'; c.strokeStyle = OUT; c.lineWidth = 1.5;
  rr(c, x - 9, y - 7, 18, 14, 4); c.fill(); c.stroke();
  c.fillStyle = sty.body; circle(c, x, y, 6); c.fill(); c.stroke();
  c.fillStyle = sty.dark; c.fillRect(x - 1.5, y - 12, 3, 7);
}
function drawPlayerPanel(c, p, x0, time, twoP) {
  const sty = PLAYER_TANKS[p.tankIdx];
  const nH = Math.ceil(p.maxHp / 2), small = nH > 5;
  const hs = small ? 16 : 20, gap = small ? 19 : 23;
  for (let i = 0; i < nH; i++) {
    const x = x0 + 18 + i * gap, y = small ? 10 : 8;
    const v = clamp(Math.max(0, p.hp) - i * 2, 0, 2);
    c.strokeStyle = OUT; c.lineWidth = 2;
    c.fillStyle = '#E3E8EF'; heartPath(c, x, y, hs); c.fill();
    if (v > 0) {
      c.save(); heartPath(c, x, y, hs); c.clip();
      c.fillStyle = '#FF4D6D'; c.fillRect(x - hs / 2, y, v === 2 ? hs : hs / 2, hs);
      c.restore();
    }
    heartPath(c, x, y, hs); c.stroke();
  }
  drawMiniTank(c, x0 + 20, 44, sty);
  txt(c, '×' + Math.max(0, p.lives), x0 + 34, 45, 17, OUT, 'left');
  if (twoP) {
    c.fillStyle = p.pid ? '#3EC1F3' : '#FF8A3D'; rr(c, x0 + 72, 35, 32, 20, 8); c.fill();
    txt(c, p.pid ? '2P' : '1P', x0 + 88, 45.5, 13, '#FFFFFF');
  }
  const wx = x0 + 160;
  if (p.weapon === 'normal') {
    c.fillStyle = '#EEF2F7'; c.strokeStyle = OUT; c.lineWidth = 2.5; rr(c, wx - 18, 12, 36, 36, 10); c.fill(); c.stroke();
    c.fillStyle = '#FFE14D'; starPath(c, wx, 30, 10, 5, 5, 0); c.fill(); c.stroke();
  } else {
    drawPupIcon(c, p.weapon, wx, 30, 36, time);
    const k = clamp(p.weaponT / 20, 0, 1);
    c.fillStyle = '#E3E8EF'; c.fillRect(wx - 18, 51, 36, 5);
    c.fillStyle = PUPS[p.weapon].color; c.fillRect(wx - 18, 51, 36 * k, 5);
  }
  const sx = x0 + 206, ready = p.energy >= 1;
  c.save();
  if (ready) { const sc = 1 + Math.sin(time * 8) * 0.07; c.translate(sx, 30); c.scale(sc, sc); c.translate(-sx, -30); }
  drawPupIcon(c, sty.skillIcon || sty.skill, sx, 30, 38, time);
  if (!ready) {
    c.fillStyle = 'rgba(40,50,70,.55)';
    rr(c, sx - 19, 11, 38, 38 * (1 - p.energy), 8); c.fill();
  } else {
    c.strokeStyle = `hsl(${(time * 400) % 360},100%,60%)`; c.lineWidth = 3; rr(c, sx - 22, 8, 44, 44, 12); c.stroke();
  }
  c.restore();
  c.fillStyle = OUT; circle(c, sx + 17, 13, 9); c.fill();
  txt(c, twoP && p.pid ? '⇧' : 'K', sx + 17, 13.5, 12, '#FFFFFF');
}
function drawHUD(c, time) {
  const g = G, twoP = g.players.length > 1;
  c.fillStyle = 'rgba(255,255,255,.95)'; c.fillRect(0, 0, VIEW_W, HUD_H);
  c.fillStyle = 'rgba(0,0,0,.07)'; c.fillRect(0, HUD_H - 3, VIEW_W, 3);
  drawPlayerPanel(c, g.players[0], 0, time, twoP);
  if (twoP) drawPlayerPanel(c, g.players[1], 372, time, true);
  // 宝宝蛋
  const ex = twoP ? 244 : 262;
  c.fillStyle = '#FFF7E6'; c.strokeStyle = OUT; c.lineWidth = 2;
  c.beginPath(); c.ellipse(ex, 27, 10, 13, 0, 0, Math.PI * 2); c.fill(); c.stroke();
  const n = g.egg.maxHp, step = Math.min(8, 40 / Math.max(1, n - 1));
  for (let i = 0; i < n; i++) { c.fillStyle = i < g.egg.hp ? '#5BE37D' : '#E3E8EF'; circle(c, ex - (step * (n - 1)) / 2 + i * step, 50, 3); c.fill(); c.stroke(); }
  // 剩余敌人 / 玩法进度
  const enx = twoP ? 282 : 310, fs = twoP ? 15 : 18;
  const prog = modeProgress(g);
  if (prog) {
    txt(c, prog[0], enx - 2, 31, fs, OUT, 'center');
    txt(c, prog[1], enx + 12, 32, fs, prog[2] || OUT, 'left');
  } else if (g.L.boss && (g.bossOn || !g.preWave)) {
    const w = twoP ? 44 : 60;
    c.fillStyle = '#FF4D6D'; c.strokeStyle = OUT; c.lineWidth = 2; rr(c, enx - 14, 17, w, 26, 10); c.fill(); c.stroke();
    txt(c, 'BOSS', enx - 14 + w / 2, 30.5, twoP ? 12 : 15, '#FFFFFF');
  } else {
    drawMiniRobot(c, enx, 32, '#A9F07E');
    txt(c, '×' + Math.max(0, g.total - g.killed), enx + 16, 32, fs, OUT, 'left');
  }
  // 金币
  const cx = twoP ? 340 : 390;
  drawCoin(c, cx, 30, 0, 9);
  txt(c, String(g.coinsGot), cx + 12, 31, twoP ? 14 : 17, '#C98A00', 'left');
  if (twoP) return;
  const p = g.players[0], st = [];
  if (p.shieldT > 0) st.push(['shield', p.shieldT / 10]);
  if (p.speedT > 0) st.push(['speed', p.speedT / 12]);
  if (p.helperT > 0) st.push(['helper', p.helperT / 15]);
  if (p.magnetT > 0) st.push(['magnet', p.magnetT / 12]);
  if (p.mirrorT > 0) st.push(['mirror', p.mirrorT / 8]);
  if (p.cloneT > 0) st.push(['clone', p.cloneT / 12]);
  if (g.lightT > 0) st.push(['firefly', g.lightT / 8]);
  if (g.freezeT > 0) st.push(['freeze', g.freezeT / 6]);
  if (g.wallT > 0 && !g.wallForever) st.push(['wall', g.wallT / 15]);
  st.slice(0, 4).forEach(([type, k], i) => {
    const x = 456 + i * 34;
    drawPupIcon(c, type, x, 26, 28, time);
    c.fillStyle = '#E3E8EF'; c.fillRect(x - 14, 44, 28, 4);
    c.fillStyle = PUPS[type].color; c.fillRect(x - 14, 44, 28 * clamp(k, 0, 1), 4);
  });
}

function modeProgress(g) {
  switch (g.mode) {
    case 'collect': return ['⭐', g.collected + '/' + g.gems.length];
    case 'survive': { const s = Math.max(0, Math.ceil(g.surviveT)); return ['⏱️', Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'), s <= 10 ? '#FF3B3B' : OUT]; }
    case 'push': return ['📦', g.pads.filter(p => p.done).length + '/' + g.pads.length];
    case 'rescue': return ['🔓', g.cages.filter(k => k.open).length + '/' + g.cages.length];
    case 'gold': return ['💰', (g.goldCaught || 0) + '/' + g.L.golds];
  }
  return null;
}
const MODE_GOAL = {
  collect: L => '⭐ 捡齐 ' + L.goal + ' 颗星星', survive: L => '⏱️ 坚持 ' + L.goal + ' 秒', push: L => '📦 把 ' + L.goal + ' 个箱子推到垫子上',
  rescue: L => '🔓 救出 ' + L.goal + ' 个小伙伴', gold: L => '💰 抓金宝宝',
};
// ===== 整个游戏画面 =====
function renderGame(c, time) {
  const g = G, twoP = g.players.length > 1;
  drawHUD(c, time);
  c.save();
  c.beginPath(); c.rect(0, HUD_H, MAP_W, MAP_H); c.clip();
  let sx = 0, sy = 0;
  if (g.shake > 0) { sx = rand(-1, 1) * g.shake; sy = rand(-1, 1) * g.shake; }
  c.translate(sx, HUD_H + sy);
  c.drawImage(getGround(g.theme), 0, 0, MAP_W, MAP_H);
  drawTiles(c, time);
  drawWorldUnder(c, time);
  for (const P of g.portals) drawPortal(c, P, time);
  for (const s of g.springs) drawSpring(c, s, time);
  drawEgg(c, g.egg, time);
  for (const u of g.pups) {
    if (u.life - u.t < 3 && Math.floor(time * 8) % 2 === 0) continue;
    const bob = Math.sin(time * 4 + u.x) * 3;
    c.fillStyle = 'rgba(0,0,0,.15)'; c.beginPath(); c.ellipse(u.x, u.y + 18, 14, 4, 0, 0, Math.PI * 2); c.fill();
    c.save(); c.globalAlpha = 0.5 + 0.3 * Math.sin(time * 6);
    c.fillStyle = '#FFFFFF'; circle(c, u.x, u.y + bob, 26); c.fill(); c.restore();
    drawPupIcon(c, u.type, u.x, u.y + bob, 36, time);
  }
  for (const k of g.crates) drawCrate(c, k);
  for (const k of g.cages) if (!k.open) drawCage(c, k, time);
  for (const u of g.turrets) drawTurret(c, u, time);
  drawBlocks(c, time);
  for (const e of g.tanks) if (e.type === 'boss' && !e.dead) drawBossExtras(c, e, time);
  for (const s of g.spawns) {
    if (s.t < 0) continue;
    const k = s.t / 0.9, big = s.boss ? 2.2 : 1;
    c.fillStyle = s.boss ? '#FF4D6D' : s.gold ? '#FFD23F' : '#FFFFFF'; c.strokeStyle = '#FFE14D'; c.lineWidth = 3;
    starPath(c, s.x, s.y, (10 + Math.sin(k * Math.PI) * 14) * big, 6 * big, 5, s.t * 8); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.8)'; circle(c, s.x, s.y, (1 - k) * 30 * big); c.stroke();
  }
  const env = { won: g.phase === 'won', lost: g.phase === 'lost', twoP };
  for (const t of g.tanks) if (!t.dead && !t.jump) drawTank(c, t, time, env);
  for (const b of g.bullets) drawBullet(c, b, time);
  drawHazards(c, time);
  for (const k of g.coins) drawCoin(c, k.x, k.y, time + k.x, 8);
  for (const w of g.waves) {
    c.strokeStyle = w.ice ? 'rgba(160,235,255,.9)' : 'rgba(255,180,80,.9)'; c.lineWidth = 10 * (1 - w.r / w.max) + 3;
    circle(c, w.x, w.y, w.r); c.stroke();
    if (w.ice) { c.fillStyle = 'rgba(180,240,255,.15)'; c.fill(); }
  }
  for (const bm of g.beams) {
    const a = 1 - bm.t / 0.4;
    c.globalAlpha = clamp(a, 0, 1); c.lineCap = 'round';
    c.strokeStyle = '#FFE14D'; c.lineWidth = bm.w; c.beginPath(); c.moveTo(bm.x0, bm.y0); c.lineTo(bm.x1, bm.y1); c.stroke();
    c.strokeStyle = '#FFFFFF'; c.lineWidth = bm.w * 0.4; c.stroke();
    c.globalAlpha = 1;
  }
  drawGrass(c, time);
  // 星星画在草丛上面，不会被挡住
  for (const s of g.gems) if (!s.got) drawGem(c, s.x, s.y + Math.sin(time * 3 + s.x) * 3, WORLDS[g.world].gem, time);
  for (const t of g.tanks) if (!t.dead && t.jump) drawTank(c, t, time, env);
  for (const f of g.flowers) drawFlower(c, f);
  drawParts(c);
  drawNight(c, time);
  drawFindHint(c, g, time);
  if (g.mode === 'survive' && g.phase === 'play') {
    const s = Math.max(0, Math.ceil(g.surviveT)), hot = s <= 10;
    c.save(); c.globalAlpha = 0.85; c.translate(MAP_W / 2, 30); if (hot) { const k = 1 + 0.12 * Math.abs(Math.sin(time * 6)); c.scale(k, k); }
    txt(c, '⏱ ' + s, 0, 0, hot ? 34 : 26, hot ? '#FF3B3B' : '#FFFFFF', 'center', OUT); c.restore();
  }
  for (const t of g.texts) {
    c.globalAlpha = clamp(1 - t.t / t.life, 0, 1);
    txt(c, t.s, t.x, t.y - t.t * 30, t.size, t.color, 'center', OUT);
  }
  c.globalAlpha = 1;
  for (const f of g.pickFx) {
    c.globalAlpha = clamp(1 - f.t, 0, 1);
    drawPupIcon(c, f.type, f.x, f.y - 30 - f.t * 40, 36 * (1 + f.t * 0.6), time);
    txt(c, PUPS[f.type].name, f.x, f.y - 62 - f.t * 40, 16, '#FFFFFF', 'center', OUT);
  }
  c.globalAlpha = 1;
  if (g.freezeT > 0) { c.fillStyle = 'rgba(150,220,255,.12)'; c.fillRect(0, 0, MAP_W, MAP_H); }
  if (g.flash > 0) { c.fillStyle = `rgba(255,255,255,${g.flash * 2})`; c.fillRect(0, 0, MAP_W, MAP_H); }
  // 指示箭头：你 / 宝宝蛋
  if (!g.tut && (g.phase === 'intro' || (g.phase === 'play' && g.t < (g.L.boss ? 6 : 4.5)))) {
    const bob = Math.abs(Math.sin(time * 5)) * 8;
    for (const p of g.players) if (!p.dead) arrowTag(c, p.x, p.y - 34 - bob, p.pid ? '#3EC1F3' : '#FFC93C', twoP ? (p.pid ? '2P' : '1P') : '这是你');
    arrowTag(c, g.egg.x, g.egg.y - 32 - bob, '#FF7AB6', '保护宝宝蛋');
  }
  // Boss 血条
  const bosses = g.tanks.filter(e => e.type === 'boss' && !e.dead && !e.bd.fake);
  if (bosses.length) {
    const e = g.boss && !g.boss.dead ? g.boss : bosses[0], w = 380, x = MAP_W / 2 - w / 2, y = 10;
    c.save(); if (bosses.some(b => b.y - b.size / 2 < 44)) c.globalAlpha = 0.45;
    c.fillStyle = 'rgba(38,50,74,.85)'; rr(c, x - 6, y - 4, w + 12, 30, 12); c.fill();
    c.fillStyle = '#3B4766'; rr(c, x, y + 10, w, 12, 6); c.fill();
    // 分裂出来的小家伙也一起算
    const pool = b => b.bd.split ? b.bd.split.n * bossTreeHp(b.bd.split.into) * b.hpMul * (1 - 0.15 * g.assist) * g.diff.boss : 0;
    const cur = bosses.reduce((sum, b) => sum + Math.max(0, b.hp) + pool(b), 0);
    const k = clamp(g.bossTotal ? cur / g.bossTotal : e.hp / e.maxHp, 0, 1);
    c.fillStyle = bosses.some(b => b.angry) ? '#FF3B3B' : '#FF7A59'; rr(c, x, y + 10, Math.max(6, w * k), 12, 6); c.fill();
    if (e.bd.phases) { c.fillStyle = '#FFFFFF'; for (let i = 1; i < e.bd.phases.length; i++) c.fillRect(x + (w * i) / e.bd.phases.length, y + 10, 2, 12); }
    const names = g.bossKeys.map(kk => BOSSES[kk].name).join(' & ');
    txt(c, BOSS_KIND_NAME[BOSSES[g.bossKeys[0]] ? BOSSES[g.bossKeys[0]].kind : e.bd.kind] + ' · ' + names, MAP_W / 2, y + 3, 13, '#FFFFFF');
    c.restore();
  }
  if (g.phase === 'intro' || g.phase === 'bossIntro') {
    if (g.phase === 'bossIntro' || (g.L.boss && !g.preWave)) drawBossIntro(c, g, time);
    else {
      const k = g.phaseT;
      const sc = easeOutBack(clamp(k * 2.5, 0, 1)) * (k > 1.75 ? Math.max(0, 1 - (k - 1.75) * 4) : 1);
      c.save(); c.translate(MAP_W / 2, MAP_H / 2 - 30); c.scale(sc, sc);
      c.fillStyle = g.L.tutorial ? '#3DD68C' : g.L.custom ? '#A97CFF' : '#FF8A3D'; c.strokeStyle = '#FFFFFF'; c.lineWidth = 6;
      rr(c, -190, -62, 380, 124, 32); c.fill(); c.stroke();
      const title = g.L.tutorial ? '新手教学' : g.L.custom ? '我的关卡' : '第 ' + (g.li + 1) + ' 关';
      txt(c, title, 0, -22, 46, '#FFFFFF', 'center', 'rgba(0,0,0,.15)');
      txt(c, g.L.tutorial ? '跟着提示一步一步来' : g.L.custom ? '自己设计的关卡' : g.L.name + ' · ' + g.diff.emoji + ' ' + g.diff.name, 0, 30, 22, '#FFFFFF');
      const goal = MODE_GOAL[g.mode] ? MODE_GOAL[g.mode](g.L) : g.preWave ? '😈 打完小兵，小 Boss 就要来啦' : '';
      if (goal) { c.fillStyle = '#FFFFFF'; rr(c, -170, 74, 340, 40, 20); c.fill(); txt(c, goal + (g.L.night ? ' · 🌙 夜晚' : ''), 0, 94, 19, '#FF8A3D'); }
      c.restore();
    }
  }
  if (g.tut) drawTutorial(c, time);
  c.restore();
}

// Boss 登场：黑屏 + 警告条 + 大头像
function drawBossIntro(c, g, time) {
  const k = g.phaseT, keys = g.bossKeys, bd = BOSSES[keys[0]];
  const fade = k > 3.1 ? Math.max(0, 1 - (k - 3.1) / 0.5) : 1;
  c.save(); c.globalAlpha = fade;
  c.fillStyle = `rgba(12,10,30,${Math.min(0.8, k * 1.6)})`; c.fillRect(-20, -20, MAP_W + 40, MAP_H + 40);
  for (const [y, dirn] of [[60, 1], [MAP_H - 60, -1]]) {
    c.save(); c.beginPath(); c.rect(0, y - 18, MAP_W, 36); c.clip();
    c.fillStyle = '#FFD23F'; c.fillRect(0, y - 18, MAP_W, 36);
    c.fillStyle = OUT;
    const off = ((time * 90 * dirn) % 40 + 40) % 40;
    for (let x = -80 + off; x < MAP_W + 80; x += 40) { c.beginPath(); c.moveTo(x, y - 18); c.lineTo(x + 20, y - 18); c.lineTo(x, y + 18); c.lineTo(x - 20, y + 18); c.closePath(); c.fill(); }
    c.restore();
    c.fillStyle = '#FF3B3B'; rr(c, MAP_W / 2 - 120, y - 15, 240, 30, 10); c.fill();
    txt(c, '⚠ 危险！Boss 来了 ⚠', MAP_W / 2, y, 17, '#FFFFFF');
  }
  const sIn = easeOutBack(clamp((k - 0.3) * 1.8, 0, 1));
  const bx = MAP_W + 180 - (MAP_W + 180 - MAP_W * 0.7) * sIn, by = MAP_H / 2 + 8;
  keys.forEach((key, i) => {
    const b = BOSSES[key];
    const fake = { bd: b, key, size: b.size, aim: Math.PI * 0.8 + Math.sin(time * 2) * 0.2, dir: 3, dist: time * 30, recoil: 0, flashT: 0, frozenT: 0, invisT: 0, teleT: 0, dashWarn: 0, angry: k > 1.6, x: 0, y: 0, guardKind: '', popWarn: 0, weakT: 0, shieldOffT: 0, stunT: 0, clawWarn: 0, windT: 0 };
    const off = keys.length > 1 ? (i ? 70 : -70) : 0;
    c.save(); c.translate(bx + off * 0.6, by + off); const sc = (keys.length > 1 ? 150 : 210) / b.size; c.scale(sc, sc); drawBoss(c, fake, time, {}); c.restore();
  });
  const tIn = easeOutBack(clamp((k - 0.6) * 1.8, 0, 1));
  const nx = -260 + (MAP_W * 0.3 + 260) * tIn;
  txt(c, keys.length > 1 ? '双子 Boss' : BOSS_KIND_NAME[bd.kind], nx, MAP_H / 2 - 44, 24, '#FFD23F', 'center', OUT);
  txt(c, keys.map(kk => BOSSES[kk].name).join(' & '), nx, MAP_H / 2 + 8, keys.length > 1 ? 34 : 48, '#FFFFFF', 'center', '#FF3B3B');
  txt(c, '第 ' + (g.li + 1) + ' 关', nx, MAP_H / 2 + 56, 18, '#C9D3FF');
  c.restore();
}
function arrowTag(c, x, y, color, label) {
  c.fillStyle = color; c.strokeStyle = OUT; c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(x - 9, y - 10); c.lineTo(x + 9, y - 10); c.lineTo(x, y); c.closePath(); c.fill(); c.stroke();
  txt(c, label, x, y - 22, 14, '#FFFFFF', 'center', OUT);
}
