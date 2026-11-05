# 单词大冒险

听发音学英语单词：戳对的泡泡、开小蛇去吃对的字母、翻卡片配对单词和图。
现开放 1—6 年级，每个年级 10 关，共 60 关、375 个英语单词及 26 个字母，按生活、校园、时间、交通、健康等主题学习。

| 关 | 名字 | 玩法 |
|---|---|---|
| 1 | 彩虹泡泡 | 吹泡泡，教学关（第一题只有一个泡泡） |
| 2 | 字母小蛇 A–M | 小蛇听字母吃字母 |
| 3 | 数一数泡泡 | 吹泡泡，数字 one–ten |
| 4 | 动物翻翻乐 | 单词卡和图片卡配对 |
| 5 | 小 Boss：捣蛋恐龙 | 吹泡泡打恐龙，它会定时跺脚（先冒感叹号） |
| 6 | 字母小蛇 N–Z | 小蛇听字母，加石头 |
| 7 | 水果泡泡 | 吹泡泡 |
| 8 | 身体和家人翻翻乐 | 配对 |
| 9 | 拼小词 | 小蛇按顺序吃字母拼 cat、dog、sun…… |
| 10 | 大 Boss：乱码恐龙王 | 拼小词打恐龙王，躲开红圈 |

- 代码：纯 HTML + Canvas + 原生 JS，无构建步骤。加载顺序 `words → levels → save → audio → art → game → mode-* → main`
- 改关卡：`js/levels.js`；改词库：`js/words.js`（改完运行 `python3 -I tools/verify-cambridge.py` 重新核对拼写）
- 存档键 `word-adventure-save-v1`，改结构时同时改 `defaultSave()` 和 `fillSave()`
- 原有启蒙读音：Wikimedia Commons / Lingua Libre 的真人录音（CC BY-SA 3.0、CC0、公有领域），逐个文件出处见 `audio/CREDITS.txt`；
  重新下载用 `python3 -I tools/fetch-audio.py <原始文件目录>`（需要 ffmpeg）

## 运行和测试

```sh
python3 -m http.server 8811   # 在本目录，打开 http://127.0.0.1:8811
npm test                      # 词库核对、录音完整性、存档清洗，以及全年级的自动通关模拟
```

浏览器自测：在控制台加载 `tests/bot.js` 后运行 `runLevel(关号, 答错比例)`，结果在 `window.__res`。


内容按年级核心知识组织，供游戏化学习与复习；不宣称逐课覆盖某一版教材。原一年级关卡编号和存档键保持兼容。

新增 324 个词的音频为本机 Qwen3-TTS 合成（Ryan），运行仓库根目录 `scripts/generate-extra-word-audio.py` 可补齐缺失文件；先设置 `QWEN_TTS_MODEL`。音频清单逐项标明 `synthesized`，不属于原录音的 CC 授权声明。
