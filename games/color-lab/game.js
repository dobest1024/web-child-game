import { LEVELS } from './levels.js';
import {
  mixLight,
  mixPigment,
  colorDistance,
  isColorMatch,
  calculateStars,
  sanitizeProgress,
} from './engine.js';
import { sfx } from './audio.js';

class ColorLabGame {
  constructor() {
    this.currentLevelIndex = 0;
    this.lightValues = { r: 0, g: 0, b: 0 };
    this.pigmentDrops = { c: 0, m: 0, y: 0, w: 0, k: 0 };
    this.moves = 0;
    this.hasCleared = false;

    // Load progress
    try {
      const raw = JSON.parse(localStorage.getItem('color_lab_progress') || '{}');
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
    this.tipTextEl = document.getElementById('tip-text');
    this.swatchTarget = document.getElementById('swatch-target');
    this.swatchCurrent = document.getElementById('swatch-current');
    this.matchAccuracyEl = document.getElementById('match-accuracy');
    this.lightPanel = document.getElementById('light-panel');
    this.pigmentPanel = document.getElementById('pigment-panel');

    // Light inputs
    this.sliderR = document.getElementById('slider-r');
    this.sliderG = document.getElementById('slider-g');
    this.sliderB = document.getElementById('slider-b');
    this.valR = document.getElementById('val-r');
    this.valG = document.getElementById('val-g');
    this.valB = document.getElementById('val-b');

    // Pigment container
    this.droppersContainer = document.getElementById('droppers-container');
    this.btnResetPigments = document.getElementById('btn-reset-pigments');

    // Actions
    this.btnLevels = document.getElementById('btn-levels');
    this.btnReset = document.getElementById('btn-reset');
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
    // Light sliders
    const handleSlider = () => {
      sfx.init();
      sfx.playSlider();
      this.moves++;
      this.lightValues.r = parseFloat(this.sliderR.value);
      this.lightValues.g = parseFloat(this.sliderG.value);
      this.lightValues.b = parseFloat(this.sliderB.value);

      this.valR.textContent = `${Math.round(this.lightValues.r * 100)}%`;
      this.valG.textContent = `${Math.round(this.lightValues.g * 100)}%`;
      this.valB.textContent = `${Math.round(this.lightValues.b * 100)}%`;

      this.updateColor();
    };

    this.sliderR.addEventListener('input', handleSlider);
    this.sliderG.addEventListener('input', handleSlider);
    this.sliderB.addEventListener('input', handleSlider);

    // Reset pigments
    this.btnResetPigments.addEventListener('click', () => {
      sfx.init();
      sfx.playClear();
      this.pigmentDrops = { c: 0, m: 0, y: 0, w: 0, k: 0 };
      this.moves = 0;
      this.renderPigmentDroppers();
      this.updateColor();
    });

    // Reset button
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

    // Win dialog
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

  loadLevel(index) {
    this.currentLevelIndex = index;
    const lvl = LEVELS[index];
    this.levelNameEl.textContent = `第 ${index + 1} 关: ${lvl.title} (${lvl.mode === 'light' ? '色光加色法' : '颜料减色法'})`;
    this.tipTextEl.textContent = lvl.tip;
    this.hasCleared = false;
    this.moves = 0;

    // Set Target Swatch
    this.swatchTarget.style.backgroundColor = lvl.target.hex;

    if (lvl.mode === 'light') {
      this.lightPanel.style.display = 'flex';
      this.pigmentPanel.style.display = 'none';

      // Reset sliders
      this.lightValues = { r: 0, g: 0, b: 0 };
      this.sliderR.value = 0;
      this.sliderG.value = 0;
      this.sliderB.value = 0;
      this.valR.textContent = '0%';
      this.valG.textContent = '0%';
      this.valB.textContent = '0%';
    } else {
      this.lightPanel.style.display = 'none';
      this.pigmentPanel.style.display = 'flex';

      this.pigmentDrops = { c: 0, m: 0, y: 0, w: 0, k: 0 };
      this.renderPigmentDroppers();
    }

    this.updateColor();
  }

  renderPigmentDroppers() {
    this.droppersContainer.innerHTML = '';
    const lvl = LEVELS[this.currentLevelIndex];
    if (lvl.mode !== 'pigment') return;

    const PIGMENT_CONFIG = {
      c: { name: '青色 (Cyan)', color: '#00d2d3', icon: '🔵' },
      m: { name: '品红 (Magenta)', color: '#ff4d4d', icon: '🟣' },
      y: { name: '黄色 (Yellow)', color: '#feca57', icon: '🟡' },
      w: { name: '白色 (White)', color: '#ffffff', icon: '⚪' },
      k: { name: '黑色 (Black)', color: '#222f3e', icon: '⚫' },
    };

    lvl.palette.forEach((pk) => {
      const conf = PIGMENT_CONFIG[pk];
      const count = this.pigmentDrops[pk] || 0;

      const btn = document.createElement('div');
      btn.className = 'dropper-btn';
      btn.innerHTML = `
        <div class="dropper-icon" style="background: ${conf.color}22; border: 2px solid ${conf.color};">
          ${conf.icon}
        </div>
        <span style="font-size: 13px; font-weight: 700;">${conf.name}</span>
        <span class="dropper-count">已滴: ${count} 滴</span>
      `;

      btn.addEventListener('click', () => {
        sfx.init();
        sfx.playDrop();
        this.pigmentDrops[pk] = (this.pigmentDrops[pk] || 0) + 1;
        this.moves++;
        this.renderPigmentDroppers();
        this.updateColor();
      });

      this.droppersContainer.appendChild(btn);
    });
  }

  updateColor() {
    const lvl = LEVELS[this.currentLevelIndex];
    let currentRgb;

    if (lvl.mode === 'light') {
      currentRgb = mixLight(this.lightValues.r, this.lightValues.g, this.lightValues.b);
    } else {
      currentRgb = mixPigment(this.pigmentDrops);
    }

    this.swatchCurrent.style.backgroundColor = currentRgb.hex;

    // Calculate match distance
    const dist = colorDistance(currentRgb, lvl.target);
    const accuracy = Math.max(0, Math.min(100, Math.round(100 - dist * 1.8)));
    this.matchAccuracyEl.textContent = `${accuracy}%`;

    // Victory check
    if (!this.hasCleared && isColorMatch(currentRgb, lvl.target, 18)) {
      this.hasCleared = true;
      setTimeout(() => this.triggerWin(dist), 500);
    }
  }

  triggerWin(dist) {
    const lvl = LEVELS[this.currentLevelIndex];
    const stars = calculateStars(dist, lvl.optimalMoves, this.moves);

    const lId = String(lvl.id);
    const prevStars = this.progress.stars[lId] || 0;
    if (stars > prevStars) {
      this.progress.stars[lId] = stars;
      this.progress.cleared[lId] = true;
      try {
        localStorage.setItem('color_lab_progress', JSON.stringify(this.progress));
      } catch {}
    }

    sfx.playSuccess();
    this.winStarsEl.textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    document.getElementById('res-accuracy').textContent = this.matchAccuracyEl.textContent;
    this.winModal.classList.add('open');
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
        <span style="font-size: 11px; color: #ec4899;">${lvl.mode === 'light' ? 'RGB光' : '颜料'}</span>
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
  new ColorLabGame();
});
