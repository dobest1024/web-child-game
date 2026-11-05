export class DeliveryAudio {
  constructor() {
    this.enabled = true;
    this.active = new Set();
    try { this.enabled = localStorage.getItem('icefire-delivery:muted:v1') !== 'true'; } catch { /* Optional preference. */ }
  }
  unlock() {
    if (!this.enabled) return;
    try { this.context ??= new (window.AudioContext || window.webkitAudioContext)(); if (this.context.state === 'suspended') this.context.resume().catch(() => {}); } catch { /* Keep the game playable without sound. */ }
  }
  stop() {
    for (const source of this.active) { try { source.stop(); } catch { /* Already stopped. */ } }
    this.active.clear();
  }
  toggle() {
    this.enabled = !this.enabled; this.stop(); if (this.enabled) this.unlock();
    try { localStorage.setItem('icefire-delivery:muted:v1', String(!this.enabled)); } catch { /* Optional preference. */ }
  }
  play(cue, player = 0) {
    if (!this.enabled || !this.context || document.hidden) return;
    const notes = { move: [player ? 300 : 440], pickup: [523, 659, 784], deliver: [659, 784, 1047], gate: [330, 440, 550], blocked: [220, 180], undo: [440, 330], win: [523, 659, 784, 1047, 784, 1047] }[cue] || [600];
    notes.forEach((frequency, i) => {
      const start = this.context.currentTime + i * .09;
      const duration = cue === 'win' ? .3 : .12;
      const source = this.context.createOscillator(), gain = this.context.createGain();
      source.type = cue === 'move' ? 'triangle' : 'sine'; source.frequency.value = frequency;
      gain.gain.setValueAtTime(.001, start); gain.gain.linearRampToValueAtTime(cue === 'move' ? .024 : .045, start + .014); gain.gain.exponentialRampToValueAtTime(.001, start + duration);
      source.connect(gain).connect(this.context.destination); this.active.add(source);
      source.onended = () => { this.active.delete(source); source.disconnect(); gain.disconnect(); };
      source.start(start); source.stop(start + duration + .02);
    });
  }
}
