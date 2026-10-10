// Iconos propios (dibujados aqui, sin derechos de terceros) para la frase grande.
// "{i:nombre}" dentro del texto pone el icono en una pastilla verde.
const s = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const ICONS = {
  clock: s('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  spark: s('<path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z"/><path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>'),
  eye: s('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
  play: s('<path d="M8 5.5v13l10.5-6.5z"/>'),
  music: s('<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>'),
  mail: s('<rect x="3" y="5.5" width="18" height="13" rx="3"/><path d="M4 8l8 5.5L20 8"/>'),
  share: s('<circle cx="6" cy="12" r="2.5"/><circle cx="17.5" cy="6" r="2.5"/><circle cx="17.5" cy="18" r="2.5"/><path d="M8.2 10.8l7.1-3.6M8.2 13.2l7.1 3.6"/>'),
  friend: s('<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19c.5-3.2 2.7-5 5.5-5s5 1.8 5.5 5"/><path d="M16.5 6.5a2.6 2.6 0 0 1 0 5M18.5 14.4c1.4.7 2.2 2.2 2.5 4.6"/>'),
  search: s('<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>'),
  dots: s('<circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/>'),
  cc: s('<rect x="3" y="5.5" width="18" height="13" rx="3"/><path d="M10.5 10.2a2.2 2.2 0 1 0 0 3.6M16.5 10.2a2.2 2.2 0 1 0 0 3.6"/>'),
};
export const stToken = (w) => { const m = w.match(/^\{i:(\w+)\}(.*)$/); return m ? { icon: m[1], rest: m[2] } : null; };
