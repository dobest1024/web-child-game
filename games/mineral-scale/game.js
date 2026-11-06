// 天平探矿师 - 游戏主逻辑
import {
  weighCoins,
  verifyAccusation,
  calculateStars,
  sanitizeProgress,
} from './engine.js';
import { LEVELS } from './levels.js';
import { sound } from './audio.js';

const STORAGE_KEY = 'lpi:mineral-scale';

class MineralScaleGame {
  constructor() {
    this.currentLevelIndex = 0;
    this.weighCount = 0;
    this.targetPan = 'left'; // 'left' | 'right' | 'accuse'
    this.leftCoins = [];
    this.rightCoins = [];
    this.trayCoins = [];
    this.weighLog = [];
    this.tiltAngle = 0; // 当前倾斜角（弧度）
    this.targetTiltAngle = 0;
    this.animating = false;
    this.progress = this.loadProgress();

    this.initDOMElements();
    this.initCanvas();
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
    this.elMissionTitle = document.getElementById('mission-title');
    this.elMissionBadge = document.getElementById('mission-badge');
    this.elMissionDesc = document.getElementById('mission-desc');
    this.elTotalStars = document.getElementById('total-stars');
    this.elWeighCount = document.getElementById('weigh-count');
    this.elMuteBtn = document.getElementById('mute-btn');
    this.elLevelSelect = document.getElementById('level-select');
    this.canvas = document.getElementById('scale-canvas');
    this.ctx = this.canvas.getContext('2d');

    this.elLeftPanCoins = document.getElementById('left-pan-coins');
    this.elRightPanCoins = document.getElementById('right-pan-coins');
    this.elTrayCoins = document.getElementById('tray-coins');
    this.elWeighBtn = document.getElementById('weigh-btn');
    this.elClearBtn = document.getElementById('clear-btn');
    this.elTargetLeftBtn = document.getElementById('target-left-btn');
    this.elTargetRightBtn = document.getElementById('target-right-btn');
    this.elTargetAccuseBtn = document.getElementById('target-accuse-btn');
    this.elLogList = document.getElementById('log-list');

    this.elModal = document.getElementById('win-modal');
    this.elModalStars = document.getElementById('modal-stars');
    this.elModalMsg = document.getElementById('modal-msg');
    this.elNextLevelBtn = document.getElementById('next-level-btn');
    this.elRetryBtn = document.getElementById('retry-btn');

    // 填充关卡选择
    this.elLevelSelect.innerHTML = LEVELS.map(
      (lvl, idx) => `<option value="${idx}">第 ${lvl.id} 关: ${lvl.title}</option>`
    ).join('');
  }

  initCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = (rect.width || 720) * dpr;
    this.canvas.height = (rect.height || 200) * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width || 720;
    this.height = rect.height || 200;
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.initCanvas();
      this.renderScale();
    });

    this.elMuteBtn.addEventListener('click', () => {
      const isMuted = sound.toggleMute();
      this.elMuteBtn.textContent = isMuted ? '🔇 静音' : '🔊 声音';
    });

    this.elLevelSelect.addEventListener('change', (e) => {
      this.loadLevel(Number(e.target.value));
    });

    this.elTargetLeftBtn.addEventListener('click', () => this.setTargetMode('left'));
    this.elTargetRightBtn.addEventListener('click', () => this.setTargetMode('right'));
    this.elTargetAccuseBtn.addEventListener('click', () => this.setTargetMode('accuse'));

    this.elWeighBtn.addEventListener('click', () => this.handleWeigh());
    this.elClearBtn.addEventListener('click', () => this.clearPans());

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

  setTargetMode(mode) {
    this.targetPan = mode;
    this.elTargetLeftBtn.style.background = mode === 'left' ? '#f59e0b' : '#292524';
    this.elTargetLeftBtn.style.color = mode === 'left' ? '#1c1917' : '#f5f5f4';

    this.elTargetRightBtn.style.background = mode === 'right' ? '#f59e0b' : '#292524';
    this.elTargetRightBtn.style.color = mode === 'right' ? '#1c1917' : '#f5f5f4';

    this.elTargetAccuseBtn.style.background = mode === 'accuse' ? '#ef4444' : '#292524';
    this.elTargetAccuseBtn.style.color = mode === 'accuse' ? '#ffffff' : '#f5f5f4';

    this.renderCoinTray();
  }

  loadLevel(index) {
    this.currentLevelIndex = index;
    this.weighCount = 0;
    this.weighLog = [];
    this.leftCoins = [];
    this.rightCoins = [];
    this.tiltAngle = 0;
    this.targetTiltAngle = 0;
    this.elLevelSelect.value = index;

    const level = LEVELS[index];
    this.elMissionTitle.textContent = level.title;
    this.elMissionBadge.textContent = `共 ${level.coinCount} 枚金币 · 目标 ≤${level.optimalWeighs} 次`;
    this.elMissionDesc.textContent = `${level.prompt}（提示：${level.hint}）`;

    // 初始化托盘金币
    this.trayCoins = Array.from({ length: level.coinCount }, (_, i) => i + 1);

    this.setTargetMode('left');
    this.updateStats();
    this.renderPanCoins();
    this.renderCoinTray();
    this.renderLogList();
    this.renderScale();
  }

  updateStats() {
    this.elWeighCount.textContent = `⚖️ 已称量: ${this.weighCount} 次`;
    let total = 0;
    for (const stars of Object.values(this.progress)) {
      total += stars;
    }
    this.elTotalStars.textContent = `⭐ ${total}`;
  }

  renderCoinTray() {
    this.elTrayCoins.innerHTML = '';
    this.trayCoins.forEach((coinNum) => {
      const btn = document.createElement('div');
      btn.className = `coin-token ${this.targetPan === 'accuse' ? 'accuse-mode' : ''}`;
      btn.textContent = coinNum;
      btn.addEventListener('click', () => this.handleTrayCoinClick(coinNum));
      this.elTrayCoins.appendChild(btn);
    });
  }

  renderPanCoins() {
    // 左盘
    this.elLeftPanCoins.innerHTML = '';
    this.leftCoins.forEach((coinNum) => {
      const btn = document.createElement('div');
      btn.className = 'coin-token';
      btn.textContent = coinNum;
      btn.title = '点击放回托盘';
      btn.addEventListener('click', () => this.returnCoinFromPan('left', coinNum));
      this.elLeftPanCoins.appendChild(btn);
    });

    // 右盘
    this.elRightPanCoins.innerHTML = '';
    this.rightCoins.forEach((coinNum) => {
      const btn = document.createElement('div');
      btn.className = 'coin-token';
      btn.textContent = coinNum;
      btn.title = '点击放回托盘';
      btn.addEventListener('click', () => this.returnCoinFromPan('right', coinNum));
      this.elRightPanCoins.appendChild(btn);
    });
  }

  handleTrayCoinClick(coinNum) {
    sound.playCoinClink();
    if (this.targetPan === 'accuse') {
      this.accuseCoin(coinNum);
      return;
    }

    // 从 tray 移入对应 pan
    this.trayCoins = this.trayCoins.filter((c) => c !== coinNum);
    if (this.targetPan === 'left') {
      this.leftCoins.push(coinNum);
    } else if (this.targetPan === 'right') {
      this.rightCoins.push(coinNum);
    }

    this.renderCoinTray();
    this.renderPanCoins();
  }

  returnCoinFromPan(pan, coinNum) {
    sound.playCoinClink();
    if (pan === 'left') {
      this.leftCoins = this.leftCoins.filter((c) => c !== coinNum);
    } else {
      this.rightCoins = this.rightCoins.filter((c) => c !== coinNum);
    }
    this.trayCoins.push(coinNum);
    this.trayCoins.sort((a, b) => a - b);

    this.renderCoinTray();
    this.renderPanCoins();
  }

  clearPans() {
    this.trayCoins.push(...this.leftCoins, ...this.rightCoins);
    this.trayCoins.sort((a, b) => a - b);
    this.leftCoins = [];
    this.rightCoins = [];
    this.targetTiltAngle = 0;
    this.animateScaleTilt();
    this.renderCoinTray();
    this.renderPanCoins();
  }

  handleWeigh() {
    if (this.leftCoins.length === 0 || this.rightCoins.length === 0) {
      alert('两边托盘必须都有金币才能称量！');
      return;
    }
    if (this.leftCoins.length !== this.rightCoins.length) {
      alert('两边托盘的金币数量必须相等才能称量！');
      return;
    }

    this.weighCount++;
    const level = LEVELS[this.currentLevelIndex];
    const outcome = weighCoins(
      this.leftCoins,
      this.rightCoins,
      level.fakeCoinIndex,
      level.fakeDelta
    );

    let resultDesc = '';
    if (outcome === 'left-lighter') {
      // 左轻右重：天平左翘右沉，逆时针倾斜
      this.targetTiltAngle = 0.18;
      resultDesc = '左盘较轻 ⮥ (右盘下沉)';
      sound.playScaleTilt();
    } else if (outcome === 'left-heavier') {
      // 左重右轻：天平左沉右翘，顺时针倾斜
      this.targetTiltAngle = -0.18;
      resultDesc = '左盘较重 ⮧ (左盘下沉)';
      sound.playScaleTilt();
    } else {
      // 平衡
      this.targetTiltAngle = 0;
      resultDesc = '两盘完全平衡 ⚖️';
      sound.playScaleBalanced();
    }

    this.animateScaleTilt();
    this.updateStats();

    // 写入探矿笔记
    const leftStr = `[${this.leftCoins.sort((a, b) => a - b).join(',')}]`;
    const rightStr = `[${this.rightCoins.sort((a, b) => a - b).join(',')}]`;
    this.weighLog.unshift({
      step: this.weighCount,
      text: `${leftStr} vs ${rightStr} ➔ ${resultDesc}`,
    });
    this.renderLogList();
  }

  accuseCoin(coinNum) {
    const level = LEVELS[this.currentLevelIndex];
    if (verifyAccusation(coinNum, level.fakeCoinIndex)) {
      // 成功找出假币！
      sound.playFanfare();
      const stars = calculateStars(this.weighCount, level.optimalWeighs);
      this.saveProgress(level.id, stars);
      this.updateStats();

      const starIcons = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
      this.elModalStars.textContent = starIcons;
      this.elModalMsg.textContent = `太神了！第 ${coinNum} 号金币果然是伪造的假币！你仅用了 ${this.weighCount} 次称量（目标 ≤${level.optimalWeighs} 次）就破解了谜团！`;
      this.elModal.style.display = 'flex';
    } else {
      // 指认错误
      sound.playWrong();
      alert(`哎呀！第 ${coinNum} 号金币是真金打造的纯正金币！请继续利用天平排除嫌疑。`);
    }
  }

  animateScaleTilt() {
    this.animating = true;
    const step = () => {
      this.tiltAngle += (this.targetTiltAngle - this.tiltAngle) * 0.2;
      this.renderScale();
      if (Math.abs(this.targetTiltAngle - this.tiltAngle) > 0.005) {
        requestAnimationFrame(step);
      } else {
        this.tiltAngle = this.targetTiltAngle;
        this.animating = false;
        this.renderScale();
      }
    };
    step();
  }

  renderLogList() {
    this.elLogList.innerHTML = this.weighLog.map(
      (log) => `
        <div class="log-item">
          <span>第 ${log.step} 次称量:</span>
          <span>${log.text}</span>
        </div>
      `
    ).join('');
  }

  renderScale() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const centerX = this.width / 2;
    const baseY = this.height - 25;
    const fulcrumY = 70;
    const beamLength = Math.min(this.width * 0.7, 440);

    // 1. 底座与立柱
    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 3;

    // 底座
    ctx.beginPath();
    ctx.roundRect(centerX - 60, baseY, 120, 16, 8);
    ctx.fill();
    ctx.stroke();

    // 竖直铜柱
    ctx.beginPath();
    ctx.moveTo(centerX - 8, baseY);
    ctx.lineTo(centerX - 8, fulcrumY);
    ctx.lineTo(centerX + 8, fulcrumY);
    ctx.lineTo(centerX + 8, baseY);
    ctx.fillStyle = '#b45309';
    ctx.fill();
    ctx.stroke();

    // 2. 支点枢轴圆环
    ctx.beginPath();
    ctx.arc(centerX, fulcrumY, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
    ctx.stroke();

    // 3. 倾斜横梁
    ctx.save();
    ctx.translate(centerX, fulcrumY);
    ctx.rotate(this.tiltAngle);

    // 横梁主体
    ctx.fillStyle = '#fbbf24';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-beamLength / 2, -6, beamLength, 12, 6);
    ctx.fill();
    ctx.stroke();

    // 两端挂钩
    const leftHookX = -beamLength / 2 + 10;
    const rightHookX = beamLength / 2 - 10;

    ctx.restore();

    // 计算世界坐标下的左右挂钩位置
    const cosA = Math.cos(this.tiltAngle);
    const sinA = Math.sin(this.tiltAngle);

    const leftPanWorldX = centerX + leftHookX * cosA - (-6) * sinA;
    const leftPanWorldY = fulcrumY + leftHookX * sinA + (-6) * cosA;

    const rightPanWorldX = centerX + rightHookX * cosA - (-6) * sinA;
    const rightPanWorldY = fulcrumY + rightHookX * sinA + (-6) * cosA;

    // 4. 吊盘铁链与托盘
    const panStringLength = 70;

    // 左盘吊绳
    ctx.strokeStyle = '#a8a29e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(leftPanWorldX, leftPanWorldY);
    ctx.lineTo(leftPanWorldX - 35, leftPanWorldY + panStringLength);
    ctx.moveTo(leftPanWorldX, leftPanWorldY);
    ctx.lineTo(leftPanWorldX + 35, leftPanWorldY + panStringLength);
    ctx.stroke();

    // 左托盘底盘
    ctx.fillStyle = '#44403c';
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(leftPanWorldX, leftPanWorldY + panStringLength, 45, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 右盘吊绳
    ctx.strokeStyle = '#a8a29e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rightPanWorldX, rightPanWorldY);
    ctx.lineTo(rightPanWorldX - 35, rightPanWorldY + panStringLength);
    ctx.moveTo(rightPanWorldX, rightPanWorldY);
    ctx.lineTo(rightPanWorldX + 35, rightPanWorldY + panStringLength);
    ctx.stroke();

    // 右托盘底盘
    ctx.fillStyle = '#44403c';
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(rightPanWorldX, rightPanWorldY + panStringLength, 45, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new MineralScaleGame();
});
