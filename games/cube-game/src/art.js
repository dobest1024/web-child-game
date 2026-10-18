let artId = 0;
export function cubeArt(
  type = "3x3x3",
  { mascot = false, className = "" } = {},
) {
  const id = `cube-${++artId}`;
  if (type === "pyraminx")
    return `<svg class="cube-art ${className}" viewBox="0 0 300 280" aria-hidden="true"><defs><filter id="${id}"><feGaussianBlur stdDeviation="9"/></filter></defs><ellipse cx="150" cy="245" rx="80" ry="13" fill="#6c568d" opacity=".15" filter="url(#${id})"/><g stroke="#f9f4ec" stroke-width="5" stroke-linejoin="round"><path fill="#f6b944" d="m150 25 0 210L35 215Z"/><path fill="#7e68ce" d="m150 25 115 190-115 20Z"/><path fill="#ffd967" d="m150 25-38 63 38 7Zm0 70-38-7 38 77Zm-38-7-38 64 38 7Zm0 71-38-7 38 76Zm38 6-38-6 38 76Zm-38 63-38-76-39 63Z"/><path fill="#aa91ee" d="m150 25 38 63-38 7Zm0 70 38-7-38 77Zm38-7 38 64-38 7Zm0 71 38-7-38 76Zm-38 6 38-6-38 76Zm38 63 38-76 39 63Z"/></g></svg>`;
  const n = type === "2x2x2" ? 2 : 3;
  const faces = [
    {
      a: [150, 25],
      b: [263, 85],
      c: [150, 145],
      d: [37, 85],
      colors: ["#ffe185", "#ffd25c", "#ffdc75"],
      stroke: "#e7af43",
    },
    {
      a: [37, 85],
      b: [150, 145],
      c: [150, 260],
      d: [37, 200],
      colors: ["#ffab80", "#ff9870", "#ffbb96"],
      stroke: "#e98660",
    },
    {
      a: [150, 145],
      b: [263, 85],
      c: [263, 200],
      d: [150, 260],
      colors: ["#75c6ae", "#8ed5bc", "#60bfa7"],
      stroke: "#4ba48f",
    },
  ];
  const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const point = (f, u, v) =>
    lerp(lerp(f.a, f.b, u), lerp(f.d, f.c, u), v).join(",");
  const blocks = faces
    .map(
      (f) =>
        `<polygon points="${[f.a, f.b, f.c, f.d].map((x) => x.join(",")).join(" ")}" fill="${f.stroke}" stroke="${f.stroke}" stroke-width="7" stroke-linejoin="round"/>` +
        Array.from({ length: n * n }, (_, i) => {
          const x = i % n,
            y = Math.floor(i / n),
            gap = 0.035;
          return `<polygon points="${[point(f, (x + gap) / n, (y + gap) / n), point(f, (x + 1 - gap) / n, (y + gap) / n), point(f, (x + 1 - gap) / n, (y + 1 - gap) / n), point(f, (x + gap) / n, (y + 1 - gap) / n)].join(" ")}" fill="${f.colors[(x + y) % 3]}" stroke="#fff" stroke-opacity=".36" stroke-width="1" stroke-linejoin="round"/>`;
        }).join(""),
    )
    .join("");
  return `<svg class="cube-art ${className}" viewBox="0 0 300 290" aria-hidden="true"><defs><filter id="${id}"><feGaussianBlur stdDeviation="8"/></filter></defs><ellipse cx="150" cy="269" rx="91" ry="12" fill="#897257" opacity=".17" filter="url(#${id})"/><g>${blocks}</g>${mascot ? '<g fill="#4a3f38"><ellipse cx="72" cy="157" rx="5" ry="8" transform="rotate(-17 72 157)"/><ellipse cx="117" cy="180" rx="5" ry="8" transform="rotate(-17 117 180)"/><path d="M84 183q9 15 20 10" fill="none" stroke="#4a3f38" stroke-width="4" stroke-linecap="round"/><ellipse cx="62" cy="173" rx="9" ry="4" fill="#ef7863" opacity=".65"/><ellipse cx="125" cy="202" rx="9" ry="4" fill="#ef7863" opacity=".65"/></g>' : ""}</svg>`;
}
