import { LEVELS } from './levels.js';
import { solveGears, calculateStars, sanitizeProgress, GEAR_TYPES, distance } from './engine.js';
import { sfx } from './audio.js';

class GearLabGame {
  constructor() {
    this.currentLevelIndex = 0;
    this.placedGears = {}; // pegId -> 'S'|'M'|'L'
    this.gearAngles = {}; // pegId -> current angle in radians
    this.selectedTrayGear = null;
    this.solveResult = { solved: false, jammed: false, gearStates: {} };
    this.animationId = null;
    this.lastTime = performance.now();
    this.hasCleared = false;

    // Load progress
    try {
      const raw = JSON.parse(localStorage.getItem('gear_lab_progress') || '{}');
      this.progress = sanitizeProgress(raw);
    } catch {
      this.progress = { cleared: {}, stars: {} };
    }

    this.cacheDOM();
    this.bindEvents();
    this.loadLevel(0);
    this.loop();
  }

  cacheDOM() {
    this.levelTitleEl = document.getElementById('level-title');
    this.levelDescEl = document.getElementById('level-desc');
    this.tipTextEl = document.getElementById('tip-text');
    this.statusDotEl = document.getElementById('status-dot');
    this.statusTextEl = document.getElementById('status-text');
    this.canvas = document.getElementById('gear-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.trayGearsEl = document.getElementById('gears-tray');

    this.btnLevels = document.getElementById('btn-levels');
    this.btnReset = document.getElementById('btn-reset');
    this.btnMute = document.getElementById('btn-mute');

    this.winModal = document.getElementById('win-modal');
    this.winStarsEl = document.getElementById('win-stars');
    this.btnNextLevel = document.getElementById('btn-next-level');
    this.btnReplay = document.getElementById('btn-replay');

    this.levelsModal = document.getElementById('levels-modal');
    this.levelsGridEl = document.getElementById('levels-grid');
    this.btnCloseLevels = document.getElementById('btn-close-levels');
  }

  bindEvents() {
    // Canvas pointer interaction
    this.canvas.addEventListener('pointerdown', (e) => {
      sfx.init();
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      this.handleCanvasClick(x, y);
    });

    // Mute toggle
    this.btnMute.addEventListener('click', () => {
      sfx.init();
      sfx.muted = !sfx.muted;
      this.btnMute.textContent = sfx.muted ? '🔇 静音' : '🔊 声音';
    });

    // Reset
    this.btnReset.addEventListener('click', () => {
      sfx.init();
      this.resetLevel();
    });

    // Levels dialog
    this.btnLevels.addEventListener('click', () => {
      sfx.init();
      this.renderLevelsGrid();
      this.levelsModal.classList.add('open');
    });

    this.btnCloseLevels.addEventListener('click', () => {
      this.levelsModal.classList.remove('open');
    });

    // Win dialog
    this.btnReplay.addEventListener('click', () => {
      this.winModal.classList.remove('open');
      this.resetLevel();
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

  loadLevel(index) {
    this.currentLevelIndex = index;
    const lvl = LEVELS[index];
    this.levelTitleEl.textContent = `第 ${index + 1} 关: ${lvl.title}`;
    this.levelDescEl.textContent = lvl.desc;
    this.tipTextEl.textContent = lvl.tip;
    this.placedGears = {};
    this.gearAngles = {};
    this.hasCleared = false;
    this.selectedTrayGear = null;

    // Initialize angles for all pegs
    lvl.pegs.forEach((p) => {
      this.gearAngles[p.id] = 0;
    });

    // Auto-select first available gear in tray
    if (lvl.tray.length > 0) {
      this.selectedTrayGear = lvl.tray[0];
    }

    this.updateSolution();
    this.renderTray();
  }

  resetLevel() {
    this.placedGears = {};
    this.hasCleared = false;
    this.updateSolution();
    this.renderTray();
  }

  getTrayCounts() {
    const lvl = LEVELS[this.currentLevelIndex];
    const total = {};
    lvl.tray.forEach((g) => {
      total[g] = (total[g] || 0) + 1;
    });

    // Subtract placed
    for (const g of Object.values(this.placedGears)) {
      if (total[g] > 0) {
        total[g]--;
      }
    }
    return total;
  }

  handleCanvasClick(x, y) {
    const lvl = LEVELS[this.currentLevelIndex];

    // Check if clicked an existing placed gear or peg
    for (const peg of lvl.pegs) {
      const d = Math.hypot(peg.x - x, peg.y - y);
      const isOccupied = peg.fixedGear || this.placedGears[peg.id];

      // If clicked on placed player gear -> remove it
      if (this.placedGears[peg.id]) {
        const radius = GEAR_TYPES[this.placedGears[peg.id]].radius;
        if (d <= radius) {
          delete this.placedGears[peg.id];
          sfx.playGearRemove();
          this.updateSolution();
          this.renderTray();
          return;
        }
      }

      // If clicked on an empty peg -> place currently selected gear
      if (!isOccupied && d <= 30) {
        if (!this.selectedTrayGear) return;
        const counts = this.getTrayCounts();
        if (counts[this.selectedTrayGear] > 0) {
          this.placedGears[peg.id] = this.selectedTrayGear;
          sfx.playGearSnap();
          this.updateSolution();
          this.renderTray();
          return;
        }
      }
    }
  }

  updateSolution() {
    const lvl = LEVELS[this.currentLevelIndex];
    this.solveResult = solveGears(lvl.pegs, this.placedGears);

    if (this.solveResult.jammed) {
      this.statusDotEl.className = 'status-dot jammed';
      this.statusTextEl.textContent = `⚠️ ${this.solveResult.jamReason || '齿轮卡死'}`;
      sfx.playJamBuzz();
    } else if (this.solveResult.solved) {
      this.statusDotEl.className = 'status-dot running';
      this.statusTextEl.textContent = '✨ 完美啮合！机械全速运转中';
      if (!this.hasCleared) {
        this.hasCleared = true;
        setTimeout(() => this.triggerWin(), 600);
      }
    } else {
      this.statusDotEl.className = 'status-dot';
      this.statusTextEl.textContent = '动力未接通至所有目标';
    }
  }

  triggerWin() {
    const lvl = LEVELS[this.currentLevelIndex];
    const gearsUsed = Object.keys(this.placedGears).length;
    const stars = calculateStars(true, gearsUsed, lvl.optimalGears);

    const lId = String(lvl.id);
    const prevStars = this.progress.stars[lId] || 0;
    if (stars > prevStars) {
      this.progress.stars[lId] = stars;
      this.progress.cleared[lId] = true;
      try {
        localStorage.setItem('gear_lab_progress', JSON.stringify(this.progress));
      } catch {}
    }

    sfx.playWinChime();

    this.winStarsEl.textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    document.getElementById('res-gears').textContent = `${gearsUsed} 个 (标杆: ${lvl.optimalGears})`;
    this.winModal.classList.add('open');
  }

  renderTray() {
    this.trayGearsEl.innerHTML = '';
    const counts = this.getTrayCounts();
    const gearTypes = ['S', 'M', 'L'];

    gearTypes.forEach((gt) => {
      const typeInfo = GEAR_TYPES[gt];
      const count = counts[gt] || 0;
      if (count === 0 && this.selectedTrayGear === gt) {
        // find another available
        this.selectedTrayGear = null;
      }

      const itemEl = document.createElement('div');
      itemEl.className = `tray-gear-item ${this.selectedTrayGear === gt ? 'selected' : ''}`;
      itemEl.style.opacity = count > 0 ? '1' : '0.45';

      itemEl.innerHTML = `
        <div class="tray-gear-preview" style="color: ${typeInfo.color};">⚙️</div>
        <div class="tray-gear-meta">
          <span class="tray-gear-name">${typeInfo.name}</span>
          <span class="tray-gear-count">剩余: ${count}</span>
        </div>
      `;

      itemEl.addEventListener('click', () => {
        if (count > 0) {
          this.selectedTrayGear = gt;
          this.renderTray();
        }
      });

      this.trayGearsEl.appendChild(itemEl);
    });
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
        <span class="level-btn-stars">${stars > 0 ? '⭐'.repeat(stars) : '·'}</span>
      `;

      btn.addEventListener('click', () => {
        this.levelsModal.classList.remove('open');
        this.loadLevel(idx);
      });

      this.levelsGridEl.appendChild(btn);
    });
  }

  loop() {
    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // Update gear angles if running
    if (!this.solveResult.jammed && this.solveResult.gearStates) {
      for (const [pegId, state] of Object.entries(this.solveResult.gearStates)) {
        // 1.0 speed corresponds to ~2 rad/s
        this.gearAngles[pegId] = (this.gearAngles[pegId] || 0) + state.angSpeed * 2.5 * dt;
      }
    }

    this.draw();
    this.animationId = requestAnimationFrame(() => this.loop());
  }

  draw() {
    const { ctx, canvas } = this;
    const lvl = LEVELS[this.currentLevelIndex];

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background blueprint grid dots
    ctx.fillStyle = '#334155';
    for (let x = 20; x < canvas.width; x += 30) {
      for (let y = 20; y < canvas.height; y += 30) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw empty pegs
    for (const peg of lvl.pegs) {
      const isOccupied = peg.fixedGear || this.placedGears[peg.id];

      // Draw peg mount base
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = peg.isMotor ? '#0369a1' : peg.isTarget ? '#b45309' : '#1e293b';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = peg.isMotor ? '#38bdf8' : peg.isTarget ? '#f59e0b' : '#475569';
      ctx.stroke();

      if (!isOccupied) {
        // Center pin
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#94a3b8';
        ctx.fill();

        // Guide text for empty peg
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'center';
        ctx.fillText('空轴', peg.x, peg.y + 24);
      }
    }

    // Draw gears on pegs
    for (const peg of lvl.pegs) {
      const gType = peg.fixedGear || this.placedGears[peg.id];
      if (!gType) continue;

      const typeInfo = GEAR_TYPES[gType];
      const angle = this.gearAngles[peg.id] || 0;
      const state = this.solveResult.gearStates ? this.solveResult.gearStates[peg.id] : null;

      this.drawGear(peg.x, peg.y, typeInfo, angle, peg, state);
    }
  }

  drawGear(x, y, typeInfo, angle, peg, state) {
    const { ctx } = this;
    const { radius, teeth, color } = typeInfo;
    const innerR = radius - 8;
    const toothAngle = (Math.PI * 2) / teeth;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Draw teeth path
    ctx.beginPath();
    for (let i = 0; i < teeth; i++) {
      const a = i * toothAngle;
      const a1 = a + toothAngle * 0.25;
      const a2 = a + toothAngle * 0.55;
      const a3 = a + toothAngle * 0.8;

      ctx.lineTo(Math.cos(a) * innerR, Math.sin(a) * innerR);
      ctx.lineTo(Math.cos(a1) * radius, Math.sin(a1) * radius);
      ctx.lineTo(Math.cos(a2) * radius, Math.sin(a2) * radius);
      ctx.lineTo(Math.cos(a3) * innerR, Math.sin(a3) * innerR);
    }
    ctx.closePath();

    // Fill gear body
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    // Spoke cutouts
    const numSpokes = teeth >= 18 ? 4 : 3;
    const spokeR = innerR * 0.55;
    ctx.fillStyle = '#1e293b';
    for (let s = 0; s < numSpokes; s++) {
      const sa = (s * Math.PI * 2) / numSpokes;
      ctx.beginPath();
      ctx.arc(Math.cos(sa) * spokeR, Math.sin(sa) * spokeR, innerR * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Center hub & mounting hole
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#e2e8f0';
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();

    ctx.restore();

    // Overlays (Motor / Target Badges)
    if (peg.isMotor) {
      ctx.save();
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ 动力马达', x, y - radius - 6);
      ctx.restore();
    } else if (peg.isTarget) {
      ctx.save();
      ctx.font = 'bold 11px sans-serif';
      const reqDir = peg.targetReq && peg.targetReq.dir === 1 ? '↻ 顺时针' : peg.targetReq && peg.targetReq.dir === -1 ? '⟲ 逆时针' : '';
      const isOk = state && (!peg.targetReq.dir || state.dir === peg.targetReq.dir);
      ctx.fillStyle = isOk ? '#34d399' : '#f59e0b';
      ctx.textAlign = 'center';
      ctx.fillText(`🎯 目标 ${reqDir}`, x, y - radius - 6);
      ctx.restore();
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GearLabGame();
});
