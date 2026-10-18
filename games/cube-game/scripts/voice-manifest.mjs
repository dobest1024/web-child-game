import { courses, formulas, moveWords } from "../src/content.js";
import knowledge from "../src/knowledge.json" with { type: "json" };
import { journeyWords, journeySpeech } from "../src/journey-model.js";
import { createHash } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
const common = [
  "嗨，小探险家！我是小方。魔方不需要一次就学会。今天学会一个小动作，也是一件很棒的事情。拿起魔方，我们一起出发吧！",
  "这里可以自由转动魔方。打乱后，点击下一步提示，沿着原路回到整齐。",
  "太棒啦！魔方复原成功。每一步练习，都让你更厉害一点！",
];
const texts = [
  ...new Set([
    ...common,
    ...knowledge.items.flatMap(q => [q.explanation + q.question, q.success, ...q.wrongFeedback.filter(Boolean)]),
    ...Object.values(journeyWords).map(s => s.why),
    ...Object.values(journeySpeech),
    ...courses.flatMap((c) =>
      c.stages.flatMap((s) => [
        s.intro,
        ...(s.narration ? [s.narration, ...s.groups.map((g) => g.why)] : []),
      ]),
    ),
    ...formulas.map((f) => f.detail),
    ...["R", "L", "U", "D", "F", "B", "r", "M"].flatMap((m) =>
      ["", "'", "2"].map((s) => moveWords(m + s)),
    ),
    ...["R", "L", "U", "B", "u", "r", "l", "b"].flatMap((m) =>
      ["", "'"].map((s) => moveWords(m + s, "pyraminx")),
    ),
  ]),
];
const records = texts.map((text) => ({
  text,
  filename:
    createHash("sha256").update(text).digest("hex").slice(0, 16) + ".mp3",
  spoken: text
    .replaceAll("F2L", "角棱配对")
    .replaceAll("OLL", "顶面翻色")
    .replaceAll("PLL", "顶层换位")
    .replaceAll("CFOP", "四步速拧法")
    .replaceAll("Cross", "十字")
    .replaceAll("U2", "上层转半圈")
    .replaceAll("大写 R", "大写的英文字母 R")
    .replaceAll("小写 u", "小写的英文字母 U"),
}));
mkdirSync("artifacts/voice", { recursive: true });
writeFileSync("artifacts/voice/records.json", JSON.stringify(records, null, 2));
writeFileSync(
  "src/voice-manifest.json",
  JSON.stringify(
    Object.fromEntries(records.map((r) => [r.text, "/audio/" + r.filename])),
    null,
    2,
  ),
);
console.log(`${records.length} 条中文讲解与动作提示`);
