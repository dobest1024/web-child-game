// 风力帆船航海记 - 游戏主逻辑
import {
  calculateApparentWindAngle,
  isInNoGoZone,
  calculateThrust,
  checkCollision,
  isAtDestination,
  calculateStars,
  sanitizeProgress,
} from './engine.js';
import { LEVELS } from './levels.js';
import { sound } from './audio.js';

const STORAGE_KEY = 'lpi:wind-sailor';

class WindSailorGame {
  constructor() {
    this.currentLevelIndex = 0;
    this.progress = this.loadProgress();

    // 帆船物理状态
    this.ship = {
      x: 100,
      y: 100,
      heading: 90, // 0 = 右(东), 90 = 下(南), 180 = 左(西), 270 = 上(北)
      speed: 0,
      sailTrim: 1.0, // 帆张角系数 0.5 ~ 1.0
      radius: 14,
    };

    this.wind = { deg: 270, speed: 1.5 };
    this.crashCount = 0;
    this.elapsedTime = 0;
    this.isRunning = false;
    this.lastFrameTime = performance.now();
    this.wakeTrail = [];

    this.initDOMElements();
    this.initCanvas();
    this.bindEvents();
    this.loadLevel(this.currentLevelIndex);
    this.startLoop();
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
    this.elMarineTitle = document.getElementById('marine-title');
    this.elMarineDesc = document.getElementById('marine-desc');
    this.elWindVane = document.getElementById('wind-vane-badge');
    this.elTotalStars = document.getElementById('total-stars');
    this.elMuteBtn = document.getElementById('mute-btn');
    this.elLevelSelect = document.getElementById('level-select');
    this.canvas = document.getElementById('marine-canvas');
    this.ctx = this.canvas.getContext('2d');

    this.elHudSpeed = document.getElementById('hud-speed');
    this.elHudHeading = document.getElementById('hud-heading');
    this.elHudTime = document.getElementById('hud-time');
    this.elHudWarning = document.getElementById('hud-warning');
    this.elSailTrimVal = document.getElementById('sail-trim-val');

    this.elSteerLeftBtn = document.getElementById('steer-left-btn');
    this.elSteerRightBtn = document.getElementById('steer-right-btn');
    this.elTrimInBtn = document.getElementById('trim-in-btn');
    this.elTrimOutBtn = document.getElementById('trim-out-btn');

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
    this.canvas.width = (rect.width || 800) * dpr;
    this.canvas.height = (rect.height || 380) * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width || 800;
    this.height = rect.height || 380;
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.initCanvas();
    });

    this.elMuteBtn.addEventListener('click', () => {
      const isMuted = sound.toggleMute();
      this.elMuteBtn.textContent = isMuted ? '🔇 静音' : '🔊 声音';
    });

    this.elLevelSelect.addEventListener('change', (e) => {
      this.loadLevel(Number(e.target.value));
    });

    // 舵盘控制 (持续按压或点击)
    const setupHoldBtn = (btn, action) => {
      let interval = null;
      const start = (e) => {
        e.preventDefault();
        action();
        interval = setInterval(action, 60);
      };
      const stop = () => {
        if (interval) clearInterval(interval);
        interval = null;
      };
      btn.addEventListener('mousedown', start);
      btn.addEventListener('mouseup', stop);
      btn.addEventListener('mouseleave', stop);
      btn.addEventListener('touchstart', start, { passive: false });
      btn.addEventListener('touchend', stop);
    };

    setupHoldBtn(this.elSteerLeftBtn, () => this.steer(-5));
    setupHoldBtn(this.elSteerRightBtn, () => this.steer(5));

    this.elTrimInBtn.addEventListener('click', () => this.adjustTrim(0.1));
    this.elTrimOutBtn.addEventListener('click', () => this.adjustTrim(-0.1));

    // 键盘支持
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.steer(-5);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.steer(5);
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        this.adjustTrim(0.1);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        this.adjustTrim(-0.1);
      }
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

  steer(deltaDeg) {
    this.ship.heading = (this.ship.heading + deltaDeg + 360) % 360;
  }

  adjustTrim(delta) {
    this.ship.sailTrim = Math.max(0.4, Math.min(1.0, +(this.ship.sailTrim + delta).toFixed(1)));
    this.elSailTrimVal.textContent = `${Math.round(this.ship.sailTrim * 100)}%`;
  }

  loadLevel(index) {
    this.currentLevelIndex = index;
    const level = LEVELS[index];

    this.ship.x = level.start.x;
    this.ship.y = level.start.y;
    this.ship.heading = level.start.heading;
    this.ship.speed = 0;
    this.ship.sailTrim = 1.0;
    this.wind = { ...level.wind };

    this.crashCount = 0;
    this.elapsedTime = 0;
    this.wakeTrail = [];
    this.isRunning = true;
    this.lastFrameTime = performance.now();

    this.elLevelSelect.value = index;
    this.elMarineTitle.textContent = level.title;
    this.elMarineDesc.textContent = `${level.prompt}（目标时间: ${level.parTime} 秒）`;
    this.elWindVane.textContent = `💨 ${level.wind.name} · 风速 ${level.wind.speed.toFixed(1)} 节`;
    this.elSailTrimVal.textContent = '100%';

    this.updateStats();
    sound.playShipBell();
  }

  updateStats() {
    let total = 0;
    for (const stars of Object.values(this.progress)) {
      total += stars;
    }
    this.elTotalStars.textContent = `⭐ ${total}`;
  }

  startLoop() {
    const loop = (now) => {
      const dt = Math.min((now - this.lastFrameTime) / 1000, 0.1);
      this.lastFrameTime = now;

      if (this.isRunning) {
        this.updatePhysics(dt);
      }
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  updatePhysics(dt) {
    this.elapsedTime += dt;
    const level = LEVELS[this.currentLevelIndex];

    // 动力学推力计算
    const thrust = calculateThrust(this.ship.heading, this.wind.deg, this.ship.sailTrim);
    const inNoGo = isInNoGoZone(this.ship.heading, this.wind.deg);

    if (inNoGo) {
      this.elHudWarning.style.display = 'inline';
      if (Math.random() < 0.05) sound.playSailFlap();
      // 减速阻力
      this.ship.speed = Math.max(-0.4, this.ship.speed - 1.2 * dt);
    } else {
      this.elHudWarning.style.display = 'none';
      const targetSpeed = thrust * this.wind.speed * 45;
      this.ship.speed += (targetSpeed - this.ship.speed) * (1.5 * dt);
    }

    // 沿船头方向移动
    const rad = (this.ship.heading * Math.PI) / 180;
    this.ship.x += Math.cos(rad) * this.ship.speed * dt;
    this.ship.y += Math.sin(rad) * this.ship.speed * dt;

    // 尾流记录
    if (Math.abs(this.ship.speed) > 2) {
      this.wakeTrail.push({ x: this.ship.x, y: this.ship.y, alpha: 0.6 });
      if (this.wakeTrail.length > 30) this.wakeTrail.shift();
    }
    this.wakeTrail.forEach((p) => { p.alpha -= 0.015; });
    this.wakeTrail = this.wakeTrail.filter((p) => p.alpha > 0);

    // 边界反弹
    if (this.ship.x < 15 || this.ship.x > this.width - 15 || this.ship.y < 15 || this.ship.y > this.height - 15) {
      sound.playCrash();
      this.crashCount++;
      this.ship.speed = -this.ship.speed * 0.5;
      this.ship.x = Math.max(20, Math.min(this.width - 20, this.ship.x));
      this.ship.y = Math.max(20, Math.min(this.height - 20, this.ship.y));
    }

    // 暗礁障碍物碰撞
    for (const obs of level.obstacles) {
      if (checkCollision(this.ship.x, this.ship.y, this.ship.radius, obs.x, obs.y, obs.r)) {
        sound.playCrash();
        this.crashCount++;
        // 反弹推离
        const dx = this.ship.x - obs.x;
        const dy = this.ship.y - obs.y;
        const dist = Math.hypot(dx, dy) || 1;
        this.ship.x = obs.x + (dx / dist) * (obs.r + this.ship.radius + 4);
        this.ship.y = obs.y + (dy / dist) * (obs.r + this.ship.radius + 4);
        this.ship.speed = -this.ship.speed * 0.4;
      }
    }

    // 更新 HUD
    this.elHudSpeed.textContent = `${Math.max(0, this.ship.speed).toFixed(1)} 节`;
    this.elHudHeading.textContent = `${Math.round(this.ship.heading)}°`;
    this.elHudTime.textContent = `${this.elapsedTime.toFixed(1)}s`;

    // 到达终点判定
    if (isAtDestination(this.ship.x, this.ship.y, level.dest.x, level.dest.y, level.dest.r)) {
      this.isRunning = false;
      sound.playFanfare();
      const stars = calculateStars(this.elapsedTime, level.parTime, this.crashCount);
      this.saveProgress(level.id, stars);
      this.updateStats();

      const starIcons = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
      this.elModalStars.textContent = starIcons;
      this.elModalMsg.textContent = `成功靠泊海港！用时 ${this.elapsedTime.toFixed(1)} 秒（标准目标 ≤${level.parTime}s），碰撞 ${this.crashCount} 次！`;
      this.elModal.style.display = 'flex';
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const level = LEVELS[this.currentLevelIndex];

    // 1. 绘制海面背景与流动水纹
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(0, 0, this.width, this.height);

    // 水流微纹
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1;
    const waveOffset = (performance.now() * 0.02) % 40;
    for (let y = waveOffset; y < this.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(this.width * 0.3, y + 8, this.width * 0.7, y - 8, this.width, y);
      ctx.stroke();
    }

    // 2. 绘制终点海港与灯塔
    ctx.save();
    const dest = level.dest;
    ctx.beginPath();
    ctx.arc(dest.x, dest.y, dest.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(250, 204, 21, 0.2)';
    ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 目标灯塔/港口标志
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏮', dest.x, dest.y);
    ctx.restore();

    // 3. 绘制暗礁群
    for (const obs of level.obstacles) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(obs.x, obs.y, obs.r, 0, Math.PI * 2);
      ctx.fillStyle = '#44403c';
      ctx.fill();
      ctx.strokeStyle = '#292524';
      ctx.lineWidth = 3;
      ctx.stroke();

      // 礁石上的青苔
      ctx.beginPath();
      ctx.arc(obs.x - obs.r * 0.3, obs.y - obs.r * 0.2, obs.r * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = '#15803d';
      ctx.fill();

      ctx.restore();
    }

    // 4. 绘制航迹尾流
    for (const pt of this.wakeTrail) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(224, 242, 254, ${pt.alpha})`;
      ctx.fill();
    }

    // 5. 绘制帆船 (船体 + 主桅 + 船帆)
    ctx.save();
    ctx.translate(this.ship.x, this.ship.y);
    ctx.rotate((this.ship.heading * Math.PI) / 180);

    // 船体 (水滴型木质船身)
    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(18, 0); // 船艏尖
    ctx.quadraticCurveTo(0, 10, -14, 8);
    ctx.lineTo(-14, -8);
    ctx.quadraticCurveTo(0, -10, 18, 0);
    ctx.fill();
    ctx.stroke();

    // 甲板
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.ellipse(-2, 0, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // 白帆 (根据相对风向鼓起或受力弯曲)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(4, 0); // 桅杆
    // 帆桁横向展开
    const sailAngleRad = 0.5 * (1 - this.ship.sailTrim);
    ctx.lineTo(-12, 10 * this.ship.sailTrim);
    ctx.stroke();

    // 船头方向指示箭头
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(16, -4);
    ctx.lineTo(16, 4);
    ctx.fill();

    ctx.restore();

    // 6. 绘制右上角风向罗盘小仪表
    this.renderWindCompass(ctx);
  }

  renderWindCompass(ctx) {
    const compassX = this.width - 55;
    const compassY = 55;
    const radius = 34;

    ctx.save();
    ctx.beginPath();
    ctx.arc(compassX, compassY, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8, 47, 73, 0.85)';
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 标出死风禁航区弧形 (红弧: 船头正对着风吹来的方向前后 45 度)
    const windFromRad = (this.wind.deg * Math.PI) / 180;
    ctx.beginPath();
    ctx.arc(compassX, compassY, radius - 4, windFromRad - 0.78, windFromRad + 0.78);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
    ctx.lineWidth = 5;
    ctx.stroke();

    // 风向箭头 (从 wind.deg 吹向中心并穿过)
    const arrowLen = radius - 8;
    const ax = compassX + Math.cos(windFromRad) * arrowLen;
    const ay = compassY + Math.sin(windFromRad) * arrowLen;
    const bx = compassX - Math.cos(windFromRad) * arrowLen;
    const by = compassY - Math.sin(windFromRad) * arrowLen;

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();

    // 箭头羽
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(bx, by, 4, 0, Math.PI * 2);
    ctx.fill();

    // N 标
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', compassX, compassY - radius + 10);

    ctx.restore();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new WindSailorGame();
});
