# 验收记录

日期：2026-10-18。验收对象：本地 / 局域网可运行版本；用户明确选择本次先不做公网发布。

## 技术参考

已实际读取 amiaoapp/inkwave 的 README、package.json、server/wrangler.jsonc 和 docs/NET.md。参考项目使用 Three.js r186、原生 ES Modules、程序化资产以及 Cloudflare Worker / Durable Object WebSocket 转发。王冠峡谷沿用这些基础技术，战斗改为服务端权威模拟，并补充无需云账号的 Node 本地运行方式。

## 自动检查

- `npm run check`：15 个 JavaScript 模块语法通过。
- `npm test`：16 项测试通过。覆盖出牌扣费、卡组循环、非法位置与参数、圣水恢复、桥梁寻路、对空限制、范围伤害、塔激活与摧毁、常规 / 加时 / 平局、隐藏手牌、完整 AI 对局、双人准备、重连、断线超时、再战、房间过期与心跳。
- `npm run test:online`：真实 Node HTTP + WebSocket 服务通过。两个独立客户端在同一 tick 看到完全相同的单位与塔；重连保留对局；双方再战重置状态。
- `TEST_URL=http://127.0.0.1:8791 WORKER_TEST=1 npm run test:online`：同一套在线集成检查在 Wrangler / workerd 本地运行环境通过。
- `npm run build`：完整生成 dist/，Three.js 及其工具模块在同域提供，不依赖 CDN。
- `npx wrangler deploy --dry-run`：Worker 打包成功，ROOMS / BattleRoom 和 ASSETS 绑定均识别。未执行公网发布。
- `npm audit --omit=dev`：报告 0 个已知生产依赖漏洞。

## 浏览器实测

先用 Chrome 验证大厅、AI 练习、完整 AI 胜负结算与再来一局。随后用两个独立 Playwright 浏览器上下文执行以下流程：

1. 1440 × 1000 桌面页面填写称号，查看并关闭帮助，开启音效。
2. 桌面创建双人房间，390 × 844 手机触摸环境打开邀请链接并加入。
3. 双方点击准备，进入同一个倒计时与对局。
4. 桌面通过数字键选卡并点击战场；手机在反向视角下通过触摸选卡、落兵。两端均出现两队单位，卡牌正确轮换。
5. 手机页面刷新后，原房间、阵营及比赛时间均保留。验收房间 BY7C5V，刷新前 team=1 / time=0.55，刷新后 team=1 / time=0.95。
6. 桌面打开退出确认并取消，继续战斗；再次确认退出后，手机显示“王冠属于你！”。
7. 上述完整流程捕获到的页面 JavaScript 异常为 0。
8. 手机对局中 document 的宽高为 390 × 844，与视口一致，没有横向溢出，手牌和圣水均在首屏可见。

已经打开并人工查看桌面、手机截图，确认竞技场、河流、桥梁、双方塔、单位、手牌、圣水和结算画面实际渲染。

本地截图（artifacts/ 不纳入 Git）：

- [桌面对局](../artifacts/pvp-desktop.png)
- [手机对局](../artifacts/pvp-mobile.png)
- [胜利结算](../artifacts/pvp-result.png)
- [大厅](../artifacts/desktop-final.png)

## 需求逐项对应

| 需求 | 实现与证据 |
| --- | --- |
| 双路、河流、桥梁、三塔及战斗 | shared/game.js；桥梁行军测试、完整 AI 对局、桌面和手机截图 |
| 八卡、四手牌、圣水、兵种差异与法术 | shared/cards.js；费用 / 循环 / 飞行 / 溅射测试；触摸落兵后的卡牌更新 |
| 3 分钟、双倍圣水、加时、结算、再战 | RULES 与 Game.checkResult；时间规则测试；AI 实时结算与再战；在线双人再战测试 |
| AI、房间码、邀请、准备、同步 | 两套后端的在线测试；双浏览器完整邀请流程 |
| 重连、超时、校验、清理 | Room 与 Connection；单测、真实 WebSocket 重连、手机刷新重连 |
| 桌面、手机、键盘、音效开关、说明 | 数字键与 touchscreen 验收；帮助对话框；音效开关状态；README |
| 验证与构建 | 上述单测、在线测试、浏览器流程、语法检查与构建结果 |
| 运行与 Cloudflare 配置 | README、wrangler.jsonc、dry-run、workerd 实测 |

## 交付边界

- 没有在物理手机或第二台局域网设备上测试；手机部分是浏览器触摸与尺寸模拟。
- 已验证音效开关和 Web Audio 调用无异常，未进行人工听音质量验收。
- 没有发布公网域名，也没有验证公网延迟、线上扩容或正式账号权限。
- 房间为临时状态，服务重启或运行实例回收后可能丢失。客户端重连仅针对同一仍在运行的房间实例。
