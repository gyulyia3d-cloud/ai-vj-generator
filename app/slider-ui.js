/* Slider v2 (fase 14a): preenchimento da trilha e estado "alterado" de todo input[type=range].
   Só apresentação: escreve a variável CSS --p (posição, 0 a 100%) e a classe chg/hasdef na linha .pc; nunca muda valor nem dispara evento.
   O padrão vem de data-def (ctlHtml). Linhas sem data-def (modulação, áudio) ganham só o preenchimento.
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html entre os marcadores SLIDERUI. */
const SLIDERUI = (() => {
  const pos = r => {
    const lo = parseFloat(r.min), hi = parseFloat(r.max), min = isFinite(lo) ? lo : 0, max = isFinite(hi) ? hi : 100, v = parseFloat(r.value);
    return max > min && isFinite(v) ? Math.min(1, Math.max(0, (v - min) / (max - min))) : 0;
  };
  /* alterado = distância do padrão maior que meio passo (evita acender por arredondamento) */
  const changed = r => {
    const d = parseFloat(r.dataset.def), v = parseFloat(r.value), st = parseFloat(r.step);
    return isFinite(d) && isFinite(v) && Math.abs(v - d) > (isFinite(st) && st > 0 ? st : 0.001) / 2;
  };
  function sync(r) {
    if (!r || r.type !== 'range') return;
    r.style.setProperty('--p', (pos(r) * 100).toFixed(2) + '%');
    const row = r.closest('.pc');
    if (row && r.dataset.def !== undefined) { row.classList.add('hasdef'); row.classList.toggle('chg', changed(r)); }
  }
  const syncAll = root => (root || document).querySelectorAll('input[type=range]').forEach(sync);
  document.addEventListener('input', e => { if (e.target && e.target.type === 'range') sync(e.target); }, true);
  document.addEventListener('change', e => { if (e.target && e.target.type === 'range') sync(e.target); }, true);
  /* painéis são reconstruídos por innerHTML: sincroniza o que entra, uma vez por quadro */
  let queued = new Set(), tid = 0;
  new MutationObserver(ms => {
    for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) queued.add(n);
    if (!tid && queued.size) tid = setTimeout(() => { tid = 0; const q = queued; queued = new Set(); q.forEach(n => { if (n.isConnected) { if (n.matches && n.matches('input[type=range]')) sync(n); syncAll(n); } }); }, 0);
  }).observe(document.body || document.documentElement, { childList: true, subtree: true });
  syncAll();
  return { sync, syncAll, pos, changed };
})();
