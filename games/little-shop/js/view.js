'use strict';
// ===== 画面：把引擎状态画成 DOM。状态有变化（rev 变了）才重建，进度条之类每帧更新 =====
// 这里拼进 innerHTML 的只有游戏自带的常量和题目文字，存档内容一律不拼

const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const decorOf = (decor, slot) => DECOR[slot].items.find((i) => i.id === decor[slot]) || DECOR[slot].items[0];

// 小店背景：遮阳棚、招牌、货架、店长、门口装饰都按装修来
function sceneHtml(decor) {
  const awning = decorOf(decor, 'awning');
  const stripes = awning.colors.map((c, i) => `${c} ${i * 34}px ${(i + 1) * 34}px`).join(',');
  return `<div class="wall"></div>`
    + `<div class="awning" style="background:repeating-linear-gradient(90deg,${stripes})"></div>`
    + `<div class="awning-edge" style="--edge:${awning.colors[0]}"></div>`
    + `<div class="sign sign-${esc(decorOf(decor, 'sign').id)}"><span>小小店长的店</span></div>`
    + `<div class="shelf shelf-1"><span>🍎🍌🥕🍞🥚🍓</span></div>`
    + `<div class="shelf shelf-2"><span>🍬🧃🍪🥛🍐🌽</span></div>`
    + `<div class="wall-clock" id="wall-clock">${clockSvg(9, false)}</div>`
    + `<div class="keeper"><span class="keeper-hat">${decorOf(decor, 'hat').e}</span><span class="keeper-body">🐿️</span></div>`
    + `<div class="door-deco">${decorOf(decor, 'deco').e}</div>`
    + `<div class="counter"></div>`;
}

function customerHtml(G) {
  const queue = `<div class="queue">${G.queue.slice(0, 2).map((a) => `<span>${a.e}</span>`).join('')}</div>`;
  const c = G.customer;
  if (!c) return queue;
  const t = c.task;
  const showBubble = c.say || c.phase === 'order';
  const bubble = showBubble ? `<div class="bubble${c.say ? ' says' : ''}">${esc(c.say || t.ask)}</div>` : '';
  let goods = '';
  if (t.type === 'pay' || t.type === 'change') goods = `<div class="goods"><span class="goods-item">${t.item.e}</span><span class="price-tag">${formatMoney(t.price)}</span></div>`;
  if (t.type === 'count') goods = `<div class="goods"><span class="goods-item">${t.item.e}</span><span class="price-tag want">要 ${t.n} ${t.item.unit}</span></div>`;
  let hand = '';
  if (t.type === 'change') hand = `<div class="hand" aria-label="顾客给了${MONEY[t.given].label}">${moneySvg(t.given)}</div>`;
  if (t.type === 'exchange') hand = `<div class="hand" aria-label="要换的是${MONEY[t.from].label}">${moneySvg(t.from)}</div>`;
  const crown = G.boss ? '<span class="crown">👑</span>' : '';
  return `${queue}<div class="customer phase-${c.phase} ${c.outcome || ''}${G.boss ? ' boss' : ''}">`
    + `<div class="cust-face">${crown}${c.animal.e}<span class="mood"></span></div>`
    + `<div class="patience"><i></i></div>${hand}</div>`
    + `${bubble}${goods}${c.phase === 'help' ? '<div class="parrot">🦜</div>' : ''}`
    + `${G.boss ? '<div class="boss-warn">❗</div>' : ''}`;
}

const TRAY_TITLE = { pay: '顾客的钱包（点一点拿钱）', change: '收银抽屉（点一点找钱）', exchange: '收银抽屉（点一点换钱）' };
const PLATE_TITLE = { pay: '收银台', change: '找给顾客的钱', exchange: '换给顾客的零钱' };
const SUBMIT_TEXT = { pay: '收好啦 ✔', change: '找钱 ✔', exchange: '换好啦 ✔', count: '装好啦 ✔' };

function panelHtml(G) {
  const c = G.customer;
  if (!c) return '<p class="panel-wait">下一位顾客马上就来…</p>';
  const t = c.task;
  const lock = !G.canAct();
  const cls = `panel-inner${lock ? ' locked' : ''}`;
  const helpOn = c.phase === 'help';
  if (MONEY_TYPES.includes(t.type)) {
    const sol = c.hint >= 2 ? solveTask(t) : [];
    const tray = t.allowed.map((id, i) => `<button class="money-btn${sol.includes(id) ? ' suggest' : ''}" data-act="add" data-id="${id}" aria-label="放入${MONEY[id].label}"><kbd>${i + 1}</kbd>${moneySvg(id)}</button>`).join('');
    const plate = G.plate.map((id, i) => `<button class="money-btn small" data-act="remove" data-i="${i}" aria-label="拿回${MONEY[id].label}">${moneySvg(id)}</button>`).join('')
      || '<span class="plate-empty">点上面的钱，放到这里</span>';
    const sum = G.showSum() ? `<b class="sum">合计 ${formatMoney(sumMoney(G.plate))}</b>` : '';
    const goal = c.hint >= 2 && t.type === 'change' ? `<b class="sum goal">要找 ${formatMoney(t.target)}</b>` : '';
    return `<div class="${cls} money-panel">`
      + `<div class="tray-box"><p class="box-title">${TRAY_TITLE[t.type]}</p><div class="tray">${tray}</div></div>`
      + `<div class="plate-box${helpOn ? ' helped' : ''}"><p class="box-title">${PLATE_TITLE[t.type]} ${sum}${goal}</p><div class="plate">${plate}</div></div>`
      + `<button class="go-btn" data-act="submit">${SUBMIT_TEXT[t.type]}</button></div>`;
  }
  if (t.type === 'count') {
    const basket = Array.from({ length: G.basket }, () => `<button class="basket-item" data-act="item-remove" aria-label="拿出一${t.item.unit}">${t.item.e}</button>`).join('')
      || '<span class="plate-empty">篮子空空的</span>';
    const count = G.showSum() ? `<b class="sum">${G.basket} ${t.item.unit}</b>` : '';
    return `<div class="${cls} count-panel">`
      + `<button class="item-btn" data-act="item-add" aria-label="拿一${t.item.unit}${t.item.name}"><span>${t.item.e}</span><small>点一下拿一${t.item.unit}</small></button>`
      + `<div class="plate-box${helpOn ? ' helped' : ''}"><p class="box-title">篮子 ${count}</p><div class="plate basket">${basket}</div></div>`
      + `<button class="go-btn" data-act="submit">${SUBMIT_TEXT.count}</button></div>`;
  }
  const glow = (v) => (c.hint >= 2 || helpOn) && v === solveTask(t);
  const tried = (v) => c.tried.includes(v);
  if (t.type === 'pick') {
    const btns = t.choices.map((id, i) => `<button class="money-btn big${glow(id) ? ' suggest' : ''}${tried(id) ? ' tried' : ''}" data-act="choose" data-v="${id}" aria-label="${MONEY[id].label}"${tried(id) ? ' disabled' : ''}><kbd>${i + 1}</kbd>${moneySvg(id)}</button>`).join('');
    return `<div class="${cls} pick-panel"><p class="box-title">顾客要哪个，就点哪个</p><div class="choices">${btns}</div></div>`;
  }
  if (t.type === 'calc') {
    const btns = t.choices.map((v, i) => `<button class="choice-btn${glow(v) ? ' suggest' : ''}${tried(v) ? ' tried' : ''}" data-act="choose" data-v="${esc(v)}"${tried(v) ? ' disabled' : ''}><kbd>${i + 1}</kbd>${esc(v)}<small>${esc(t.unit)}</small></button>`).join('');
    return `<div class="${cls} pick-panel"><p class="box-title">${esc(t.ask)}</p><div class="choices">${btns}</div></div>`;
  }
  const btns = t.choices.map((k, i) => {
    const { h, half } = clockTime(k);
    return `<button class="choice-btn${glow(k) ? ' suggest' : ''}${tried(k) ? ' tried' : ''}" data-act="choose" data-v="${k}"${tried(k) ? ' disabled' : ''}><kbd>${i + 1}</kbd>${clockLabel(h, half)}<small>${k}</small></button>`;
  }).join('');
  return `<div class="${cls} clock-panel"><div class="clock-big">${clockSvg(t.h, t.half)}</div><div class="choices">${btns}</div></div>`;
}

function hudHtml(G) {
  const hearts = G.hearts === null ? '' : '❤️'.repeat(Math.max(0, G.hearts)) + '🤍'.repeat(3 - Math.max(0, G.hearts));
  const goal = G.boss
    ? `<span class="pill boss-pill">${G.L.boss.e} ${esc(G.L.boss.name)} <span class="hp"><i style="width:${(G.boss.hp / G.boss.max) * 100}%"></i></span> 还要 ${G.boss.hp} 单</span>`
    : `<span class="pill">⭐ ${G.served}/${G.goal}</span>`;
  return `<span class="hud-hearts">${hearts}</span>${goal}<span class="pill">🪙 ${G.coins}</span>`;
}

function createView(stage) {
  const $s = (sel) => stage.querySelector(sel);
  const sceneBg = $s('#scene-bg');
  const cust = $s('#cust-area');
  const panel = $s('#panel');
  const hud = $s('#hud-info');
  const dayFill = $s('#day-fill');
  const pests = $s('#pests');
  const fx = $s('#fx');
  let lastRev = -1;
  let clockShown = '9:00';

  function start(decor) {
    lastRev = -1;
    clockShown = '9:00';
    sceneBg.innerHTML = sceneHtml(decor);
    pests.innerHTML = '';
    fx.innerHTML = '';
  }

  function pop(G, e) {
    const el = document.createElement('div');
    el.className = `pop ${e.kind}${e.bad ? ' bad' : ''}`;
    el.textContent = e.text;
    if (e.at === 'pest') {
      el.style.left = `${e.x * 100}%`;
      el.style.top = `${e.y * 100}%`;
    } else if (e.at === 'customer') {
      el.classList.add('at-customer');
    }
    fx.append(el);
    setTimeout(() => el.remove(), 1300);
  }

  function render(G) {
    if (G.rev !== lastRev) {
      lastRev = G.rev;
      cust.innerHTML = customerHtml(G);
      panel.innerHTML = panelHtml(G);
      hud.innerHTML = hudHtml(G);
      const t = G.customer && G.customer.task;
      if (t && t.type === 'clock' && clockShown !== t.key) {
        clockShown = t.key;
        $s('#wall-clock').innerHTML = clockSvg(t.h, t.half);
      }
    }
    // 每帧：耐心条、营业时间、Boss 感叹号、捣乱的小东西
    const c = G.customer;
    const bar = cust.querySelector('.patience i');
    if (c && bar) {
      const mood = G.mood(c);
      bar.style.width = `${(c.patience / c.max) * 100}%`;
      bar.className = mood;
      const face = cust.querySelector('.mood');
      const icon = { happy: '😊', wait: '😐', sad: '😣' }[mood];
      if (face.textContent !== icon) face.textContent = icon;
    }
    dayFill.style.width = `${(G.dayLeft / G.dayLen) * 100}%`;
    dayFill.classList.toggle('late', G.dayLeft / G.dayLen < 0.25);
    if (G.boss) {
      const warn = cust.querySelector('.boss-warn');
      if (warn) warn.classList.toggle('on', G.boss.warn > 0);
      const who = cust.querySelector('.customer');
      if (who) who.classList.toggle('hurt', G.boss.hurt > 0);
    }
    const alive = new Set(G.pests.map((p) => String(p.id)));
    pests.querySelectorAll('.pest').forEach((el) => { if (!alive.has(el.dataset.id)) el.remove(); });
    for (const p of G.pests) {
      let el = pests.querySelector(`.pest[data-id="${p.id}"]`);
      if (!el) {
        el = document.createElement('button');
        el.className = 'pest';
        el.dataset.act = 'pest';
        el.dataset.id = String(p.id);
        el.setAttribute('aria-label', `点掉${G.L.boss.pestName}`);
        el.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" fill="none" stroke="#ffffffaa" stroke-width="8"/><circle class="ring" cx="50" cy="50" r="44" fill="none" stroke="#ff6f61" stroke-width="8" stroke-dasharray="276.5" transform="rotate(-90 50 50)"/></svg><span>${G.L.boss.pest}</span>`;
        el.style.left = `${p.x * 100}%`;
        el.style.top = `${p.y * 100}%`;
        pests.append(el);
      }
      el.querySelector('.ring').style.strokeDashoffset = String(276.5 * Math.min(1, p.t / p.life));
    }
    for (const e of G.events.splice(0)) pop(G, e);
  }

  return { start, render };
}
