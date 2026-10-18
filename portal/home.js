import { games, gameLink } from './games.js';
import { illustration } from './art.js';

const grid = document.querySelector('#game-grid');
const search = document.querySelector('#search');
const filters = [...document.querySelectorAll('.filter')];
let category = '全部游戏';
function render() {
  const query = search.value.trim().toLowerCase();
  const visible = games.filter(
    (game) =>
      (category === '全部游戏' || game.category === category) &&
      `${game.title} ${game.tags} ${game.category}`
        .toLowerCase()
        .includes(query),
  );
  grid.innerHTML = visible
    .map(
      (game, index) =>
        `<a class="game-card" href="${gameLink(game)}" style="--order:${Math.min(index, 5)}" aria-label="开始玩${game.title}"><div class="card-art ${game.color}"><span class="card-label">${game.label}</span>${illustration(game.art)}<span class="card-open" aria-hidden="true">↗</span></div><div class="card-body"><div class="card-title"><h3>${game.title}</h3><span class="category-dot ${game.color}" aria-hidden="true"></span></div><p>${game.subtitle}</p><div class="card-bottom"><span>${game.note}</span><span class="play-word">开始玩 <b>→</b></span></div></div></a>`,
    )
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
filters.forEach((button) =>
  button.addEventListener('click', () => {
    category = button.dataset.category;
    render();
  }),
);
search.addEventListener('input', render);
document.querySelector('#reset-search').addEventListener('click', () => {
  search.value = '';
  category = '全部游戏';
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
render();
