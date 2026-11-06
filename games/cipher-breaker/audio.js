// 密码解谜家 - 音效合成器 (Web Audio API)
class AudioSystem {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // 播放单声电报滴答 (dot: 80ms, dash: 240ms)
  playMorseTone(durationMs = 80) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const durSec = durationMs / 1000;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(750, t);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.01);
    gain.gain.setValueAtTime(0.2, t + durSec - 0.01);
    gain.gain.linearRampToValueAtTime(0.001, t + durSec);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + durSec);
  }

  // 播放一段摩斯电码字符串 (例如 "... --- ...")
  playMorseSequence(morseStr, onDone) {
    if (this.muted) {
      if (onDone) onDone();
      return;
    }
    this.init();
    let currentDelay = 0;
    const dotDuration = 90;
    const dashDuration = 270;
    const symbolGap = 70;
    const letterGap = 250;

    for (const char of morseStr) {
      if (char === '.') {
        setTimeout(() => this.playMorseTone(dotDuration), currentDelay);
        currentDelay += dotDuration + symbolGap;
      } else if (char === '-') {
        setTimeout(() => this.playMorseTone(dashDuration), currentDelay);
        currentDelay += dashDuration + symbolGap;
      } else if (char === ' ' || char === '/') {
        currentDelay += letterGap;
      }
    }

    if (onDone) {
      setTimeout(onDone, currentDelay + 100);
    }
  }

  playDialClick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.03);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.03);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.03);
  }

  playStamp() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.linearRampToValueAtTime(60, t + 0.12);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  playFanfare() {
    if (this.muted) return;
    const notes = [392, 523.25, 659.25, 783.99];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.init();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.35);
      }, idx * 110);
    });
  }
}

export const sound = new AudioSystem();
