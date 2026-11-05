# 古诗大作战

小鸡接住天上掉下的字、小鸭子用诗句铺桥过河、和 Boss 对诗。现开放 1—6 年级，每个年级 10 关，共 60 关、63 首古诗词，通过接字、诗句拼桥和对诗复习。

- 设计：`docs/01-设计理念.md`、`docs/02-关卡设计.md`
- 代码：纯 HTML + Canvas + 原生 JS，按 `poems → levels → save → audio → game → main` 顺序加载，无构建步骤
- 诗文：`js/poems.js`（注释写了核对来源）；关卡：`js/levels.js`
- 存档键 `poetry-adventure-save-v1`，改结构时同时改 `defaultSave()` 和 `fillSave()`
- 朗读：`audio/lines/*.mp3` 由本机 Qwen3-TTS 合成（`tools/gen_audio.py`），清单 `audio/manifest.json`；没有这些文件也能玩

## 运行和测试

```sh
python3 -m http.server 8802   # 在本目录，打开 http://127.0.0.1:8802
npm test                      # 诗文格式、干扰项、飞花令选项、关卡覆盖、朗读清单、存档清洗
```

浏览器自测：控制台加载 `tests/bot.js` 后运行 `runLevel(关号, 答错比例)`，结果在 `window.__res`。

重新生成朗读（需要 BaoCut）：

```sh
QWEN_TTS_MODEL="<qwen3-tts gguf 路径>" python3 -I tools/gen_audio.py
```


内容按年级核心知识组织，供游戏化学习与复习；不宣称逐课覆盖某一版教材。原一年级关卡编号和存档键保持兼容。
