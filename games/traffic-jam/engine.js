// 6x6 Rush Hour grid engine
export const GRID_SIZE = 6;
export const EXIT_ROW = 2; // target car row
export const EXIT_COL = 5; // right edge

export function createCar(id, row, col, length, orientation, isTarget = false, color = 'red', label = '') {
  return {
    id,
    row,
    col,
    length, // 2 or 3
    orientation, // 'H' (horizontal) or 'V' (vertical)
    isTarget,
    color,
    label: label || id,
  };
}

export function buildOccupancyGrid(cars, excludeId = null) {
  const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
  for (const car of cars) {
    if (car.id === excludeId) continue;
    for (let i = 0; i < car.length; i++) {
      const r = car.orientation === 'V' ? car.row + i : car.row;
      const c = car.orientation === 'H' ? car.col + i : car.col;
      if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
        grid[r][c] = car.id;
      }
    }
  }
  return grid;
}

export function canMove(car, newPos, cars) {
  const grid = buildOccupancyGrid(cars, car.id);
  if (car.orientation === 'H') {
    const newCol = newPos;
    if (newCol < 0 || newCol + car.length > GRID_SIZE) return false;
    const start = Math.min(car.col, newCol);
    const end = Math.max(car.col, newCol) + car.length - 1;
    for (let c = start; c <= end; c++) {
      if (grid[car.row][c] !== null && grid[car.row][c] !== car.id) {
        return false;
      }
    }
  } else {
    const newRow = newPos;
    if (newRow < 0 || newRow + car.length > GRID_SIZE) return false;
    const start = Math.min(car.row, newRow);
    const end = Math.max(car.row, newRow) + car.length - 1;
    for (let r = start; r <= end; r++) {
      if (grid[r][car.col] !== null && grid[r][car.col] !== car.id) {
        return false;
      }
    }
  }
  return true;
}

export function getMoveRange(car, cars) {
  const grid = buildOccupancyGrid(cars, car.id);
  let minPos = car.orientation === 'H' ? car.col : car.row;
  let maxPos = minPos;

  if (car.orientation === 'H') {
    // move left
    while (minPos > 0 && grid[car.row][minPos - 1] === null) {
      minPos--;
    }
    // move right
    while (maxPos + car.length < GRID_SIZE && grid[car.row][maxPos + car.length] === null) {
      maxPos++;
    }
  } else {
    // move up
    while (minPos > 0 && grid[minPos - 1][car.col] === null) {
      minPos--;
    }
    // move down
    while (maxPos + car.length < GRID_SIZE && grid[maxPos + car.length][car.col] === null) {
      maxPos++;
    }
  }
  return { min: minPos, max: maxPos };
}

export function moveCar(cars, carId, delta) {
  const index = cars.findIndex((c) => c.id === carId);
  if (index === -1) return { cars, moved: false };
  const car = cars[index];
  const currentPos = car.orientation === 'H' ? car.col : car.row;
  const targetPos = currentPos + delta;
  const range = getMoveRange(car, cars);

  if (targetPos < range.min || targetPos > range.max) {
    return { cars, moved: false };
  }

  const updatedCars = cars.map((c) => {
    if (c.id !== carId) return c;
    return car.orientation === 'H'
      ? { ...c, col: targetPos }
      : { ...c, row: targetPos };
  });

  return { cars: updatedCars, moved: true };
}

export function isSolved(cars) {
  const target = cars.find((c) => c.isTarget);
  if (!target) return false;
  // target reaches exit column
  return target.col + target.length === GRID_SIZE;
}

export function calculateStars(moves, minMoves) {
  if (moves <= minMoves) return 3;
  if (moves <= minMoves + 3) return 2;
  return 1;
}

export function sanitizeProgress(raw) {
  const fallback = { cleared: {}, bestMoves: {} };
  if (!raw || typeof raw !== 'object') return fallback;
  const cleared = {};
  const bestMoves = {};
  if (raw.cleared && typeof raw.cleared === 'object') {
    for (const [k, v] of Object.entries(raw.cleared)) {
      if (typeof v === 'number' && v >= 1 && v <= 3) cleared[k] = v;
    }
  }
  if (raw.bestMoves && typeof raw.bestMoves === 'object') {
    for (const [k, v] of Object.entries(raw.bestMoves)) {
      if (typeof v === 'number' && v > 0) bestMoves[k] = Math.floor(v);
    }
  }
  return { cleared, bestMoves };
}
