import { Alg } from "cubing/alg";

// z2 keeps green at the front and places white underneath for beginner lessons.
export const baseOrientation = (puzzle) => (puzzle === "pyraminx" ? "" : "z2");
export const inverseMoves = (moves) =>
  new Alg(moves.join(" ")).invert().toString().split(" ").filter(Boolean);
// Fold adjacent turns of the same layer, so a guided inverse really removes a detour.
// Pyraminx has three positions per turn; cubes have four.
export function normalizedMoves(moves, puzzle = "3x3x3") {
  const modulus = puzzle === "pyraminx" ? 3 : 4;
  const stack = [];
  for (const move of moves) {
    const face = move.replace(/[2']+$/, "");
    let amount = (move.includes("2") ? 2 : 1) * (move.includes("'") ? -1 : 1);
    if (stack.at(-1)?.face === face) amount += stack.pop().amount;
    amount = ((amount % modulus) + modulus) % modulus;
    if (amount) stack.push({ face, amount });
  }
  return stack.map(
    ({ face, amount }) =>
      face + (amount === 1 ? "" : amount === modulus - 1 ? "'" : "2"),
  );
}
export function remainingMoves(
  history,
  solution,
  free = false,
  puzzle = "3x3x3",
) {
  history = normalizedMoves(history, puzzle);
  if (free) return inverseMoves(history);
  let prefix = 0;
  while (
    prefix < history.length &&
    prefix < solution.length &&
    history[prefix] === solution[prefix]
  )
    prefix++;
  return [...inverseMoves(history.slice(prefix)), ...solution.slice(prefix)];
}
export function puzzleSolved(kpuzzle, setup, history, base) {
  const pattern = kpuzzle
    .defaultPattern()
    .applyAlg(`${setup} ${history.join(" ")}`);
  // A 2×2 has no fixed centers: turning the whole solved cube is still a solve.
  if (kpuzzle.name() === "2x2x2")
    return pattern.experimentalIsSolved({
      ignorePuzzleOrientation: true,
      ignoreCenterOrientation: true,
    });
  return pattern.isIdentical(kpuzzle.defaultPattern().applyAlg(base));
}
