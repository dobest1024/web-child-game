import { LEVELS } from './levels.js';
import {
  normalizeLink,
  verifyFoodWeb,
  simulateEcosystem,
  calculateStars,
  sanitizeProgress,
} from './engine.js';
import { sfx } from './audio.js';

class FoodChainGame {
  constructor() {
    this.currentLevelIndex = 0;
    this.selectedNode = null;
    this.userLinks = new Set();
    this.isSimulating = false;

    // Load progress
    try {
      const raw = JSON.parse(localStorage.getItem('food_chain_progress') || '{}');
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
    this.canvas = document.getElementById('chain-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.btnSimulate = document.getElementById('btn-simulate');
    this.btnClear = document.getElementById('btn-clear');

    // Controls
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
    this.canvas.addEventListener('pointerdown', (e) => {
      sfx.init();
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      this.handleCanvasClick(x, y);
    });

    this.btnSimulate.addEventListener('click', () => {
      sfx.init();
      this.runSimulation();
    });

    this.btnClear.addEventListener('click', () => {
      sfx.init();
      this.userLinks.clear();
      this.selectedNode = null;
      this.draw();
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
    this.levelNameEl.textContent = `第 ${index + 1} 关: ${lvl.title} (${lvl.biome})`;
    this.missionTitleEl.textContent = `🌿 ${lvl.title}`;
    this.missionDescEl.textContent = lvl.desc;
    this.tipTextEl.textContent = lvl.tip;

    this.selectedNode = null;
    this.userLinks.clear();
    this.isSimulating = false;
    this.draw();
  }

  handleCanvasClick(clickX, clickY) {
    const lvl = LEVELS[this.currentLevelIndex];

    let clickedNode = null;
    for (const node of lvl.nodes) {
      if (Math.hypot(clickX - node.x, clickY - node.y) <= 30) {
        clickedNode = node;
        break;
      }
    }

    if (!clickedNode) {
      this.selectedNode = null;
      this.draw();
      return;
    }

    if (!this.selectedNode) {
      this.selectedNode = clickedNode;
      sfx.playSelect();
      this.draw();
      return;
    }

    if (this.selectedNode.id === clickedNode.id) {
      this.selectedNode = null;
      this.draw();
      return;
    }

    // Toggle directed link from selectedNode to clickedNode
    const linkKey = normalizeLink(this.selectedNode.id, clickedNode.id);
    if (this.userLinks.has(linkKey)) {
      this.userLinks.delete(linkKey);
      sfx.playDisconnect();
    } else {
      this.userLinks.add(linkKey);
      sfx.playConnect();
    }

    this.selectedNode = null;
    this.draw();
  }

  runSimulation() {
    const lvl = LEVELS[this.currentLevelIndex];
    const userArray = Array.from(this.userLinks);

    const verifyRes = verifyFoodWeb(lvl.links, userArray);
    const simRes = simulateEcosystem(lvl.nodes, userArray);

    if (verifyRes.balanced && simRes.allFed) {
      sfx.playWin();
      const stars = calculateStars(verifyRes.missing, verifyRes.invalid);

      const lId = String(lvl.id);
      const prevStars = this.progress.stars[lId] || 0;
      if (stars > prevStars) {
        this.progress.stars[lId] = stars;
        this.progress.cleared[lId] = true;
        try {
          localStorage.setItem('food_chain_progress', JSON.stringify(this.progress));
        } catch {}
      }

      this.winStarsEl.textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
      document.getElementById('res-food-chains').textContent = `${this.userLinks.size} 条捕食链`;
      this.winModal.classList.add('open');
    } else if (verifyRes.missing > 0) {
      sfx.playDisconnect();
      alert(`生态网尚未完整：还缺少 ${verifyRes.missing} 条捕食链关系，请根据生物习性继续连接！`);
    } else if (verifyRes.invalid > 0) {
      sfx.playDisconnect();
      alert(`存在 ${verifyRes.invalid} 条不符合常理的捕食关系（比如食草动物不会捕食猛兽哦）！点击连线可擦除。`);
    }
  }

  draw() {
    const { ctx, canvas } = this;
    const lvl = LEVELS[this.currentLevelIndex];

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const nodeMap = new Map();
    lvl.nodes.forEach((n) => nodeMap.set(n.id, n));

    // Draw directed arrow links
    for (const link of this.userLinks) {
      const [fromId, toId] = link.split('->');
      const fromNode = nodeMap.get(fromId);
      const toNode = nodeMap.get(toId);
      if (fromNode && toNode) {
        this.drawArrow(fromNode.x, fromNode.y, toNode.x, toNode.y);
      }
    }

    // Draw organism nodes
    for (const node of lvl.nodes) {
      const isSelected = this.selectedNode && this.selectedNode.id === node.id;

      // Selection halo
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 34, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(251, 191, 36, 0.4)';
        ctx.fill();
      }

      // Outer disc
      ctx.beginPath();
      ctx.arc(node.x, node.y, 26, 0, Math.PI * 2);
      ctx.fillStyle = node.type === 'producer' ? '#166534' : node.type === 'herbivore' ? '#1e3a8a' : '#7c2d12';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = isSelected ? '#fbbf24' : '#4ade80';
      ctx.stroke();

      // Emoji
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.icon, node.x, node.y - 1);

      // Name & Role label
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#f0fdf4';
      ctx.fillText(node.name, node.x, node.y + 40);

      const typeNames = { producer: '生产者', herbivore: '食草动物', carnivore: '捕食者', apex: '顶级霸主', decomposer: '分解者' };
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#a7f3d0';
      ctx.fillText(typeNames[node.type] || '', node.x, node.y + 54);
    }
  }

  drawArrow(fromX, fromY, toX, toY) {
    const { ctx } = this;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    // Stop at edge of target node radius
    const targetX = toX - Math.cos(angle) * 30;
    const targetY = toY - Math.sin(angle) * 30;
    const startX = fromX + Math.cos(angle) * 30;
    const startY = fromY + Math.sin(angle) * 30;

    ctx.save();
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#4ade80';

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(targetX, targetY);
    ctx.stroke();

    // Arrowhead
    const headLen = 12;
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.moveTo(targetX, targetY);
    ctx.lineTo(targetX - headLen * Math.cos(angle - Math.PI / 6), targetY - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(targetX - headLen * Math.cos(angle + Math.PI / 6), targetY - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    ctx.restore();
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
  new FoodChainGame();
});
