# Repository Guidelines

## Structure

`index.html` and `play.html` are the portal entry points. `portal/` owns catalog data, SVG artwork, styles, and browser interactions. `games/` contains independent H5 projects. `server/` serves approved public paths and proxies Crown Gorge HTTP/WebSocket traffic. `scripts/` installs dependencies and builds Cube Island into ignored `.cache/` output. `tests/` covers gateway integration.

## Development

Use Node.js 22.12+. Run `npm run setup` after cloning, then `npm start`; open port 8780. `PORT` changes the gateway port. Run `npm run build` before `npm test`. With the app running, `TEST_URL=http://127.0.0.1:8780 npm run test:online` validates actual two-client WebSocket gameplay.

## Coding Style

Follow KISS, YAGNI, and SOLID. Implement only requested behavior and keep responsibilities small. Portal/server JavaScript uses ES modules, two-space indentation, single quotes, and camelCase. Match existing conventions inside individual games. No shared formatter is configured. Keep UI text in Simplified Chinese and support keyboard navigation, mobile layouts, and reduced motion.

## Game Boundaries

Read project-local instructions before editing, particularly `games/tanke/AGENTS.md`. Preserve author credits, asset attribution, saved-game compatibility, and existing game rules. Avoid changing gameplay for portal-only work. Cube Island requires Vite output and root audio paths; Crown Gorge requires the same-origin API, WebSocket proxy, and invitation redirect. Keep new game entries in `portal/games.js` and expose static roots explicitly in the gateway.

## Tests and Reviews

Use `*.test.mjs` for Node gateway tests. Cover changed routing, error paths, and proxy behavior. Run each affected game's own tests for gameplay changes. Check search, categories, iframe navigation, keyboard controls, and narrow-screen layout in a browser. Report browser simulation separately from physical-device testing.

## Commits and Pull Requests

Use concise `feat:`, `fix:`, `test:`, or `docs:` messages. Describe affected games and user-visible changes, include validation results, and add screenshots for visual updates. Do not commit dependencies, build output, credentials, or runtime logs. A Git push is distinct from deployment.
