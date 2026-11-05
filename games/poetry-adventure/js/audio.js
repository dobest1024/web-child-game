'use strict';
// ===== 声音：诗句朗读是预先生成的 mp3（可能没有），音效用 WebAudio 现场合成 =====
// 没有朗读文件也能完整玩：诗句文字一直显示。流程从不等待播放结束事件。

const Sound = {
  ctx: null,
  buffers: {},
  available: null, // audio/manifest.json 里列出的 id；读不到就当没有朗读
  muted: false,

  // 必须在一次点击里调用（iOS / 微信要求）；切到后台回来也要再调一次
  unlock() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) this.ctx = new AC();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const src = this.ctx.createBufferSource();
    src.buffer = this.ctx.createBuffer(1, 1, 22050);
    src.connect(this.ctx.destination);
    src.start(0);
  },

  async loadManifest() {
    if (this.available) return;
    try {
      const list = await (await fetch('audio/manifest.json')).json();
      this.available = new Set(list.map((item) => item.id));
    } catch {
      this.available = new Set();
    }
  },

  async load(ids) {
    await this.loadManifest();
    if (!this.ctx) return;
    await Promise.all(ids.filter((id) => this.available.has(id) && !(id in this.buffers)).map(async (id) => {
      try {
        const res = await fetch(`audio/lines/${id}.mp3`);
        this.buffers[id] = await this.ctx.decodeAudioData(await res.arrayBuffer());
      } catch {
        this.buffers[id] = null;
      }
    }));
  },

  // 朗读的长度（秒），没有音频时按字数估计，用来排下一句的时间
  length(id, text) {
    const buf = this.buffers[id];
    return buf ? buf.duration : 0.4 + text.length * 0.32;
  },

  current: null,
  say(id) {
    if (this.muted || !id || !this.available || !this.available.has(id)) return;
    this.stopVoice();
    const buf = this.buffers[id];
    if (buf && this.ctx) {
      const src = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      gain.gain.value = 1.3;
      src.buffer = buf;
      src.connect(gain).connect(this.ctx.destination);
      src.start();
      this.current = src;
    } else {
      const audio = new Audio(`audio/lines/${id}.mp3`);
      this.current = { stop: () => audio.pause() };
      audio.play().catch(() => {});
    }
  },
  stopVoice() {
    if (this.current) {
      try { this.current.stop(); } catch { /* 已经停了 */ }
      this.current = null;
    }
  },

  // 小音效：notes = [[频率, 开始秒, 长度秒], ...]
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
  right() { this.tone([[880, 0, 0.1], [1320, 0.07, 0.2]], 'triangle', 0.14); },
  wrong() { this.tone([[230, 0, 0.18]], 'sine', 0.13); },
  hurt() { this.tone([[300, 0, 0.12], [200, 0.1, 0.2]], 'sawtooth', 0.06); },
  plank() { this.tone([[392, 0, 0.08], [523, 0.06, 0.12]], 'square', 0.05); },
  line() { this.tone([[659, 0, 0.12], [784, 0.1, 0.12], [988, 0.2, 0.25]], 'triangle', 0.12); },
  win() { this.tone([[523, 0, 0.15], [659, 0.15, 0.15], [784, 0.3, 0.15], [1047, 0.45, 0.4]], 'triangle', 0.15); },
  boss() { this.tone([[180, 0, 0.25], [140, 0.2, 0.3]], 'square', 0.05); },
  warn() { this.tone([[660, 0, 0.1], [660, 0.18, 0.1]], 'square', 0.05); },
};
