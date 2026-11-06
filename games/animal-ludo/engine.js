export const TRACK_LENGTH = 24;
export const RUNWAY_LENGTH = 3;
export const PAWNS_PER_PLAYER = 2;

export const PLAYERS = [
  { id: 0, key: 'red', name: '兔跳跳', animal: '🐰', color: '#ef4444', startTrack: 0, runwayEntry: 23 },
  { id: 1, key: 'yellow', name: '狐闪闪', animal: '🦊', color: '#eab308', startTrack: 6, runwayEntry: 5 },
  { id: 2, key: 'green', name: '蛙呱呱', animal: '🐸', color: '#22c55e', startTrack: 12, runwayEntry: 11 },
  { id: 3, key: 'blue', name: '熊大力', animal: '🐻', color: '#3b82f6', startTrack: 18, runwayEntry: 17 },
];

export function createInitialState(playerCount = 4, isAi = [false, true, true, true]) {
  const pawns = [];
  for (let p = 0; p < playerCount; p++) {
    for (let i = 0; i < PAWNS_PER_PLAYER; i++) {
      pawns.push({
        id: `${p}-${i}`,
        player: p,
        pawnIndex: i,
        state: 'hangar', // 'hangar' | 'track' | 'runway' | 'goal'
        stepCount: 0, // 0 to (TRACK_LENGTH + RUNWAY_LENGTH)
        trackPos: -1, // 0 to 23
        runwayPos: -1, // 0 to 2
      });
    }
  }

  return {
    playerCount,
    isAi,
    activePlayer: 0,
    diceValue: null,
    hasRolled: false,
    extraTurn: false,
    winner: null,
    pawns,
    history: [],
  };
}

export function rollDice(randomFn = Math.random) {
  return Math.floor(randomFn() * 6) + 1;
}

export function canPawnMove(pawn, dice) {
  if (pawn.state === 'goal') return false;
  if (pawn.state === 'hangar') {
    return dice >= 5; // 5 or 6 can launch
  }
  // If in runway or track:
  const maxSteps = TRACK_LENGTH + RUNWAY_LENGTH;
  return pawn.stepCount + dice <= maxSteps;
}

export function getMovablePawns(state, dice) {
  const currentPawns = state.pawns.filter((p) => p.player === state.activePlayer);
  return currentPawns.filter((p) => canPawnMove(p, dice));
}

export function movePawn(state, pawnId, dice) {
  const pawn = state.pawns.find((p) => p.id === pawnId);
  if (!pawn || !canPawnMove(pawn, dice)) return { state, success: false };

  const playerConfig = PLAYERS[pawn.player];
  const nextPawns = state.pawns.map((p) => ({ ...p }));
  const targetPawn = nextPawns.find((p) => p.id === pawnId);

  let knockedPawn = null;

  if (targetPawn.state === 'hangar') {
    // Launch onto track
    targetPawn.state = 'track';
    targetPawn.stepCount = 0;
    targetPawn.trackPos = playerConfig.startTrack;
    targetPawn.runwayPos = -1;
  } else {
    targetPawn.stepCount += dice;
    if (targetPawn.stepCount < TRACK_LENGTH) {
      // Still on outer track
      targetPawn.state = 'track';
      targetPawn.trackPos = (playerConfig.startTrack + targetPawn.stepCount) % TRACK_LENGTH;

      // Color jump rule: If landing on same color space (every 4th space), jump +4 steps!
      if (targetPawn.trackPos % 4 === playerConfig.startTrack % 4) {
        targetPawn.stepCount += 4;
        targetPawn.trackPos = (targetPawn.trackPos + 4) % TRACK_LENGTH;
      }
    } else if (targetPawn.stepCount < TRACK_LENGTH + RUNWAY_LENGTH) {
      // In home runway
      targetPawn.state = 'runway';
      targetPawn.trackPos = -1;
      targetPawn.runwayPos = targetPawn.stepCount - TRACK_LENGTH;
    } else {
      // Reached GOAL!
      targetPawn.state = 'goal';
      targetPawn.trackPos = -1;
      targetPawn.runwayPos = -1;
    }
  }

  // Knock opponent pawn back to hangar if on same outer track space
  if (targetPawn.state === 'track') {
    for (const other of nextPawns) {
      if (other.player !== targetPawn.player && other.state === 'track' && other.trackPos === targetPawn.trackPos) {
        other.state = 'hangar';
        other.stepCount = 0;
        other.trackPos = -1;
        other.runwayPos = -1;
        knockedPawn = other;
      }
    }
  }

  // Check victory: both pawns in goal
  const playerPawns = nextPawns.filter((p) => p.player === targetPawn.player);
  const isWinner = playerPawns.every((p) => p.state === 'goal');

  const extraTurn = dice === 6;
  const nextActive = extraTurn && !isWinner ? state.activePlayer : (state.activePlayer + 1) % state.playerCount;

  return {
    state: {
      ...state,
      pawns: nextPawns,
      activePlayer: isWinner ? state.activePlayer : nextActive,
      winner: isWinner ? targetPawn.player : null,
      diceValue: null,
      hasRolled: false,
      extraTurn,
    },
    success: true,
    knockedPawn,
  };
}

export function chooseAiMove(state, dice) {
  const movable = getMovablePawns(state, dice);
  if (movable.length === 0) return null;
  if (movable.length === 1) return movable[0].id;

  // AI scoring:
  // 1. Can knock opponent?
  // 2. Can enter goal?
  // 3. Can launch from hangar?
  // 4. Furthest ahead?
  let bestPawn = movable[0];
  let bestScore = -1;

  for (const p of movable) {
    let score = p.stepCount;
    if (p.state === 'hangar') score += 15;
    if (p.stepCount + dice >= TRACK_LENGTH + RUNWAY_LENGTH) score += 50;

    // Simulate to see if it knocks opponent
    const sim = movePawn(state, p.id, dice);
    if (sim.knockedPawn) score += 40;

    if (score > bestScore) {
      bestScore = score;
      bestPawn = p;
    }
  }

  return bestPawn.id;
}

export function sanitizeProgress(raw) {
  const fallback = { wins: 0, gamesPlayed: 0 };
  if (!raw || typeof raw !== 'object') return fallback;
  return {
    wins: typeof raw.wins === 'number' && raw.wins >= 0 ? Math.floor(raw.wins) : 0,
    gamesPlayed: typeof raw.gamesPlayed === 'number' && raw.gamesPlayed >= 0 ? Math.floor(raw.gamesPlayed) : 0,
  };
}
