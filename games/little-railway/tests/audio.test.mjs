import test from 'node:test';
import assert from 'node:assert/strict';
import { RailwayAudio } from '../audio.js';
import { RobotAudio } from '../../robot-rescue/audio.js';

function setup() {
  const storage = new Map();
  const sources = [];
  const param = () => ({
    value: 0,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
  });
  class Context {
    constructor() {
      this.currentTime = 0;
      this.state = 'running';
      this.destination = {};
    }
    createGain() {
      return { gain: param(), connect() {}, disconnect() {} };
    }
    createOscillator() {
      const source = {
        frequency: param(),
        connect(target) {
          return target;
        },
        disconnect() {},
        start(at) {
          this.started = at;
        },
        stop() {
          this.stops = (this.stops || 0) + 1;
        },
      };
      sources.push(source);
      return source;
    }
  }
  globalThis.document = { hidden: false };
  globalThis.window = { AudioContext: Context };
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  };
  return { sources, storage };
}

test('railway sound requires a gesture unlock, mute stops scheduled notes and preferences persist', () => {
  const { sources } = setup();
  const sounds = new RailwayAudio();
  sounds.play('whistle');
  assert.equal(sources.length, 0);
  sounds.unlock();
  sounds.play('whistle');
  assert.equal(sources.length, 6);
  sounds.setEnabled(false);
  assert.equal(sounds.active.size, 0);
  assert.ok(sources.every((source) => source.stops >= 2));
  sounds.play('win');
  assert.equal(sources.length, 6);
  assert.equal(new RailwayAudio().enabled, false);
  sounds.setVolume(0.2);
  assert.equal(new RailwayAudio().volume, 0.2);
  sounds.setEnabled(true);
  document.hidden = true;
  sounds.play('place');
  assert.equal(sources.length, 6);
});

test('robot mute cancels its fanfare and prevents new effect scheduling', () => {
  const { sources } = setup();
  const sounds = new RobotAudio();
  sounds.unlock();
  sounds.play('win');
  assert.equal(sources.length, 6);
  sounds.toggle();
  assert.equal(sounds.active.size, 0);
  sounds.play('add');
  assert.equal(sources.length, 6);
  assert.equal(new RobotAudio().enabled, false);
});
