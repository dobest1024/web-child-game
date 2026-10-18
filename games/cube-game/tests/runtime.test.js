import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

// Exercise the real handlers while the asynchronous puzzle loader is still pending.
// No DOM should be touched until the player exists.
const source = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
const handlers = source.slice(
  source.indexOf("function resetGame(g)"),
  source.indexOf("function winGame(g)"),
);
test("reset and shuffle safely ignore a loading or failed puzzle", () => {
  const g = { player: null, busy: false, history: [] };
  assert.doesNotThrow(() => runInNewContext(
    `${handlers}; resetGame(game); shuffleGame(game);`, { game: g },
  ));
  assert.deepEqual(g.history, []);
});
