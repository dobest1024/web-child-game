// Boot: open the island map, or jump straight into a game via #gameId
(() => {
  const id = (location.hash || '').slice(1);
  Z.home();
  if (id) {
    const g = Z.games.find(x => x.id === id);
    if (g) Z.startGame(g);
  }
})();
