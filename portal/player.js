import { games } from './games.js';
const params = new URLSearchParams(location.search);
const game = games.find((item) => item.id === params.get('game'));
const status = document.querySelector('#player-status');
const player = document.querySelector('#player');
const title = document.querySelector('#game-title');
const fullscreen = document.querySelector('#fullscreen');

function showError(message) {
  status.hidden = false;
  status.classList.add('player-error');
  status.replaceChildren();
  const heading = document.createElement('h2');
  heading.textContent = message;
  const back = document.createElement('a');
  back.href = '/';
  back.className = 'primary-button';
  back.textContent = '回游乐岛看看';
  status.append(heading, back);
}
if (!game) {
  title.textContent = '游戏未找到';
  showError('这个小世界还不存在');
} else {
  title.textContent = game.title;
  document.title = `${game.title} · 小小游乐岛`;
  const source = new URL(game.path, location.origin);
  if (game.id === 'crown' && params.has('room'))
    source.searchParams.set('room', params.get('room'));
  const open = document.querySelector('#open-game');
  open.href = source.href;
  open.hidden = false;
  if (document.fullscreenEnabled) fullscreen.hidden = false;
  fullscreen.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      fullscreen.textContent = '请使用单独打开';
    }
  });
  document.addEventListener('fullscreenchange', () => {
    fullscreen.textContent = document.fullscreenElement
      ? '退出全屏 ⛶'
      : '全屏 ⛶';
  });
  try {
    const response = await fetch(source, {
      method: 'HEAD',
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error('unavailable');
    const frame = document.createElement('iframe');
    frame.title = game.title;
    frame.allow = 'autoplay; fullscreen';
    frame.addEventListener('load', () => {
      status.hidden = true;
      frame.focus();
    });
    frame.src = source.href;
    player.append(frame);
  } catch {
    showError('游戏暂时没有打开，稍后再试试吧');
  }
}
