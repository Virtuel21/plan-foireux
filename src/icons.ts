const paths: Record<string, string> = {
  alarm:
    '<path d="M6 17V9a6 6 0 0 1 12 0v8M4 17h16v4H4ZM12 1V0M3 4l-2-2m20 2 2-2M1 10h2m18 0h2"/><path d="M9 13V9a3 3 0 0 1 3-3"/>',
  wrench: '<path d="m14 4 3 3 4-2a6 6 0 0 1-7 8l-7 8-4-4 8-7a6 6 0 0 1 3-6Z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 6 10 7L22 6"/>',
  mask: '<path d="M3 8c3-2 5-2 9 0 4-2 6-2 9 0v5c0 4-5 6-9 1-4 5-9 3-9-1Z"/><ellipse cx="7" cy="11" rx="2" ry="1.5"/><ellipse cx="17" cy="11" rx="2" ry="1.5"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M12 6v12m3-9c-5-3-8 3-3 3s2 6-3 3"/>',
  users:
    '<circle cx="9" cy="7" r="3"/><path d="M3 20v-4c0-5 12-5 12 0v4m1-16a3 3 0 0 1 0 6m3 3c3 0 3 4 3 7"/>',
  grid: '<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M7 3v18m5-18v18m5-18v18M3 6h18M3 18h18"/>',
  laser: '<path d="m14 2-9 11h6l-1 9 9-12h-6Z"/>',
  bag: '<path d="m9 7-3-5h12l-3 5c2 2 7 7 6 12-1 4-17 4-18 0C2 14 7 9 9 7Zm-1 0h8"/><path d="M12 11v7m3-6c-5-2-7 3-3 3s2 5-3 2"/>',
  shield:
    '<path d="m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6Z"/><path d="m8 12 3 3 5-6"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  lock: '<rect x="5" y="10" width="14" height="12" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v3"/>',
  van: '<path d="M2 6h13l7 7v5H2Zm13 0v7h7M4 11h7"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 3c-1 1-1 1-1 3m0 3v.1"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 5V3H3v13h2"/>',
  sound:
    '<path d="M3 9h4l5-5v16l-5-5H3Zm13-1c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>',
  mute: '<path d="M3 9h4l5-5v16l-5-5H3Zm13 0 6 6m0-6-6 6"/>',
  close: '<path d="m6 6 12 12m0-12L6 18"/>',
  museum: '<path d="m2 8 10-6 10 6H2Zm1 13h18M5 10v8m7-8v8m7-8v8"/>',
  flag: '<path d="M5 22V3c5-4 9 4 15 0v12c-6 4-10-4-15 0"/>',
  clock: '<circle cx="12" cy="13" r="9"/><path d="M12 8v5l3 2M9 1h6"/>',
  chat: '<path d="M21 3H3v14h5v5l6-5h7Z"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  minus: '<path d="M4 12h16"/>',
};
export const icon = (name: string, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.mask}</svg>`;
