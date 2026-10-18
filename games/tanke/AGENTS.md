# AGENTS.md

坦克大冒险：面向 6–9 岁小朋友的网页坦克大战。作者：周逸卿。

## 先读这些
1. `docs/01-设计理念.md`：为什么这样做，所有新功能都要符合这里的原则。
2. `docs/02-100关设计.md`：100 关、新地形、新敌人、新道具、40 个 Boss 的完整设计。
3. `docs/03-开发任务.md`：代码地图、数据格式、里程碑（M0–M8，已全部实现）和验收标准。

## 代码在哪
- 加载顺序：`data → levels → meta → audio → draw → draw2 → game → world → boss → tutorial → editor → main`。
- 改关卡：`js/levels.js` 的 `LEVEL_TABLE`；改敌人 / Boss / 道具数值：`js/data.js`；改 Boss 招式：`js/boss.js` 的 `doSkill`。
- 网址加 `?dev=1` 会在控制台跑 `checkLevels()` 自检 100 关。

## 硬性约定
- 纯 HTML + Canvas + 原生 JS，用普通 `<script>` 按顺序加载，不加依赖、不加构建步骤，`file://` 直接打开能玩。
- 代码风格跟现有文件一致：`'use strict'`、2 空格、单引号、少量中文注释。
- 界面文字用简体中文；标题页和通关页必须显示"作者：周逸卿"。
- 改存档结构时同时改 `js/meta.js` 的 `defaultSave()` 和 `fillSave()`；存档键名 `tanke-save-v2` 不改；老存档不能坏。
- 存档码、分享码读进来的数据按白名单清洗，不拼进 `innerHTML`。
- 任何伤害玩家的东西都要先有预警；不做血腥恐怖内容；玩家之间不互相伤害。

## 运行和调试
- 直接打开 `index.html`，或者在项目目录起一个静态服务器：`python3 -m http.server 8800`。
- `?unlock=1` 解锁全部关卡；`window.__tk` 可以看内部状态。
