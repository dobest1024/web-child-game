# 小小游乐岛 · Web Child Game

一个统一的 H5 游戏入口：26 款游戏，支持分类、搜索、随机选择、全屏和返回大厅。
桌面与手机均可访问。游戏源码和所需资源包含在本仓库内，不依赖原工作目录。

## 1—6 年级学习游戏

六款学习游戏均提供六个年级的核心知识内容，共 370 关；按主题拓展，不限定某一版教材。

| 游戏 | 关卡 | 内容 |
|---|---:|---|
| 拼音大冒险 | 70 | 基础拼读、多音字、语境辨音、易错读音 |
| 古诗大作战 | 60 | 63 首古诗词，接字、拼桥、对诗 |
| 汉字积木 | 60 | 147 个汉字，部件与形近字 |
| 单词大冒险 | 60 | 375 个单词、26 个字母，按主题分组 |
| 口算大作战 | 60 | 整数、小数、分数、百分数、比和几何量 |
| 小小店长 | 60 | 购物找零、单位换算、数量关系、折扣与比例 |

运行 `npm run test:games` 验证六款游戏的数据、音频、规则和通关流程。
原有存档键与关卡编号保留。新增英语和古诗音频为本机 Qwen3-TTS 合成，具体来源见各游戏的 `audio/manifest.json`。

## 本地运行

需要 **Node.js 22.12+** 和 npm。

```sh
git clone https://github.com/dobest1024/web-child-game.git
cd web-child-game
# 使用 nvm 时可运行 nvm install && nvm use（仓库带 .nvmrc）
npm run setup
npm start
```

打开 **http://localhost:8780**。同一 Wi-Fi 下的手机可以访问终端打印的局域网地址。
`npm start` 先构建魔方小岛，再启动大厅和王冠峡谷服务；按 `Ctrl+C` 一起退出。
首次安装需联网下载 npm 依赖。

```sh
PORT=9000 npm start             # 更换统一入口端口
HOST=127.0.0.1 npm start        # 大厅仅供本机访问
```

王冠峡谷内部服务使用自动分配的空闲端口，游戏通过大厅同源 HTTP / WebSocket 代理连接。
邀请链接也会回到大厅的游戏页。对局存于内存，重启服务会结束进行中的对局。
好友联机版需要 Node 服务；静态预览版的王冠峡谷仅开放单人 AI 练习。

## 游戏清单

| 分类 | 游戏 |
| --- | --- |
| 益智解谜 | 魔法药水店、奇妙机关屋、水滴救援队、机器人救援队、小小铁路工程师、魔方小岛、格子动物园、聪聪智力岛、魔方小课堂、魔方小老师 |
| 探索学习 | 星球探险队、拼音小火车、拼音大冒险、古诗大作战、单词大冒险、口算大作战、小小店长、汉字积木 |
| 动作冒险 | 双人冰火快递、坦克大冒险、小闪电反应营、小坦克大冒险 |
| 棋盘对战 | 王冠峡谷、象棋小棋手、围棋小课堂、五子棋小课堂 |

`games/mini-game/index.html` 的原合集页也保留。两个 Godot 项目不包含在此仓库。

## 目录

```text
index.html / play.html   大厅与游戏容器
portal/                 游戏目录数据、原创 SVG 插画、页面样式和交互
games/                  21 个 H5 项目目录（共 26 个游戏入口）
server/                 统一入口和王冠峡谷代理
scripts/                安装与魔方构建脚本
tests/                  路由、入口、代理与私有路径隔离测试
.cache/cube-game/       自动构建产物，不提交
```

新增游戏时在 `portal/games.js` 添加标题、类别和路径；独立静态目录同时加入
`server/gateway.mjs` 的 `staticGames`。编辑现有游戏前阅读其 README 和局部 AGENTS.md。
游戏副本与原工作区互相独立，修改不会自动同步。

## 验证

```sh
npm run build
npm test
# 另一个终端先运行 npm start，再验证双客户端真实 WebSocket 对局：
TEST_URL=http://127.0.0.1:8780 npm run test:online
```

各游戏的独立测试保留在 `games/` 下，例如 `npm test --prefix games/cube-game`
和 `npm test --prefix games/huang`。大厅测试不替代每款游戏的完整关卡验收。
素材与依赖的原有署名、许可证说明保留在各游戏目录中。

页面截图、验收结果及限制见 [docs/QA.md](docs/QA.md)。

## 部署

### Cloudflare（当前站点）

访问 **https://game.930316.xyz**。使用 `cf` CLI 的 Workers 静态资源托管，
王冠峡谷提供单人 AI 练习。

```sh
npm run setup
npm run deploy:cf
```

部署命令先生成静态文件，再运行 `cf deploy --prebuilt --profile work`。
需要已授权的 `work` 配置；账号、Worker 名称和域名在 `scripts/build-cloudflare.mjs` 中设置。
此脚本生成 `.cloudflare/output/v0/`，已验证兼容 `cf@1.0.0-beta.18`；升级 CLI 后先运行
`cf deploy --prebuilt --profile work --dry-run` 检查构建输出兼容性。
Cloudflare 自动管理自定义域名的 DNS 和 HTTPS。部署文件及凭据不提交 Git。

### Node 服务

在具备 Node.js 的主机按上述命令运行即可。配置反向代理时需同时转发 HTTP 与
`/ws` 的 WebSocket Upgrade；公网建议使用 HTTPS。进程管理器应运行 `node server/start.mjs`，
在发布阶段先执行 `npm run setup` 和 `npm run build`。
本仓库推送不代表已经部署公网游戏站点。

### EdgeOne 静态预览

```sh
npm run setup
npm run build:static
PAGES_SOURCE=skills edgeone makers deploy dist --anonymous --site global --json
```

`dist/` 包含大厅和全部 26 个游戏入口，可直接托管。王冠峡谷在浏览器内运行原有
对战规则，支持 AI 出兵、出牌、投降和再战；预览隐藏好友房间，不提供联机。
`npm start` 仍使用原来的服务端联机版本。`edgeone.json` 配置源码构建，生成目录不提交。
免登录预览链接有效期为 60 分钟；如需保存项目，请按发布结果中的链接登录认领。
`.edgeone/` 保存部署凭据，已加入忽略规则，不要上传或提交。
