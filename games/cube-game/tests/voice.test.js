import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { courses, formulas, moveWords } from "../src/content.js";
import knowledge from "../src/knowledge.json" with { type: "json" };
import { journeyWords, journeySpeech } from "../src/journey-model.js";
const manifest = JSON.parse(
  readFileSync(new URL("../src/voice-manifest.json", import.meta.url)),
);
test("every lesson explanation, group reason, and taught turn has bundled model narration", () => {
  const spoken = courses.flatMap((c) =>
    c.stages.flatMap((s) => [
      s.intro,
      ...(s.narration ? [s.narration, ...s.groups.map((g) => g.why)] : []),
      ...s.alg.split(" ").map((m) => moveWords(m, c.puzzle)),
    ]),
  );
  spoken.push(...formulas.map((f) => f.detail));
  spoken.push(...knowledge.items.flatMap(q => [q.explanation + q.question, q.success, ...q.wrongFeedback.filter(Boolean)]));
  spoken.push(...Object.values(journeyWords).map(s => s.why), ...Object.values(journeySpeech));
  for (const text of new Set(spoken)) {
    assert.ok(manifest[text], `Missing narration mapping: ${text}`);
    assert.ok(
      statSync(new URL("../public" + manifest[text], import.meta.url)).size >
        1000,
      text,
    );
  }
  const publicManifest = JSON.parse(
    readFileSync(new URL("../public/audio/manifest.json", import.meta.url)),
  );
  assert.deepEqual(publicManifest, manifest);
});
