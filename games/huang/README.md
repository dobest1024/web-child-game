# 王冠峡谷 · Crown Gorge

一款可直接在浏览器玩的 3D 实时卡牌攻塔游戏。包含 AI 练习和真正的双人 WebSocket 对战，桌面与手机布局均可用。

参考 [amiaoapp/inkwave](https://github.com/amiaoapp/inkwave) 的技术选择：Three.js r186、原生 JavaScript ES Modules、程序化美术和 WebSocket 房间；Cloudflare Worker / Durable Object 作为可部署后端。未复制 inkwave 游戏代码，不使用皇室战争官方素材，也不连接官方服务器。

## 立即运行

需要 Node.js 22 或更高版本。

```sh
npm install
npm start
```

打开 **http://localhost:8790**。服务监听 `0.0.0.0`，手机和朋友在同一个局域网时，可用启动输出中的本机局域网 IP 打开，例如 `http://192.168.x.x:8790`。如果无法访问，检查是否连接同一网络及系统防火墙是否允许 Node 入站。代理、VPN、虚拟机网卡地址不一定是可用的局域网地址。

`PORT=9000 npm start` 可更换端口。`npm run dev` 会监听服务端文件变动重启；重启会清空正在进行的房间。

## 怎么玩

- **开始练习**：直接与 AI 对战，三秒倒计时后开始。
- **创建好友对战**：复制邀请链接或六位房间码给另一位玩家；两人点击准备后开始。
- 点击底部四张手牌之一，再点击己方半场落兵。电脑可以用 `1–4` 选卡，`Esc` 取消。
- 部队自动通过桥梁推进、寻敌和攻击。飞行单位能越过河流。
- 法术可以释放在任意半场；圣水不足、敌方落兵、塔上落兵由服务器拒绝。
- 3 分钟常规赛，最后一分钟双倍圣水。摧毁国王塔立即胜利；否则比较皇冠数。平分加时 60 秒，先取得皇冠领先者胜；最终比较剩余塔总生命值，完全相同则平局。
- 比赛结束可以再来一局；双人模式需要双方同意。顶部退出按钮适用于电脑与手机。
- 页面刷新或短时掉线后自动重连，保留阵营和当前战斗。掉线超过 30 秒判负。主动退出直接判负。
- 音效默认关闭，点击右上角音符开启。

八张卡牌：铁卫、双子游侠、山岭巨人、绿林小队、爆破专家、翡翠幼龙、陨火、箭雨。四张手牌加四张循环队列，下一张牌可见。双方使用相同的固定卡组。

## 验证

```sh
npm run check          # 全部 JS 模块语法检查
npm test               # 战斗规则、房间状态、重连及完整 AI 对局
npm run test:online    # 先运行 npm start，再做真实双客户端 WebSocket 测试
npm run build          # 生成 dist/，包括本地托管的 Three.js
```

在线测试覆盖双方准备、服务端落兵校验、同一 tick 的双方单位和塔完全一致、隐藏对手手牌、断线重连、认输、再战和实时 AI 出兵。

浏览器验收记录与实际截图见 [docs/QA.md](docs/QA.md)。只检查过手机尺寸模拟，未在物理手机上验收。

## Cloudflare 部署

项目已提供 Worker + Durable Object 配置，前端静态资源与房间服务同域，无需单独配置 WebSocket URL。

```sh
npm run cf:dev              # 本地运行 Cloudflare 版本，默认端口 8787
npx wrangler login         # 登录你自己的 Cloudflare 账号
npm run deploy             # 发布静态资源、Worker 与 Durable Object
```

也可先做部署包检查：

```sh
npm run build
npx wrangler deploy --dry-run
```

验证 Cloudflare 本地实例：

```sh
TEST_URL=http://127.0.0.1:8787 WORKER_TEST=1 npm run test:online
```

**本次没有发布公网服务。** Node 与 Cloudflare 本地运行环境已验证；线上账户权限、域名和实际公网延迟待部署后验证。房间是临时对局，服务重启、Worker 更新或运行实例回收后不保证恢复。Durable Object 在对局期间运行 20 Hz 模拟，实际使用会产生对应平台的计算与连接费用；对外开放前可按部署规模增加平台级请求限流。

## 结构与边界

```text
src/                Three.js 场景、浏览器交互、卡牌 SVG、音效、网络连接
shared/cards.js     统一卡牌数据与规则常量
shared/game.js      独立的权威战斗模拟，无浏览器依赖
server/room.js      共用房间、准备、掉线、重连与消息协议
server/local.js     本地 HTTP + WebSocket 服务
server/worker.js    Cloudflare Worker + 每房间一个 Durable Object
wrangler.jsonc      Cloudflare 配置
```

服务器每秒模拟 20 次、每秒下发 10 次快照。客户端只发送出牌与准备等指令，不上传生命、伤害或圣水；两位玩家接收同一场权威战斗，客户端平滑渲染单位位置。重连凭证保存在当前标签页的 sessionStorage；复制房间码不会泄漏凭证。

项目聚焦卡牌攻塔与联机对战，不包含账号、付费、排行榜、长期存档或全球匹配。图形为程序化低多边形美术；不需要 CDN、外部图片、模型或字体。Three.js 随构建附带其 MIT 许可证。
