import { CARDS, DECK, RULES } from "../shared/cards.js";
import { Game } from "../shared/game.js";
import { art, crown } from "./art.js";
import { ArenaScene } from "./scene.js";
import { Connection } from "./network.js";
import { Audio } from "./audio.js";

const $ = (id) => document.getElementById(id);
const audio = new Audio();
let scene,
  team = 0,
  state = null,
  selected = null,
  resultShown = false,
  currentHand = "",
  lastNext = "",
  lastSeats = "",
  lastTime = 0,
  lastAudioId = 0,
  connected = false,
  toastTimer;
const preview = new Game().snapshot(0);
const view = { hand: [...preview.players[0].hand], elixir: 5 };
for (const element of document.querySelectorAll("[data-crown]"))
  element.innerHTML = crown;
function toast(text) {
  $("toast").textContent = text;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    $("toast").hidden = true;
  }, 3200);
}
function detail(id) {
  const c = CARDS[id];
  $("detail-name").textContent = c.name;
  $("detail-role").textContent = c.role;
  $("detail-description").textContent = c.description;
  $("detail-cost").textContent = `${c.cost} 圣水`;
  $("stat-a-label").textContent = c.spell ? "作用半径" : "生命值";
  $("stat-a").textContent = c.spell ? c.radius : c.hp;
  $("stat-b").textContent = c.damage;
  document
    .querySelectorAll(".deck-card")
    .forEach((b) => b.classList.toggle("active", b.dataset.card === id));
  document.querySelector(".field-guide-title>span:last-child").textContent =
    `${String(DECK.indexOf(id) + 1).padStart(2, "0")} / 08`;
}
$("deck").innerHTML = DECK.map(
  (id) =>
    `<button class="deck-card${id === "knight" ? " active" : ""}" data-card="${id}" aria-label="查看${CARDS[id].name}，${CARDS[id].cost}圣水" style="color:${CARDS[id].color}"><span class="cost">${CARDS[id].cost}</span>${art(id)}</button>`,
).join("");
$("deck").addEventListener("click", (e) => {
  const card = e.target.closest("[data-card]");
  if (card) detail(card.dataset.card);
});
function drawHand(player) {
  view.hand = player.hand;
  view.elixir = player.elixir;
  const key = player.hand.join(",");
  if (key !== currentHand) {
    currentHand = key;
    $("hand").innerHTML = player.hand
      .map(
        (id, index) =>
          `<button class="hand-card" data-slot="${index}" aria-label="${index + 1}号卡 ${CARDS[id].name}，消耗${CARDS[id].cost}圣水" aria-pressed="false" style="color:${CARDS[id].color}"><span class="cost">${CARDS[id].cost}</span><span class="hotkey">${index + 1}</span>${art(id)}<span class="card-name">${CARDS[id].name}</span></button>`,
      )
      .join("");
    if (selected !== null) select(null);
  }
  document.querySelectorAll(".hand-card").forEach((button, i) => {
    const insufficient = CARDS[player.hand[i]].cost > player.elixir;
    button.classList.toggle("unaffordable", insufficient);
    button.classList.toggle("selected", selected === i);
    button.setAttribute("aria-pressed", String(selected === i));
  });
  $("elixir-number").textContent = Math.floor(player.elixir);
  $("elixir-fill").style.width = `${player.elixir * 10}%`;
  $("elixir-label").textContent =
    player.elixir >= 10
      ? "圣水已满"
      : state?.game?.time >= 120
        ? "双倍恢复 ×2"
        : "圣水恢复中";
  if (lastNext !== player.next) {
    lastNext = player.next;
    $("next-art").innerHTML = art(player.next);
    $("next-name").textContent = CARDS[player.next].name;
  }
}
function active() {
  return connected && state?.game?.phase === "playing" && !state.countdown;
}
function select(slot) {
  selected = slot;
  const card = slot !== null ? CARDS[view.hand[slot]] : null;
  if (card) {
    detail(card.id);
    audio.play("select");
  }
  scene?.select(card, active());
  document.querySelectorAll(".hand-card").forEach((button, i) => {
    button.classList.toggle("selected", i === slot);
    button.setAttribute("aria-pressed", String(i === slot));
  });
  $("deploy-hint").textContent = !card
    ? "选一张卡牌，再点击战场部署"
    : !active()
      ? `${card.name} · 开始对局后即可部署`
      : card.spell
        ? `${card.name} · 点击任意位置释放`
        : `${card.name} · 点击己方半场部署`;
}
$("hand").addEventListener("click", (e) => {
  const b = e.target.closest("[data-slot]");
  if (b)
    select(selected === Number(b.dataset.slot) ? null : Number(b.dataset.slot));
});
document.addEventListener("keydown", (e) => {
  if (
    e.target instanceof HTMLInputElement ||
    document.querySelector("dialog[open]")
  )
    return;
  if (/^[1-4]$/.test(e.key)) {
    e.preventDefault();
    select(Number(e.key) - 1);
  }
  if (e.key === "Escape") select(null);
});
try {
  scene = new ArenaScene($("arena"), (x, z) => {
    if (!active() || selected === null) return;
    const card = CARDS[view.hand[selected]];
    if (view.elixir < card.cost) return toast("圣水不足，再等一会儿");
    if (Math.abs(x) > 6.6 || Math.abs(z) > 10.5)
      return toast("请点击竞技场内的位置");
    if (!card.spell && (team === 0 ? z < 1.45 : z > -1.45))
      return toast("部队只能部署在己方半场");
    network.send({ type: "play", slot: selected, x, z });
    select(null);
  });
  scene.update(preview);
} catch (error) {
  console.error(error);
  const message = document.createElement("p");
  message.className = "renderer-error";
  message.textContent =
    "无法启动 3D 画面，请使用支持 WebGL 的浏览器，并开启硬件加速。";
  $("arena").prepend(message);
  $("practice").disabled = $("create").disabled = true;
}
const network = new Connection({
  onWelcome(data) {
    team = data.team;
    scene?.setTeam(team);
    $("lobby-controls").hidden = true;
    $("room-panel").hidden = false;
    document.body.dataset.team = String(team);
    $("quick-leave").hidden = false;
    $("room-code").textContent = data.code;
    $("room-mode").textContent = data.mode === "bot" ? "单人练习" : "好友对战";
    $("copy-room").hidden = data.mode === "bot";
    $("mode-badge").textContent = data.mode === "bot" ? "AI 练习" : "好友对战";
    history.replaceState(
      null,
      "",
      data.mode === "pvp" ? `?room=${data.code}` : location.pathname,
    );
  },
  onStatus(status) {
    connected = status === "connected";
    const labels = {
      connected: "已连接竞技场",
      connecting: "正在连接竞技场…",
      reconnecting: "连接中断，正在重连…",
      failed: "连接失败，请重新加入",
    };
    $("connection-text").textContent = labels[status] || status;
    $("connection-dot").classList.toggle("online", connected);
    if (!connected) {
      scene?.select(null, false);
      $("ping").textContent = "";
    }
    if (status === "failed") {
      $("lobby-controls").hidden = false;
      $("room-panel").hidden = true;
      document.body.classList.remove("in-battle");
    }
  },
  onPing(ms) {
    $("ping").textContent = `${ms} ms`;
  },
  onError: toast,
  onState: update,
});
function update(next) {
  state = next;
  const game = next.game;
  const seatsKey = JSON.stringify(
    next.seats.map((s) => s && [s.name, s.connected, s.ready]),
  );
  if (lastSeats !== seatsKey) {
    lastSeats = seatsKey;
    $("seats").replaceChildren(
      ...next.seats.map((seat, i) => {
        const row = document.createElement("div");
        row.className = "seat";
        const name = document.createElement("span");
        name.textContent = seat
          ? `${i === team ? "你 · " : ""}${seat.name}`
          : "等待对手加入…";
        const status = document.createElement("small");
        status.textContent = !seat
          ? "空位"
          : !seat.connected
            ? "重连中"
            : seat.ready
              ? "已准备"
              : "已就位";
        row.append(name, status);
        return row;
      }),
    );
  }
  const canReady = !game || game.phase === "ended";
  $("ready").hidden = !canReady || (next.mode === "bot" && !!game);
  $("ready").disabled = !connected;
  $("ready").textContent = next.seats[team]?.ready
    ? "已准备 · 等待对手"
    : game?.phase === "ended"
      ? "准备再战"
      : "准备战斗";
  $("rematch").disabled =
    next.mode !== "bot" && !next.seats[1 - team]?.connected;
  $("rematch").textContent = $("rematch").disabled
    ? "对手已离线，请返回大厅"
    : "再来一局";
  $("enemy-name").textContent = next.seats[1 - team]?.name || "等待对手加入";
  $("own-name").textContent = next.seats[team]?.name || "你的领地";
  if (!game) {
    $("phase-label").textContent = "等待双方准备";
    $("arena-caption").hidden = false;
    $("arena-caption").querySelector("small").textContent =
      "分享房间码，双方准备后开始对决";
    return;
  }
  if (game.time < lastTime || (resultShown && game.phase === "playing")) {
    scene?.reset();
    selected = null;
    resultShown = false;
    lastAudioId = 0;
    if ($("result-dialog").open) $("result-dialog").close();
  }
  lastTime = game.time;
  document.body.classList.toggle("in-battle", game.phase === "playing");
  $("arena-caption").hidden = true;
  $("countdown").hidden = !next.countdown;
  $("countdown").textContent = Math.ceil(next.countdown);
  const overtime = game.time >= RULES.duration;
  const remaining = Math.max(
    0,
    Math.ceil(
      (overtime ? RULES.duration + RULES.overtime : RULES.duration) - game.time,
    ),
  );
  $("timer").textContent =
    `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
  $("phase-label").textContent =
    game.phase === "ended"
      ? "比赛结束"
      : next.countdown
        ? "即将开战"
        : overtime
          ? "加时 · 一塔决胜"
          : game.time >= 120
            ? "双倍圣水 ×2"
            : "常规对局";
  $("enemy-score").textContent = game.players[1 - team].crowns;
  $("own-score").textContent = `♛ ${game.players[team].crowns}`;
  const other = next.seats[1 - team];
  $("battle-notice").hidden =
    !other || other.connected || game.phase !== "playing";
  if (other && !other.connected)
    $("battle-notice").textContent =
      `对手掉线 · 等待重连 ${Math.ceil(other.reconnect)} 秒`;
  drawHand(game.players[team]);
  scene?.update(game);
  for (const e of game.effects)
    if (e.id > lastAudioId && game.time - e.at < 0.3) {
      if (e.type !== "shot" && e.type !== "death") audio.play(e.type);
    }
  if (game.effects.length)
    lastAudioId = Math.max(lastAudioId, ...game.effects.map((e) => e.id));
  if (game.phase === "ended" && !resultShown) {
    resultShown = true;
    select(null);
    if ($("leave-dialog").open) $("leave-dialog").close();
    const won = game.result.winner === team,
      draw = game.result.winner === null;
    $("result-title").textContent = draw
      ? "不分伯仲"
      : won
        ? "王冠属于你！"
        : "下一场，赢回来。";
    $("result-reason").textContent = game.result.reason;
    $("result-score").textContent =
      `${game.players[team].crowns} : ${game.players[1 - team].crowns}`;
    $("result-eyebrow").textContent = draw
      ? "HONORABLE DRAW"
      : won
        ? "VICTORY"
        : "WELL FOUGHT";
    $("result-dialog").showModal();
    audio.play(won ? "victory" : "defeat");
  }
}
function name() {
  const value = $("player-name").value.trim() || "无名骑士";
  localStorage.setItem("crown-name", value);
  return value;
}
$("player-name").value = localStorage.getItem("crown-name") || "";
async function create(mode) {
  if (!scene) return;
  $("practice").disabled = $("create").disabled = true;
  try {
    await network.create(mode, name());
  } catch (error) {
    toast(`无法创建房间：${error.message}`);
  } finally {
    $("practice").disabled = $("create").disabled = false;
  }
}
$("practice").addEventListener("click", () => create("bot"));
$("create").addEventListener("click", () => create("pvp"));
$("join-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const code = $("room-input").value.trim().toUpperCase();
  if (!/^[A-Z2-9]{6}$/.test(code)) return toast("请输入六位房间码");
  if (!scene) return toast("请先启用 WebGL");
  network.join(code, name());
});
$("ready").addEventListener("click", () => network.send({ type: "ready" }));
$("copy-room").addEventListener("click", async () => {
  const url = `${location.origin}/?room=${state.code}`;
  try {
    await navigator.clipboard.writeText(url);
    toast("邀请链接已复制，发给好友一起玩");
  } catch {
    toast(`房间码 ${state.code} · 可从地址栏复制邀请链接`);
  }
});
function leave() {
  network.leave();
  connected = false;
  state = null;
  selected = null;
  lastTime = 0;
  resultShown = false;
  currentHand = "";
  lastAudioId = 0;
  document.body.dataset.team = "0";
  scene?.reset();
  scene?.setTeam(0);
  scene?.select(null, false);
  scene?.update(preview);
  $("lobby-controls").hidden = false;
  $("room-panel").hidden = true;
  $("arena-caption").hidden = false;
  $("countdown").hidden = true;
  $("battle-notice").hidden = true;
  $("quick-leave").hidden = true;
  $("arena-caption").querySelector("small").textContent =
    "选择左侧模式，开启你的第一场对决";
  $("timer").textContent = "3:00";
  $("phase-label").textContent = "等待开战";
  $("enemy-name").textContent = "霜叶骑士";
  $("enemy-score").textContent = "0";
  $("own-name").textContent = "你的领地";
  $("own-score").textContent = "♛ 0";
  $("mode-badge").textContent = "自由练习";
  $("connection-text").textContent = "准备好迎接挑战了吗？";
  $("connection-dot").classList.remove("online");
  $("ping").textContent = "";
  document.body.classList.remove("in-battle");
  if ($("result-dialog").open) $("result-dialog").close();
  if ($("leave-dialog").open) $("leave-dialog").close();
  history.replaceState(null, "", location.pathname);
  drawHand(preview.players[0]);
  select(null);
}
function requestLeave() {
  if (state?.game?.phase === "playing") $("leave-dialog").showModal();
  else leave();
}
$("leave").addEventListener("click", requestLeave);
$("quick-leave").addEventListener("click", requestLeave);
$("cancel-leave").addEventListener("click", () => $("leave-dialog").close());
$("confirm-leave").addEventListener("click", leave);
$("result-leave").addEventListener("click", leave);
$("rematch").addEventListener("click", () => {
  $("result-dialog").close();
  network.send({ type: "ready" });
  toast(state?.mode === "bot" ? "新一局即将开始" : "已准备，等待对手再战");
});
$("sound").addEventListener("click", () => {
  const enabled = audio.toggle();
  $("sound").setAttribute("aria-pressed", String(enabled));
  $("sound").setAttribute("aria-label", enabled ? "关闭音效" : "打开音效");
  $("sound").querySelector("span").textContent = enabled
    ? "音效开启"
    : "音效关闭";
});
$("help").addEventListener("click", () => $("help-dialog").showModal());
for (const button of document.querySelectorAll(
  ".dialog-close,.dialog-close-button",
))
  button.addEventListener("click", () => $("help-dialog").close());
drawHand(preview.players[0]);
const invited = new URLSearchParams(location.search).get("room");
if (invited) {
  $("room-input").value = invited.toUpperCase();
  toast("好友邀请已就绪，填写称号后点击箭头加入");
}
try {
  const previous = JSON.parse(sessionStorage.getItem("crown-room") || "null");
  if (previous?.token && (!invited || invited === previous.code) && scene)
    network.join(previous.code, previous.name, previous.token);
} catch {
  sessionStorage.removeItem("crown-room");
}
// Read-only diagnostics for browser acceptance; no mutation or client-side authority.
window.crownGorge = {
  inspect: () => ({
    team,
    connected,
    selected,
    state,
    renderer: scene
      ? {
          calls: scene.renderer.info.render.calls,
          triangles: scene.renderer.info.render.triangles,
        }
      : null,
  }),
};
