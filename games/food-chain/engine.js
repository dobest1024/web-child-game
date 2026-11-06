// Food Chain (森林食物网) Engine

/**
 * Normalizes directed link string "from->to"
 */
export function normalizeLink(fromId, toId) {
  return `${fromId}->${toId}`;
}

/**
 * Verifies if all required predator-prey links exist and no illegal links
 * @param {Array<[string, string]>} validLinks - Array of [prey, predator]
 * @param {Array<string>} userLinks - Array of "prey->predator"
 */
export function verifyFoodWeb(validLinks, userLinks) {
  const validSet = new Set(validLinks.map(([from, to]) => normalizeLink(from, to)));
  const userSet = new Set(userLinks);

  let missing = 0;
  for (const link of validSet) {
    if (!userSet.has(link)) missing++;
  }

  let invalid = 0;
  for (const link of userSet) {
    if (!validSet.has(link)) invalid++;
  }

  return {
    balanced: missing === 0 && invalid === 0,
    missing,
    invalid,
    totalRequired: validSet.size,
  };
}

/**
 * Checks energy flow reachability from producers to all consumers
 */
export function simulateEcosystem(nodes, userLinks) {
  const producers = nodes.filter(n => n.type === 'producer').map(n => n.id);
  const adj = new Map();
  nodes.forEach(n => adj.set(n.id, []));

  userLinks.forEach(link => {
    const [from, to] = link.split('->');
    if (adj.has(from) && adj.has(to)) {
      adj.get(from).push(to);
    }
  });

  // BFS from all producers
  const reached = new Set(producers);
  const queue = [...producers];

  while (queue.length > 0) {
    const curr = queue.shift();
    const nextList = adj.get(curr) || [];
    for (const next of nextList) {
      if (!reached.has(next)) {
        reached.add(next);
        queue.push(next);
      }
    }
  }

  const starving = nodes.filter(n => !reached.has(n.id));
  return {
    allFed: starving.length === 0,
    starvingIds: starving.map(n => n.id),
  };
}

export function calculateStars(missing, invalid) {
  if (missing > 0 || invalid > 0) return 0;
  return 3;
}

export function sanitizeProgress(raw) {
  const fallback = { cleared: {}, stars: {} };
  if (!raw || typeof raw !== 'object') return fallback;
  const cleared = {};
  const stars = {};
  if (raw.cleared && typeof raw.cleared === 'object') {
    for (const [k, v] of Object.entries(raw.cleared)) {
      if (v === true) cleared[k] = true;
    }
  }
  if (raw.stars && typeof raw.stars === 'object') {
    for (const [k, v] of Object.entries(raw.stars)) {
      if (typeof v === 'number' && v >= 1 && v <= 3) stars[k] = Math.floor(v);
    }
  }
  return { cleared, stars };
}
