export const crown =
  '<svg viewBox="0 0 32 32" fill="none"><path d="M5 11l5 5 6-10 6 10 5-5-3 14H8L5 11z" fill="currentColor"/><path d="M9 28h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const portraits = {
  knight:
    '<path d="M20 108V75Q48 61 76 75v33" fill="#638cac"/><path d="M30 71l18 20 18-20" fill="#d5e7ec"/><rect x="30" y="34" width="36" height="39" rx="15" fill="#dfbd91"/><path d="M27 53V37q0-25 21-25t21 25v16l-9-8H36z" fill="#bed3d9"/><path d="M48 12v29M29 36h37" stroke="#7b96aa" stroke-width="4"/><path d="M40 52h2m12 0h2" stroke="#233044" stroke-width="4"/><path d="M37 60q11 10 22 0" fill="#794f36"/><path d="M15 87V36l5-7 5 7v51" fill="#e3eaf0"/><path d="M10 78h20" stroke="#e8c277" stroke-width="5"/>',
  archers:
    '<path d="M21 108V78Q48 56 75 78v30" fill="#566765"/><path d="M26 64V39q0-25 22-25t22 25v32l-10-8H36z" fill="#ce8bb4"/><ellipse cx="48" cy="48" rx="17" ry="22" fill="#e7c0a1"/><path d="M29 40q2-32 35-15l6 22-16-14-25 9" fill="#db9fc8"/><path d="M38 49h3m14 0h3" stroke="#293845" stroke-width="3"/><path d="M74 31q28 31-1 63M74 31v63" fill="none" stroke="#dcb779" stroke-width="3"/><path d="M54 66h31l-6-5m6 5l-6 5" fill="none" stroke="#dbe3db" stroke-width="2"/>',
  giant:
    '<path d="M8 108V76q40-26 80 0v32" fill="#986b44"/><path d="M26 70l8 38m36-38l-8 38" stroke="#c49a58" stroke-width="10"/><rect x="23" y="21" width="50" height="57" rx="20" fill="#d8aa76"/><path d="M24 44V24q21-22 47 0v19L60 30H35z" fill="#b0713f"/><path d="M27 52q21 10 43 0v17q-21 21-43 0z" fill="#b0713f"/><path d="M35 44h4m18 0h4" stroke="#374045" stroke-width="4"/><path d="M37 61h22" stroke="#fff2d6" stroke-width="5"/>',
  goblins:
    '<path d="M18 108V79q30-25 60 0v29" fill="#6a8353"/><path d="M23 39L5 26l7 34 18 2m43-23l18-13-7 34-18 2" fill="#84ad63"/><path d="M24 32q24-24 48 0v34q-24 24-48 0z" fill="#add687"/><path d="M31 44l13 4m8 0l13-4" stroke="#4a6744" stroke-width="5"/><path d="M41 54l7-9 6 12" fill="#88ae61"/><path d="M33 65l8 7 6-7 7 7 9-9" fill="#f5f2cf"/><path d="M75 92V56l9 5-3 31" fill="#d6e1e1"/>',
  bomber:
    '<path d="M20 108V77q28-20 56 0v31" fill="#6d7485"/><path d="M23 46q0-33 25-33t25 33z" fill="#6a7080"/><path d="M28 45h40v24q-20 23-40 0z" fill="#e9dbb3"/><path d="M32 52h12v10H32zm20 0h12v10H52z" fill="#3c4a58"/><path d="M42 73h12" stroke="#615744" stroke-width="3"/><circle cx="69" cy="86" r="19" fill="#293344"/><path d="M72 67q-8-13 4-17" stroke="#cbb788" stroke-width="3" fill="none"/><path d="M74 46l7 3-5 6-5-5z" fill="#f9ca78"/>',
  dragon:
    '<path d="M34 61L6 32l3 40 27 12m25-24l29-31-4 43-25 12" fill="#6dafa0"/><path d="M34 61L9 48l6 18 21 9m25-15l25-15-6 21-21 9" fill="#9bd8be"/><path d="M30 108V69q2-16 18-16t18 16v39" fill="#79b599"/><path d="M36 106V77h24v29" fill="#d3dca8"/><path d="M28 36l2-20 14 13 17-12 9 26v24q-21 15-42-2z" fill="#9cd1a5"/><path d="M34 46h10m12 0h8" stroke="#374c40" stroke-width="4"/><path d="M33 63h30" stroke="#5f926f" stroke-width="3"/>',
  fireball:
    '<path d="M67 4Q20 19 31 46L14 39q-12 34 14 56t54-7Q98 61 67 4" fill="#ed8759"/><path d="M60 30Q33 41 43 58l-17-4q-7 24 14 37t35-11Q82 64 60 30" fill="#ffc96a"/><path d="M53 58q-22 16-5 30t19-9z" fill="#fff0b0"/><path d="M16 15l-5 11m74 0l4 13m-6 58l-4 9" stroke="#ffcd87" stroke-width="3"/>',
  arrows:
    '<path d="M22 14l6 70m18-77l6 70m19-63l6 70" stroke="#d8bb85" stroke-width="4"/><path d="M16 76l12 20 9-23M40 69l12 20 9-23M65 76l12 20 9-23" fill="#e4ebed"/><path d="M22 21L11 12v18l13 10m22-26L35 5v18l13 10m23-12L60 12v18l13 10" fill="#8ebbbd"/>',
};
export function art(id) {
  return `<svg viewBox="0 0 96 112" aria-hidden="true"><circle cx="48" cy="58" r="37" fill="currentColor" opacity=".12"/>${portraits[id] || ""}</svg>`;
}
