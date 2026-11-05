// Pure color mixing and judging rules for 魔法药水店. No DOM access, so Node tests can import it.
export const colorIds = ['red', 'yellow', 'blue', 'white', 'black'];
export const colorNames = {
  red: '红',
  yellow: '黄',
  blue: '蓝',
  white: '白',
  black: '黑',
};
// CIE76 ΔE under 10 reads as "the same color" next to each other for a child.
// Tests keep every wrong recipe of every level at least this far from the target.
export const perceptibleDeltaE = 10;

// Gossett & Chen style RYB cube: 8 corner colors, trilinear interpolation.
// Corners are tuned so red + yellow is a clear orange and yellow + blue a clear green.
const rybCorners = [
  [0, 0, 0, [1, 1, 1]], // no paint
  [1, 0, 0, [0.92, 0.1, 0.2]], // red
  [0, 1, 0, [1, 0.93, 0.08]], // yellow
  [0, 0, 1, [0.08, 0.3, 0.88]], // blue
  [1, 1, 0, [1, 0.47, 0.05]], // orange
  [1, 0, 1, [0.5, 0.15, 0.64]], // purple
  [0, 1, 1, [0.12, 0.64, 0.22]], // green
  [1, 1, 1, [0.52, 0.3, 0.13]], // brown
];
const white = [1, 1, 1];
const dark = [0.05, 0.04, 0.09];
export const waterColor = '#dcebf0';

export function countDrops(drops) {
  const counts = Object.fromEntries(colorIds.map((id) => [id, 0]));
  for (const id of drops) if (id in counts) counts[id]++;
  return counts;
}
const amounts = (counts) => colorIds.map((id) => counts[id] || 0);
const sum = (values) => values.reduce((total, value) => total + value, 0);
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

export function rybToRgb(r, y, b) {
  const rgb = [0, 0, 0];
  for (const [cr, cy, cb, corner] of rybCorners) {
    const weight =
      (cr ? r : 1 - r) * (cy ? y : 1 - y) * (cb ? b : 1 - b);
    for (let i = 0; i < 3; i++) rgb[i] += weight * corner[i];
  }
  return rgb;
}

// Primaries set the hue (scaled so the strongest one is 1, which makes 2:2 equal 1:1).
// White and black then pull the hue toward white or dark by their share of all drops.
export function mix(counts) {
  const [r, y, b, w, k] = amounts(counts);
  const paint = r + y + b;
  const all = paint + w + k;
  if (!all) return null;
  const top = Math.max(r, y, b) || 1;
  const hue = rybToRgb(r / top, y / top, b / top);
  return hue.map((value, i) => (value * paint + white[i] * w + dark[i] * k) / all);
}

export function toHex(rgb) {
  if (!rgb) return waterColor;
  return `#${rgb
    .map((value) =>
      Math.round(Math.min(1, Math.max(0, value)) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

export function toLab(rgb) {
  const linear = rgb.map((v) =>
    v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
  );
  const [lr, lg, lb] = linear;
  const x = (0.4124 * lr + 0.3576 * lg + 0.1805 * lb) / 0.95047;
  const y = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
  const z = (0.0193 * lr + 0.1192 * lg + 0.9505 * lb) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27) * t / 116 + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

export function deltaE(a, b) {
  const [l1, a1, b1] = toLab(a);
  const [l2, a2, b2] = toLab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

export function ratioOf(counts) {
  const values = amounts(counts);
  const divisor = values.reduce(gcd, 0) || 1;
  return values.map((value) => value / divisor);
}

export function sameRatio(a, b) {
  return ratioOf(a).join() === ratioOf(b).join() && sum(amounts(a)) > 0;
}

export function minimalDrops(recipe) {
  return sum(ratioOf(recipe));
}

export function addDrop(drops, color, capacity) {
  if (!colorIds.includes(color) || drops.length >= capacity) return drops;
  return [...drops, color];
}

const tooMuch = (id) =>
  id === 'white'
    ? '颜色有点太浅啦'
    : id === 'black'
      ? '颜色有点太深啦'
      : `颜色有点偏${colorNames[id]}哦`;
const addMore = (id) =>
  id === 'white'
    ? '再加一点白，让它浅一点'
    : id === 'black'
      ? '再加一点黑，让它深一点'
      : `再加一点${colorNames[id]}试试`;

// A kind next step for a wrong potion. `add` is only suggested when adding drops can
// reach the recipe without overflowing the cauldron; otherwise the child is told to pour.
export function hintFor(counts, recipe, capacity) {
  const have = amounts(counts);
  const want = ratioOf(recipe);
  const used = sum(have);
  const extra = colorIds.find((id, i) => have[i] > 0 && !want[i]);
  if (extra)
    return {
      extra,
      text: `这瓶药水不需要${colorNames[extra]}色哦。撤回一滴，或者倒掉重新调吧。`,
    };
  const scale = Math.max(...want.map((n, i) => (n ? Math.ceil(have[i] / n) : 0)), 1);
  const canAdd = scale * sum(want) <= capacity;
  const missing = colorIds.find((id, i) => want[i] && !have[i]);
  if (missing)
    return canAdd
      ? { add: missing, text: `还少了${colorNames[missing]}色哦，加一点${colorNames[missing]}试试。` }
      : { pour: true, text: `还少了${colorNames[missing]}色，锅里放不下啦。倒掉重新调吧。` };
  const share = have.map((n, i) => n / used - want[i] / sum(want));
  const over = colorIds[share.indexOf(Math.max(...share))];
  const under = colorIds[share.indexOf(Math.min(...share))];
  return canAdd
    ? { add: under, over, text: `${tooMuch(over)}，${addMore(under)}。` }
    : {
        pour: true,
        over,
        text: `${tooMuch(over)}。锅快满啦，倒掉重新调，少放一点${colorNames[over]}试试。`,
      };
}

export function judge(drops, recipe, capacity) {
  const counts = countDrops(drops);
  if (!drops.length) return { correct: false, minimal: false, hint: { text: '锅里还是清水，先加几滴颜料吧。' } };
  const correct = sameRatio(counts, recipe);
  return {
    correct,
    minimal: correct && drops.length === minimalDrops(recipe),
    hint: correct ? null : hintFor(counts, recipe, capacity),
  };
}

// One star for brewing every potion, one more if every customer got it right on the
// first serve, and one more if every potion used the fewest possible drops.
export function score(results) {
  if (!results.length) return 0;
  return (
    1 +
    Number(results.every((result) => result.firstTry)) +
    Number(results.every((result) => result.minimal))
  );
}

export function sanitizeStars(raw, levelCount) {
  const clean = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return clean;
  for (let id = 0; id < levelCount; id++)
    if ([1, 2, 3].includes(raw[id])) clean[id] = raw[id];
  return clean;
}

export function loadStars(storage, key, levelCount) {
  try {
    return sanitizeStars(JSON.parse(storage.getItem(key)), levelCount);
  } catch {
    return {};
  }
}

export function saveStars(storage, key, stars) {
  try {
    storage.setItem(key, JSON.stringify(stars));
    return true;
  } catch {
    return false;
  }
}
