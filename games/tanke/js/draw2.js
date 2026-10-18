'use strict';
// ===== 100 关新增的绘制：地形机关、玩法物件、危险提示、新敌人、新 Boss =====

// ----- 地面装饰（新世界）-----
function groundDeco(c, theme, R, x, y, th) {
  switch (theme) {
    case 'ocean':
      if (R() < 0.3) { c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1.5; circle(c, x, y, 2 + R() * 3); c.stroke(); }
      else { c.fillStyle = pickR(R, ['#FFD1DC', '#FFF3C4', '#E0F2FF']); c.beginPath(); c.arc(x, y, 4, Math.PI, 0); c.closePath(); c.fill(); }
      break;
    case 'forest':
      if (R() < 0.25) { c.fillStyle = '#FF6B6B'; c.beginPath(); c.arc(x, y, 4, Math.PI, 0); c.fill(); c.fillStyle = '#FFF3E0'; c.fillRect(x - 1.2, y, 2.4, 4); c.fillStyle = '#FFFFFF'; circle(c, x - 1.5, y - 2, 0.9); c.fill(); }
      else { c.fillStyle = th.deco; c.save(); c.translate(x, y); c.rotate(R() * 6); c.beginPath(); c.ellipse(0, 0, 4, 2, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
      break;
    case 'volcano':
      if (R() < 0.4) { c.fillStyle = th.deco; circle(c, x, y, 1.5 + R() * 2.5); c.fill(); }
      else { c.strokeStyle = 'rgba(160,80,50,.35)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x - 6, y); c.lineTo(x - 1, y + 3); c.lineTo(x + 5, y - 1); c.stroke(); }
      break;
    case 'factory':
      if (R() < 0.3) { c.fillStyle = '#AEB6C6'; circle(c, x, y, 2.5); c.fill(); c.strokeStyle = '#8A93A6'; c.lineWidth = 1; c.beginPath(); c.moveTo(x - 1.5, y); c.lineTo(x + 1.5, y); c.stroke(); }
      else if (R() < 0.5) { c.fillStyle = pickR(R, ['#FF7B6B', '#FFC93C', '#7FD6FF', '#8EF0A0']); c.fillRect(x - 2, y - 2, 4, 4); }
      break;
    case 'space':
      c.fillStyle = R() < 0.3 ? '#FFE88A' : 'rgba(255,255,255,.75)';
      if (R() < 0.15) { starPath(c, x, y, 3.5, 1.4, 4, 0); c.fill(); } else { circle(c, x, y, 0.8 + R() * 1.2); c.fill(); }
      break;
    case 'castle':
      if (R() < 0.2) { c.fillStyle = '#C77BDB'; circle(c, x, y, 2.5); c.fill(); }
      else { c.strokeStyle = 'rgba(120,100,160,.25)'; c.lineWidth = 1.5; c.strokeRect(x - 6, y - 4, 12, 8); }
      break;
  }
}

// ----- 新格子（24px 一格）-----
function drawCellNew(c, g, v, x, y, px, py, time) {
  const th = THEMES[g.theme];
  switch (v) {
    case SAND: {
      c.fillStyle = '#EBCB86'; c.fillRect(px, py, C, C);
      c.strokeStyle = '#D2AA5E'; c.lineWidth = 1.5;
      const o = Math.sin(time * 1.2 + x + y * 0.7) * 2;
      c.beginPath(); c.arc(px + 12 + o, py + 12, 6, 0.3, 4.2); c.stroke();
      c.fillStyle = '#F7E2A6'; circle(c, px + 5, py + 18, 1.5); c.fill();
      return true;
    }
    case JELLY: {
      const w = Math.sin(time * 5 + x * 0.8 + y) * 1.2;
      c.fillStyle = '#FF8CD0'; rr(c, px + 1 - w * 0.3, py + 1 + w * 0.3, C - 2 + w * 0.6, C - 2 - w * 0.6, 7); c.fill();
      c.fillStyle = 'rgba(255,255,255,.55)'; rr(c, px + 4, py + 4, 8, 5, 3); c.fill();
      c.strokeStyle = '#D9489A'; c.lineWidth = 1.5; rr(c, px + 1, py + 1, C - 2, C - 2, 7); c.stroke();
      return true;
    }
    case FLOW: {
      const d = g.flow[y * GW + x], belt = g.theme === 'factory';
      c.fillStyle = belt ? '#7A8396' : 'rgba(70,170,240,.32)'; c.fillRect(px, py, C, C);
      if (belt) { c.fillStyle = '#5E6779'; for (let i = 0; i < 2; i++) c.fillRect(px + (DY[d] ? 0 : i * 12), py + (DY[d] ? i * 12 : 0), DY[d] ? C : 2, DY[d] ? 2 : C); }
      const k = ((time * (belt ? 1.6 : 1)) % 1) * C;
      c.save(); c.beginPath(); c.rect(px, py, C, C); c.clip();
      c.translate(px + 12, py + 12); c.rotate(dirAngle(d) + Math.PI / 2);
      c.strokeStyle = belt ? '#FFD23F' : 'rgba(255,255,255,.85)'; c.lineWidth = belt ? 3 : 2.5; c.lineCap = 'round';
      for (const off of [-C, 0]) { c.beginPath(); c.moveTo(-6, off + k + 3); c.lineTo(0, off + k - 3); c.lineTo(6, off + k + 3); c.stroke(); }
      c.restore();
      return true;
    }
    case VINE: {
      c.fillStyle = '#3B8A46'; c.fillRect(px, py, C, C);
      c.fillStyle = '#5DBB5A';
      for (const [a, b] of [[6, 6], [17, 7], [9, 16], [19, 18]]) { c.beginPath(); c.ellipse(px + a, py + b, 5, 3.5, (a + b) * 0.3, 0, Math.PI * 2); c.fill(); }
      c.strokeStyle = '#2A6A34'; c.lineWidth = 2; c.beginPath(); c.moveTo(px + 2, py + 22); c.quadraticCurveTo(px + 12, py + 10, px + 22, py + 2); c.stroke();
      if ((x * 7 + y * 3) % 5 === 0) { c.fillStyle = '#FFE14D'; circle(c, px + 15, py + 12, 2.2); c.fill(); }
      return true;
    }
    case LAVA: {
      c.fillStyle = LAVA_COL[0]; c.fillRect(px, py, C, C);
      const k = (time * 0.8 + (x * 13 + y * 7) * 0.13) % 1;
      c.fillStyle = LAVA_COL[1]; c.globalAlpha = 1 - k; circle(c, px + 8 + (x % 3) * 4, py + 14 - k * 6, 2 + k * 3); c.fill(); c.globalAlpha = 1;
      c.fillStyle = 'rgba(255,240,180,.5)'; c.fillRect(px + 2, py + 4 + Math.sin(time * 2 + x) * 2, 10, 2);
      return true;
    }
    case BLINK: case BLINK_OFF: {
      const grp = (Math.floor(x / 2) + Math.floor(y / 2)) % 2, ph = g.t % 8;
      const toOn = grp === 0 ? 8 - ph : (ph < 4 ? 4 - ph : 12 - ph);
      if (v === BLINK) {
        const toOff = grp === 0 ? (ph < 4 ? 4 - ph : 0) : (ph >= 4 ? 8 - ph : 0);
        c.globalAlpha = toOff < 0.8 && Math.floor(time * 10) % 2 ? 0.55 : 1;
        c.fillStyle = '#6E54B8'; c.fillRect(px, py, C, C);
        c.fillStyle = '#9C86E8'; c.fillRect(px + 2, py + 2, 20, 20);
        c.fillStyle = '#FFE14D'; starPath(c, px + 12, py + 12, 5, 2.2, 4, 0); c.fill();
        c.globalAlpha = 1;
      } else {
        c.strokeStyle = 'rgba(110,84,184,.5)'; c.lineWidth = 1.5; c.setLineDash([3, 3]); c.strokeRect(px + 2, py + 2, 20, 20); c.setLineDash([]);
        if (toOn < 1 && Math.floor(time * 10) % 2) { c.fillStyle = 'rgba(110,84,184,.4)'; c.fillRect(px, py, C, C); }
      }
      return true;
    }
    case GATE_OPEN: {
      c.fillStyle = 'rgba(255,210,63,.25)'; c.fillRect(px, py, C, C);
      return true;
    }
  }
  return false;
}

// ----- 地面上的机关（在坦克下面画）-----
function drawWorldUnder(c, time) {
  const g = G;
  for (const s of g.slows) {
    const a = clamp((s.life - s.t) * 2, 0, 1) * 0.8;
    c.globalAlpha = a;
    c.fillStyle = { cream: '#FFF0F6', spore: '#C9F59E', honey: '#FFC93C' }[s.kind] || '#FFFFFF';
    c.beginPath(); c.ellipse(s.x, s.y, s.r, s.r * 0.8, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,.5)'; circle(c, s.x - s.r * 0.3, s.y - s.r * 0.2, s.r * 0.2); c.fill();
    c.globalAlpha = 1;
  }
  for (const h of g.holes) {
    c.save(); c.translate(h.x, h.y);
    c.fillStyle = '#1A1238'; circle(c, 0, 0, 22); c.fill();
    c.lineWidth = 3; c.lineCap = 'round';
    for (let i = 0; i < 3; i++) { c.save(); c.rotate(time * (3 + i)); c.strokeStyle = ['#8E5BD6', '#C9A5FF', '#FFFFFF'][i]; c.beginPath(); c.arc(0, 0, 20 - i * 5, 0, Math.PI * 1.2); c.stroke(); c.restore(); }
    for (let i = 0; i < 5; i++) { const a = time * 2 + i * 1.26, r = 30 + Math.sin(time * 3 + i) * 4; c.fillStyle = '#FFE88A'; circle(c, Math.cos(a) * r, Math.sin(a) * r, 1.6); c.fill(); }
    c.restore();
  }
  for (const v of g.vents) {
    c.save(); c.translate(v.x, v.y);
    c.fillStyle = '#5A4A44'; c.strokeStyle = OUT; c.lineWidth = 2.5; circle(c, 0, 0, 16); c.fill(); c.stroke();
    const warn = v.state === 1, fire = v.state === 2;
    c.fillStyle = fire ? '#FFE14D' : warn ? (Math.floor(time * 10) % 2 ? '#FF5A1F' : '#FF9A3D') : '#2B2220'; circle(c, 0, 0, 9); c.fill();
    if (warn) { c.strokeStyle = 'rgba(255,90,31,.8)'; c.lineWidth = 3; circle(c, 0, 0, 20 + Math.sin(time * 20) * 2); c.stroke(); }
    c.restore();
  }
  for (const s of g.switches) {
    const down = s.on;
    c.save(); c.translate(s.x, s.y);
    c.fillStyle = '#3A4152'; c.strokeStyle = OUT; c.lineWidth = 2.5; rr(c, -18, -18, 36, 36, 8); c.fill(); c.stroke();
    c.fillStyle = g.gatesOpen ? '#5BE37D' : '#FFD23F'; circle(c, 0, down ? 1 : -1, down ? 11 : 13); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.6)'; circle(c, -4, -5, 3.5); c.fill();
    c.restore();
  }
  for (const d of g.gates) {
    if (d.open) {
      c.strokeStyle = '#C9A000'; c.lineWidth = 2; c.setLineDash([4, 4]); c.strokeRect(d.x - 22, d.y - 22, 44, 44); c.setLineDash([]);
      continue;
    }
    c.save(); c.translate(d.x, d.y);
    c.fillStyle = '#FFD23F'; c.strokeStyle = OUT; c.lineWidth = 2.5; rr(c, -23, -23, 46, 46, 6); c.fill(); c.stroke();
    c.save(); rr(c, -21, -21, 42, 42, 5); c.clip();
    c.fillStyle = OUT; for (let i = -3; i < 4; i++) { c.beginPath(); c.moveTo(i * 14 - 4, -24); c.lineTo(i * 14 + 4, -24); c.lineTo(i * 14 + 18, 24); c.lineTo(i * 14 + 10, 24); c.closePath(); c.fill(); }
    c.restore();
    c.fillStyle = '#FFFFFF'; rr(c, -9, -4, 18, 14, 3); c.fill(); c.stroke();
    c.strokeStyle = OUT; c.lineWidth = 2.5; c.beginPath(); c.arc(0, -4, 6, Math.PI, 0); c.stroke();
    c.restore();
  }
  for (const p of g.pads) {
    c.save(); c.translate(p.x, p.y);
    const pulse = 0.5 + 0.5 * Math.sin(time * 4);
    c.fillStyle = p.done ? 'rgba(255,210,63,.6)' : `rgba(255,210,63,${0.25 + pulse * 0.25})`; rr(c, -22, -22, 44, 44, 10); c.fill();
    c.strokeStyle = '#FFB300'; c.lineWidth = 3; c.setLineDash([6, 4]); c.lineDashOffset = -time * 20; rr(c, -20, -20, 40, 40, 9); c.stroke(); c.setLineDash([]);
    if (!p.done) { c.fillStyle = '#FFB300'; starPath(c, 0, 0, 9, 4, 5, 0); c.fill(); }
    c.restore();
  }
  for (const f of g.fires) drawFlameLick(c, f.x, f.y, 14 * clamp((f.life - f.t) * 1.5, 0.3, 1), time);
}
function drawGem(c, x, y, kind, time) {
  c.save(); c.translate(x, y);
  c.fillStyle = 'rgba(255,255,255,.45)'; circle(c, 0, 0, 20 + Math.sin(time * 5) * 2); c.fill();
  c.strokeStyle = OUT; c.lineWidth = 2.5;
  if (kind === 'pearl') {
    c.fillStyle = '#FFF4FA'; circle(c, 0, 0, 12); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,170,220,.5)'; circle(c, 4, 4, 6); c.fill();
    c.fillStyle = '#FFFFFF'; circle(c, -4, -4, 3.5); c.fill();
  } else if (kind === 'gear') {
    c.rotate(time * 1.5);
    c.fillStyle = '#FFC93C'; c.beginPath();
    for (let i = 0; i < 16; i++) { const a = (i * Math.PI) / 8, r = i % 2 ? 9 : 14; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#FFF0A0'; circle(c, 0, 0, 4); c.fill(); c.stroke();
  } else if (kind === 'candy') {
    c.fillStyle = '#FF6FAE'; c.beginPath(); c.moveTo(-18, -7); c.lineTo(-9, 0); c.lineTo(-18, 7); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(18, -7); c.lineTo(9, 0); c.lineTo(18, 7); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#FFE14D'; circle(c, 0, 0, 10); c.fill(); c.stroke();
    c.strokeStyle = '#FF6FAE'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 5, 0, 4.5); c.stroke();
  } else {
    c.rotate(Math.sin(time * 2 + x) * 0.2);
    c.fillStyle = '#FFE14D'; starPath(c, 0, 0, 15, 7, 5, 0); c.fill(); c.stroke();
    c.fillStyle = '#FFF7C2'; starPath(c, -2, -2, 6, 3, 5, 0); c.fill();
  }
  c.restore();
}
function drawFlameLick(c, x, y, s, time) {
  const f = Math.sin(time * 18 + x) * 0.15;
  c.fillStyle = '#FF7A2E'; c.beginPath(); c.moveTo(x - s * 0.6, y + s * 0.4); c.quadraticCurveTo(x - s * 0.7, y - s * 0.5, x + f * s, y - s * (1.1 + f)); c.quadraticCurveTo(x + s * 0.7, y - s * 0.5, x + s * 0.6, y + s * 0.4); c.closePath(); c.fill();
  c.fillStyle = '#FFE14D'; c.beginPath(); c.moveTo(x - s * 0.3, y + s * 0.35); c.quadraticCurveTo(x - s * 0.3, y - s * 0.1, x, y - s * 0.55); c.quadraticCurveTo(x + s * 0.3, y - s * 0.1, x + s * 0.3, y + s * 0.35); c.closePath(); c.fill();
}
// 笼子（坦克那一层）
function drawCage(c, k, time) {
  c.save(); c.translate(k.x, k.y);
  drawFriend(c, 0, 4, WORLDS[G.world].friend, time, true);
  c.strokeStyle = k.flashT > 0 ? '#FFFFFF' : '#7A8699'; c.lineWidth = 3.5;
  for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 9, -20); c.lineTo(i * 9, 20); c.stroke(); }
  c.fillStyle = '#5E6779'; c.strokeStyle = OUT; c.lineWidth = 2.5;
  rr(c, -23, -24, 46, 8, 3); c.fill(); c.stroke(); rr(c, -23, 16, 46, 8, 3); c.fill(); c.stroke();
  c.fillStyle = '#FFD23F'; rr(c, -6, -4, 12, 10, 3); c.fill(); c.stroke();
  for (let i = 0; i < 3 - k.hp; i++) { c.fillStyle = '#FF4D6D'; circle(c, -10 + i * 10, -30, 3); c.fill(); }
  if (Math.floor(time * 2) % 2) txt(c, '救命！', 0, -36, 12, '#FFFFFF', 'center', OUT);
  c.restore();
}
// 小伙伴：小动物头像
function drawFriend(c, x, y, name, time, scared) {
  const col = { 小兔子: ['#FFFFFF', '#FFB3C7'], 小企鹅: ['#3B4A6B', '#FFFFFF'], 小骆驼: ['#E3B46A', '#C98A3E'], 小熊软糖: ['#FF8A5C', '#FFC2A6'], 小海龟: ['#5ED6A8', '#2E9E74'], 小松鼠: ['#C9824A', '#FFE0C2'], 小恐龙: ['#7ED957', '#3E9B2A'], 玩具熊: ['#C9935A', '#FFE0C2'], 小外星人: ['#9AE6B4', '#3E9A6A'], 小精灵: ['#FFE88A', '#FFB3E6'] }[name] || ['#FFFFFF', '#FFB3C7'];
  const bob = Math.sin(time * 6) * 1.5;
  c.save(); c.translate(x, y + bob);
  c.strokeStyle = OUT; c.lineWidth = 2;
  c.fillStyle = col[0];
  if (name === '小兔子') { c.beginPath(); c.ellipse(-5, -14, 3.5, 8, -0.2, 0, Math.PI * 2); c.fill(); c.stroke(); c.beginPath(); c.ellipse(5, -14, 3.5, 8, 0.2, 0, Math.PI * 2); c.fill(); c.stroke(); }
  else if (name === '小熊软糖' || name === '玩具熊' || name === '小松鼠') { circle(c, -9, -9, 4.5); c.fill(); c.stroke(); circle(c, 9, -9, 4.5); c.fill(); c.stroke(); }
  else if (name === '小外星人') { c.beginPath(); c.moveTo(-5, -10); c.lineTo(-8, -18); c.moveTo(5, -10); c.lineTo(8, -18); c.stroke(); circle(c, -8, -19, 2); c.fill(); circle(c, 8, -19, 2); c.fill(); }
  else if (name === '小精灵') { c.fillStyle = 'rgba(200,240,255,.8)'; c.beginPath(); c.ellipse(-12, -2, 6, 9, -0.5, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(12, -2, 6, 9, 0.5, 0, Math.PI * 2); c.fill(); c.fillStyle = col[0]; }
  circle(c, 0, 0, 11); c.fill(); c.stroke();
  c.fillStyle = col[1]; c.beginPath(); c.ellipse(0, 4, 6, 4, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = OUT; circle(c, -4, -2, 1.8); c.fill(); circle(c, 4, -2, 1.8); c.fill();
  c.beginPath();
  if (scared) c.arc(0, 6, 2, 0, Math.PI * 2); else c.arc(0, 3, 3, 0.1 * Math.PI, 0.9 * Math.PI);
  c.stroke();
  c.restore();
}
function drawTurret(c, u, time) {
  if (u.kind === 'friend') {
    const hop = Math.abs(Math.sin(u.bob * 5)) * 4;
    drawFriend(c, u.x, u.y - hop, WORLDS[u.world].friend, time, false);
    c.save(); c.translate(u.x, u.y - hop); c.rotate(u.aim);
    c.fillStyle = '#FFB3D9'; c.strokeStyle = OUT; c.lineWidth = 1.5; rr(c, 8, -3, 12, 6, 3); c.fill(); c.stroke();
    c.restore();
    return;
  }
  if (u.life < 3 && Math.floor(time * 8) % 2) return;
  c.save(); c.translate(u.x, u.y);
  c.fillStyle = '#8D6E63'; c.strokeStyle = OUT; c.lineWidth = 2.5; rr(c, -14, -6, 28, 18, 5); c.fill(); c.stroke();
  c.save(); c.rotate(u.aim); c.fillStyle = '#5D4037'; rr(c, 0, -4, 20, 8, 3); c.fill(); c.stroke(); c.restore();
  c.fillStyle = '#FFD23F'; circle(c, 0, 0, 9); c.fill(); c.stroke();
  c.fillStyle = OUT; circle(c, -3, -1, 1.5); c.fill(); circle(c, 3, -1, 1.5); c.fill();
  c.restore();
}

// ----- 危险提示（在坦克上面画）-----
function drawHazards(c, time) {
  const g = G;
  for (const v of g.vents) if (v.state === 2) {
    const k = ((g.t + v.ph) % 5) - 4;
    const hgt = 46 * Math.sin(Math.min(1, k * 3) * Math.PI / 2);
    c.save(); c.translate(v.x, v.y + 10);
    c.fillStyle = 'rgba(255,90,31,.85)'; c.beginPath(); c.moveTo(-15, 0); c.quadraticCurveTo(-18, -hgt * 0.6, Math.sin(time * 20) * 4, -hgt - 10); c.quadraticCurveTo(18, -hgt * 0.6, 15, 0); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,225,77,.95)'; c.beginPath(); c.moveTo(-8, 0); c.quadraticCurveTo(-9, -hgt * 0.5, 0, -hgt * 0.8); c.quadraticCurveTo(9, -hgt * 0.5, 8, 0); c.closePath(); c.fill();
    c.restore();
  }
  for (const z of g.zones) {
    const k = clamp(z.t / z.delay, 0, 1);
    if (z.kind === 'land') {
      c.fillStyle = `rgba(20,20,40,${0.15 + k * 0.25})`; c.beginPath(); c.ellipse(z.x, z.y + 6, z.r * (0.5 + k * 0.5), z.r * 0.6 * (0.5 + k * 0.5), 0, 0, Math.PI * 2); c.fill();
      continue;
    }
    const magic = z.kind === 'magic', slow = z.slow;
    c.fillStyle = magic ? `rgba(180,120,255,${0.15 + k * 0.25})` : slow ? `rgba(255,255,255,${0.15 + k * 0.2})` : `rgba(255,60,60,${0.12 + k * 0.28})`;
    circle(c, z.x, z.y, z.r * (0.4 + k * 0.6)); c.fill();
    c.strokeStyle = magic ? '#C9A8FF' : slow ? '#FFFFFF' : '#FF3B3B'; c.lineWidth = 2.5; c.setLineDash([6, 4]); c.lineDashOffset = -time * 30;
    circle(c, z.x, z.y, z.r); c.stroke(); c.setLineDash([]);
    if (magic) { c.save(); c.translate(z.x, z.y); c.rotate(time * 2); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2; starPath(c, 0, 0, z.r * 0.8, z.r * 0.35, 5, 0); c.stroke(); c.restore(); }
    // 快落下来时画出掉下来的东西
    if (k > 0.55 && !magic && z.kind !== 'root') {
      const h = (1 - k) / 0.45 * 260, x = z.fx !== undefined ? z.fx + (z.x - z.fx) * k : z.x, y = z.y - h;
      drawFalling(c, z.kind, x, y, time);
    }
    if (z.kind === 'root' && k > 0.7) { c.fillStyle = '#7A4B26'; c.beginPath(); c.moveTo(z.x - 10, z.y + 8); c.lineTo(z.x, z.y - 14 * (k - 0.7) / 0.3); c.lineTo(z.x + 10, z.y + 8); c.closePath(); c.fill(); }
  }
  for (const L of g.lines) {
    const ex = L.x + Math.cos(L.cur) * L.reach, ey = L.y + Math.sin(L.cur) * L.reach;
    c.lineCap = 'round';
    if (L.t < L.warn) {
      c.strokeStyle = Math.floor(time * 12) % 2 ? 'rgba(255,60,60,.85)' : 'rgba(255,255,255,.85)'; c.lineWidth = 3; c.setLineDash([10, 8]);
      c.beginPath(); c.moveTo(L.x, L.y); c.lineTo(ex, ey); c.stroke(); c.setLineDash([]);
      if (L.sweep) {
        c.strokeStyle = 'rgba(255,60,60,.5)'; c.lineWidth = 2;
        c.beginPath(); c.arc(L.x, L.y, 80, L.a - L.sweep / 2, L.a + L.sweep / 2); c.stroke();
      }
    } else {
      c.strokeStyle = L.color || '#FFE14D'; c.globalAlpha = 0.85; c.lineWidth = L.w;
      c.beginPath(); c.moveTo(L.x, L.y); c.lineTo(ex, ey); c.stroke();
      c.strokeStyle = '#FFFFFF'; c.lineWidth = L.w * 0.4; c.stroke(); c.globalAlpha = 1;
    }
  }
  for (const f of g.flames) {
    if (f.t >= f.warn) continue;
    const o = f.owner;
    c.fillStyle = `rgba(255,90,31,${0.15 + 0.15 * Math.sin(time * 20)})`;
    c.beginPath(); c.moveTo(f.x, f.y);
    const a0 = f.sweep ? f.a - f.sweep / 2 - f.spread / 2 : f.a - f.spread / 2, a1 = f.sweep ? f.a + f.sweep / 2 + f.spread / 2 : f.a + f.spread / 2;
    c.arc(f.x, f.y, f.len + (o ? o.size / 2 : 0), a0, a1); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,90,31,.8)'; c.lineWidth = 2; c.setLineDash([6, 5]); c.stroke(); c.setLineDash([]);
  }
}
function drawFalling(c, kind, x, y, time) {
  c.save(); c.translate(x, y); c.strokeStyle = OUT; c.lineWidth = 2.5;
  switch (kind) {
    case 'meteor':
      c.fillStyle = 'rgba(255,154,61,.5)'; c.beginPath(); c.moveTo(-10, -6); c.lineTo(0, -40); c.lineTo(10, -6); c.closePath(); c.fill();
      c.fillStyle = '#8C7A6A'; circle(c, 0, 0, 14); c.fill(); c.stroke();
      c.fillStyle = '#6E5E52'; circle(c, -4, -3, 3.5); c.fill(); circle(c, 5, 4, 2.5); c.fill();
      break;
    case 'acorn':
      c.fillStyle = '#B97A45'; c.beginPath(); c.ellipse(0, 3, 10, 12, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = '#7A4B26'; c.beginPath(); c.ellipse(0, -7, 12, 6, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      break;
    case 'crate': drawCrate(c, { x: 0, y: 0, hp: 3, flashT: 0 }); break;
    case 'cream': c.fillStyle = '#FFFFFF'; circle(c, 0, 0, 12); c.fill(); c.stroke(); c.fillStyle = '#FF5D8A'; circle(c, 0, -10, 4); c.fill(); break;
    case 'spore': c.fillStyle = '#C9F59E'; circle(c, 0, 0, 10); c.fill(); c.stroke(); break;
    case 'honey': c.fillStyle = '#FFC93C'; c.beginPath(); c.moveTo(0, -14); c.quadraticCurveTo(12, 4, 0, 10); c.quadraticCurveTo(-12, 4, 0, -14); c.fill(); c.stroke(); break;
    case 'fire': drawFlameLick(c, 0, 8, 16, time); break;
    default: c.fillStyle = pick(['#FF6FAE', '#7FD6FF', '#FFE14D']); circle(c, 0, 0, 11); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.7)'; circle(c, -3, -3, 3.5); c.fill();
  }
  c.restore();
}
// 夜晚：只看得见身边
const nightCv = typeof document !== 'undefined' && document.createElement ? document.createElement('canvas') : null;
function drawNight(c, time) {
  const g = G;
  if (!g.L.night || !nightCv || !nightCv.getContext) return;
  const a = g.lightT > 0 ? clamp(1 - g.lightT, 0, 0.82) * (g.lightT < 1 ? 1 : 0) : 0.82;
  if (a <= 0.01) return;
  nightCv.width = MAP_W; nightCv.height = MAP_H;
  const x = nightCv.getContext('2d');
  x.fillStyle = `rgba(10,14,40,${a})`; x.fillRect(0, 0, MAP_W, MAP_H);
  x.globalCompositeOperation = 'destination-out';
  const hole = (px, py, r) => { const gr = x.createRadialGradient(px, py, r * 0.55, px, py, r); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill(); };
  for (const p of g.players) if (!p.dead) hole(p.x, p.y, 190);
  hole(g.egg.x, g.egg.y, 80);
  for (const u of g.pups) if (u.type === 'firefly') hole(u.x, u.y, 60);
  x.globalCompositeOperation = 'source-over';
  c.drawImage(nightCv, 0, 0);
  // 敌人的眼睛和子弹在黑暗里一直亮着
  for (const e of g.tanks) {
    if (e.dead || e.kind !== 'enemy') continue;
    const col = e.type === 'boss' ? e.bd.eye : ENEMIES[e.type].eye;
    c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 8;
    circle(c, e.x - e.size * 0.12, e.y - e.size * 0.12, 3); c.fill(); circle(c, e.x + e.size * 0.12, e.y - e.size * 0.12, 3); c.fill();
    c.shadowBlur = 0;
  }
  for (const b of g.bullets) if (!b.player) { c.fillStyle = b.color; circle(c, b.x, b.y, b.r); c.fill(); }
  for (let i = 0; i < 10; i++) {
    const fx = (Math.sin(time * 0.3 + i * 2.1) * 0.5 + 0.5) * MAP_W, fy = (Math.cos(time * 0.4 + i * 1.7) * 0.5 + 0.5) * MAP_H;
    c.fillStyle = `rgba(220,255,120,${0.5 + 0.5 * Math.sin(time * 4 + i)})`; circle(c, fx, fy, 2); c.fill();
  }
}

// ----- 新敌人的装饰 -----
// inHull：在车身坐标系里（已经按朝向旋转）
function drawEnemyHullDeco(c, t, sty, s, time) {
  const h = s / 2;
  switch (t.type) {
    case 'd': {
      c.fillStyle = '#C9CED8'; c.strokeStyle = OUT; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-9, -h + 2); c.lineTo(0, -h - 16); c.lineTo(9, -h + 2); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = '#7A8396'; c.lineWidth = 1.5; const k = (time * 20) % 6;
      c.beginPath(); for (let y = -h - 12 + k; y < -h; y += 6) { const w = (y + h + 16) * 0.5; c.moveTo(-w, y); c.lineTo(w, y + 3); } c.stroke();
      break;
    }
    case 'f':
      c.fillStyle = sty.body; c.strokeStyle = OUT; c.lineWidth = 2;
      c.beginPath(); c.moveTo(0, h - 2); c.lineTo(-12, h + 12 + Math.sin(time * 10) * 3); c.lineTo(12, h + 12 - Math.sin(time * 10) * 3); c.closePath(); c.fill(); c.stroke();
      break;
    case 'z':
      if (t.shieldOffT > 0) break;
      c.fillStyle = '#C9D3E3'; c.strokeStyle = OUT; c.lineWidth = 2.5;
      rr(c, -h - 2, -h - 10, s + 4, 10, 4); c.fill(); c.stroke();
      c.fillStyle = '#FFE14D'; circle(c, 0, -h - 5, 3); c.fill();
      break;
  }
}
function drawEnemyHeadDeco(c, t, sty, s, time) {
  const w = s * 0.6, top = -w * 0.44;
  c.strokeStyle = OUT; c.lineWidth = 2;
  switch (t.type) {
    case 'k':
      c.strokeStyle = '#1F9E80'; c.lineWidth = 2.5; c.beginPath();
      for (let i = 0; i <= 6; i++) c.lineTo((i % 2 ? 4 : -4), top - 4 - i * 2.2 - Math.abs(Math.sin(time * 8)) * 3);
      c.stroke(); c.fillStyle = '#FF6FAE'; circle(c, 0, top - 19 - Math.abs(Math.sin(time * 8)) * 3, 3.5); c.fill(); break;
    case 'n':
      c.fillStyle = '#FF4D6D'; c.fillRect(-w / 2 - 1, top + w * 0.12, w + 2, 5);
      c.beginPath(); c.moveTo(w / 2, top + w * 0.15); c.lineTo(w / 2 + 10, top + 4 + Math.sin(time * 9) * 3); c.lineTo(w / 2 + 8, top + w * 0.3); c.closePath(); c.fill(); break;
    case 'l':
      for (let i = -1; i <= 1; i++) drawFlameLick(c, i * 7, top + 2, 8 + Math.sin(time * 12 + i) * 1.5, time + i);
      break;
    case 'u':
      c.save(); c.translate(0, top - 6); c.scale(Math.cos(time * 30), 1);
      c.fillStyle = '#FFFFFF'; rr(c, -14, -2, 28, 4, 2); c.fill(); c.stroke(); c.restore();
      c.fillStyle = OUT; c.fillRect(-1.5, top - 6, 3, 6); break;
    case 'q':
      c.save(); c.translate(0, top - 6); c.rotate(-0.6);
      c.fillStyle = '#B0BEC5'; rr(c, -2.5, -8, 5, 14, 2); c.fill(); c.stroke();
      c.beginPath(); c.arc(0, -9, 5, 0.6, Math.PI * 2 - 0.6 + Math.PI); c.fill(); c.stroke(); c.restore();
      break;
    case 't':
      c.fillStyle = '#2B2D42'; rr(c, -w * 0.32, top - 12, w * 0.64, 13, 3); c.fill(); c.stroke();
      c.fillStyle = '#FFD23F'; circle(c, 0, top - 6, 2.5); c.fill();
      c.fillStyle = '#FF5D5D'; c.beginPath(); c.ellipse(0, top - 15, 3, 5, 0, 0, Math.PI * 2); c.fill(); break;
  }
}
// 护盾发生器、小石像（不会动的）
function drawStill(c, t, time) {
  c.save(); c.translate(t.x, t.y);
  c.fillStyle = 'rgba(20,40,20,.16)'; c.beginPath(); c.ellipse(3, 6, 20, 16, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = OUT; c.lineWidth = 2.5;
  if (t.type === 'gen') {
    c.fillStyle = t.flashT > 0 ? '#FFFFFF' : '#5A68C8'; rr(c, -16, -6, 32, 22, 6); c.fill(); c.stroke();
    c.fillStyle = '#B9C4FF'; rr(c, -8, -24, 16, 22, 5); c.fill(); c.stroke();
    const p = 0.5 + 0.5 * Math.sin(time * 6);
    c.fillStyle = `rgba(150,200,255,${0.5 + p * 0.5})`; circle(c, 0, -26, 7); c.fill(); c.stroke();
  } else {
    c.fillStyle = t.flashT > 0 ? '#FFFFFF' : '#D9B56A'; rr(c, -18, -14, 36, 32, 6); c.fill(); c.stroke();
    c.fillStyle = '#3AD6FF'; circle(c, -7, -2, 3.5); c.fill(); circle(c, 7, -2, 3.5); c.fill();
    c.fillStyle = '#4A90D9'; c.fillRect(-18, -14, 36, 6); c.strokeRect(-18, -14, 36, 6);
  }
  c.restore();
  if (t.hp < t.maxHp) drawHpBar(c, t.x, t.y - 36, 36, t.hp / t.maxHp);
}
function drawBubbleOver(c, t, time) {
  const r = t.size * 0.7 + Math.sin(time * 5) * 2;
  c.fillStyle = 'rgba(190,240,255,.35)'; c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 2.5;
  circle(c, 0, 0, r); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.ellipse(-r * 0.4, -r * 0.45, r * 0.22, r * 0.12, -0.6, 0, Math.PI * 2); c.fill();
}

// ----- 新 Boss 的装饰 -----
// 在头后面画（back=true）或者头前面画
function drawBossDeco(c, e, bd, time, back) {
  const s = e.size, w = s * 0.54, hh = w * 0.86, top = -hh / 2;
  c.strokeStyle = OUT; c.lineWidth = 2.5; c.lineJoin = 'round';
  switch (bd.deco) {
    case 'snail':
      if (back) {
        c.fillStyle = '#C98BFF'; circle(c, 0, s * 0.12, s * 0.42); c.fill(); c.stroke();
        c.strokeStyle = '#8A4FD0'; c.lineWidth = 4; c.beginPath();
        for (let a = 0; a < 12; a += 0.3) { const r = s * 0.36 * (1 - a / 12); c.lineTo(Math.cos(a + time * 0.5) * r, s * 0.12 + Math.sin(a + time * 0.5) * r); }
        c.stroke();
      } else {
        for (const sx of [-1, 1]) { c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(sx * w * 0.2, top); c.lineTo(sx * w * 0.32, top - 18); c.stroke(); c.fillStyle = bd.body; circle(c, sx * w * 0.32, top - 20, 5); c.fill(); c.stroke(); }
      }
      break;
    case 'snowman':
      if (!back) {
        c.fillStyle = '#2B2D42'; rr(c, -w * 0.32, top - 22, w * 0.64, 22, 3); c.fill(); c.stroke(); rr(c, -w * 0.5, top - 4, w, 6, 3); c.fill(); c.stroke();
        c.fillStyle = '#FF5D5D'; c.fillRect(-w * 0.32 + 1, top - 8, w * 0.64 - 2, 4);
        c.fillStyle = '#FF9A3D'; c.beginPath(); c.moveTo(-3, top + hh * 0.62); c.lineTo(16, top + hh * 0.68); c.lineTo(-3, top + hh * 0.75); c.closePath(); c.fill(); c.stroke();
      }
      break;
    case 'penguin':
      if (!back) { c.fillStyle = '#FFC93C'; c.beginPath(); c.moveTo(-7, top + hh * 0.6); c.lineTo(7, top + hh * 0.6); c.lineTo(0, top + hh * 0.8); c.closePath(); c.fill(); c.stroke(); }
      else { c.fillStyle = '#FFFFFF'; c.beginPath(); c.ellipse(0, s * 0.12, s * 0.22, s * 0.3, 0, 0, Math.PI * 2); c.fill(); }
      break;
    case 'dragon':
      if (back) {
        for (const sx of [-1, 1]) {
          const flap = Math.sin(time * 6) * 0.25;
          c.save(); c.scale(sx, 1); c.rotate(flap);
          c.fillStyle = bd.dark; c.beginPath(); c.moveTo(w * 0.3, 0); c.quadraticCurveTo(s * 0.7, -s * 0.5, s * 0.75, -s * 0.05); c.quadraticCurveTo(s * 0.55, -s * 0.1, s * 0.6, s * 0.15); c.quadraticCurveTo(s * 0.45, 0, w * 0.3, s * 0.15); c.closePath(); c.fill(); c.stroke();
          c.restore();
        }
      } else {
        c.fillStyle = bd.key === 'icedragon' ? '#DDF6FF' : '#FFE14D';
        for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * w * 0.2, top + 2); c.lineTo(sx * w * 0.42, top - 18); c.lineTo(sx * w * 0.38, top + 4); c.closePath(); c.fill(); c.stroke(); }
      }
      break;
    case 'worm':
      if (!back) { c.fillStyle = '#FFE0A8'; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * w * 0.18 - 4, top + hh); c.lineTo(i * w * 0.18, top + hh + 7); c.lineTo(i * w * 0.18 + 4, top + hh); c.fill(); c.stroke(); } }
      else { c.fillStyle = bd.dark; for (let i = 0; i < 3; i++) { circle(c, 0, s * 0.18 + i * 10, s * 0.24 - i * 4); c.fill(); c.stroke(); } }
      break;
    case 'pharaoh':
      if (back) {
        c.fillStyle = '#3A6CFF'; c.beginPath(); c.moveTo(-w * 0.75, top + hh); c.lineTo(-w * 0.6, top - 6); c.lineTo(w * 0.6, top - 6); c.lineTo(w * 0.75, top + hh); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#FFD25E'; for (let i = 0; i < 4; i++) c.fillRect(-w * 0.72 + i * 2, top + i * 12, w * 1.44 - i * 4, 5);
      } else { c.fillStyle = '#FFD25E'; c.beginPath(); c.moveTo(-6, top - 2); c.lineTo(0, top - 16); c.lineTo(6, top - 2); c.closePath(); c.fill(); c.stroke(); }
      break;
    case 'clown':
      if (back) { for (const sx of [-1, 1]) { c.fillStyle = sx < 0 ? '#FF6FAE' : '#7FD6FF'; circle(c, sx * w * 0.55, top + 6, 11); c.fill(); c.stroke(); } }
      else { c.fillStyle = '#FF3B3B'; circle(c, 0, top + hh * 0.58, 6); c.fill(); c.stroke(); c.fillStyle = '#FFE14D'; c.beginPath(); c.moveTo(-8, top); c.lineTo(0, top - 18); c.lineTo(8, top); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#FF6FAE'; circle(c, 0, top - 19, 4); c.fill(); }
      break;
    case 'cake':
      if (!back) {
        c.fillStyle = '#FFF0F6'; rr(c, -w * 0.45, top - 14, w * 0.9, 14, 4); c.fill(); c.stroke();
        c.fillStyle = '#FF8CC6'; rr(c, -w * 0.35, top - 26, w * 0.7, 12, 4); c.fill(); c.stroke();
        c.fillStyle = '#FF3B5C'; circle(c, 0, top - 31, 5); c.fill(); c.stroke();
        c.fillStyle = '#FFFFFF'; for (let i = -2; i <= 2; i++) { circle(c, i * w * 0.17, top - 14, 3); c.fill(); }
      }
      break;
    case 'jelly':
      if (back) { c.fillStyle = 'rgba(124,242,200,.55)'; const wob = Math.sin(time * 6) * 3; c.beginPath(); c.ellipse(0, 4, s * 0.55 + wob, s * 0.5 - wob, 0, 0, Math.PI * 2); c.fill(); c.stroke(); }
      else { c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(-w * 0.3, top - 2, 6, 3, -0.5, 0, Math.PI * 2); c.fill(); }
      break;
    case 'crab':
      if (back) {
        const open = e.clawWarn > 0;
        for (const sx of [-1, 1]) {
          c.save(); c.translate(sx * s * 0.5, -s * 0.05); c.rotate(sx * (open ? -0.6 : 0.2));
          c.fillStyle = bd.body; c.beginPath(); c.ellipse(0, 0, 14, 11, 0, 0, Math.PI * 2); c.fill(); c.stroke();
          c.fillStyle = bd.dark; c.beginPath(); c.moveTo(-4, -8); c.lineTo(0, open ? -22 : -14); c.lineTo(5, -8); c.closePath(); c.fill(); c.stroke();
          c.restore();
        }
      } else for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * w * 0.2, top); c.lineTo(sx * w * 0.24, top - 12); c.stroke(); c.fillStyle = '#FFFFFF'; circle(c, sx * w * 0.24, top - 14, 4); c.fill(); c.stroke(); }
      break;
    case 'puffer':
      if (back) { c.fillStyle = '#FFB84D'; const n = 14; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + time * 0.3; c.beginPath(); c.moveTo(Math.cos(a - 0.12) * s * 0.42, Math.sin(a - 0.12) * s * 0.42); c.lineTo(Math.cos(a) * s * 0.62, Math.sin(a) * s * 0.62); c.lineTo(Math.cos(a + 0.12) * s * 0.42, Math.sin(a + 0.12) * s * 0.42); c.closePath(); c.fill(); c.stroke(); } }
      break;
    case 'whale':
      if (back) { c.fillStyle = bd.dark; c.beginPath(); c.moveTo(0, s * 0.4); c.lineTo(-s * 0.3, s * 0.62 + Math.sin(time * 5) * 4); c.lineTo(s * 0.3, s * 0.62 - Math.sin(time * 5) * 4); c.closePath(); c.fill(); c.stroke(); }
      else { const k = (time * 1.5) % 1; c.strokeStyle = '#9ED8FF'; c.lineWidth = 3; c.globalAlpha = 1 - k; c.beginPath(); c.moveTo(0, top - 2); c.quadraticCurveTo(-8, top - 14 - k * 10, -14, top - 6 - k * 8); c.moveTo(0, top - 2); c.quadraticCurveTo(8, top - 14 - k * 10, 14, top - 6 - k * 8); c.stroke(); c.globalAlpha = 1; }
      break;
    case 'shroom':
      if (!back) { c.fillStyle = '#FF4D4D'; c.beginPath(); c.ellipse(0, top + 2, w * 0.78, w * 0.48, 0, Math.PI, 0); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#FFFFFF'; circle(c, -w * 0.35, top - 8, 5); c.fill(); circle(c, w * 0.2, top - 14, 6); c.fill(); circle(c, w * 0.5, top - 4, 3.5); c.fill(); }
      break;
    case 'pecker':
      if (!back) {
        c.fillStyle = '#FF4D4D'; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-4 + i * 4, top + 2); c.lineTo(-10 + i * 8, top - 16 - i * 2); c.lineTo(2 + i * 4, top + 2); c.closePath(); c.fill(); c.stroke(); }
        c.fillStyle = '#FFC93C'; c.beginPath(); c.moveTo(-5, top + hh * 0.55); c.lineTo(5, top + hh * 0.55); c.lineTo(0, top + hh * 0.55 + 14); c.closePath(); c.fill(); c.stroke();
      }
      break;
    case 'tree':
      if (back) {
        c.fillStyle = '#4CAF50';
        for (const [x, y, r] of [[-s * 0.35, -s * 0.35, s * 0.28], [s * 0.35, -s * 0.35, s * 0.28], [0, -s * 0.52, s * 0.32], [-s * 0.5, -s * 0.05, s * 0.2], [s * 0.5, -s * 0.05, s * 0.2]]) { circle(c, x, y + Math.sin(time * 2 + x) * 2, r); c.fill(); c.stroke(); }
        c.fillStyle = '#FF6B6B'; circle(c, -s * 0.3, -s * 0.5, 5); c.fill(); circle(c, s * 0.25, -s * 0.6, 5); c.fill();
      }
      break;
    case 'bear':
      if (back) for (const sx of [-1, 1]) { c.fillStyle = bd.body; circle(c, sx * w * 0.5, top + 2, 12); c.fill(); c.stroke(); c.fillStyle = '#FFC1A1'; circle(c, sx * w * 0.5, top + 2, 6); c.fill(); }
      else { c.fillStyle = '#FFE0C2'; c.beginPath(); c.ellipse(0, top + hh * 0.7, 10, 7, 0, 0, Math.PI * 2); c.fill(); c.stroke(); c.fillStyle = OUT; circle(c, 0, top + hh * 0.64, 3); c.fill(); }
      break;
    case 'lava': case 'blaze':
      if (back) for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + time * 2; drawFlameLick(c, Math.cos(a) * s * 0.5, Math.sin(a) * s * 0.5, 9, time + i); }
      else if (bd.deco === 'blaze') for (let i = -2; i <= 2; i++) drawFlameLick(c, i * w * 0.18, top + 2, 12 + Math.sin(time * 10 + i) * 2, time + i);
      break;
    case 'golem':
      if (back) { c.fillStyle = '#5E504C'; for (const [x, y, r] of [[-s * 0.45, -s * 0.2, 12], [s * 0.45, -s * 0.2, 12], [-s * 0.4, s * 0.25, 10], [s * 0.4, s * 0.25, 10]]) { circle(c, x, y, r); c.fill(); c.stroke(); } }
      else { const glow = e.weakT > 0; c.fillStyle = glow ? `rgba(255,${120 + 80 * Math.sin(time * 12)},40,1)` : '#7A3A20'; circle(c, 0, hh / 2 + 12, glow ? 10 : 7); c.fill(); c.stroke(); if (glow) { c.strokeStyle = '#FFE14D'; c.lineWidth = 2; circle(c, 0, hh / 2 + 12, 14 + Math.sin(time * 12) * 2); c.stroke(); } }
      break;
    case 'bunny':
      if (back) for (const sx of [-1, 1]) { c.fillStyle = bd.body; c.beginPath(); c.ellipse(sx * w * 0.25, top - 22, 7, 20, sx * 0.15, 0, Math.PI * 2); c.fill(); c.stroke(); c.fillStyle = '#FF8AC0'; c.beginPath(); c.ellipse(sx * w * 0.25, top - 22, 3, 13, sx * 0.15, 0, Math.PI * 2); c.fill(); }
      else { c.save(); c.translate(0, hh / 2 + 16); c.rotate(time * (e.windT > 0 ? 18 : 2)); c.fillStyle = '#FFD23F'; c.fillRect(-2, -10, 4, 10); circle(c, -6, -12, 6); c.fill(); c.stroke(); circle(c, 6, -12, 6); c.fill(); c.stroke(); c.restore(); }
      break;
    case 'crane':
      if (back) {
        c.fillStyle = '#FFB300'; rr(c, -6, -s * 0.75, 12, s * 0.45, 4); c.fill(); c.stroke();
        c.save(); c.translate(0, -s * 0.78); c.rotate(Math.sin(time * 2) * 0.3);
        c.strokeStyle = '#5E6779'; c.lineWidth = 4; c.beginPath(); c.moveTo(-10, 0); c.lineTo(-14, 14); c.moveTo(10, 0); c.lineTo(14, 14); c.stroke(); c.restore();
      }
      break;
    case 'blocky':
      if (back) { const cols = ['#FF5D5D', '#FFC93C', '#4CD964', '#3EC1F3']; for (let i = 0; i < 4; i++) { c.fillStyle = cols[i]; const x = (i % 2 ? 1 : -1) * s * 0.45, y = (i < 2 ? -1 : 1) * s * 0.3; rr(c, x - 9, y - 9, 18, 18, 3); c.fill(); c.stroke(); } }
      else { c.fillStyle = '#FFC93C'; rr(c, -w * 0.3, top - 12, w * 0.6, 12, 3); c.fill(); c.stroke(); circle(c, -w * 0.12, top - 14, 3); c.fill(); c.stroke(); circle(c, w * 0.12, top - 14, 3); c.fill(); c.stroke(); }
      break;
    case 'soldier':
      if (!back) { c.fillStyle = '#2B2D42'; rr(c, -w * 0.32, top - 30, w * 0.64, 30, 4); c.fill(); c.stroke(); c.fillStyle = '#FFD23F'; c.fillRect(-w * 0.32 + 1, top - 6, w * 0.64 - 2, 4); circle(c, 0, top - 16, 4); c.fill(); c.fillStyle = '#FFFFFF'; c.beginPath(); c.ellipse(0, top - 36, 5, 9, 0, 0, Math.PI * 2); c.fill(); c.stroke(); }
      break;
    case 'ufo':
      if (back) { c.fillStyle = '#C9D3E3'; c.beginPath(); c.ellipse(0, s * 0.05, s * 0.62, s * 0.2, 0, 0, Math.PI * 2); c.fill(); c.stroke(); for (let i = 0; i < 6; i++) { c.fillStyle = Math.floor(time * 6 + i) % 2 ? '#FFE14D' : '#FF4DD2'; circle(c, -s * 0.5 + i * s * 0.2, s * 0.08, 3.5); c.fill(); } }
      else { c.fillStyle = 'rgba(180,240,255,.5)'; c.beginPath(); c.arc(0, top + 4, w * 0.62, Math.PI, 0); c.fill(); c.stroke(); }
      break;
    case 'rock':
      if (!back) { c.fillStyle = 'rgba(0,0,0,.2)'; circle(c, -w * 0.3, top + 6, 4); c.fill(); circle(c, w * 0.32, top + hh * 0.8, 3); c.fill(); }
      else { c.fillStyle = bd.dark; for (let i = 0; i < 5; i++) { const a = i * 1.26 + 0.3; circle(c, Math.cos(a) * s * 0.45, Math.sin(a) * s * 0.45, 7); c.fill(); c.stroke(); } }
      break;
    case 'mothership':
      if (back) { c.strokeStyle = '#B9C4FF'; c.lineWidth = 4; for (let i = 0; i < 2; i++) { c.beginPath(); c.ellipse(0, 0, s * (0.6 + i * 0.12), s * (0.18 + i * 0.05), time * 0.5 * (i ? -1 : 1), 0, Math.PI * 2); c.stroke(); } }
      else { c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(0, top); c.lineTo(0, top - 18); c.stroke(); c.fillStyle = Math.floor(time * 4) % 2 ? '#FF4DD2' : '#FFE14D'; circle(c, 0, top - 20, 5); c.fill(); c.stroke(); }
      break;
    case 'blackhole':
      if (back) { c.save(); c.rotate(time * 2); c.strokeStyle = '#C77BFF'; c.lineWidth = 5; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(0, 0, s * 0.55 + i * 6, i * 2, i * 2 + 2.2); c.stroke(); } c.restore(); }
      break;
    case 'knight':
      if (!back) {
        c.fillStyle = '#C9D3E3'; c.beginPath(); c.arc(0, top + 4, w * 0.56, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#FF4D6D'; c.beginPath(); c.moveTo(0, top - w * 0.5); c.quadraticCurveTo(14, top - w * 0.9, 22, top - w * 0.4); c.quadraticCurveTo(10, top - w * 0.55, 0, top - w * 0.45); c.fill(); c.stroke();
      }
      break;
    case 'wizard':
      if (!back) {
        c.fillStyle = bd.dark; c.beginPath(); c.moveTo(-w * 0.62, top + 4); c.lineTo(w * 0.62, top + 4); c.lineTo(w * 0.1, top - 40); c.lineTo(-w * 0.05, top - 34); c.closePath(); c.fill(); c.stroke();
        if (!bd.fake) { c.fillStyle = '#FFE14D'; starPath(c, -w * 0.05, top - 12, 7, 3, 5, time); c.fill(); c.stroke(); circle(c, w * 0.1, top - 41, 4); c.fill(); }
      }
      break;
    case 'mirror':
      if (back) { c.strokeStyle = '#FFD23F'; c.lineWidth = 6; c.beginPath(); c.ellipse(0, 0, s * 0.5, s * 0.58, 0, 0, Math.PI * 2); c.stroke(); }
      else { const k = (time * 0.7) % 1; c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.moveTo(-w / 2 + k * w, top); c.lineTo(-w / 2 + k * w + 6, top); c.lineTo(-w / 2 + k * w - 6, top + hh); c.lineTo(-w / 2 + k * w - 12, top + hh); c.closePath(); c.fill(); if (e.weakT > 0) { c.strokeStyle = OUT; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-w * 0.3, top); c.lineTo(-w * 0.05, top + hh * 0.4); c.lineTo(w * 0.15, top + hh * 0.2); c.lineTo(w * 0.35, top + hh); c.stroke(); } }
      break;
  }
}
// Boss 的特殊状态（在 Boss 坐标里画，返回 true 表示不用画身体了）
function drawBossState(c, e, time) {
  const s = e.size;
  if (e.guardKind === 'burrow' || e.guardKind === 'dive' || e.popWarn > 0) {
    const pos = e.popWarn > 0 ? e.popAt : [e.x, e.y], dive = e.guardKind === 'dive';
    c.save(); c.translate(pos[0] - e.x, pos[1] - e.y);
    if (dive) {
      c.fillStyle = 'rgba(70,170,240,.35)'; c.beginPath(); c.ellipse(0, 6, s * 0.4, s * 0.16, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = e.bd.dark; c.strokeStyle = OUT; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-12, 6); c.quadraticCurveTo(-2, -24, 10, -26); c.quadraticCurveTo(6, -6, 14, 6); c.closePath(); c.fill(); c.stroke();
    } else {
      const sh = e.popWarn > 0 ? rand(-2, 2) : 0;
      c.fillStyle = '#D9B56A'; c.strokeStyle = '#A8742E'; c.lineWidth = 2.5; c.beginPath(); c.ellipse(sh, 6, s * 0.38, s * 0.2, 0, Math.PI, 0); c.fill(); c.stroke();
      c.fillStyle = '#E8C78A'; for (let i = 0; i < 4; i++) { circle(c, -s * 0.25 + i * s * 0.17 + sh, -2 - (i % 2) * 5, 3.5); c.fill(); }
    }
    if (e.popWarn > 0) txt(c, '!', 0, -s * 0.5, 30, '#FF3B3B', 'center', '#FFFFFF');
    c.restore();
    return true;
  }
  if (e.guardKind === 'shell') {
    c.save(); c.rotate(e.ballT > 0 ? time * 10 : 0);
    c.fillStyle = '#C98BFF'; c.strokeStyle = OUT; c.lineWidth = 3; circle(c, 0, 0, s * 0.5); c.fill(); c.stroke();
    c.strokeStyle = '#8A4FD0'; c.lineWidth = 5; c.beginPath();
    for (let a = 0; a < 12; a += 0.3) { const r = s * 0.44 * (1 - a / 12); c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    c.stroke(); c.restore();
    return true;
  }
  return false;
}
function drawBossExtras(c, e, time) {
  const s = e.size;
  // 被护盾发生器保护着
  if (G.tanks.some(t => t.type === 'gen' && !t.dead && t.genOf === e)) {
    c.strokeStyle = `rgba(150,190,255,${0.6 + 0.3 * Math.sin(time * 6)})`; c.lineWidth = 4; circle(c, e.x, e.y, s * 0.72); c.stroke();
    c.fillStyle = 'rgba(150,190,255,.15)'; c.fill();
    for (const t of G.tanks) if (t.type === 'gen' && !t.dead && t.genOf === e) {
      c.strokeStyle = 'rgba(150,190,255,.45)'; c.lineWidth = 2; c.setLineDash([6, 6]); c.lineDashOffset = -time * 40;
      c.beginPath(); c.moveTo(t.x, t.y - 20); c.lineTo(e.x, e.y); c.stroke(); c.setLineDash([]);
    }
  }
  if (e.tractorWarn > 0) { c.fillStyle = `rgba(150,255,180,${0.3 + 0.3 * Math.sin(time * 20)})`; circle(c, e.x, e.y + s * 0.2, s * 0.3); c.fill(); }
  if (e.tractorT > 0 && e.tractorTo && !e.tractorTo.dead) {
    const p = e.tractorTo;
    c.fillStyle = 'rgba(150,255,180,.28)'; c.beginPath(); c.moveTo(e.x - 14, e.y); c.lineTo(p.x - 30, p.y); c.lineTo(p.x + 30, p.y); c.lineTo(e.x + 14, e.y); c.closePath(); c.fill();
  }
  if (e.pullT > 0) { for (let i = 0; i < 3; i++) { const r = ((time * 120 + i * 60) % 180) + s / 2; c.strokeStyle = `rgba(199,123,255,${1 - (r - s / 2) / 180})`; c.lineWidth = 3; circle(c, e.x, e.y, 240 + s / 2 - r); c.stroke(); } }
  if (e.dashWarn > 0) {
    c.strokeStyle = 'rgba(255,60,60,.7)'; c.lineWidth = s * 0.5; c.globalAlpha = 0.25;
    c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.x + DX[e.dir] * 700, e.y + DY[e.dir] * 700); c.stroke(); c.globalAlpha = 1;
    c.strokeStyle = '#FF3B3B'; c.lineWidth = 3; c.setLineDash([10, 8]); c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.x + DX[e.dir] * 700, e.y + DY[e.dir] * 700); c.stroke(); c.setLineDash([]);
  }
  if (e.stunT > 0) for (let i = 0; i < 3; i++) { const a = time * 6 + (i * Math.PI * 2) / 3; c.fillStyle = '#FFE14D'; c.strokeStyle = OUT; c.lineWidth = 1.5; starPath(c, e.x + Math.cos(a) * s * 0.35, e.y - s / 2 - 8 + Math.sin(a) * 6, 7, 3, 5, a); c.fill(); c.stroke(); }
  if (e.clawWarn > 0 || e.windT > 0) txt(c, '!', e.x, e.y - s / 2 - 30, 34, '#FF3B3B', 'center', '#FFFFFF');
  for (const o of G.orbs) if (o.owner === e) {
    c.save(); c.translate(o.x, o.y);
    c.fillStyle = o.flashT > 0 ? '#FFFFFF' : '#FF6B6B'; c.strokeStyle = OUT; c.lineWidth = 2;
    c.beginPath(); c.arc(0, 0, 13, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#FFF3E0'; c.fillRect(-4, 0, 8, 8); c.strokeRect(-4, 0, 8, 8);
    c.fillStyle = '#FFFFFF'; circle(c, -5, -5, 2.5); c.fill(); circle(c, 4, -7, 2); c.fill();
    c.restore();
  }
}
function drawBlocks(c, time) {
  for (const o of G.blocks) {
    const k = o.t < 1 && Math.floor(time * 10) % 2;
    c.fillStyle = o.flashT > 0 || k ? '#FFFFFF' : o.color; c.strokeStyle = OUT; c.lineWidth = 2;
    rr(c, o.x - 12, o.y - 12, 24, 24, 4); c.fill(); c.stroke();
    circle(c, o.x - 5, o.y - 13, 3.5); c.fill(); c.stroke(); circle(c, o.x + 5, o.y - 13, 3.5); c.fill(); c.stroke();
  }
}

// 好一会儿没进展：把还没完成的目标标出来（躲在草丛里的敌人、看不清的星星）
function hintTargets(g) {
  if (g.phase !== 'play' || g.tut || g.t - g.lastProg < 10) return [];
  switch (g.mode) {
    case 'collect': return g.gems.filter(s => !s.got);
    case 'rescue': return g.cages.filter(k => !k.open);
    case 'push': return g.pads.filter(p => !p.done);
    case 'kill': {
      if (g.L.boss && g.bossOn) return [];
      const list = g.tanks.filter(e => e.kind === 'enemy' && !e.dead && !e.gold && e.type !== 'boss');
      return list.length <= 3 ? list : [];
    }
  }
  return [];
}
function drawFindHint(c, g, time) {
  const list = hintTargets(g);
  if (!list.length) return;
  if (!g.hintSaid) { g.hintSaid = true; say(g.mode === 'kill' ? '还有敌人藏在这里哦' : '看看发光的地方'); }
  const bob = Math.abs(Math.sin(time * 5)) * 10;
  for (const o of list) {
    c.strokeStyle = `rgba(255,225,77,${0.6 + 0.4 * Math.sin(time * 8)})`; c.lineWidth = 4;
    circle(c, o.x, o.y, 30 + Math.sin(time * 6) * 4); c.stroke();
    arrowTag(c, o.x, o.y - 34 - bob, '#FFE14D', g.mode === 'kill' ? '在这里！' : '这里！');
  }
}
