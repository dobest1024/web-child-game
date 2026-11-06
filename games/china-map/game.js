import {
  PROVINCES,
  REGIONS,
  getProvincesByRegion,
  generateQuiz,
  sanitizeProgress,
} from './engine.js';
import { sfx } from './audio.js';

// Provincial centroid / approximate map coordinates on 800x600 viewBox
export const PROV_COORDS = {
  xj: { x: 160, y: 170, w: 140, h: 100 },
  xz: { x: 190, y: 340, w: 130, h: 80 },
  qh: { x: 330, y: 270, w: 80, h: 60 },
  gs: { x: 390, y: 220, w: 75, h: 55 },
  nm: { x: 440, y: 140, w: 120, h: 60 },
  hl: { x: 670, y: 90, w: 85, h: 70 },
  jl: { x: 670, y: 170, w: 75, h: 50 },
  ln: { x: 630, y: 215, w: 65, h: 45 },
  bj: { x: 545, y: 200, w: 42, h: 32 },
  tj: { x: 565, y: 225, w: 38, h: 30 },
  he: { x: 525, y: 235, w: 55, h: 50 },
  sx: { x: 480, y: 240, w: 45, h: 55 },
  sd: { x: 570, y: 270, w: 65, h: 45 },
  nx: { x: 410, y: 270, w: 45, h: 40 },
  sn: { x: 455, y: 310, w: 50, h: 60 },
  ha: { x: 520, y: 310, w: 55, h: 50 },
  js: { x: 610, y: 320, w: 50, h: 45 },
  ah: { x: 575, y: 350, w: 48, h: 50 },
  sh: { x: 660, y: 345, w: 34, h: 30 },
  zj: { x: 635, y: 385, w: 48, h: 45 },
  jx: { x: 575, y: 420, w: 48, h: 52 },
  hb: { x: 510, y: 375, w: 55, h: 48 },
  hn: { x: 505, y: 435, w: 52, h: 52 },
  sc: { x: 370, y: 360, w: 80, h: 70 },
  cq: { x: 455, y: 390, w: 45, h: 45 },
  gz: { x: 440, y: 455, w: 52, h: 48 },
  yn: { x: 375, y: 470, w: 68, h: 60 },
  gx: { x: 475, y: 510, w: 58, h: 48 },
  gd: { x: 550, y: 500, w: 68, h: 52 },
  fj: { x: 625, y: 455, w: 50, h: 48 },
  hi: { x: 500, y: 575, w: 45, h: 36 },
  tw: { x: 680, y: 490, w: 42, h: 50 },
  hk: { x: 580, y: 545, w: 32, h: 24 },
  mo: { x: 555, y: 545, w: 32, h: 24 },
};

class ChinaMapGame {
  constructor() {
    this.mode = 'regions'; // 'regions' | 'national' | 'quiz'
    this.currentRegionId = 'north';
    this.placedProvinces = new Set();
    this.selectedProvince = null;

    // Quiz state
    this.quizQuestions = [];
    this.quizIndex = 0;
    this.quizScore = 0;

    // Load progress
    try {
      const raw = JSON.parse(localStorage.getItem('china_map_progress') || '{}');
      this.progress = sanitizeProgress(raw);
    } catch {
      this.progress = { puzzleCleared: {}, quizHighScore: 0 };
    }

    this.cacheDOM();
    this.bindEvents();
    this.initMap();
    this.switchMode('regions');
  }

  cacheDOM() {
    this.mapSvg = document.getElementById('map-svg');
    this.provincesListEl = document.getElementById('provinces-list');
    this.encyclopediaEl = document.getElementById('encyclopedia');
    this.gameContainer = document.getElementById('game-container');
    this.quizContainer = document.getElementById('quiz-container');

    // Tabs
    this.tabRegions = document.getElementById('tab-regions');
    this.tabNational = document.getElementById('tab-national');
    this.tabQuiz = document.getElementById('tab-quiz');

    // Quiz elements
    this.quizQNum = document.getElementById('quiz-qnum');
    this.quizScoreVal = document.getElementById('quiz-score-val');
    this.quizQuestionText = document.getElementById('quiz-question-text');
    this.quizOptionsContainer = document.getElementById('quiz-options');

    // Modal
    this.winModal = document.getElementById('win-modal');
    this.modalTitle = document.getElementById('modal-title');
    this.modalMsg = document.getElementById('modal-msg');
    this.btnModalContinue = document.getElementById('btn-modal-continue');
    this.btnMute = document.getElementById('btn-mute');
  }

  bindEvents() {
    this.tabRegions.addEventListener('click', () => this.switchMode('regions'));
    this.tabNational.addEventListener('click', () => this.switchMode('national'));
    this.tabQuiz.addEventListener('click', () => this.switchMode('quiz'));

    this.btnMute.addEventListener('click', () => {
      sfx.init();
      sfx.muted = !sfx.muted;
      this.btnMute.textContent = sfx.muted ? '🔇 静音' : '🔊 声音';
    });

    this.btnModalContinue.addEventListener('click', () => {
      this.winModal.classList.remove('open');
      if (this.mode === 'quiz') {
        this.startQuiz();
      }
    });
  }

  switchMode(newMode) {
    sfx.init();
    this.mode = newMode;
    this.tabRegions.classList.toggle('active', newMode === 'regions');
    this.tabNational.classList.toggle('active', newMode === 'national');
    this.tabQuiz.classList.toggle('active', newMode === 'quiz');

    if (newMode === 'quiz') {
      this.gameContainer.style.display = 'none';
      this.quizContainer.style.display = 'flex';
      this.startQuiz();
    } else {
      this.gameContainer.style.display = 'grid';
      this.quizContainer.style.display = 'none';
      this.placedProvinces.clear();
      this.selectedProvince = null;
      this.renderSidebar();
      this.updateMapDisplay();
    }
  }

  initMap() {
    this.mapSvg.innerHTML = '';

    // Draw Sea background / border guideline
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', '800');
    bg.setAttribute('height', '600');
    bg.setAttribute('fill', '#f5eee4');
    bg.setAttribute('rx', '12');
    this.mapSvg.appendChild(bg);

    // Draw Province nodes
    PROVINCES.forEach((p) => {
      const coord = PROV_COORDS[p.id];
      if (!coord) return;

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'prov-node unplaced');
      g.setAttribute('id', `prov-node-${p.id}`);
      g.setAttribute('transform', `translate(${coord.x}, ${coord.y})`);

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', coord.w);
      rect.setAttribute('height', coord.h);
      rect.setAttribute('rx', '8');
      rect.setAttribute('fill', REGIONS[p.region].color);
      rect.setAttribute('stroke', '#33271e');
      rect.setAttribute('stroke-width', '2');

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', coord.w / 2);
      text.setAttribute('y', coord.h / 2 + 5);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', '#ffffff');
      text.setAttribute('font-size', '14');
      text.setAttribute('font-weight', 'bold');
      text.textContent = p.name;

      g.appendChild(rect);
      g.appendChild(text);

      g.addEventListener('click', () => {
        this.handleMapNodeClick(p);
      });

      this.mapSvg.appendChild(g);
    });
  }

  handleMapNodeClick(p) {
    sfx.init();

    // If province already placed -> show encyclopedia
    if (this.placedProvinces.has(p.id)) {
      this.showEncyclopedia(p);
      return;
    }

    // If selected province matches this node -> place it!
    if (this.selectedProvince && this.selectedProvince.id === p.id) {
      this.placeProvince(p);
    } else {
      this.showEncyclopedia(p);
    }
  }

  placeProvince(p) {
    this.placedProvinces.add(p.id);
    this.selectedProvince = null;
    sfx.playSnap();
    this.updateMapDisplay();
    this.renderSidebar();
    this.showEncyclopedia(p);

    // Check completion
    const targetPool = this.mode === 'regions'
      ? getProvincesByRegion(this.currentRegionId)
      : PROVINCES;

    const isComplete = targetPool.every(prov => this.placedProvinces.has(prov.id));
    if (isComplete) {
      sfx.playWin();
      this.modalTitle.textContent = '🎉 恭喜！拼图大功告成！';
      this.modalMsg.textContent = this.mode === 'regions'
        ? `完美拼成【${REGIONS[this.currentRegionId].name}】的所有省份！`
        : '太了不起啦！你成功拼齐了祖国全部 34 个省级行政区！';
      this.winModal.classList.add('open');
    }
  }

  updateMapDisplay() {
    PROVINCES.forEach((p) => {
      const node = document.getElementById(`prov-node-${p.id}`);
      if (!node) return;

      const isPlaced = this.placedProvinces.has(p.id);
      node.setAttribute('class', `prov-node ${isPlaced ? 'placed' : 'unplaced'}`);

      // Filter visibility if in regions mode
      if (this.mode === 'regions') {
        const inRegion = p.region === this.currentRegionId;
        node.style.display = inRegion ? 'block' : 'none';
      } else {
        node.style.display = 'block';
      }
    });
  }

  renderSidebar() {
    this.provincesListEl.innerHTML = '';
    const pool = this.mode === 'regions'
      ? getProvincesByRegion(this.currentRegionId)
      : PROVINCES;

    pool.forEach((p) => {
      const isDone = this.placedProvinces.has(p.id);
      const isSelected = this.selectedProvince && this.selectedProvince.id === p.id;

      const btn = document.createElement('div');
      btn.className = `prov-item-btn ${isDone ? 'done' : ''} ${isSelected ? 'selected' : ''}`;
      btn.textContent = `${p.name} (${p.abbr})`;

      btn.addEventListener('click', () => {
        sfx.init();
        if (!isDone) {
          this.selectedProvince = p;
          this.renderSidebar();
        }
        this.showEncyclopedia(p);
      });

      this.provincesListEl.appendChild(btn);
    });
  }

  showEncyclopedia(p) {
    this.encyclopediaEl.innerHTML = `
      <div class="encyclopedia-title">${p.name} (${p.abbr})</div>
      <div class="encyclopedia-row"><span class="encyclopedia-label">省会:</span> <strong>${p.capital}</strong></div>
      <div class="encyclopedia-row"><span class="encyclopedia-label">地标:</span> <span>${p.landmark}</span></div>
      <div class="encyclopedia-row"><span class="encyclopedia-label">特产:</span> <span>${p.specialty}</span></div>
    `;
  }

  // --- Quiz Mode ---
  startQuiz() {
    this.quizQuestions = generateQuiz(10);
    this.quizIndex = 0;
    this.quizScore = 0;
    this.renderQuizQuestion();
  }

  renderQuizQuestion() {
    const q = this.quizQuestions[this.quizIndex];
    this.quizQNum.textContent = `第 ${this.quizIndex + 1} / 10 题`;
    this.quizScoreVal.textContent = `得分: ${this.quizScore}`;
    this.quizQuestionText.textContent = q.question;

    this.quizOptionsContainer.innerHTML = '';
    q.options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-opt-btn';
      btn.textContent = opt.name;

      btn.addEventListener('click', () => {
        this.handleQuizAnswer(opt.id === q.targetId);
      });

      this.quizOptionsContainer.appendChild(btn);
    });
  }

  handleQuizAnswer(isCorrect) {
    sfx.init();
    if (isCorrect) {
      sfx.playSnap();
      this.quizScore += 10;
    } else {
      sfx.playError();
    }

    if (this.quizIndex + 1 < this.quizQuestions.length) {
      this.quizIndex++;
      this.renderQuizQuestion();
    } else {
      // Quiz complete
      sfx.playWin();
      if (this.quizScore > this.progress.quizHighScore) {
        this.progress.quizHighScore = this.quizScore;
        try {
          localStorage.setItem('china_map_progress', JSON.stringify(this.progress));
        } catch {}
      }

      this.modalTitle.textContent = '🏅 地理竞猜挑战完成！';
      this.modalMsg.textContent = `最终得分: ${this.quizScore} 分！${this.quizScore >= 80 ? '真棒！你是名副其实的地理小达人！' : '继续加油，多多探索祖国大好河山！'}`;
      this.winModal.classList.add('open');
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new ChinaMapGame();
});
