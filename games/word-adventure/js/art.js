'use strict';
// ===== 画图小工具：图片（emoji / 颜料 / 数字 / 字母）、恐龙、背景 =====
// 统一描边色 #33405a，圆滚滚、大眼睛、亮颜色

const INK = '#33405a';
const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
const ROUND_FONT = '"Arial Rounded MT Bold", "PingFang SC", "Microsoft YaHei", sans-serif';

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function text(ctx, str, x, y, size, color = INK, font = ROUND_FONT, weight = 'bold') {
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

// 一张图，画在 (cx, cy) 为中心、边长约 size 的方框里
function drawPic(ctx, pic, cx, cy, size) {
  if (pic.text) {
    const chars = [...pic.text];
    const rows = [];
    for (let i = 0; i < chars.length; i += 4) rows.push(chars.slice(i, i + 4).join(''));
    const font = Math.min(24, size / 4);
    rows.forEach((row, i) => text(ctx, row, cx, cy + (i - (rows.length - 1) / 2) * (font + 4), font));
  } else if (pic.emoji) {
    ctx.font = `${Math.round(size * 0.82)}px ${EMOJI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText(pic.emoji, cx, cy + size * 0.04);
  } else if (pic.color) {
    // 一团颜料：中间大圆 + 几个小鼓包
    const r = size * 0.34;
    ctx.fillStyle = pic.color;
    ctx.strokeStyle = pic.color === '#ffffff' ? '#9aa3b5' : 'rgba(0,0,0,.18)';
    ctx.lineWidth = Math.max(2, size * 0.03);
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const rr = r * (1 + (i % 2 ? 0.16 : -0.02));
      const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.quadraticCurveTo(cx + Math.cos(a - 0.26) * rr * 1.08, cy + Math.sin(a - 0.26) * rr * 1.08, px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    circle(ctx, cx - r * 0.35, cy - r * 0.35, r * 0.18);
  } else if (pic.number) {
    text(ctx, String(pic.number), cx, cy - size * 0.16, size * 0.46, '#3b6fd1');
    // 圆点：一行最多 5 个
    const n = pic.number, rows = n > 5 ? 2 : 1, dot = size * 0.075;
    for (let i = 0; i < n; i++) {
      const row = rows === 2 && i >= 5 ? 1 : 0;
      const inRow = rows === 2 ? (row ? n - 5 : 5) : n;
      const col = row ? i - 5 : i;
      const x = cx + (col - (inRow - 1) / 2) * dot * 2.4;
      const y = cy + size * 0.2 + row * dot * 2.4;
      ctx.fillStyle = '#ff8a3d';
      circle(ctx, x, y, dot);
    }
  } else if (pic.letter) {
    text(ctx, pic.letter.toUpperCase(), cx - size * 0.14, cy, size * 0.56, '#e2574c');
    text(ctx, pic.letter, cx + size * 0.24, cy + size * 0.08, size * 0.38, '#3b6fd1');
  }
}

// 恐龙：mood = 'idle' | 'warn' | 'hurt' | 'dead'；king 带皇冠；calm 时挨打不晃
function drawDino(ctx, x, y, s, { mood = 'idle', king = false, t = 0, calm = false } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (mood === 'hurt' && !calm) ctx.translate(Math.sin(t * 60) * 5, 0);
  const body = mood === 'hurt' ? '#ffffff' : king ? '#8fd17a' : '#9fd8a0';
  ctx.lineWidth = 5;
  ctx.strokeStyle = INK;
  ctx.fillStyle = body;
  // 尾巴、身体、头
  ctx.beginPath();
  ctx.moveTo(60, 40);
  ctx.quadraticCurveTo(120, 50, 130, 10);
  ctx.quadraticCurveTo(110, 70, 40, 80);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, 40, 70, 62, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-30, -50, 58, 46, -0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // 背上的小刺
  ctx.fillStyle = '#ffb547';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    const bx = 10 + i * 26, by = -10 + i * 12;
    ctx.moveTo(bx - 12, by + 6); ctx.lineTo(bx, by - 18); ctx.lineTo(bx + 12, by + 8);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // 肚皮、脚
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath(); ctx.ellipse(-10, 52, 38, 34, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = body;
  const stomp = mood === 'warn' ? Math.abs(Math.sin(t * 14)) * 14 : 0;
  roundRect(ctx, -50, 88 - stomp, 34, 26, 10); ctx.fill(); ctx.stroke();
  roundRect(ctx, 10, 88, 34, 26, 10); ctx.fill(); ctx.stroke();
  // 眼睛、嘴
  ctx.fillStyle = '#fff';
  circle(ctx, -48, -62, 15); circle(ctx, -14, -66, 15);
  ctx.fillStyle = INK;
  if (mood === 'dead') {
    text(ctx, '×', -48, -60, 26); text(ctx, '×', -14, -64, 26);
  } else {
    circle(ctx, -46, -60, 7); circle(ctx, -12, -64, 7);
  }
  ctx.lineWidth = 4;
  ctx.beginPath();
  if (mood === 'warn') ctx.ellipse(-34, -26, 14, 9, 0, 0, Math.PI * 2);
  else ctx.arc(-34, -34, 14, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = '#ff9fb2';
  circle(ctx, -66, -40, 7); circle(ctx, 2, -44, 7);
  if (king) {
    ctx.fillStyle = '#ffd23f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-62, -92); ctx.lineTo(-56, -126); ctx.lineTo(-40, -104); ctx.lineTo(-28, -132); ctx.lineTo(-16, -104); ctx.lineTo(0, -126); ctx.lineTo(2, -92);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  if (mood === 'warn') text(ctx, '!', -30, -150 + Math.sin(t * 30) * 4, 64, '#ff4d4d');
  ctx.restore();
}

// 天空、云、草地
function drawBackground(ctx, world, w, h, t, groundY = h - 40) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, world.bg[0]);
  sky.addColorStop(1, world.bg[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  for (let i = 0; i < 4; i++) {
    const x = ((i * 290 + t * 12) % (w + 240)) - 120, y = 60 + (i % 2) * 50;
    circle(ctx, x, y, 24); circle(ctx, x + 28, y - 10, 30); circle(ctx, x + 58, y, 22);
  }
  ctx.fillStyle = world.ground;
  ctx.fillRect(0, groundY, w, h - groundY);
}

if (typeof module === 'object') module.exports = { drawPic, drawDino, drawBackground, circle, roundRect, text };
