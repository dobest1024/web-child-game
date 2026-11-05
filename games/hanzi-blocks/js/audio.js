'use strict';
// ===== 声音：字音和组词是真人录音 mp3（audio/zi-*.mp3、audio/ci-*.mp3），音效用 WebAudio 现场合成 =====
// 游戏流程从不等待播放结束事件（移动端经常丢事件）

const Sound = {
  ctx: null,
  buffers: {},
  muted: false,

  // 必须在一次点击里调用（iOS / 微信要求）
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

  async load(ids) {
    if (!this.ctx) return;
    await Promise.all(ids.filter((id) => !(id in this.buffers)).map(async (id) => {
      try {
        const res = await fetch(`audio/${id}.mp3`);
        this.buffers[id] = await this.ctx.decodeAudioData(await res.arrayBuffer());
      } catch {
        this.buffers[id] = null; // 读不到就用 <audio> 兜底
      }
    }));
  },

  current: null,
  voiceTimers: [],
  duration(id) {
    return this.buffers[id]?.duration || (id.startsWith('ci-') ? 1.8 : 1.3);
  },
  stopVoice() {
    this.voiceTimers.forEach(clearTimeout);
    this.voiceTimers = [];
    if (this.current) {
      try { this.current.stop(); } catch { /* 已经停了 */ }
      this.current = null;
    }
  },
  say(id) {
    this.stopVoice();
    this.playVoice(id);
  },
  // 返回总时长，让下一题也等字音和组词念完。
  sequence(ids, delay = 0) {
    this.stopVoice();
    let at = delay;
    for (const id of ids) {
      this.voiceTimers.push(setTimeout(() => this.playVoice(id), at * 1000));
      at += this.duration(id) + 0.15;
    }
    return at;
  },
  playVoice(id) {
    if (this.muted || !id) return;
    if (this.current) {
      try { this.current.stop(); } catch { /* 已经停了 */ }
      this.current = null;
    }
    const buf = this.buffers[id];
    if (buf && this.ctx) {
      const src = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      gain.gain.value = 1.4;
      src.buffer = buf;
      src.connect(gain).connect(this.ctx.destination);
      src.start();
      this.current = src;
    } else {
      const audio = new Audio(`audio/${id}.mp3`);
      this.current = { stop: () => audio.pause() };
      audio.play().catch(() => {});
    }
  },

  // 小音效：notes = [[频率, 开始秒, 长度秒], ...]
  tone(notes, type = 'sine', volume = 0.18) {
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
  pop() { this.tone([[660, 0, 0.08], [990, 0.05, 0.12]], 'triangle', 0.12); },
  thud() { this.tone([[150, 0, 0.14]], 'sine', 0.2); },
  right() { this.tone([[880, 0, 0.12], [1320, 0.08, 0.22]], 'triangle', 0.16); },
  wrong() { this.tone([[220, 0, 0.18]], 'sine', 0.14); },
  broom() { this.tone([[1400, 0, 0.06], [1100, 0.05, 0.06], [800, 0.1, 0.1]], 'triangle', 0.07); },
  warn() { this.tone([[600, 0, 0.1], [600, 0.18, 0.1]], 'square', 0.05); },
  win() { this.tone([[523, 0, 0.15], [659, 0.15, 0.15], [784, 0.3, 0.15], [1047, 0.45, 0.4]], 'triangle', 0.16); },
  boss() { this.tone([[180, 0, 0.25], [140, 0.2, 0.3]], 'square', 0.06); },
};

if (typeof module === 'object') module.exports = { Sound };
