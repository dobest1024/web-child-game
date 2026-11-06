import { noteToFrequency } from './engine.js';
// 琴音合成器：基频正弦 + 一个八度上的三角波泛音 + 包络，做出清脆的钢琴感。
// AudioContext 懒加载，首次交互时解锁；允许多个音同时叠放（和弦）。
export class PianoAudio {
  constructor() {
    this.enabled = true;
    this.context = null;
    this.active = new Set();
    try {
      this.enabled = localStorage.getItem('happy-piano:muted') !== 'true';
    } catch {
      /* Optional preference. */
    }
  }
  unlock() {
    if (!this.enabled) return;
    try {
      this.context ??= new (window.AudioContext || window.webkitAudioContext)();
      if (this.context.state === 'suspended')
        this.context.resume().catch(() => {});
    } catch {
      /* Silent fallback. */
    }
  }
  stop() {
    for (const oscillator of this.active) {
      try {
        oscillator.stop();
      } catch {
        /* Already ended. */
      }
    }
    this.active.clear();
  }
  toggle() {
    this.enabled = !this.enabled;
    this.stop();
    if (this.enabled) this.unlock();
    try {
      localStorage.setItem('happy-piano:muted', String(!this.enabled));
    } catch {
      /* Optional preference. */
    }
  }
  // duration 单位是秒；when 是相对现在的延迟秒数，方便排小旋律。
  note(name, duration = 0.8, when = 0) {
    if (!this.enabled || !this.context || document.hidden) return;
    const frequency = noteToFrequency(name);
    const start = this.context.currentTime + when;
    const envelope = this.context.createGain();
    const peak = 0.16;
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.linearRampToValueAtTime(peak, start + 0.012);
    envelope.gain.exponentialRampToValueAtTime(peak * 0.4, start + 0.22);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    envelope.connect(this.context.destination);
    const fundamental = this.context.createOscillator();
    fundamental.type = 'sine';
    fundamental.frequency.setValueAtTime(frequency, start);
    const fundamentalGain = this.context.createGain();
    fundamentalGain.gain.value = 0.82;
    fundamental.connect(fundamentalGain).connect(envelope);
    const overtone = this.context.createOscillator();
    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(frequency * 2, start);
    const overtoneGain = this.context.createGain();
    overtoneGain.gain.value = 0.18;
    overtone.connect(overtoneGain).connect(envelope);
    const end = start + duration + 0.05;
    for (const oscillator of [fundamental, overtone]) {
      this.active.add(oscillator);
      oscillator.onended = () => {
        this.active.delete(oscillator);
        envelope.disconnect();
        fundamentalGain.disconnect();
        overtoneGain.disconnect();
      };
      oscillator.start(start);
      oscillator.stop(end);
    }
  }
}
