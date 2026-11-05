'use strict';
// ===== 声音：拼音读音是真人录音 mp3，音效用 WebAudio 现场合成 =====
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
    await Promise.all(ids.filter((id) => !this.buffers[id]).map(async (id) => {
      try {
        const res = await fetch(`audio/syl/${id}.mp3`);
        this.buffers[id] = await this.ctx.decodeAudioData(await res.arrayBuffer());
      } catch {
        this.buffers[id] = null; // 读不到就用 <audio> 兜底
      }
    }));
  },

  current: null,
  say(id) {
    if (this.muted || !id) return;
    this.stopVoice();
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
      const audio = new Audio(`audio/syl/${id}.mp3`);
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
  jump() { this.tone([[520, 0, 0.12], [780, 0.04, 0.1]], 'triangle', 0.08); },
  right() { this.tone([[880, 0, 0.12], [1320, 0.08, 0.22]], 'triangle', 0.16); },
  wrong() { this.tone([[220, 0, 0.18]], 'sine', 0.14); },
  coin() { this.tone([[1180, 0, 0.08], [1560, 0.06, 0.12]], 'square', 0.05); },
  hurt() { this.tone([[300, 0, 0.12], [200, 0.1, 0.2]], 'sawtooth', 0.07); },
  splash() { this.tone([[330, 0, 0.1], [260, 0.08, 0.14], [200, 0.16, 0.2]], 'sine', 0.12); },
  win() { this.tone([[523, 0, 0.15], [659, 0.15, 0.15], [784, 0.3, 0.15], [1047, 0.45, 0.4]], 'triangle', 0.16); },
  boss() { this.tone([[180, 0, 0.25], [140, 0.2, 0.3]], 'square', 0.06); },
};
