import test from "node:test";
import assert from "node:assert/strict";
import { puzzles } from "cubing/puzzles";
import { Alg } from "cubing/alg";
import {
  cfopLessons,
  cfopChapters,
  lessonStep,
  migrateProgress,
} from "../src/cfop.js";
import { cfopChecks, topView } from "../src/cfop-state.js";
import { courses, moveWords } from "../src/content.js";
import { caseDiagram } from "../src/teaching.js";
const k = await puzzles["3x3x3"].kpuzzle();
const target = k.defaultPattern().applyAlg("z2");
const start = (s) => target.applyAlg(new Alg(s.alg).invert());
const byId = (id) => cfopLessons.find((s) => s.id === id);

test("full CFOP narration teaches the holding orientation before case recognition", () => {
  for (const s of cfopLessons) {
    assert.ok(s.narration.includes(s.hold), s.id);
    assert.ok(
      s.narration.indexOf(s.hold) < s.narration.indexOf(s.recognition), s.id,
    );
  }
});

test("the case diagram exposes all four side strips to screen readers", () => {
  const label = caseDiagram(start(byId("pll-ua"))).match(
    /role="img" aria-label="([^"]+)"/,
  )[1];
  assert.match(label, /前侧从左到右：绿、橙、绿/);
  assert.match(label, /后侧从左到右：蓝、蓝、蓝/);
  assert.match(label, /左侧从后到前：红、绿、红/);
  assert.match(label, /右侧从后到前：橙、红、橙/);
});

test("CFOP progression has four chapters, 10 two-look OLL cases, 6 PLL cases, and final alignment", () => {
  assert.equal(cfopLessons.length, 24);
  assert.equal(new Set(cfopLessons.map((s) => s.id)).size, 24);
  assert.deepEqual(
    cfopChapters.map(
      (c) => cfopLessons.filter((s) => s.chapter === c.id).length,
    ),
    [3, 4, 10, 7],
  );
});
test("every F2L case starts with the white cross intact and exactly one unfinished pair", () => {
  for (const s of cfopLessons.filter((s) => s.chapter === "f2l")) {
    const checks = cfopChecks(start(s), target);
    assert.equal(checks.cross, 4, s.id);
    assert.equal(checks.pairs, 3, s.id);
  }
});
test("all OLL and PLL cases begin with two complete layers; PLL never asks to orient a yellow piece", () => {
  for (const s of cfopLessons.filter((s) =>
    ["oll", "pll"].includes(s.chapter),
  )) {
    const checks = cfopChecks(start(s), target);
    assert.equal(checks.cross, 4, s.id);
    assert.equal(checks.pairs, 4, s.id);
    if (s.chapter === "pll") assert.equal(checks.yellow, 9, s.id);
  }
});
test("yellow-edge cases match the stated holding direction, ignoring corners", () => {
  const mask = (id) =>
    [1, 3, 5, 7].map((i) => topView(start(byId(id))).top[i] === "Y");
  assert.deepEqual(mask("oll-line"), [false, true, true, false]);
  assert.deepEqual(mask("oll-elbow"), [true, true, false, false]);
  assert.deepEqual(mask("oll-dot"), [false, false, false, false]);
  const dot = byId("oll-dot");
  const halfway = start(dot).applyAlg(dot.groups[0].moves).applyAlg("U2");
  assert.deepEqual(
    [1, 3, 5, 7].map((i) => topView(halfway).top[i] === "Y"),
    [true, true, false, false],
  );
});
test("seven yellow-corner cases are distinct even after any U adjustment", () => {
  const cases = cfopLessons.filter(
    (s) =>
      s.id.startsWith("oll-") &&
      !["oll-line", "oll-elbow", "oll-dot"].includes(s.id),
  );
  const signatures = [];
  for (const s of cases) {
    const p = start(s),
      view = topView(p);
    assert.equal(
      [1, 3, 5, 7].every((i) => view.top[i] === "Y"),
      true,
      s.id,
    );
    const signature = ["", "U", "U2", "U'"]
      .map((u) =>
        Object.values(topView(p.applyAlg(u)))
          .flat()
          .map((c) => (c === "Y" ? "Y" : "."))
          .join(""),
      )
      .sort()[0];
    assert.equal(signatures.includes(signature), false, s.id);
    signatures.push(signature);
  }
});
test("corner cases have the stated headlights, edge cases preserve the already positioned corners", () => {
  const headlights = (id) =>
    Object.entries(topView(start(byId(id))))
      .filter(([side]) => side !== "top")
      .filter(([, v]) => v[0] === v[2]).length;
  assert.equal(headlights("pll-t"), 1);
  assert.equal(headlights("pll-y"), 0);
  for (const id of ["pll-ua", "pll-ub", "pll-h", "pll-z"]) {
    assert.deepEqual(
      start(byId(id)).patternData.CORNERS,
      target.patternData.CORNERS,
      id,
    );
  }
});
test("case diagram matches actual center orientation and side colors", () => {
  assert.deepEqual(topView(target), {
    top: Array(9).fill("Y"),
    back: ["B", "B", "B"],
    front: ["G", "G", "G"],
    left: ["R", "R", "R"],
    right: ["O", "O", "O"],
  });
  const ua = topView(start(byId("pll-ua"))),
    ub = topView(start(byId("pll-ub")));
  assert.deepEqual([ua.front[1], ua.right[1], ua.left[1]], ["O", "R", "G"]);
  assert.deepEqual([ub.front[1], ub.right[1], ub.left[1]], ["R", "G", "O"]);
});
test("each move belongs to a concrete teaching group, including long PLL sequences", () => {
  for (const s of cfopLessons) {
    const moves = s.alg.split(" ");
    moves.forEach((m, i) => {
      const step = lessonStep(s, i);
      assert.ok(step.why, s.id);
      assert.equal(step.moves.split(" ")[step.within - 1], m);
    });
    assert.equal(lessonStep(s, moves.length), null);
  }
});
test("old CFOP achievements migrate to the same exercises without awarding new lessons", () => {
  assert.deepEqual(
    migrateProgress(
      [
        "cfop:0",
        "cfop:1",
        "cfop:2",
        "cfop:3",
        "beginner:2",
        "cfop:99",
        "cfop:1",
      ],
      courses,
    ),
    [
      "cfop:cross-aligned",
      "cfop:f2l-right",
      "cfop:oll-sune",
      "cfop:pll-t",
      "beginner:2",
    ],
  );
  assert.deepEqual(migrateProgress(["cfop:pll-z", "cfop:unknown"], courses), [
    "cfop:pll-z",
  ]);
});
test("wide layer and middle slice narration cannot be confused with pyramid tips", () => {
  assert.match(moveWords("r"), /右边两层/);
  assert.match(moveWords("M'"), /正对左面看.*逆时针/);
  assert.match(moveWords("r", "pyraminx"), /右尖角.*120/);
});

test("F2L pairing lessons really form the taught pair at their first checkpoint", () => {
  const paired = start(byId("f2l-right")).patternData;
  for (const id of ["f2l-pair", "f2l-extract"]) {
    const s = byId(id),
      p = start(s).applyAlg(s.groups[0].moves).patternData;
    assert.deepEqual(p, paired, id);
  }
  const p = start(byId("f2l-extract"));
  assert.equal(topView(p).top[0], "W", "white-up corner is at upper back left");
});
