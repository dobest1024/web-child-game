// cubing's 3x3 orbit ordering. Colors follow pieces, never guessed from the formula name.
const colors = {
  CORNERS: [
    ["W", "R", "G"],
    ["W", "B", "R"],
    ["W", "O", "B"],
    ["W", "G", "O"],
    ["Y", "G", "R"],
    ["Y", "O", "G"],
    ["Y", "B", "O"],
    ["Y", "R", "B"],
  ],
  EDGES: [
    ["W", "G"],
    ["W", "R"],
    ["W", "B"],
    ["W", "O"],
    ["Y", "G"],
    ["Y", "R"],
    ["Y", "B"],
    ["Y", "O"],
    ["G", "R"],
    ["G", "O"],
    ["B", "R"],
    ["B", "O"],
  ],
  CENTERS: [["W"], ["O"], ["G"], ["R"], ["B"], ["Y"]],
};
export const colorNames = {
  W: "白",
  R: "红",
  G: "绿",
  B: "蓝",
  O: "橙",
  Y: "黄",
};
export function sticker(pattern, orbit, position, orientation) {
  const data = pattern.patternData[orbit],
    n = colors[orbit][0].length;
  return colors[orbit][data.pieces[position]][
    (orientation - data.orientation[position] + n) % n
  ];
}
export function topView(pattern) {
  const c = (i, o) => sticker(pattern, "CORNERS", i, o),
    e = (i, o) => sticker(pattern, "EDGES", i, o);
  return {
    top: [
      c(2, 0),
      e(2, 0),
      c(1, 0),
      e(3, 0),
      sticker(pattern, "CENTERS", 0, 0),
      e(1, 0),
      c(3, 0),
      e(0, 0),
      c(0, 0),
    ],
    back: [c(2, 2), e(2, 1), c(1, 1)],
    front: [c(3, 1), e(0, 1), c(0, 2)],
    left: [c(2, 1), e(3, 1), c(3, 2)],
    right: [c(1, 2), e(1, 1), c(0, 1)],
  };
}
export function cfopChecks(pattern, target) {
  const same = (orbit, i) =>
    pattern.patternData[orbit].pieces[i] ===
      target.patternData[orbit].pieces[i] &&
    pattern.patternData[orbit].orientation[i] ===
      target.patternData[orbit].orientation[i];
  const cross = [4, 5, 6, 7].filter((i) => same("EDGES", i)).length;
  const pairs = [
    [4, 8],
    [5, 9],
    [6, 11],
    [7, 10],
  ].filter(([c, e]) => same("CORNERS", c) && same("EDGES", e)).length;
  const view = topView(pattern);
  return {
    cross,
    pairs,
    yellow: view.top.filter((c) => c === "Y").length,
    solved: pattern.isIdentical(target),
  };
}
