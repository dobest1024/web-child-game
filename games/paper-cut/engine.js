// Paper Cut & Symmetrical Window Decoration Engine
export const FULL_SIZE = 8;

export function createEmptyGrid(size = FULL_SIZE) {
  return Array.from({ length: size }, () => Array(size).fill(0));
}

export function cloneGrid(grid) {
  return grid.map((r) => [...r]);
}

/**
 * foldType:
 * - 'V': Left-Right fold (4x8)
 * - 'H': Top-Bottom fold (8x4)
 * - 'VH': Four-fold (4x4)
 * - 'DIAG': Diagonal fold (upper-triangle)
 */
export function getFoldDimensions(foldType, size = FULL_SIZE) {
  switch (foldType) {
    case 'V':
      return { rows: size, cols: size / 2 };
    case 'H':
      return { rows: size / 2, cols: size };
    case 'VH':
      return { rows: size / 2, cols: size / 2 };
    case 'DIAG':
      return { rows: size, cols: size };
    default:
      return { rows: size, cols: size };
  }
}

export function unfoldGrid(cutCells, foldType, size = FULL_SIZE) {
  const full = createEmptyGrid(size);

  if (foldType === 'V') {
    // cutCells is rows x (size/2). Left-to-right symmetry
    for (const [r, c] of cutCells) {
      if (r >= 0 && r < size && c >= 0 && c < size / 2) {
        full[r][c] = 1;
        full[r][size - 1 - c] = 1;
      }
    }
  } else if (foldType === 'H') {
    // cutCells is (size/2) x cols. Top-to-bottom symmetry
    for (const [r, c] of cutCells) {
      if (r >= 0 && r < size / 2 && c >= 0 && c < size) {
        full[r][c] = 1;
        full[size - 1 - r][c] = 1;
      }
    }
  } else if (foldType === 'VH') {
    // 4-fold: (size/2) x (size/2)
    const half = size / 2;
    for (const [r, c] of cutCells) {
      if (r >= 0 && r < half && c >= 0 && c < half) {
        full[r][c] = 1;
        full[r][size - 1 - c] = 1;
        full[size - 1 - r][c] = 1;
        full[size - 1 - r][size - 1 - c] = 1;
      }
    }
  } else if (foldType === 'DIAG') {
    for (const [r, c] of cutCells) {
      if (r >= 0 && r < size && c >= 0 && c < size) {
        full[r][c] = 1;
        full[c][r] = 1; // Symmetrical across diagonal
      }
    }
  }

  return full;
}

export function compareGrids(gridA, gridB, size = FULL_SIZE) {
  let matched = 0;
  let totalTarget = 0;
  let falseCuts = 0;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const a = gridA[r][c] ? 1 : 0;
      const b = gridB[r][c] ? 1 : 0;
      if (b === 1) totalTarget++;
      if (a === 1 && b === 1) matched++;
      if (a === 1 && b === 0) falseCuts++;
    }
  }

  const perfect = matched === totalTarget && falseCuts === 0;
  return { perfect, matched, totalTarget, falseCuts };
}

export function sanitizeProgress(raw) {
  const fallback = { cleared: {}, album: [] };
  if (!raw || typeof raw !== 'object') return fallback;
  const cleared = {};
  if (raw.cleared && typeof raw.cleared === 'object') {
    for (const [k, v] of Object.entries(raw.cleared)) {
      if (typeof v === 'number' && v >= 1 && v <= 3) cleared[k] = v;
    }
  }
  const album = Array.isArray(raw.album) ? raw.album.slice(0, 16) : [];
  return { cleared, album };
}
