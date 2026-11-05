# 拼音大冒险

小兔跳跳自动向前跑，点屏幕（或按空格 / ↑）跳起来，顶写着对的拼音的砖块。
现开放 1—6 年级，共 70 关：一年级 20 关补足基础拼读，二至六年级各 10 关练习语境读音、多音字和易错字音。

- 设计：`docs/01-设计理念.md`、`docs/02-关卡设计.md`
- 代码：纯 HTML + Canvas + 原生 JS，按 `pinyin → levels → save → audio → game → main` 顺序加载，无构建步骤
- 改关卡和题库：`js/levels.js`；拼音规则：`js/pinyin.js`
- 存档键 `pinyin-adventure-save-v1`，改结构时同时改 `defaultSave()` 和 `fillSave()`
- 读音：`audio/syl/*.mp3` 是 audio-cmn 的真人录音（CC BY-SA，见 `audio/CREDITS.txt`）

## 运行和测试

```sh
python3 -m http.server 8801   # 在本目录，打开 http://127.0.0.1:8801
npm test                      # 拼音规则、题库和音频文件完整性
```

浏览器自测：在控制台加载 `tests/bot.js` 后运行 `runLevel(关号, 答错比例)`，结果在 `window.__res`。


内容按年级核心知识组织，供游戏化学习与复习；不宣称逐课覆盖某一版教材。原一年级关卡编号和存档键保持兼容。
