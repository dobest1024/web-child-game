import { LEVELS } from './levels.js';
import {
  timeToAngles,
  addTime,
  isTimeMatch,
  calculateStars,
  sanitizeProgress,
} from './engine.js';
import { sfx } from './audio.js';

class ClockMasterGame {
  constructor() {
    this.currentLevelIndex = 0;
    this.userH = 12;
    this.userM = 0;
    this.moves = 0;
    this.isDragging = false;

    // Load progress
    try {
      const raw = JSON.parse(localStorage.getItem('clock_master_progress') || '{}');
      this.progress = sanitizeProgress(raw);
    } catch {
      this.progress = { cleared: {}, stars: {} };
    }

    this.cacheDOM();
    this.bindEvents();
    this.loadLevel(0);
  }

  cacheDOM() {
    this.levelNameEl = document.getElementById('level-name');
    this.missionTitleEl = document.getElementById('mission-title');
    this.missionDescEl = document.getElementById('mission-desc');
    this.tipTextEl = document.getElementById('tip-text');
    this.canvas = document.getElementById('clock-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.digitalTimeEl = document.getElementById('digital-time');
    this.btnCheck = document.getElementById('btn-check');

    // Controls
    this.btnReset = document.getElementById('btn-reset');
    this.btnLevels = document.getElementById('btn-levels');
    this.btnMute = document.getElementById('btn-mute');

    // Modals
    this.winModal = document.getElementById('win-modal');
    this.winStarsEl = document.getElementById('win-stars');
    this.btnNextLevel = document.getElementById('btn-next-level');
    this.btnReplay = document.getElementById('btn-replay');

    this.levelsModal = document.getElementById('levels-modal');
    this.levelsGridEl = document.getElementById('levels-grid');
    this.btnCloseLevels = document.getElementById('btn-close-levels');
  }

  bindEvents() {
    // Stepping adjustment buttons
    document.querySelectorAll('[data-step]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        sfx.init();
        const delta = parseInt(e.target.dataset.step, 10);
        this.stepMinutes(delta);
      });
    });

    // Check time button
    this.btnCheck.addEventListener('click', () => {
      sfx.init();
      this.verifyTime();
    });

    // Canvas pointer drag for minute hand
    this.canvas.addEventListener('pointerdown', (e) => {
      sfx.init();
      this.isDragging = true;
      this.handlePointer(e);
    });

    window.addEventListener('pointermove', (e) => {
      if (this.isDragging) {
        this.handlePointer(e);
      }
    });

    window.addEventListener('pointerup', () => {
      this.isDragging = false;
    });

    // Reset
    this.btnReset.addEventListener('click', () => {
      sfx.init();
      this.loadLevel(this.currentLevelIndex);
    });

    // Mute
    this.btnMute.addEventListener('click', () => {
      sfx.init();
      sfx.muted = !sfx.muted;
      this.btnMute.textContent = sfx.muted ? '🔇 静音' : '🔊 声音';
    });

    // Levels modal
    this.btnLevels.addEventListener('click', () => {
      sfx.init();
      this.renderLevelsGrid();
      this.levelsModal.classList.add('open');
    });

    this.btnCloseLevels.addEventListener('click', () => {
      this.levelsModal.classList.remove('open');
    });

    // Win dialog actions
    this.btnReplay.addEventListener('click', () => {
      this.winModal.classList.remove('open');
      this.loadLevel(this.currentLevelIndex);
    });

    this.btnNextLevel.addEventListener('click', () => {
      this.winModal.classList.remove('open');
      if (this.currentLevelIndex + 1 < LEVELS.length) {
        this.loadLevel(this.currentLevelIndex + 1);
      } else {
        this.loadLevel(0);
      }
    });
  }

  handlePointer(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX - 180;
    const y = (e.clientY - rect.top) * scaleY - 180;

    // Angle clockwise from top (12 o'clock)
    let deg = (Math.atan2(y, x) * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;

    // Nearest minute (each minute is 6 deg)
    const m = Math.round(deg / 6) % 60;
    if (m !== this.userM) {
      // Check hour rollover if crossing between 59 and 0
      if (this.userM > 45 && m < 15) {
        this.userH = (this.userH % 12) + 1;
      } else if (this.userM < 15 && m > 45) {
        this.userH = this.userH - 1 <= 0 ? 12 : this.userH - 1;
      }
      this.userM = m;
      this.moves++;
      sfx.playTick();
      this.updateUI();
      this.draw();
    }
  }

  stepMinutes(deltaMinutes) {
    const next = addTime(this.userH, this.userM, deltaMinutes);
    this.userH = next.hours;
    this.userM = next.minutes;
    this.moves++;
    sfx.playTick();
    this.updateUI();
    this.draw();
  }

  loadLevel(index) {
    this.currentLevelIndex = index;
    const lvl = LEVELS[index];
    this.levelNameEl.textContent = `第 ${index + 1} 关: ${lvl.title}`;
    this.missionTitleEl.textContent = `🎯 任务: ${lvl.title}`;
    this.missionDescEl.textContent = lvl.desc;
    this.tipTextEl.textContent = lvl.tip;

    this.userH = lvl.startH;
    this.userM = lvl.startM;
    this.moves = 0;

    this.updateUI();
    this.draw();
  }

  updateUI() {
    const hStr = String(this.userH).padStart(2, '0');
    const mStr = String(this.userM).padStart(2, '0');
    this.digitalTimeEl.textContent = `${hStr}:${mStr}`;
  }

  verifyTime() {
    const lvl = LEVELS[this.currentLevelIndex];
    const isOk = isTimeMatch(this.userH, this.userM, lvl.targetH, lvl.targetM);

    if (isOk) {
      sfx.playGong();
      setTimeout(() => sfx.playWin(), 300);

      const stars = calculateStars(this.moves, lvl.optimalMoves);
      const lId = String(lvl.id);
      const prevStars = this.progress.stars[lId] || 0;
      if (stars > prevStars) {
        this.progress.stars[lId] = stars;
        this.progress.cleared[lId] = true;
        try {
          localStorage.setItem('clock_master_progress', JSON.stringify(this.progress));
        } catch {}
      }

      this.winStarsEl.textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
      const targetStr = `${String(lvl.targetH).padStart(2, '0')}:${String(lvl.targetM).padStart(2, '0')}`;
      document.getElementById('res-target-time').textContent = targetStr;
      this.winModal.classList.add('open');
    } else {
      sfx.playTick();
      alert('还差一点点哦！请仔细对照时针与分针的位置，再试一次！');
    }
  }

  draw() {
    const { ctx, canvas } = this;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = 160;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Outer Brass Rim
    ctx.beginPath();
    ctx.arc(cx, cy, r + 14, 0, Math.PI * 2);
    ctx.fillStyle = '#b45309';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#eab308';
    ctx.stroke();

    // Inner Dial Face
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#fffdf7';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#3d2b22';
    ctx.stroke();

    // Dial Ticks and Numbers
    for (let i = 0; i < 60; i++) {
      const angle = (i * Math.PI) / 30;
      const isHour = i % 5 === 0;
      const tickLength = isHour ? 14 : 7;

      const x1 = cx + Math.sin(angle) * (r - 4);
      const y1 = cy - Math.cos(angle) * (r - 4);
      const x2 = cx + Math.sin(angle) * (r - 4 - tickLength);
      const y2 = cy - Math.cos(angle) * (r - 4 - tickLength);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = isHour ? 3 : 1;
      ctx.strokeStyle = isHour ? '#291b14' : '#8c7365';
      ctx.stroke();

      if (isHour) {
        const num = i === 0 ? 12 : i / 5;
        const numX = cx + Math.sin(angle) * (r - 30);
        const numY = cy - Math.cos(angle) * (r - 30) + 6;
        ctx.font = 'bold 22px serif';
        ctx.fillStyle = '#291b14';
        ctx.textAlign = 'center';
        ctx.fillText(String(num), numX, numY);
      }
    }

    // Hand Angles
    const { minuteAngle, hourAngle } = timeToAngles(this.userH, this.userM);

    // Draw Hour Hand (Blue / Brass)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((hourAngle * Math.PI) / 180);

    ctx.beginPath();
    ctx.moveTo(-6, 15);
    ctx.lineTo(-6, -70);
    ctx.lineTo(0, -90);
    ctx.lineTo(6, -70);
    ctx.lineTo(6, 15);
    ctx.closePath();
    ctx.fillStyle = '#0284c7';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#082f49';
    ctx.stroke();
    ctx.restore();

    // Draw Minute Hand (Red / Arrow tip)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((minuteAngle * Math.PI) / 180);

    ctx.beginPath();
    ctx.moveTo(-4, 20);
    ctx.lineTo(-4, -115);
    ctx.lineTo(-8, -115);
    ctx.lineTo(0, -135);
    ctx.lineTo(8, -115);
    ctx.lineTo(4, -115);
    ctx.lineTo(4, 20);
    ctx.closePath();
    ctx.fillStyle = '#dc2626';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#450a0a';
    ctx.stroke();
    ctx.restore();

    // Center Hub Jewel Cap
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#eab308';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#78350f';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
  }

  renderLevelsGrid() {
    this.levelsGridEl.innerHTML = '';
    LEVELS.forEach((lvl, idx) => {
      const btn = document.createElement('div');
      btn.className = `level-btn ${idx === this.currentLevelIndex ? 'active' : ''}`;
      const lId = String(lvl.id);
      const stars = this.progress.stars[lId] || 0;

      btn.innerHTML = `
        <span>第 ${idx + 1} 关</span>
        <span style="font-size: 11px;">${lvl.title}</span>
        <span style="color: #fbbf24; font-size: 11px;">${stars > 0 ? '⭐'.repeat(stars) : '·'}</span>
      `;

      btn.addEventListener('click', () => {
        this.levelsModal.classList.remove('open');
        this.loadLevel(idx);
      });

      this.levelsGridEl.appendChild(btn);
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new ClockMasterGame();
});
