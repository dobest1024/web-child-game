// 动物进化链数据：级号、名称、内联 SVG、底色。纯数据，不含 DOM。
const designs = [
  [
    '蛋',
    '#fff3d1',
    '<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="90" rx="22" ry="5" fill="#00000014"/><path d="M50 12C36 12 24 33 24 55a26 24 0 0 0 52 0C76 33 64 12 50 12Z" fill="#fffdf4" stroke="#e8cfa4" stroke-width="3"/><path d="M36 32q-5 8-5 18" stroke="#ffffff" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="42" cy="55" r="3.2" fill="#6b5644"/><circle cx="58" cy="55" r="3.2" fill="#6b5644"/><ellipse cx="35" cy="62" rx="4" ry="2.6" fill="#f6c3b8"/><ellipse cx="65" cy="62" rx="4" ry="2.6" fill="#f6c3b8"/><path d="M46 62q4 4 8 0" fill="none" stroke="#6b5644" stroke-width="2.4" stroke-linecap="round"/></svg>',
  ],
  [
    '小鸡',
    '#ffe8a1',
    '<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="90" rx="24" ry="5" fill="#00000014"/><circle cx="50" cy="56" r="30" fill="#ffd94f" stroke="#efb63c" stroke-width="3"/><path d="M44 24q3-9 6-2q3-7 6 1" stroke="#efb63c" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="41" cy="50" r="3.2" fill="#5c4a32"/><circle cx="59" cy="50" r="3.2" fill="#5c4a32"/><ellipse cx="34" cy="58" rx="4" ry="2.6" fill="#f7b8a4"/><ellipse cx="66" cy="58" rx="4" ry="2.6" fill="#f7b8a4"/><path d="M44 56l6 6 6-6z" fill="#f59e3d" stroke="#e08a2a" stroke-width="1.5" stroke-linejoin="round"/><path d="M24 60q-6 4-4 10q8 0 10-6" fill="#ffd94f" stroke="#efb63c" stroke-width="2.5"/><path d="M76 60q6 4 4 10q-8 0-10-6" fill="#ffd94f" stroke="#efb63c" stroke-width="2.5"/><path d="M44 87v-4M56 87v-4" stroke="#f59e3d" stroke-width="3" stroke-linecap="round"/></svg>',
  ],
  [
    '小鸭',
    '#d5eff6',
    '<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="90" rx="25" ry="5" fill="#00000014"/><circle cx="50" cy="54" r="31" fill="#fffbee" stroke="#e6d3a0" stroke-width="3"/><path d="M43 21q4-7 7-1q4-6 7 1" stroke="#e6d3a0" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="40" cy="44" r="3.4" fill="#5c4a32"/><circle cx="60" cy="44" r="3.4" fill="#5c4a32"/><ellipse cx="33" cy="52" rx="4" ry="2.6" fill="#f9d9c8"/><ellipse cx="67" cy="52" rx="4" ry="2.6" fill="#f9d9c8"/><ellipse cx="50" cy="56" rx="13" ry="7" fill="#f5a53d" stroke="#dd8c22" stroke-width="2"/><path d="M40 56h20" stroke="#c97a18" stroke-width="2" stroke-linecap="round"/><path d="M22 60q-8 6-4 14q10-2 12-10" fill="#fffbee" stroke="#e6d3a0" stroke-width="2.5"/><path d="M78 60q8 6 4 14q-10-2-12-10" fill="#fffbee" stroke="#e6d3a0" stroke-width="2.5"/></svg>',
  ],
  [
    '兔子',
    '#fce1ea',
    '<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="90" rx="24" ry="5" fill="#00000014"/><ellipse cx="38" cy="22" rx="8" ry="17" fill="#fffdf8" stroke="#e8d8dc" stroke-width="2.5"/><ellipse cx="38" cy="24" rx="3.6" ry="11" fill="#f9cbd6"/><ellipse cx="62" cy="22" rx="8" ry="17" fill="#fffdf8" stroke="#e8d8dc" stroke-width="2.5"/><ellipse cx="62" cy="24" rx="3.6" ry="11" fill="#f9cbd6"/><circle cx="50" cy="58" r="28" fill="#fffdf8" stroke="#e8d8dc" stroke-width="3"/><circle cx="41" cy="53" r="3.2" fill="#5c4a42"/><circle cx="59" cy="53" r="3.2" fill="#5c4a42"/><ellipse cx="33" cy="62" rx="4.5" ry="3" fill="#f9cbd6"/><ellipse cx="67" cy="62" rx="4.5" ry="3" fill="#f9cbd6"/><path d="M47 60h6l-3 4z" fill="#f398ab"/><path d="M50 64v3m0 0q-2 4-5 2m5-2q2 4 5 2" fill="none" stroke="#b98a92" stroke-width="2" stroke-linecap="round"/></svg>',
  ],
  [
    '小猫',
    '#e6e1f8',
    '<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="90" rx="24" ry="5" fill="#00000014"/><path d="M30 40Q24 12 46 20L54 32Z" fill="#b9aede" stroke="#9a8cc4" stroke-width="2.5" stroke-linejoin="round"/><path d="M70 40Q76 12 54 20L46 32Z" fill="#b9aede" stroke="#9a8cc4" stroke-width="2.5" stroke-linejoin="round"/><circle cx="50" cy="58" r="28" fill="#cfc6ee" stroke="#a99bd6" stroke-width="3"/><circle cx="41" cy="53" r="3.2" fill="#4f4360"/><circle cx="59" cy="53" r="3.2" fill="#4f4360"/><ellipse cx="34" cy="63" rx="4" ry="2.6" fill="#f0b7c6"/><ellipse cx="66" cy="63" rx="4" ry="2.6" fill="#f0b7c6"/><path d="M47 61h6l-3 4z" fill="#e58fa8"/><path d="M50 65v2m0 0q-2 4-5 2m5-2q2 4 5 2" fill="none" stroke="#6d5f86" stroke-width="2" stroke-linecap="round"/><path d="M19 54h12M19 62h12M69 54h12M69 62h12" stroke="#a99bd6" stroke-width="2" stroke-linecap="round"/></svg>',
  ],
  [
    '小狗',
    '#ffe3cb',
    '<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="90" rx="24" ry="5" fill="#00000014"/><ellipse cx="23" cy="46" rx="9" ry="17" fill="#b9825a" stroke="#9c6a45" stroke-width="2.5" transform="rotate(14 23 46)"/><ellipse cx="77" cy="46" rx="9" ry="17" fill="#b9825a" stroke="#9c6a45" stroke-width="2.5" transform="rotate(-14 77 46)"/><circle cx="50" cy="56" r="29" fill="#f2c294" stroke="#d9a06b" stroke-width="3"/><ellipse cx="50" cy="66" rx="15" ry="11" fill="#fbead2"/><circle cx="39" cy="48" r="3.2" fill="#5c4630"/><circle cx="61" cy="48" r="3.2" fill="#5c4630"/><ellipse cx="31" cy="57" rx="4" ry="2.6" fill="#eda583"/><ellipse cx="69" cy="57" rx="4" ry="2.6" fill="#eda583"/><circle cx="50" cy="60" r="4.5" fill="#6b4a35"/><path d="M50 64v4" stroke="#6b4a35" stroke-width="2.4" stroke-linecap="round"/><path d="M46 71q4 8 8 0l-1 7q-3 3-6 0z" fill="#ef8f9f" stroke="#d8748a" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  ],
  [
    '山羊',
    '#e2eedd',
    '<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="90" rx="24" ry="5" fill="#00000014"/><path d="M36 30Q28 22 30 12" stroke="#c9ae85" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M64 30Q72 22 70 12" stroke="#c9ae85" stroke-width="5" fill="none" stroke-linecap="round"/><ellipse cx="24" cy="50" rx="9" ry="6" fill="#cfcfd8" stroke="#aeaebe" stroke-width="2.5"/><ellipse cx="76" cy="50" rx="9" ry="6" fill="#cfcfd8" stroke="#aeaebe" stroke-width="2.5"/><circle cx="50" cy="56" r="28" fill="#dedee6" stroke="#bcbcca" stroke-width="3"/><circle cx="41" cy="52" r="3.2" fill="#4d4a55"/><circle cx="59" cy="52" r="3.2" fill="#4d4a55"/><ellipse cx="43" cy="63" rx="4" ry="2.6" fill="#eab8b0"/><ellipse cx="57" cy="63" rx="4" ry="2.6" fill="#eab8b0"/><path d="M46 59q4 4 8 0" fill="none" stroke="#6d6a78" stroke-width="2.4" stroke-linecap="round"/><path d="M45 78q5 4 10 0l-2 10q-3 3-6 0z" fill="#c9c9d4" stroke="#aeaebe" stroke-width="2" stroke-linejoin="round"/></svg>',
  ],
  [
    '绵羊',
    '#f3f0ea',
    '<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="90" rx="25" ry="5" fill="#00000014"/><g fill="#fffefb" stroke="#ded6c6" stroke-width="2.5"><circle cx="30" cy="36" r="11"/><circle cx="42" cy="27" r="11"/><circle cx="58" cy="27" r="11"/><circle cx="70" cy="36" r="11"/></g><ellipse cx="21" cy="54" rx="8" ry="6" fill="#e8d4bd" stroke="#d4bfa4" stroke-width="2"/><ellipse cx="79" cy="54" rx="8" ry="6" fill="#e8d4bd" stroke="#d4bfa4" stroke-width="2"/><circle cx="50" cy="58" r="27" fill="#f3e2cb" stroke="#dcc3a4" stroke-width="3"/><circle cx="41" cy="53" r="3.2" fill="#4d4235"/><circle cx="59" cy="53" r="3.2" fill="#4d4235"/><ellipse cx="33" cy="61" rx="4" ry="2.6" fill="#eebfae"/><ellipse cx="67" cy="61" rx="4" ry="2.6" fill="#eebfae"/><path d="M46 62q4 4 8 0" fill="none" stroke="#6d5f4c" stroke-width="2.4" stroke-linecap="round"/></svg>',
  ],
  [
    '小鹿',
    '#efdcbf',
    '<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="90" rx="24" ry="5" fill="#00000014"/><path d="M36 30Q30 20 20 18M36 30Q34 20 26 14" stroke="#b98a5a" stroke-width="4.5" fill="none" stroke-linecap="round"/><path d="M64 30Q70 20 80 18M64 30Q66 20 74 14" stroke="#b98a5a" stroke-width="4.5" fill="none" stroke-linecap="round"/><ellipse cx="23" cy="48" rx="9" ry="6" fill="#e9bd85" stroke="#d3a065" stroke-width="2.5"/><ellipse cx="77" cy="48" rx="9" ry="6" fill="#e9bd85" stroke="#d3a065" stroke-width="2.5"/><circle cx="50" cy="58" r="28" fill="#e9bd85" stroke="#d3a065" stroke-width="3"/><circle cx="34" cy="44" r="2.2" fill="#fdf3e0"/><circle cx="66" cy="44" r="2.2" fill="#fdf3e0"/><ellipse cx="50" cy="68" rx="12" ry="8" fill="#fbf0dd"/><circle cx="50" cy="64" r="3.6" fill="#6b4a35"/><circle cx="41" cy="51" r="3.2" fill="#4d4235"/><circle cx="59" cy="51" r="3.2" fill="#4d4235"/><ellipse cx="34" cy="60" rx="4" ry="2.6" fill="#e59d7e"/><ellipse cx="66" cy="60" rx="4" ry="2.6" fill="#e59d7e"/></svg>',
  ],
  [
    '狮子',
    '#ffe0b3',
    '<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="90" rx="24" ry="5" fill="#00000014"/><g fill="#e8963f" stroke="#cf7a26" stroke-width="2.5"><circle cx="26" cy="30" r="9"/><circle cx="74" cy="30" r="9"/><circle cx="14" cy="52" r="9"/><circle cx="86" cy="52" r="9"/><circle cx="26" cy="76" r="9"/><circle cx="74" cy="76" r="9"/></g><circle cx="50" cy="54" r="34" fill="#e8963f" stroke="#cf7a26" stroke-width="3"/><circle cx="50" cy="56" r="24" fill="#ffdf9e" stroke="#e8b06e" stroke-width="3"/><circle cx="42" cy="51" r="3.2" fill="#5c4630"/><circle cx="58" cy="51" r="3.2" fill="#5c4630"/><ellipse cx="35" cy="60" rx="4" ry="2.6" fill="#f4b37e"/><ellipse cx="65" cy="60" rx="4" ry="2.6" fill="#f4b37e"/><path d="M46 59h8l-4 5z" fill="#a5673a"/><path d="M50 64v2m0 0q-3 4-6 2m6-2q3 4 6 2" fill="none" stroke="#8a5a34" stroke-width="2" stroke-linecap="round"/></svg>',
  ],
  [
    '神秘独角兽',
    '#f6e7fb',
    '<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="90" rx="24" ry="5" fill="#00000014"/><path d="M74 40q14 6 10 24" stroke="#f79ac0" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M78 56q10 10 2 22" stroke="#9ad0f5" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M68 30q18 10 12 26" stroke="#b9a6f0" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M50 6L43 33L57 33Z" fill="#ffd45e" stroke="#eab73e" stroke-width="2.5" stroke-linejoin="round"/><path d="M46.5 24h7M45 30h10" stroke="#eab73e" stroke-width="1.8" stroke-linecap="round"/><path d="M38 24q-8-6-6-14q8 0 10 10z" fill="#fffdfb" stroke="#e3d3e8" stroke-width="2.5" stroke-linejoin="round"/><circle cx="50" cy="56" r="28" fill="#fffdfb" stroke="#e3d3e8" stroke-width="3"/><circle cx="41" cy="52" r="3.2" fill="#5a4a63"/><circle cx="59" cy="52" r="3.2" fill="#5a4a63"/><ellipse cx="34" cy="60" rx="4.5" ry="3" fill="#f6c3dd"/><ellipse cx="66" cy="60" rx="4.5" ry="3" fill="#f6c3dd"/><path d="M46 61q4 4 8 0" fill="none" stroke="#8a7396" stroke-width="2.4" stroke-linecap="round"/><path d="M18 16l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#ffe08a"/><path d="M84 72l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z" fill="#c9a6f5"/></svg>',
  ],
];
export const ANIMALS = designs.map(([name, background, svg], index) => ({
  level: index + 1,
  value: 2 ** (index + 1),
  name,
  background,
  svg,
}));
export const MAX_LEVEL = ANIMALS.length;
export const animalByValue = (value) =>
  ANIMALS[Math.log2(value) - 1] || null;
