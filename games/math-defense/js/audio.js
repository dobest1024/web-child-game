'use strict';
// ===== 音效：全部用 WebAudio 现场合成，没有声音文件；没声音也能完整玩 =====

const Sound = {
  ctx: null,
  muted: false,

  // 必须在一次点击里调用（iOS / 微信要求）；暂停回来、每次点击都再叫一次
  unlock() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) this.ctx = new AC();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const tick = this.ctx.createBuffer(1, 1, 22050);
    const src = this.ctx.createBufferSource();
    src.buffer = tick;
    src.connect(this.ctx.destination);
    src.start(0);
  },

  // notes = [[频率, 开始秒, 长度秒], ...]
  tone(notes, type = 'sine', volume = 0.16) {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    for (const [freq, at, len] of notes) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + at);
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(volume, now + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + len);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(now + at);
      osc.stop(now + at + len + 0.05);
    }
  },
  shoot() { this.tone([[660, 0, 0.08], [990, 0.03, 0.08]], 'square', 0.05); },
  pop(combo = 0) {
    const up = Math.min(combo, 8) * 40;
    this.tone([[880 + up, 0, 0.1], [1320 + up, 0.07, 0.18]], 'triangle', 0.15);
  },
  wrong() { this.tone([[240, 0, 0.16], [200, 0.1, 0.18]], 'sine', 0.13); },
  bite() { this.tone([[320, 0, 0.1], [220, 0.08, 0.2]], 'sawtooth', 0.07); },
  coin() { this.tone([[1180, 0, 0.07], [1560, 0.05, 0.1]], 'square', 0.04); },
  rainbow() {
    this.tone([[523, 0, 0.14], [659, 0.08, 0.14], [784, 0.16, 0.14], [1047, 0.24, 0.14], [1319, 0.32, 0.3]], 'triangle', 0.15);
  },
  boss() { this.tone([[160, 0, 0.25], [120, 0.2, 0.35]], 'square', 0.06); },
  warn() { this.tone([[700, 0, 0.1], [700, 0.18, 0.1]], 'square', 0.05); },
  win() { this.tone([[523, 0, 0.15], [659, 0.15, 0.15], [784, 0.3, 0.15], [1047, 0.45, 0.4]], 'triangle', 0.16); },
};
