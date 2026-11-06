import { games, gameLink, recentGames } from './games.js';
import { illustration } from './art.js';

const grid = document.querySelector('#game-grid');
const search = document.querySelector('#search');
const filters = [...document.querySelectorAll('.filter')];
let category = '全部游戏';
const order = ['益智解谜', '探索学习', '动作冒险', '棋盘对战'];
const series = (game) => game.series || game.id;
const firstSeen = (list, game) => list.findIndex((item) => series(item) === series(game));
const sorted = [...games].sort(
  (a, b) =>
    order.indexOf(a.category) - order.indexOf(b.category) ||
    firstSeen(games, a) - firstSeen(games, b),
);
const card = (game, index) =>
  `<a class="game-card" href="${gameLink(game)}" style="--order:${Math.min(index, 5)}" aria-label="开始玩${game.title}"><div class="card-art ${game.color}"><span class="card-label">${game.label}</span>${illustration(game.art)}<span class="card-open" aria-hidden="true">↗</span></div><div class="card-body"><div class="card-title"><h3>${game.title}</h3><span class="category-dot ${game.color}" aria-hidden="true"></span></div><p>${game.subtitle}</p><div class="card-bottom"><span>${game.series ? `<em class="series-tag">${game.series}</em>` : game.note}</span><span class="play-word">开始玩 <b>→</b></span></div></div></a>`;
function renderRecent() {
  const recent = recentGames();
  const box = document.querySelector('#recent');
  box.hidden = recent.length === 0;
  box.innerHTML = recent.length
    ? `<h3>继续玩</h3><div class="recent-list">${recent
        .map(
          (game) =>
            `<a class="recent-item ${game.color}" href="${gameLink(game)}" aria-label="继续玩${game.title}">${illustration(game.art)}<span>${game.title}</span></a>`,
        )
        .join('')}</div>`
    : '';
}
function render() {
  const query = search.value.trim().toLowerCase();
  const visible = sorted.filter(
    (game) =>
      (category === '全部游戏' || game.category === category) &&
      `${game.title} ${game.subtitle} ${game.tags} ${game.category} ${game.series || ''} ${game.note || ''}`
        .toLowerCase()
        .includes(query),
  );
  const heading = (name) =>
    category === '全部游戏' && !query ? `<h3 class="group-title">${name}</h3>` : '';
  let index = 0;
  grid.innerHTML = order
    .map((name) => {
      const items = visible.filter((game) => game.category === name);
      return items.length
        ? `${heading(name)}<div class="group-grid">${items.map((game) => card(game, index++)).join('')}</div>`
        : '';
    })
    .join('');
  document.querySelector('#empty').hidden = visible.length > 0;
  document.querySelector('#result-count').textContent =
    `找到 ${visible.length} 个游戏`;
  document.querySelector('.count-badge').textContent = visible.length;
  filters.forEach((button) => {
    const active = button.dataset.category === category;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}
filters.forEach((button) => {
  const name = button.dataset.category;
  const count = games.filter((game) => name === '全部游戏' || game.category === name).length;
  button.querySelector('span')?.remove();
  button.insertAdjacentHTML('beforeend', ` <span>${count}</span>`);
});
document.querySelector('#total-count').textContent = games.length;
filters.forEach((button) =>
  button.addEventListener('click', () => {
    category = button.dataset.category;
    renderRecent();
render();
  }),
);
search.addEventListener('input', render);
document.querySelector('#reset-search').addEventListener('click', () => {
  search.value = '';
  category = '全部游戏';
  renderRecent();
render();
  search.focus();
});
document.querySelector('#random-game').addEventListener('click', () => {
  location.href = gameLink(games[Math.floor(Math.random() * games.length)]);
});
document
  .querySelectorAll('[data-art]')
  .forEach((tile) =>
    tile.insertAdjacentHTML('afterbegin', illustration(tile.dataset.art)),
  );
renderRecent();
render();
window.addEventListener('pageshow', (event) => event.persisted && renderRecent());
