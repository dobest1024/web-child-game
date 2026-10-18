import { normalizedMoves } from "./mechanics.js";
import { topView, colorNames, cfopChecks } from "./cfop-state.js";
import { lessonStep } from "./cfop.js";
const colorHex = {
  W: "#fffef7",
  Y: "#f8d849",
  G: "#38a776",
  B: "#528cd5",
  R: "#ed6a66",
  O: "#f5a14a",
};
function tile(color) {
  return `<span class="case-tile" style="background:${colorHex[color]}"><span>${colorNames[color]}</span></span>`;
}
export function caseDiagram(pattern, caption = "初始局面 · 从上面看") {
  const view = topView(pattern);
  const colors = (side) => view[side].map((c) => colorNames[c]).join("、");
  const description = `顶面和四侧顶层色块；下边为前面。顶面按从后到前、从左到右：${colors("top")}。前侧从左到右：${colors("front")}。后侧从左到右：${colors("back")}。左侧从后到前：${colors("left")}。右侧从后到前：${colors("right")}。`;
  return `<figure class="case-figure"><figcaption>${caption}</figcaption><div class="case-net" role="img" aria-label="${description}">${Object.entries(
    view,
  )
    .map(
      ([side, colors]) =>
        `<div class="case-${side}">${colors.map(tile).join("")}</div>`,
    )
    .join("")}</div><small>↓ 前面（绿色中心）朝自己</small></figure>`;
}
export function teachingMarkup(lesson) {
  return `<div class="lesson-tabs" role="group" aria-label="教学步骤"><button data-lesson-tab="observe" aria-pressed="true">1 先观察</button><button data-lesson-tab="follow" aria-pressed="false">2 跟着转</button><button data-lesson-tab="check" aria-pressed="false">3 检查</button></div>
  <section id="lesson-observe"><div class="observe-layout"><div id="case-initial"></div><div><h3>怎么拿？</h3><p>${lesson.hold}</p><h3>怎么认？</h3><p>${lesson.recognition}</p></div></div><p class="case-note">图里的侧边细条，是这一面的顶层侧色。只比较本关要观察的块：做黄十字时忽略角块，做黄角时比较黄色朝向，换位时比较同色关系。</p><button class="button primary full" id="begin-follow">看清楚了，开始转</button><button class="text-link full" id="listen-detail">听小方完整讲一遍</button></section>`;
}
export function checkMarkup(lesson) {
  return `<section id="lesson-check" hidden><h3>现在检查这四件事</h3><div id="live-checks"></div><h3>本关要看什么？</h3><p>${lesson.check}</p><p class="case-note">公式中途，已完成的部分可能暂时变乱。先做完当前整组，再检查。本关是单个准备好的局面；实际复原每一阶段结束后，都要重新观察。</p><button class="button secondary full" id="return-follow">回到动作，继续练习</button></section>`;
}
export function checksMarkup(checks) {
  return [
    ["白十字", checks.cross, 4],
    ["角棱伙伴", checks.pairs, 4],
    ["顶面黄格", checks.yellow, 9],
    ["六面复原", checks.solved ? 1 : 0, 1],
  ]
    .map(
      ([name, count, total]) =>
        `<div class="check-item ${count === total ? "complete" : ""}"><span>${count === total ? "✓" : "○"} ${name}</span><strong>${count}/${total}</strong></div>`,
    )
    .join("");
}
export function updateTeaching(g) {
  if (!g.lesson.groups || !g.kpuzzle) return;
  const pattern = g.kpuzzle
    .defaultPattern()
    .applyAlg(`${g.setup} ${g.history.join(" ")}`);
  const target = g.kpuzzle.defaultPattern().applyAlg(g.base);
  document.querySelector("#live-checks").innerHTML = checksMarkup(
    cfopChecks(pattern, target),
  );
  const walked = normalizedMoves(g.history, g.course.puzzle);
  const onTrack = walked.every((m, i) => m === g.solution[i]);
  const index = walked.length;
  const step = lessonStep(g.lesson, index);
  const targetEl = document.querySelector("#step-purpose");
  if (!onTrack) {
    targetEl.innerHTML =
      "<strong>走了另一条路，也没关系</strong><p>“跟我转这一步”会先撤销偏离的动作，再回到本关路线。也可以按撤回，自己退回上一格。</p>";
    return;
  }
  if (!step) {
    targetEl.innerHTML = `<strong>整组完成，看看结果</strong><p>${g.lesson.check}</p>`;
    return;
  }
  const next = g.solution[index];
  const after = pattern.applyAlg(next),
    beforeChecks = cfopChecks(pattern, target),
    afterChecks = cfopChecks(after, target);
  const changes = [
    ["cross", "白十字"],
    ["pairs", "角棱伙伴"],
    ["yellow", "顶面黄格"],
  ]
    .filter(([key]) => beforeChecks[key] !== afterChecks[key])
    .map(
      ([key, label]) => `${label} ${beforeChecks[key]} → ${afterChecks[key]}`,
    )
    .join(" · ");
  targetEl.innerHTML = `<div class="group-counter">动作组 ${step.groupIndex + 1}/${g.lesson.groups.length} · 组内第 ${step.within}/${step.count} 步</div><strong>${step.title}</strong><p>${step.why}</p><div class="group-alg">${step.moves
    .split(" ")
    .map(
      (m, i) =>
        `<span class="${i === step.within - 1 ? "current" : ""}">${m}</span>`,
    )
    .join(
      "",
    )}</div><small>${changes ? `转这一步会看到：${changes}。` : "这一步在调整位置，继续观察色块的移动。"}${next[0] === "r" ? "小写 r：右边两层一起转。" : next[0] === "M" ? "M：只转左右两层之间的夹心，正对左面判断方向。" : ""}</small>`;
}
