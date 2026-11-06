// 圆滚滚的小动物头像，全部用内联 SVG 画成，不带任何外部资源。
const ink = '#4a3b45';
const eye = (x, y, r = 4) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${ink}"/><circle cx="${x + r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.4}" fill="#fff"/>`;
const blush = (x, y) =>
  `<ellipse cx="${x}" cy="${y}" rx="6" ry="3.4" fill="#f6a9b8" opacity=".55"/>`;
const smile = (x, y, w = 12) =>
  `<path d="M${x - w / 2} ${y}q${w / 4} 6 ${w / 2} 0" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>`;
const spikes = [-124, -83, -42, 0, 42, 83, 124]
  .map((angle) => `<path d="M0 -45 11 -26 -11 -26Z" transform="rotate(${angle})"/>`)
  .join('');
const faces = {
  panda: `<circle cx="27" cy="23" r="13" fill="#3f3a3c"/><circle cx="73" cy="23" r="13" fill="#3f3a3c"/><circle cx="50" cy="56" r="35" fill="#fffdf8" stroke="#e3dacb" stroke-width="2.5"/><ellipse cx="35.5" cy="49" rx="10" ry="12.5" fill="#3f3a3c" transform="rotate(-14 35.5 49)"/><ellipse cx="64.5" cy="49" rx="10" ry="12.5" fill="#3f3a3c" transform="rotate(14 64.5 49)"/><circle cx="37" cy="47" r="3.2" fill="#fff"/><circle cx="63" cy="47" r="3.2" fill="#fff"/><circle cx="37.8" cy="47.6" r="1.5" fill="${ink}"/><circle cx="62.2" cy="47.6" r="1.5" fill="${ink}"/><ellipse cx="50" cy="61" rx="4.6" ry="3.4" fill="#3f3a3c"/>${smile(50, 69, 13)}${blush(28, 61)}${blush(72, 61)}`,
  rabbit: `<g transform="rotate(-10 37 26)"><ellipse cx="37" cy="22" rx="9.5" ry="19" fill="#fffdf8" stroke="#e3dacb" stroke-width="2.5"/><ellipse cx="37" cy="24" rx="4.4" ry="12" fill="#f9c6d2"/></g><g transform="rotate(10 63 26)"><ellipse cx="63" cy="22" rx="9.5" ry="19" fill="#fffdf8" stroke="#e3dacb" stroke-width="2.5"/><ellipse cx="63" cy="24" rx="4.4" ry="12" fill="#f9c6d2"/></g><circle cx="50" cy="61" r="31" fill="#fffdf8" stroke="#e3dacb" stroke-width="2.5"/>${eye(40, 57)}${eye(60, 57)}<path d="M46.8 64.5h6.4L50 68Z" fill="#ef9db2"/><path d="M50 68v2.6" stroke="${ink}" stroke-width="2.2" stroke-linecap="round"/><path d="M45 73.5q2.5 3 5 0q2.5 3 5 0" fill="none" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>${blush(32, 67)}${blush(68, 67)}`,
  cat: `<path d="M27 42 25 20l20 10Z" fill="#f4b168" stroke="#e0975a" stroke-width="2.5" stroke-linejoin="round"/><path d="M73 42l2-22-20 10Z" fill="#f4b168" stroke="#e0975a" stroke-width="2.5" stroke-linejoin="round"/><path d="M29.5 35l-1-9 9 4.5Z" fill="#fbd9c4"/><path d="M70.5 35l1-9-9 4.5Z" fill="#fbd9c4"/><circle cx="50" cy="59" r="32" fill="#f4b168" stroke="#e0975a" stroke-width="2.5"/><path d="M43 30v8M50 28v9M57 30v8" stroke="#e0975a" stroke-width="3" stroke-linecap="round"/>${eye(40, 55)}${eye(60, 55)}<path d="M46.8 61.5h6.4L50 65Z" fill="#e0795f"/><path d="M44.5 68q2.75 3.5 5.5 0q2.75 3.5 5.5 0" fill="none" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/><path d="M12 55h11M14 63l10-2.5M88 55H77M86 63l-10-2.5" stroke="#e8b075" stroke-width="2" stroke-linecap="round"/>${blush(32, 65)}${blush(68, 65)}`,
  frog: `<circle cx="31" cy="29" r="13" fill="#8ecf7f" stroke="#6fae60" stroke-width="2.5"/><circle cx="69" cy="29" r="13" fill="#8ecf7f" stroke="#6fae60" stroke-width="2.5"/><circle cx="31" cy="28" r="7" fill="#fff"/><circle cx="69" cy="28" r="7" fill="#fff"/><circle cx="31" cy="28.5" r="3.2" fill="${ink}"/><circle cx="69" cy="28.5" r="3.2" fill="${ink}"/><circle cx="32.2" cy="27.4" r="1.2" fill="#fff"/><circle cx="70.2" cy="27.4" r="1.2" fill="#fff"/><ellipse cx="50" cy="62" rx="37" ry="28" fill="#8ecf7f" stroke="#6fae60" stroke-width="2.5"/><circle cx="44" cy="53" r="1.8" fill="${ink}"/><circle cx="56" cy="53" r="1.8" fill="${ink}"/><path d="M32 62q18 13 36 0" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>${blush(30, 67)}${blush(70, 67)}`,
  duck: `<path d="M45 20q1-9 6-4q3-8 7-1" fill="none" stroke="#eec84e" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="59" r="32" fill="#ffd95e" stroke="#eec84e" stroke-width="2.5"/>${eye(40, 52)}${eye(60, 52)}<ellipse cx="50" cy="65" rx="12.5" ry="7.5" fill="#f5a24b" stroke="#e8913a" stroke-width="2"/><path d="M38.5 65h23" stroke="#d9822e" stroke-width="2" stroke-linecap="round"/>${blush(31, 62)}${blush(69, 62)}`,
  hedgehog: `<g fill="#a1795b" transform="translate(50 56)">${spikes}</g><circle cx="50" cy="60" r="29" fill="#ecd0a9" stroke="#d9b98c" stroke-width="2.5"/>${eye(41, 56)}${eye(59, 56)}<ellipse cx="50" cy="64.5" rx="4.6" ry="3.6" fill="#7c5a3f"/>${smile(50, 72, 10)}${blush(33, 66)}${blush(67, 66)}`,
};
export const ANIMALS = [
  { id: 'panda', species: '熊猫', name: '团团', emoji: '🐼' },
  { id: 'rabbit', species: '兔子', name: '跳跳', emoji: '🐰' },
  { id: 'cat', species: '小猫', name: '咪咪', emoji: '🐱' },
  { id: 'frog', species: '青蛙', name: '呱呱', emoji: '🐸' },
  { id: 'duck', species: '小鸭', name: '嘎嘎', emoji: '🦆' },
  { id: 'hedgehog', species: '刺猬', name: '球球', emoji: '🦔' },
];
export function animalSvg(id) {
  const body = faces[id];
  return body ? `<svg viewBox="0 0 100 100" aria-hidden="true">${body}</svg>` : '';
}
export function faceHtml(value, useDigits) {
  if (useDigits) return `<span class="digit">${value}</span>`;
  const animal = ANIMALS[value - 1];
  return animal ? animalSvg(animal.id) : '';
}
export function animalLabel(value, useDigits) {
  if (useDigits) return `数字 ${value}`;
  const animal = ANIMALS[value - 1];
  return animal ? `${animal.species}${animal.name}` : '神秘小伙伴';
}
