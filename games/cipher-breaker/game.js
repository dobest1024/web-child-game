// 密码解谜家 - 游戏主逻辑
import {
  MORSE_TABLE,
  caesarShift,
  atbash,
  verifyAnswer,
  calculateStars,
  sanitizeProgress,
} from './engine.js';
import { LEVELS } from './levels.js';
import { sound } from './audio.js';

const STORAGE_KEY = 'lpi:cipher-breaker';

class CipherBreakerGame {
  constructor() {
    this.currentLevelIndex = 0;
    this.attempts = 0;
    this.hintsUsed = 0;
    this.currentShift = 3;
    this.progress = this.loadProgress();

    this.initDOMElements();
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
    this.elDossierTitle = document.getElementById('dossier-title');
    this.elCipherBadge = document.getElementById('cipher-badge');
    this.elDossierDesc = document.getElementById('dossier-desc');
    this.elCipherDisplay = document.getElementById('cipher-display');
    this.elTelegraphRow = document.getElementById('telegraph-row');
    this.elPlayMorseBtn = document.getElementById('play-morse-btn');
    this.elWorkbenchCard = document.getElementById('workbench-card');
    this.elCaesarTool = document.getElementById('caesar-tool');
    this.elMorseTool = document.getElementById('morse-tool');
    this.elAtbashTool = document.getElementById('atbash-tool');
    this.elShiftSlider = document.getElementById('shift-slider');
    this.elShiftVal = document.getElementById('shift-val');
    this.elCaesarMapping = document.getElementById('caesar-mapping');
    this.elMorseGrid = document.getElementById('morse-grid');
    this.elAtbashMapping = document.getElementById('atbash-mapping');
    this.elAgentInput = document.getElementById('agent-input');
    this.elSubmitBtn = document.getElementById('submit-btn');
    this.elHintBtn = document.getElementById('hint-btn');
    this.elHintText = document.getElementById('hint-text');
    this.elTotalStars = document.getElementById('total-stars');
    this.elMuteBtn = document.getElementById('mute-btn');
    this.elLevelSelect = document.getElementById('level-select');
    this.elModal = document.getElementById('win-modal');
    this.elModalStars = document.getElementById('modal-stars');
    this.elModalMsg = document.getElementById('modal-msg');
    this.elNextLevelBtn = document.getElementById('next-level-btn');
    this.elRetryBtn = document.getElementById('retry-btn');

    // 填充关卡选择下拉框
    this.elLevelSelect.innerHTML = LEVELS.map(
      (lvl, idx) => `<option value="${idx}">第 ${lvl.id} 关: ${lvl.title}</option>`
    ).join('');

    // 初始化摩斯电码速查网格
    this.elMorseGrid.innerHTML = Object.entries(MORSE_TABLE).map(
      ([char, code]) => `
        <div class="morse-item">
          <span class="morse-char">${char}</span>
          <span class="morse-code">${code}</span>
        </div>
      `
    ).join('');

    // 初始化 Atbash 镜像映射表
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    this.elAtbashMapping.innerHTML = alphabet.map((ch) => `
      <div class="map-pair">
        <span class="map-from">${ch}</span>
        <span class="map-arrow">↕</span>
        <span class="map-to">${atbash(ch)}</span>
      </div>
    `).join('');
  }

  bindEvents() {
    this.elMuteBtn.addEventListener('click', () => {
      const isMuted = sound.toggleMute();
      this.elMuteBtn.textContent = isMuted ? '🔇 静音' : '🔊 声音';
    });

    this.elPlayMorseBtn.addEventListener('click', () => {
      const level = LEVELS[this.currentLevelIndex];
      this.elPlayMorseBtn.disabled = true;
      this.elPlayMorseBtn.textContent = '📻 接收信号中...';
      sound.playMorseSequence(level.cipherText, () => {
        this.elPlayMorseBtn.disabled = false;
        this.elPlayMorseBtn.textContent = '📻 播放电报声';
      });
    });

    this.elShiftSlider.addEventListener('input', (e) => {
      this.currentShift = Number(e.target.value);
      this.elShiftVal.textContent = this.currentShift > 0 ? `+${this.currentShift}` : `${this.currentShift}`;
      sound.playDialClick();
      this.renderCaesarMapping();
    });

    this.elSubmitBtn.addEventListener('click', () => this.checkSubmission());
    this.elAgentInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.checkSubmission();
    });

    this.elHintBtn.addEventListener('click', () => {
      const level = LEVELS[this.currentLevelIndex];
      this.hintsUsed++;
      this.elHintText.textContent = `💡 特工线索：${level.hint}`;
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
    this.attempts = 0;
    this.hintsUsed = 0;
    this.elLevelSelect.value = index;
    this.elAgentInput.value = '';
    this.elHintText.textContent = '';

    const level = LEVELS[index];
    this.elDossierTitle.textContent = level.title;
    this.elDossierDesc.textContent = `${level.prompt}（解密含义：${level.meaning}）`;
    this.elCipherDisplay.textContent = level.cipherText;

    const badges = {
      caesar: '凯撒移位密码',
      morse: '摩斯电报电码',
      atbash: '阿特巴什镜像密码',
    };
    this.elCipherBadge.textContent = badges[level.type] || '密码';

    // 切换工作台工具
    this.elCaesarTool.style.display = level.type === 'caesar' ? 'block' : 'none';
    this.elMorseTool.style.display = level.type === 'morse' ? 'block' : 'none';
    this.elTelegraphRow.style.display = level.type === 'morse' ? 'flex' : 'none';
    this.elAtbashTool.style.display = level.type === 'atbash' ? 'block' : 'none';

    if (level.type === 'caesar') {
      this.currentShift = level.shift || 3;
      this.elShiftSlider.value = this.currentShift;
      this.elShiftVal.textContent = `+${this.currentShift}`;
      this.renderCaesarMapping();
    }

    this.updateStats();
    this.elAgentInput.focus();

    // 摩斯电码关卡进入时自动播放一次
    if (level.type === 'morse') {
      setTimeout(() => {
        sound.playMorseSequence(level.cipherText);
      }, 400);
    }
  }

  renderCaesarMapping() {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    this.elCaesarMapping.innerHTML = alphabet.map((ch) => {
      const shifted = caesarShift(ch, this.currentShift);
      return `
        <div class="map-pair">
          <span class="map-from">${shifted}</span>
          <span class="map-arrow">↓</span>
          <span class="map-to">${ch}</span>
        </div>
      `;
    }).join('');
  }

  checkSubmission() {
    const val = this.elAgentInput.value.trim().toUpperCase();
    if (!val) return;

    this.attempts++;
    const level = LEVELS[this.currentLevelIndex];

    if (verifyAnswer(val, level.plainText)) {
      // 成功解密！
      sound.playStamp();
      sound.playFanfare();
      const stars = calculateStars(this.attempts, this.hintsUsed);
      this.saveProgress(level.id, stars);
      this.updateStats();

      const starIcons = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
      this.elModalStars.textContent = starIcons;
      this.elModalMsg.textContent = `情报破译成功！暗号【${level.plainText}】（${level.meaning}）已传回总部！`;
      this.elModal.style.display = 'flex';
    } else {
      // 解密失败反馈
      this.elAgentInput.style.borderColor = '#ef4444';
      setTimeout(() => {
        this.elAgentInput.style.borderColor = '#475569';
      }, 500);
    }
  }

  updateStats() {
    let total = 0;
    for (const stars of Object.values(this.progress)) {
      total += stars;
    }
    this.elTotalStars.textContent = `⭐ ${total}`;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new CipherBreakerGame();
});
