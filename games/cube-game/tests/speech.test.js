// Read-only runtime regression harness: runs the actual source functions with
// a controllable Audio object. This does not test browser media decoding.
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
function between(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `Source extraction failed: ${start}`);
  return source.slice(from, to);
}
const speech = between("let speechFinished = null;", "\nfunction shell()");
const sequence = between("async function speakSequence(texts)", "\nfunction guidedStep(");
const listenHandler = between(
  '  $("#listen").onclick = () => {',
  '  $("#speech-rate").onclick',
);
const winningAnnouncement = between(
  "Promise.resolve(g.lastSpeech).then(",
  "  const confetti =",
);
const success = "太棒啦！魔方复原成功。每一步练习，都让你更厉害一点！";
const flush = () => new Promise((resolve) => setImmediate(resolve));

function fixture() {
  const played = [];
  const listen = { classList: { remove() {}, add() {} } };
  const narrator = {
    paused: true,
    pause() { this.paused = true; },
    play() {
      this.paused = false;
      played.push(this.src);
      return Promise.resolve();
    },
    finishClip() {
      this.paused = true;
      this.onended?.();
    },
  };
  const game = { won: true, auto: false };
  const context = vm.createContext({
    narrator,
    game,
    g: game,
    current: game,
    free: false,
    lesson: { narration: "detail" },
    state: { voice: true, rate: 0.8 },
    speakId: 0,
    window: {},
    voiceManifest: {
      move: "/move.mp3",
      why: "/why.mp3",
      detail: "/detail.mp3",
      [success]: "/success.mp3",
    },
    $: () => listen,
    pauseDemo() {},
    toast() {},
  });
  vm.runInContext(`${speech}\n${sequence}\n${listenHandler}`, context);
  vm.runInContext("g.lastSpeech = speakSequence(['move', 'why']);", context);
  // Corresponds to winGame after its 700 ms state check, while the last move
  // narration is still playing. The callback itself comes from actual source.
  vm.runInContext(winningAnnouncement, context);
  return { played, listen, narrator };
}

test("stopping the last move narration must also cancel the queued win announcement", async () => {
  const f = fixture();
  assert.deepEqual(f.played, ["/move.mp3"]);
  f.listen.onclick();
  await flush();
  assert.equal(f.narrator.paused, true, "stop must leave narration paused");
  assert.deepEqual(f.played, ["/move.mp3"], "success narration must not restart audio");
});

test("normal last-move narration completion still plays the win announcement", async () => {
  const f = fixture();
  f.narrator.finishClip();
  await flush();
  assert.deepEqual(f.played, ["/move.mp3", "/why.mp3"]);
  f.narrator.finishClip();
  await flush();
  assert.deepEqual(f.played, ["/move.mp3", "/why.mp3", "/success.mp3"]);
  assert.equal(f.narrator.paused, false);
});
