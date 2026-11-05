'use strict';
// ===== 声音：全部用 WebAudio 现场合成的小音效，没有声音也完全能玩 =====
// 游戏流程从不等待声音播放结束

const Sound = {
  ctx: null,
  muted: false,

  // 在每次点击里调用：第一次创建，切到后台回来时恢复（iOS / 微信要求）
  unlock() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      if (!this.ctx) this.ctx = new AC();
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  },

  // notes = [[频率, 开始秒, 长度秒], ...]
  tone(notes, type = 'sine', volume = 0.16) {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    for (const [freq, at, len] of notes) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + at);
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(volume, now + at + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + len);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(now + at);
      osc.stop(now + at + len + 0.05);
    }
  },
  coin() { this.tone([[1480, 0, 0.07], [1975, 0.04, 0.1]], 'triangle', 0.09); },
  tap() { this.tone([[660, 0, 0.06]], 'triangle', 0.07); },
  back() { this.tone([[520, 0, 0.06], [400, 0.04, 0.08]], 'triangle', 0.06); },
  right() { this.tone([[988, 0, 0.09], [1319, 0.07, 0.09], [1760, 0.14, 0.25]], 'square', 0.05); },
  wrong() { this.tone([[260, 0, 0.16], [220, 0.12, 0.2]], 'sine', 0.13); },
  door() { this.tone([[1568, 0, 0.3], [1175, 0.12, 0.4]], 'sine', 0.07); },
  help() { this.tone([[880, 0, 0.08], [1047, 0.08, 0.08], [1319, 0.16, 0.16]], 'triangle', 0.1); },
  warn() { this.tone([[440, 0, 0.12], [440, 0.2, 0.12]], 'square', 0.05); },
  pop() { this.tone([[700, 0, 0.05], [1400, 0.03, 0.08]], 'triangle', 0.12); },
  hurt() { this.tone([[300, 0, 0.12], [200, 0.1, 0.2]], 'sawtooth', 0.06); },
  win() { this.tone([[523, 0, 0.14], [659, 0.14, 0.14], [784, 0.28, 0.14], [1047, 0.42, 0.4]], 'triangle', 0.15); },
  close() { this.tone([[523, 0, 0.2], [392, 0.2, 0.3]], 'sine', 0.12); },
};
