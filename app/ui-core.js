/* Núcleo de interface: tradução PT/EN (T3) e presets de superfície (usados nas abas Superfície e Projeto).
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html. */
const T3 = (pt, en) => ST.lang === 'en' ? en : pt;
const SURFACE_PRESETS = [
  { id: 'led-4500x800', pt: 'Parede LED em L · 4500×800 (duas paredes, dobra no meio)', en: 'LED wall in L · 4500×800 (two walls, fold in the middle)', type: 'led', w: 4500, h: 800, folds: [2250], pitchMm: 3.9, viewingDistanceM: [8, 40] },
  { id: 'led-ultrawide', pt: 'LED ultrawide · 3840×720', en: 'LED ultrawide · 3840×720', type: 'led', w: 3840, h: 720, pitchMm: 3.9, viewingDistanceM: [8, 40] },
  { id: 'led-fita', pt: 'LED fita · 4096×256', en: 'LED strip · 4096×256', type: 'led', w: 4096, h: 256, pitchMm: 6, viewingDistanceM: [5, 30] },
  { id: 'led-torre', pt: 'LED torre vertical · 540×1920', en: 'LED vertical tower · 540×1920', type: 'led', w: 540, h: 1920, pitchMm: 6, viewingDistanceM: [5, 30] },
  { id: 'led-16x9', pt: 'LED palco 16:9 · 3840×2160', en: 'LED stage 16:9 · 3840×2160', type: 'led', w: 3840, h: 2160, pitchMm: 3.9, viewingDistanceM: [10, 50] },
  { id: 'multi-3', pt: 'Três telas lado a lado · 5760×1080', en: 'Three screens side by side · 5760×1080', type: 'multi', w: 5760, h: 1080, folds: [1920, 3840], pitchMm: 2.5 },
  { id: 'proj-hd', pt: 'Projeção · 1920×1080', en: 'Projection · 1920×1080', type: 'projection', w: 1920, h: 1080 },
  { id: 'proj-fachada', pt: 'Fachada (mapping) · 3840×2160', en: 'Facade (mapping) · 3840×2160', type: 'mapping', w: 3840, h: 2160 },
  { id: 'screen-hd', pt: 'Tela 16:9 · 1920×1080', en: 'Screen 16:9 · 1920×1080', type: 'screen', w: 1920, h: 1080 },
  { id: 'screen-4k', pt: 'Tela 4K · 3840×2160', en: 'Screen 4K · 3840×2160', type: 'screen', w: 3840, h: 2160 },
  { id: 'screen-vertical', pt: 'Tela vertical 9:16 · 1080×1920', en: 'Vertical screen 9:16 · 1080×1920', type: 'screen', w: 1080, h: 1920 },
  { id: 'screen-square', pt: 'Quadrado · 2048×2048', en: 'Square · 2048×2048', type: 'screen', w: 2048, h: 2048 },
];
