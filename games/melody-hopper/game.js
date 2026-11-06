// 音符跳跃岛 - 游戏主逻辑
import { NOTE_DEFINITIONS, NOTE_MAP, getStaffPosition, calculateStars, sanitizeProgress } from './engine.js';
import { LEVELS } from './levels.js';
import { sound } from './audio.js';

const STORAGE_KEY = 'lpi:melody-hopper';

class MelodyHopperGame {
  constructor() {
    this.currentLevelIndex = 0;
    this.currentNoteIndex = 0;
    this.wrongCount = 0;
    this.hintsUsed = 0;
    this.progress = this.loadProgress();

    this.frogState = {
      x: 80,
      y: 100,
      targetX: 80,
      targetY: 100,
      animating: false,
    };

    this.initDOMElements();
    this.initCanvas();
    this.initLilypads();
    this.bindEvents();
    this.loadLevel(this.currentLevelIndex);
  }

  loadProgress() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return sanitizeProgress(raw);
    } catch {
      return {};
    }
  }

  saveProgress(levelId, stars) {
    const prev = this.progress[levelId] || 0;
    if (stars > prev) {
      this.progress[levelId] = stars;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress));
      } catch {}
    }
  }

  initDOMElements() {
    this.elLevelName = document.getElementById('level-name');
    this.elLevelMode = document.getElementById('level-mode');
    this.elLevelDesc = document.getElementById('level-desc');
    this.elProgressDots = document.getElementById('melody-progress');
    this.elTotalStars = document.getElementById('total-stars');
    this.elMuteBtn = document.getElementById('mute-btn');
    this.elReplayBtn = document.getElementById('replay-sound-btn');
    this.elLevelSelect = document.getElementById('level-select');
    this.elModal = document.getElementById('win-modal');
    this.elModalStars = document.getElementById('modal-stars');
    this.elModalMsg = document.getElementById('modal-msg');
    this.elNextLevelBtn = document.getElementById('next-level-btn');
    this.elRetryBtn = document.getElementById('retry-btn');
    this.canvas = document.getElementById('stave-canvas');
    this.ctx = this.canvas.getContext('2d');

    // 填充关卡选择下拉框
    this.elLevelSelect.innerHTML = LEVELS.map(
      (lvl, idx) => `<option value="${idx}">第 ${lvl.id} 关: ${lvl.title}</option>`
    ).join('');
  }

  initCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = (rect.width || 720) * dpr;
    this.canvas.height = (rect.height || 180) * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width || 720;
    this.height = rect.height || 180;
  }

  initLilypads() {
    const grid = document.getElementById('lilypads-grid');
    grid.innerHTML = '';
    NOTE_DEFINITIONS.slice(0, 8).forEach((n) => {
      const btn = document.createElement('button');
      btn.className = 'lilypad-btn';
      btn.dataset.note = n.id;
      btn.innerHTML = `
        <span class="pad-note">${n.name}</span>
        <span class="pad-solfege">${n.solfege}</span>
        <span class="pad-letter">${n.id}</span>
      `;
      btn.addEventListener('click', () => this.handleNoteClick(n.id));
      grid.appendChild(btn);
    });
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.initCanvas();
      this.render();
    });

    this.elMuteBtn.addEventListener('click', () => {
      const isMuted = sound.toggleMute();
      this.elMuteBtn.textContent = isMuted ? '🔇 静音' : '🔊 声音';
    });

    this.elReplayBtn.addEventListener('click', () => {
      this.playCurrentTargetSound();
    });

    this.elLevelSelect.addEventListener('change', (e) => {
      this.loadLevel(Number(e.target.value));
    });

    this.elNextLevelBtn.addEventListener('click', () => {
      this.elModal.style.display = 'none';
      if (this.currentLevelIndex < LEVELS.length - 1) {
        this.loadLevel(this.currentLevelIndex + 1);
      } else {
        this.loadLevel(0);
      }
    });

    this.elRetryBtn.addEventListener('click', () => {
      this.elModal.style.display = 'none';
      this.loadLevel(this.currentLevelIndex);
    });
  }

  loadLevel(index) {
    this.currentLevelIndex = index;
    this.currentNoteIndex = 0;
    this.wrongCount = 0;
    this.hintsUsed = 0;
    this.elLevelSelect.value = index;

    const level = LEVELS[index];
    this.elLevelName.textContent = level.title;
    this.elLevelDesc.textContent = level.prompt;

    const modeNames = {
      sight: '视谱辨音',
      ear: '盲听听辨',
      melody: '乐曲连弹',
    };
    this.elLevelMode.textContent = modeNames[level.mode] || '视谱';

    this.updateProgressDots();
    this.updateStats();

    // 重置青蛙位置
    this.frogState.x = 80;
    this.frogState.y = this.getNoteY(level.melody[0]);
    this.frogState.targetX = this.frogState.x;
    this.frogState.targetY = this.frogState.y;

    this.render();

    // 播放第一个目标音
    setTimeout(() => {
      this.playCurrentTargetSound();
    }, 300);
  }

  updateProgressDots() {
    const level = LEVELS[this.currentLevelIndex];
    this.elProgressDots.innerHTML = level.melody.map((noteId, idx) => {
      let cls = 'melody-dot';
      if (idx < this.currentNoteIndex) cls += ' done';
      else if (idx === this.currentNoteIndex) cls += ' active';
      return `<div class="${cls}">${idx + 1}</div>`;
    }).join('');
  }

  updateStats() {
    let total = 0;
    for (const stars of Object.values(this.progress)) {
      total += stars;
    }
    this.elTotalStars.textContent = `⭐ ${total}`;
  }

  playCurrentTargetSound() {
    const level = LEVELS[this.currentLevelIndex];
    const targetNoteId = level.melody[this.currentNoteIndex];
    const def = NOTE_MAP[targetNoteId];
    if (def) {
      sound.playNote(def.freq, 0.6);
    }
  }

  handleNoteClick(noteId) {
    const level = LEVELS[this.currentLevelIndex];
    const targetNoteId = level.melody[this.currentNoteIndex];
    const def = NOTE_MAP[noteId];

    // 播放点击音
    if (def) {
      sound.playNote(def.freq, 0.4);
    }

    if (noteId === targetNoteId) {
      // 答对了！
      sound.playJump();
      this.frogJumpTo(noteId);
      this.currentNoteIndex++;

      if (this.currentNoteIndex >= level.melody.length) {
        // 本关通关！
        this.updateProgressDots();
        setTimeout(() => this.handleLevelComplete(), 400);
      } else {
        this.updateProgressDots();
        setTimeout(() => {
          this.playCurrentTargetSound();
        }, 500);
      }
    } else {
      // 答错
      sound.playWrong();
      this.wrongCount++;
    }
    this.render();
  }

  frogJumpTo(noteId) {
    const targetY = this.getNoteY(noteId);
    const stepX = (this.width - 160) / (LEVELS[this.currentLevelIndex].melody.length || 1);
    const targetX = 100 + this.currentNoteIndex * stepX;

    this.frogState.targetX = targetX;
    this.frogState.targetY = targetY;
    this.frogState.animating = true;
    this.animateFrog();
  }

  animateFrog() {
    const speed = 0.25;
    this.frogState.x += (this.frogState.targetX - this.frogState.x) * speed;
    this.frogState.y += (this.frogState.targetY - this.frogState.y) * speed;

    if (
      Math.abs(this.frogState.x - this.frogState.targetX) < 1 &&
      Math.abs(this.frogState.y - this.frogState.targetY) < 1
    ) {
      this.frogState.x = this.frogState.targetX;
      this.frogState.y = this.frogState.targetY;
      this.frogState.animating = false;
    }

    this.render();

    if (this.frogState.animating) {
      requestAnimationFrame(() => this.animateFrog());
    }
  }

  getNoteY(noteId) {
    const pos = getStaffPosition(noteId);
    // staff center is around line 1 (G4)
    // 5 lines spaced by lineGap = 16px
    // staffLines: 0: E4, 1: G4, 2: B4, 3: D5, 4: F5
    const staffBaseY = 125; // Line 0 (E4)
    const lineGap = 16;
    return staffBaseY - pos * lineGap;
  }

  handleLevelComplete() {
    sound.playFanfare();
    const stars = calculateStars(this.wrongCount, this.hintsUsed);
    const level = LEVELS[this.currentLevelIndex];
    this.saveProgress(level.id, stars);
    this.updateStats();

    const starIcons = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    this.elModalStars.textContent = starIcons;
    this.elModalMsg.textContent = `太棒啦！你在《${level.title}》中展现了敏锐的小耳朵，顺利通过池塘！`;
    this.elModal.style.display = 'flex';
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const level = LEVELS[this.currentLevelIndex];
    const lineGap = 16;
    const line0Y = 125; // E4

    // 1. 绘制高音谱表 5 条线 (E4 到 F5)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 5; i++) {
      const y = line0Y - i * lineGap;
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(this.width - 40, y);
      ctx.stroke();

      // 线端终止符
      ctx.fillStyle = '#64748b';
      ctx.font = '10px sans-serif';
      ctx.fillText(`${i + 1}线`, 15, y + 3);
    }

    // 2. 绘制高音谱号 𝄞
    ctx.fillStyle = '#0f172a';
    ctx.font = '68px serif';
    ctx.fillText('𝄞', 42, line0Y - lineGap * 0.4);

    // 3. 绘制目标音符在五线谱上的位置
    const currentTargetId = level.melody[this.currentNoteIndex];
    if (currentTargetId) {
      const noteY = this.getNoteY(currentTargetId);
      const stepX = (this.width - 160) / (level.melody.length || 1);
      const noteX = 100 + this.currentNoteIndex * stepX;

      // 如果是视谱模式或者连续演奏模式，绘制符头
      if (level.mode !== 'ear') {
        // 若为 C4 (下加一线) 绘制加线
        if (currentTargetId === 'C4') {
          ctx.beginPath();
          ctx.moveTo(noteX - 16, noteY);
          ctx.lineTo(noteX + 16, noteY);
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1.8;
          ctx.stroke();
        }

        // 椭圆符头
        ctx.save();
        ctx.translate(noteX, noteY);
        ctx.rotate(-0.3);
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.ellipse(0, 0, 11, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 符干
        ctx.beginPath();
        ctx.moveTo(noteX + 10, noteY);
        ctx.lineTo(noteX + 10, noteY - 34);
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // 唱名提示气泡
        const noteDef = NOTE_MAP[currentTargetId];
        if (noteDef) {
          ctx.fillStyle = '#e0f2fe';
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(noteX - 18, noteY - 58, 36, 18, 9);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#0369a1';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(noteDef.name, noteX, noteY - 45);
        }
      } else {
        // 盲听模式：绘制神秘发光问号
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎵 ?', noteX, 100);
      }
    }

    // 4. 绘制小青蛙
    ctx.save();
    ctx.font = '36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐸', this.frogState.x, this.frogState.y);
    ctx.restore();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new MelodyHopperGame();
});
