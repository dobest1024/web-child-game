import test from "node:test";
import assert from "node:assert/strict";
import { Alg } from "cubing/alg";
import { puzzles } from "cubing/puzzles";
import { courses, formulas, moveWords } from "../src/content.js";
import {
  baseOrientation,
  remainingMoves,
  puzzleSolved,
} from "../src/mechanics.js";

for (const course of courses) {
  test(`${course.name}: every starting state is unsolved and every taught sequence solves it`, async () => {
    const kpuzzle = await puzzles[course.puzzle].kpuzzle();
    const base = baseOrientation(course.puzzle);
    for (const stage of course.stages) {
      const setup = `${base} ${new Alg(stage.alg).invert()}`;
      assert.equal(puzzleSolved(kpuzzle, setup, [], base), false, stage.name);
      assert.equal(
        puzzleSolved(kpuzzle, setup, stage.alg.split(" "), base),
        true,
        stage.name,
      );
      const partial = stage.alg.split(" ").slice(0, -1);
      assert.equal(
        puzzleSolved(kpuzzle, setup, partial, base),
        false,
        `${stage.name} must not pass early`,
      );
    }
  });
  test(`${course.name}: hints recover after a wrong turn without pretending it was correct`, async () => {
    const kpuzzle = await puzzles[course.puzzle].kpuzzle();
    const base = baseOrientation(course.puzzle);
    for (const stage of course.stages) {
      const solution = stage.alg.split(" ");
      const setup = `${base} ${new Alg(stage.alg).invert()}`;
      const history = [...solution.slice(0, 1), "L", "U'", "R"];
      const hint = remainingMoves(history, solution);
      assert.equal(
        puzzleSolved(kpuzzle, setup, [...history, ...hint], base),
        true,
        stage.name,
      );
    }
  });
  test(`${course.name}: free play returns all pieces, including pyramid tips`, async () => {
    const kpuzzle = await puzzles[course.puzzle].kpuzzle();
    const base = baseOrientation(course.puzzle);
    const history =
      course.puzzle === "pyraminx"
        ? ["u", "R", "r", "U'", "l", "B"]
        : ["R", "U", "F", "D", "L'", "B"];
    assert.equal(puzzleSolved(kpuzzle, base, history, base), false);
    assert.equal(
      puzzleSolved(
        kpuzzle,
        base,
        [...history, ...remainingMoves(history, [], true)],
        base,
      ),
      true,
    );
  });
}
test("all formula cards use legal algorithms for their own puzzle", async () => {
  for (const f of formulas) {
    const c = courses.find((c) => c.id === f.course);
    const k = await puzzles[c.puzzle].kpuzzle();
    assert.equal(
      k
        .defaultPattern()
        .applyAlg(new Alg(f.alg).invert())
        .applyAlg(f.alg)
        .isIdentical(k.defaultPattern()),
      true,
      f.name,
    );
  }
});
test("voice describes half turns, reverse turns, and 120-degree pyramid tips", () => {
  assert.equal(moveWords("F2"), "前层转半圈");
  assert.equal(moveWords("R'"), "右层逆时针转四分之一圈");
  assert.equal(moveWords("u", "pyraminx"), "上尖角顺时针转 120 度");
});

test("2×2 accepts all 24 solved orientations but rejects a twisted face in each", async () => {
  const k = await puzzles["2x2x2"].kpuzzle();
  const base = baseOrientation("2x2x2");
  const orientations = new Set();
  for (const up of ["", "x", "x2", "x'", "z", "z'"]) {
    for (const spin of ["", "y", "y2", "y'"]) {
      const turns = [up, spin].filter(Boolean);
      orientations.add(
        JSON.stringify(k.defaultPattern().applyAlg(turns.join(" ")).patternData),
      );
      assert.equal(
        puzzleSolved(k, base, turns, base), true, turns.join(" "),
      );
      assert.equal(puzzleSolved(k, base, [...turns, "R"], base), false);
    }
  }
  assert.equal(orientations.size, 24);
  assert.equal(puzzleSolved(k, base, ["R", "L'"], base), true);
});

test("hints recover one click at a time after a detour, instead of oscillating forever", async () => {
  for (const c of courses) {
    const k = await puzzles[c.puzzle].kpuzzle(),
      base = baseOrientation(c.puzzle);
    for (const s of c.stages) {
      const setup = `${base} ${new Alg(s.alg).invert()}`;
      const solution = s.alg.split(" "),
        history = [solution[0], "R", "L", "U'"];
      let turns = 0;
      while (!puzzleSolved(k, setup, history, base) && turns < 80) {
        const hint = remainingMoves(history, solution, false, c.puzzle)[0];
        assert.ok(hint, s.name);
        history.push(hint);
        turns++;
      }
      assert.ok(turns < 80, `${s.name}: hint failed to converge`);
    }
  }
});
test("free-play hints converge one click at a time, including cube half turns and pyramid tips", async () => {
  for (const puzzle of ["3x3x3", "2x2x2", "pyraminx"]) {
    const k = await puzzles[puzzle].kpuzzle(),
      base = baseOrientation(puzzle);
    const history =
      puzzle === "pyraminx"
        ? ["u", "u", "u", "R", "r", "U'", "B"]
        : ["R", "R", "U", "F2", "L'", "D"];
    let turns = 0;
    while (!puzzleSolved(k, base, history, base) && turns < 30) {
      history.push(remainingMoves(history, [], true, puzzle)[0]);
      turns++;
    }
    assert.ok(turns < 30, puzzle);
  }
});
