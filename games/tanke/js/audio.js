'use strict';
// ===== 音效与音乐（全部用 WebAudio 合成）=====
const midi = m => 440 * Math.pow(2, (m - 69) / 12);

const SONGS = {
  normal: {
    step: 0.19,
    mel: [72, 0, 76, 0, 79, 0, 76, 79, 77, 0, 81, 0, 79, 0, 0, 0, 76, 0, 79, 0, 84, 0, 79, 0, 81, 0, 79, 0, 76, 0, 0, 0,
      74, 0, 77, 0, 81, 0, 77, 0, 76, 0, 79, 0, 84, 0, 0, 0, 71, 0, 74, 0, 79, 0, 77, 74, 76, 0, 74, 0, 72, 0, 0, 0],
    bass: [48, 53, 48, 45, 50, 48, 43, 48],
  },
  snow: {
    step: 0.22,
    mel: [77, 0, 0, 81, 0, 0, 84, 0, 82, 0, 81, 0, 79, 0, 0, 0, 76, 0, 0, 79, 0, 0, 82, 0, 81, 0, 79, 0, 77, 0, 0, 0,
      74, 0, 0, 77, 0, 0, 81, 0, 79, 0, 77, 0, 76, 0, 0, 0, 72, 0, 76, 0, 79, 0, 82, 81, 77, 0, 0, 0, 0, 0, 0, 0],
    bass: [53, 58, 48, 53, 50, 46, 48, 53],
  },
  desert: {
    step: 0.17,
    mel: [74, 0, 75, 0, 78, 0, 79, 78, 75, 0, 74, 0, 0, 0, 74, 75, 78, 0, 79, 0, 81, 0, 82, 81, 79, 0, 78, 0, 0, 0, 0, 0,
      81, 0, 79, 78, 79, 0, 78, 75, 78, 0, 75, 74, 75, 0, 0, 0, 74, 75, 78, 79, 81, 79, 78, 75, 74, 0, 0, 0, 62, 0, 0, 0],
    bass: [50, 50, 55, 50, 55, 50, 57, 50],
  },
  candy: {
    step: 0.16,
    mel: [79, 0, 83, 79, 86, 0, 83, 0, 84, 0, 81, 0, 79, 0, 76, 0, 79, 0, 83, 79, 86, 0, 91, 0, 88, 0, 86, 0, 84, 0, 0, 0,
      81, 0, 84, 81, 88, 0, 84, 0, 83, 0, 79, 0, 76, 0, 79, 0, 81, 83, 84, 86, 88, 86, 84, 81, 79, 0, 0, 0, 79, 0, 0, 0],
    bass: [43, 48, 43, 48, 45, 43, 50, 43],
  },
  ocean: {
    step: 0.21,
    mel: [65, 0, 69, 72, 77, 0, 72, 69, 67, 0, 70, 74, 79, 0, 74, 70, 69, 0, 72, 77, 81, 0, 77, 72, 70, 0, 74, 77, 82, 0, 0, 0,
      77, 0, 76, 74, 72, 0, 69, 0, 70, 0, 72, 74, 76, 0, 77, 0, 79, 0, 77, 76, 74, 0, 72, 0, 70, 72, 74, 0, 77, 0, 0, 0],
    bass: [41, 46, 48, 41, 46, 43, 48, 41],
  },
  forest: {
    step: 0.18,
    mel: [79, 0, 76, 0, 79, 0, 76, 0, 74, 76, 78, 79, 81, 0, 0, 0, 83, 0, 79, 0, 83, 0, 79, 0, 81, 79, 78, 76, 74, 0, 0, 0,
      76, 0, 79, 0, 81, 0, 83, 0, 84, 0, 83, 81, 79, 0, 76, 0, 78, 0, 81, 0, 79, 0, 78, 0, 76, 0, 74, 0, 79, 0, 0, 0],
    bass: [43, 47, 48, 43, 40, 47, 45, 43],
  },
  night: {
    step: 0.26,
    mel: [72, 0, 0, 0, 79, 0, 0, 0, 77, 0, 76, 0, 74, 0, 0, 0, 72, 0, 0, 0, 76, 0, 0, 0, 74, 0, 72, 0, 71, 0, 0, 0,
      69, 0, 0, 0, 72, 0, 0, 0, 76, 0, 74, 0, 72, 0, 0, 0, 67, 0, 71, 0, 74, 0, 72, 0, 71, 0, 0, 0, 72, 0, 0, 0],
    bass: [48, 45, 41, 43, 45, 41, 43, 48],
  },
  volcano: {
    step: 0.16,
    mel: [74, 0, 74, 77, 0, 74, 81, 0, 79, 77, 0, 74, 76, 0, 73, 0, 74, 0, 74, 77, 0, 81, 86, 0, 84, 0, 81, 0, 79, 0, 0, 0,
      77, 0, 79, 81, 0, 77, 74, 0, 76, 0, 77, 79, 0, 76, 73, 0, 74, 77, 81, 0, 79, 77, 76, 0, 74, 0, 0, 0, 62, 0, 0, 0],
    bass: [38, 38, 46, 45, 38, 43, 45, 38],
  },
  factory: {
    step: 0.17,
    mel: [72, 72, 0, 79, 0, 72, 76, 0, 72, 72, 0, 79, 0, 77, 76, 0, 74, 74, 0, 81, 0, 74, 77, 0, 74, 74, 0, 81, 0, 79, 77, 0,
      76, 0, 79, 0, 84, 0, 79, 0, 77, 0, 81, 0, 84, 0, 81, 0, 79, 77, 76, 74, 72, 0, 74, 0, 76, 0, 72, 0, 67, 0, 0, 0],
    bass: [48, 48, 50, 50, 52, 53, 55, 48],
  },
  space: {
    step: 0.2,
    mel: [87, 0, 0, 82, 0, 0, 79, 0, 84, 0, 0, 79, 0, 0, 75, 0, 86, 0, 0, 82, 0, 0, 77, 0, 82, 0, 79, 0, 75, 0, 0, 0,
      75, 0, 82, 0, 87, 0, 82, 0, 77, 0, 84, 0, 89, 0, 84, 0, 79, 0, 86, 0, 91, 0, 87, 0, 86, 0, 82, 0, 87, 0, 0, 0],
    bass: [39, 44, 46, 39, 41, 44, 46, 39],
  },
  castle: {
    step: 0.17,
    mel: [69, 0, 69, 72, 76, 0, 72, 0, 74, 0, 74, 77, 81, 0, 77, 0, 76, 0, 72, 0, 69, 0, 72, 0, 71, 0, 68, 0, 64, 0, 0, 0,
      72, 0, 72, 76, 79, 0, 76, 0, 77, 0, 77, 81, 84, 0, 81, 0, 79, 0, 76, 0, 72, 0, 71, 0, 69, 0, 64, 0, 69, 0, 0, 0],
    bass: [45, 45, 50, 52, 48, 53, 52, 45],
  },
  boss: {
    step: 0.15,
    mel: [69, 0, 72, 76, 0, 72, 76, 0, 74, 0, 77, 0, 76, 74, 72, 0, 69, 0, 72, 76, 0, 81, 79, 0, 77, 0, 76, 0, 74, 0, 0, 0,
      77, 0, 76, 74, 0, 72, 74, 0, 76, 0, 72, 0, 69, 0, 0, 0, 74, 0, 76, 77, 0, 79, 81, 0, 80, 0, 76, 0, 81, 0, 0, 0],
    bass: [45, 41, 45, 43, 38, 45, 40, 45],
  },
  final: {
    step: 0.14,
    mel: [72, 0, 72, 75, 0, 79, 0, 78, 77, 0, 75, 0, 74, 0, 72, 0, 72, 0, 72, 75, 0, 79, 0, 84, 83, 0, 79, 0, 0, 0, 0, 0,
      80, 0, 79, 77, 0, 75, 0, 77, 79, 0, 75, 0, 72, 0, 0, 0, 80, 79, 77, 75, 74, 72, 71, 74, 72, 0, 0, 0, 67, 0, 71, 0],
    bass: [36, 41, 36, 43, 44, 39, 41, 36],
  },
};

const Snd = {
  ac: null, out: null, sfx: null, mus: null, noiseBuf: null,
  timer: null, step: 0, nextT: 0, song: 'normal',
  init() {
    if (!this.ac) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ac = new AC();
        this.out = this.ac.createGain(); this.out.connect(this.ac.destination);
        this.sfx = this.ac.createGain(); this.sfx.gain.value = 0.55; this.sfx.connect(this.out);
        this.mus = this.ac.createGain(); this.mus.gain.value = 0.14; this.mus.connect(this.out);
        const len = Math.floor(this.ac.sampleRate * 0.6);
        const b = this.ac.createBuffer(1, len, this.ac.sampleRate), d = b.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.noiseBuf = b;
      } catch (e) { this.ac = null; return; }
    }
    if (this.ac.state === 'suspended') this.ac.resume();
    this.applyMute();
  },
  applyMute() { if (this.out) this.out.gain.value = save.muted ? 0 : 1; },
  tone(type, f0, f1, dur, vol, delay, dest) {
    if (!this.ac || save.muted) return;
    const t = this.ac.currentTime + (delay || 0);
    const o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfx);
    o.start(t); o.stop(t + dur + 0.03);
  },
  noise(dur, vol, freq, delay, dest) {
    if (!this.ac || save.muted) return;
    const t = this.ac.currentTime + (delay || 0);
    const s = this.ac.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 1200; f.Q.value = 0.8;
    const g = this.ac.createGain();
    g.gain.setValueAtTime(vol || 0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.sfx);
    s.start(t); s.stop(t + dur + 0.03);
  },
  play(n) {
    if (!this.ac || save.muted) return;
    const tn = this.tone.bind(this), ns = this.noise.bind(this);
    switch (n) {
      case 'shoot': tn('square', 880, 320, 0.09, 0.1); break;
      case 'shootBig': tn('square', 300, 90, 0.18, 0.16); ns(0.12, 0.2, 500); break;
      case 'shootIce': tn('sine', 1500, 2400, 0.12, 0.15); break;
      case 'shootBomb': tn('triangle', 200, 420, 0.15, 0.25); break;
      case 'shootPierce': tn('sawtooth', 1400, 600, 0.1, 0.08); break;
      case 'eshoot': tn('triangle', 420, 200, 0.12, 0.13); break;
      case 'brick': ns(0.12, 0.32, 900); tn('square', 180, 90, 0.06, 0.05); break;
      case 'steel': tn('sine', 1600, 1500, 0.08, 0.1); tn('sine', 2400, 2300, 0.06, 0.05, 0.02); break;
      case 'boing': tn('sine', 260, 620, 0.1, 0.25); tn('sine', 620, 300, 0.1, 0.2, 0.1); break;
      case 'pop': tn('sine', 380, 1400, 0.16, 0.3); ns(0.15, 0.2, 2500); tn('triangle', 1046, 1046, 0.1, 0.12, 0.12); tn('triangle', 1318, 1318, 0.14, 0.12, 0.19); break;
      case 'boom': ns(0.5, 0.55, 300); tn('sine', 150, 40, 0.5, 0.45); break;
      case 'hurt': tn('sawtooth', 520, 140, 0.32, 0.12); break;
      case 'egg': tn('square', 660, 640, 0.12, 0.1); tn('square', 440, 420, 0.25, 0.1, 0.13); break;
      case 'pup': [523, 659, 784, 1046].forEach((f, i) => tn('triangle', f, f, 0.12, 0.22, i * 0.07)); break;
      case 'spawn': [1200, 1600, 2000].forEach((f, i) => tn('sine', f, f * 1.1, 0.08, 0.05, i * 0.06)); break;
      case 'bubble': tn('sine', 900, 1300, 0.08, 0.14); break;
      case 'poof': ns(0.08, 0.13, 3000); break;
      case 'skill': [392, 523, 659, 784, 1046, 1318].forEach((f, i) => tn('square', f, f * 1.02, 0.1, 0.1, i * 0.04)); ns(0.3, 0.2, 1800, 0.05); break;
      case 'freeze': [2000, 1600, 2400, 1800].forEach((f, i) => tn('sine', f, f, 0.15, 0.1, i * 0.06)); break;
      case 'warn': tn('square', 880, 880, 0.1, 0.12); tn('square', 880, 880, 0.1, 0.12, 0.18); break;
      case 'stomp': ns(0.4, 0.5, 200); tn('sine', 90, 40, 0.4, 0.5); break;
      case 'tele': tn('sine', 300, 1800, 0.3, 0.12); break;
      case 'win': [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tn('square', f, f, i === 5 ? 0.5 : 0.14, 0.12, i * 0.13)); break;
      case 'lose': [392, 370, 349, 330].forEach((f, i) => tn('triangle', f, f * 0.97, i === 3 ? 0.6 : 0.28, 0.22, i * 0.3)); break;
      case 'click': tn('sine', 700, 1000, 0.06, 0.18); break;
      case 'start': [392, 523, 659, 784].forEach((f, i) => tn('triangle', f, f, 0.12, 0.2, i * 0.08)); break;
      case 'coin': tn('square', 1320, 1320, 0.05, 0.07); tn('square', 1760, 1760, 0.08, 0.07, 0.05); break;
      case 'push': ns(0.15, 0.2, 400); tn('triangle', 120, 90, 0.15, 0.15); break;
      case 'splash': ns(0.4, 0.35, 1500); tn('sine', 600, 200, 0.3, 0.15); break;
      case 'portal': tn('sine', 400, 1600, 0.25, 0.14); tn('sine', 1600, 400, 0.25, 0.1, 0.1); break;
      case 'jump': tn('sine', 300, 900, 0.25, 0.25); tn('square', 600, 1200, 0.1, 0.05); break;
      case 'bossDie': for (let i = 0; i < 6; i++) { ns(0.3, 0.4, 300 + i * 200, i * 0.15); tn('sine', 200 + i * 100, 60, 0.3, 0.3, i * 0.15); } break;
    }
  },
  setSong(name) { if (this.song !== name) { this.song = name; this.step = 0; } },
  startMusic() {
    if (!this.ac || this.timer) return;
    this.nextT = this.ac.currentTime + 0.1;
    this.timer = setInterval(() => this.tick(), 30);
  },
  stopMusic() { clearInterval(this.timer); this.timer = null; },
  tick() {
    if (!this.ac) return;
    const S = SONGS[this.song];
    while (this.nextT < this.ac.currentTime + 0.15) {
      if (this.nextT < this.ac.currentTime) this.nextT = this.ac.currentTime + 0.02;
      const d = this.nextT - this.ac.currentTime, s = this.step % 64;
      const m = S.mel[s];
      if (m) this.tone('triangle', midi(m), midi(m), S.step * 1.6, 0.5, d, this.mus);
      if (s % 4 === 0) this.tone('sine', midi(S.bass[Math.floor(s / 8)]), midi(S.bass[Math.floor(s / 8)]), S.step * 3, 0.7, d, this.mus);
      if (s % 4 === 2) this.noise(0.04, 0.12, 6000, d, this.mus);
      if ((this.song === 'boss' || this.song === 'final') && s % 4 === 0) this.noise(0.08, 0.35, 150, d, this.mus);
      this.nextT += S.step;
      this.step++;
    }
  },
};

function say(txt) {
  if (save.muted) return;
  try {
    const s = window.speechSynthesis;
    if (!s) return;
    s.cancel();
    const u = new SpeechSynthesisUtterance(txt);
    u.lang = 'zh-CN'; u.rate = 1.05; u.pitch = 1.4; u.volume = 0.9;
    s.speak(u);
  } catch (e) { /* 不支持语音就算了 */ }
}
