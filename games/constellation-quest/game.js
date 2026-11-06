import { CONSTELLATIONS } from './levels.js';
import {
  normalizeEdge,
  verifyConstellation,
  calculateStars,
  sanitizeProgress,
} from './engine.js';
import { sfx } from './audio.js';

class ConstellationQuestGame {
  constructor() {
    this.currentLevelIndex = 0;
    this.selectedStar = null;
    this.userEdges = new Set();
    this.mistakes = 0;
    this.hasCleared = false;
    this.hoverStar = null;

    // Load progress
    try {
      const raw = JSON.parse(localStorage.getItem('constellation_quest_progress') || '{}');
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
    this.constellationDescEl = document.getElementById('constellation-desc');
    this.tipTextEl = document.getElementById('tip-text');
    this.progressTagEl = document.getElementById('progress-tag');
    this.linesListEl = document.getElementById('lines-checklist');
    this.canvas = document.getElementById('sky-canvas');
    this.ctx = this.canvas.getContext('2d');

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
    this.canvas.addEventListener('pointerdown', (e) => {
      sfx.init();
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      this.handleCanvasClick(x, y);
    });

    this.btnReset.addEventListener('click', () => {
      sfx.init();
      this.resetLines();
    });

    this.btnMute.addEventListener('click', () => {
      sfx.init();
      sfx.muted = !sfx.muted;
      this.btnMute.textContent = sfx.muted ? '🔇 静音' : '🔊 声音';
    });

    this.btnLevels.addEventListener('click', () => {
      sfx.init();
      this.renderLevelsGrid();
      this.levelsModal.classList.add('open');
    });

    this.btnCloseLevels.addEventListener('click', () => {
      this.levelsModal.classList.remove('open');
    });

    this.btnReplay.addEventListener('click', () => {
      this.winModal.classList.remove('open');
      this.resetLines();
    });

    this.btnNextLevel.addEventListener('click', () => {
      this.winModal.classList.remove('open');
      if (this.currentLevelIndex + 1 < CONSTELLATIONS.length) {
        this.loadLevel(this.currentLevelIndex + 1);
      } else {
        this.loadLevel(0);
      }
    });
  }

  coordToPixel(x, y) {
    const marginL = 60;
    const marginB = 60;
    const w = this.canvas.width - marginL - 40;
    const h = this.canvas.height - marginB - 40;

    const px = marginL + (x / 10) * w;
    const py = this.canvas.height - marginB - (y / 10) * h;
    return { px, py };
  }

  loadLevel(index) {
    this.currentLevelIndex = index;
    const lvl = CONSTELLATIONS[index];
    this.levelNameEl.textContent = `第 ${index + 1} 关: ${lvl.name} (${lvl.latin})`;
    this.constellationDescEl.textContent = lvl.desc;
    this.tipTextEl.textContent = lvl.tip;
    this.resetLines();
  }

  resetLines() {
    this.userEdges.clear();
    this.selectedStar = null;
    this.mistakes = 0;
    this.hasCleared = false;
    this.updateUI();
    this.draw();
  }

  handleCanvasClick(clickX, clickY) {
    if (this.hasCleared) return;
    const lvl = CONSTELLATIONS[this.currentLevelIndex];

    // Find star clicked
    let clickedStar = null;
    for (const star of lvl.stars) {
      const { px, py } = this.coordToPixel(star.x, star.y);
      if (Math.hypot(clickX - px, clickY - py) <= 24) {
        clickedStar = star;
        break;
      }
    }

    if (!clickedStar) {
      this.selectedStar = null;
      this.draw();
      return;
    }

    if (!this.selectedStar) {
      this.selectedStar = clickedStar;
      sfx.playStarSelect();
      this.draw();
      return;
    }

    if (this.selectedStar.id === clickedStar.id) {
      this.selectedStar = null;
      this.draw();
      return;
    }

    // Connect or disconnect line
    const edgeKey = normalizeEdge(this.selectedStar.id, clickedStar.id);
    if (this.userEdges.has(edgeKey)) {
      this.userEdges.delete(edgeKey);
      sfx.playLineRemove();
    } else {
      this.userEdges.add(edgeKey);
      sfx.playLineConnect();
    }

    this.selectedStar = clickedStar; // chain to next
    this.checkVictory();
    this.updateUI();
    this.draw();
  }

  checkVictory() {
    const lvl = CONSTELLATIONS[this.currentLevelIndex];
    const res = verifyConstellation(lvl.lines, Array.from(this.userEdges));

    if (res.matched && !this.hasCleared) {
      this.hasCleared = true;
      this.selectedStar = null;
      const stars = calculateStars(res.missing, res.extra, this.mistakes);

      const lId = String(lvl.id);
      const prevStars = this.progress.stars[lId] || 0;
      if (stars > prevStars) {
        this.progress.stars[lId] = stars;
        this.progress.cleared[lId] = true;
        try {
          localStorage.setItem('constellation_quest_progress', JSON.stringify(this.progress));
        } catch {}
      }

      sfx.playConstellationReveal();
      setTimeout(() => {
        this.winStarsEl.textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
        document.getElementById('res-lines').textContent = `${this.userEdges.size} / ${lvl.lines.length}`;
        this.winModal.classList.add('open');
      }, 600);
    }
  }

  updateUI() {
    const lvl = CONSTELLATIONS[this.currentLevelIndex];
    this.progressTagEl.textContent = `已连线: ${this.userEdges.size} / ${lvl.lines.length}`;

    // Render Checklist
    this.linesListEl.innerHTML = '';
    const starMap = new Map();
    lvl.stars.forEach((s) => starMap.set(s.id, s));

    lvl.lines.forEach(([a, b]) => {
      const sA = starMap.get(a);
      const sB = starMap.get(b);
      const key = normalizeEdge(a, b);
      const isDone = this.userEdges.has(key);

      const item = document.createElement('div');
      item.className = `line-check-item ${isDone ? 'done' : ''}`;
      item.innerHTML = `
        <span>${sA.name} (${sA.x},${sA.y}) ➔ ${sB.name} (${sB.x},${sB.y})</span>
        <span>${isDone ? '✨' : '○'}</span>
      `;
      this.linesListEl.appendChild(item);
    });
  }

  draw() {
    const { ctx, canvas } = this;
    const lvl = CONSTELLATIONS[this.currentLevelIndex];

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Deep space gradient
    const grad = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      20,
      canvas.width / 2,
      canvas.height / 2,
      canvas.width * 0.7
    );
    grad.addColorStop(0, '#0c1427');
    grad.addColorStop(1, '#05070d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Coordinate grid lines
    const marginL = 60;
    const marginB = 60;
    const w = canvas.width - marginL - 40;
    const h = canvas.height - marginB - 40;

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';

    for (let i = 0; i <= 10; i++) {
      const x = marginL + (i / 10) * w;
      const y = canvas.height - marginB - (i / 10) * h;

      // Vertical grid
      ctx.beginPath();
      ctx.moveTo(x, 40);
      ctx.lineTo(x, canvas.height - marginB);
      ctx.stroke();

      // Horizontal grid
      ctx.beginPath();
      ctx.moveTo(marginL, y);
      ctx.lineTo(canvas.width - 40, y);
      ctx.stroke();

      // Axis labels
      ctx.fillText(`${i}`, x, canvas.height - marginB + 20);
      ctx.fillText(`${i}`, marginL - 20, y + 4);
    }

    // Axes
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(marginL, 30);
    ctx.lineTo(marginL, canvas.height - marginB);
    ctx.lineTo(canvas.width - 25, canvas.height - marginB);
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.fillText('X 轴', canvas.width - 15, canvas.height - marginB + 4);
    ctx.fillText('Y 轴', marginL, 22);

    // Draw user connected lines
    const starMap = new Map();
    lvl.stars.forEach((s) => starMap.set(s.id, s));

    ctx.strokeStyle = this.hasCleared ? '#f59e0b' : '#38bdf8';
    ctx.lineWidth = this.hasCleared ? 3.5 : 2.5;
    ctx.shadowBlur = this.hasCleared ? 16 : 8;
    ctx.shadowColor = this.hasCleared ? '#f59e0b' : '#38bdf8';

    for (const key of this.userEdges) {
      const [idA, idB] = key.split('-');
      const sA = starMap.get(idA);
      const sB = starMap.get(idB);
      if (sA && sB) {
        const pA = this.coordToPixel(sA.x, sA.y);
        const pB = this.coordToPixel(sB.x, sB.y);
        ctx.beginPath();
        ctx.moveTo(pA.px, pA.py);
        ctx.lineTo(pB.px, pB.py);
        ctx.stroke();
      }
    }
    ctx.shadowBlur = 0;

    // Draw Stars
    for (const star of lvl.stars) {
      const { px, py } = this.coordToPixel(star.x, star.y);
      const isSelected = this.selectedStar && this.selectedStar.id === star.id;

      // Glow halo
      ctx.beginPath();
      ctx.arc(px, py, isSelected ? 18 : 12, 0, Math.PI * 2);
      ctx.fillStyle = isSelected
        ? 'rgba(245, 158, 11, 0.35)'
        : 'rgba(56, 189, 248, 0.2)';
      ctx.fill();

      // Core star
      ctx.beginPath();
      ctx.arc(px, py, isSelected ? 8 : 6, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#f59e0b' : '#ffffff';
      ctx.fill();

      // Star name & coordinate badge
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = isSelected ? '#fbbf24' : '#f8fafc';
      ctx.textAlign = 'center';
      ctx.fillText(`${star.name}`, px, py - 14);

      ctx.font = '10px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`(${star.x}, ${star.y})`, px, py + 18);
    }
  }

  renderLevelsGrid() {
    this.levelsGridEl.innerHTML = '';
    CONSTELLATIONS.forEach((c, idx) => {
      const btn = document.createElement('div');
      btn.className = `level-btn ${idx === this.currentLevelIndex ? 'active' : ''}`;
      const lId = String(c.id);
      const stars = this.progress.stars[lId] || 0;

      btn.innerHTML = `
        <span>第 ${idx + 1} 关</span>
        <span style="font-size: 11px;">${c.name}</span>
        <span style="color: #f59e0b; font-size: 11px;">${stars > 0 ? '⭐'.repeat(stars) : '·'}</span>
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
  new ConstellationQuestGame();
});
