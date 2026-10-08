/* UX (fase 3): modo Criativo/Avançado, ajuda de cada aba, atalhos (tecla ?) e tour guiado. Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html.
   Textos pela função T3 (gen-ui.js). O teste (ux_check.mjs) confere que todo atalho do teclado aparece na lista. */
const UX = (() => {
  /* modo: Criativo esconde o que só o trabalho técnico precisa (Texto, Projeto, +Efeitos, Ficha); Avançado mostra tudo. Esconder uma aba não remove nada do projeto. */
  const ADV_TABS = ['txt', 'prj', 'rec', 'spc'];
  let level = store.get('level', 'creative');
  const css = document.createElement('style'); css.id = 'uxCss';
  css.textContent = `body[data-level="creative"] #tabs [data-tab="txt"],body[data-level="creative"] #tabs [data-tab="prj"],body[data-level="creative"] #tabs [data-tab="rec"],body[data-level="creative"] #tabs [data-tab="spc"]{display:none}
#tabHelp{margin:6px 10px 2px;color:var(--dim);font-size:var(--fs-s);line-height:1.5}#tabHelp b{color:var(--fg)}#tabHelp button{padding:0 8px;margin-left:6px}
#keysBox,#tourBox{position:fixed;z-index:60;background:var(--panel,#111);color:var(--fg);border:1px solid var(--g500,#777);padding:14px 16px;max-width:min(520px,92vw)}
#keysBox{left:50%;top:50%;transform:translate(-50%,-50%);max-height:84vh;overflow:auto}#keysBox h2{margin:0 0 8px}#keysBox dl{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:0}#keysBox dt{font-family:var(--font-mono,monospace)}#keysBox dd{margin:0;color:var(--dim)}
#tourDim{position:fixed;inset:0;z-index:58;pointer-events:none}#tourHi{position:fixed;z-index:59;pointer-events:none;border:2px solid #fff;box-shadow:0 0 0 9999px rgba(0,0,0,.62);transition:all .18s}
#tourBox p{margin:0 0 10px;line-height:1.55}#tourBox .row{justify-content:space-between}`;
  document.head.appendChild(css);
  function setLevel(l, quiet) { level = l === 'advanced' ? 'advanced' : 'creative'; document.body.dataset.level = level; store.set('level', level); const b = document.getElementById('lvlBtn'); if (b) { b.textContent = level === 'creative' ? T3('Criativo', 'Creative') : T3('Avançado', 'Advanced'); b.setAttribute('aria-pressed', level === 'advanced'); b.title = T3('Criativo esconde as abas técnicas (Texto, Projeto, +Efeitos, Ficha). Avançado mostra tudo.', 'Creative hides the technical tabs (Text, Project, +Effects, Sheet). Advanced shows everything.'); }
    if (level === 'creative' && ADV_TABS.includes(ST.tab)) { const t = document.querySelector('#tabs [data-tab="comp"]'); if (t) t.click(); }
    if (!quiet) toast(level === 'creative' ? T3('Modo Criativo: abas técnicas escondidas', 'Creative mode: technical tabs hidden') : T3('Modo Avançado: todas as abas', 'Advanced mode: all tabs'), 1600); }
  /* ajuda de cada aba: uma linha sempre à vista sob a barra de abas */
  const HELP = {
    gen: ['Preencha o briefing e gere o projeto sem IA. Depois use Avaliar para ver os defeitos de estrutura.', 'Fill in the brief and generate the project with no AI. Then use Evaluate to see structural defects.'],
    comp: ['As composições do set. Clique para ativar, duplique para variar, renomeie. O resumo do projeto e a bíblia de arte estão no fim.', 'The compositions of the set. Click to activate, duplicate to vary, rename. The project summary and art bible are at the bottom.'],
    lay: ['As camadas da composição ativa, de baixo para cima. Ligue, desligue, reordene, mude mistura e opacidade. Teclas 0 a 9 ligam e desligam.', 'The layers of the active composition, bottom to top. Toggle, reorder, change blend and opacity. Keys 0 to 9 toggle them.'],
    par: ['Os parâmetros da camada selecionada. Digite números ou contas (1920/2). Abaixo, a modulação: ligue um parâmetro ao áudio ou ao BPM.', 'The parameters of the selected layer. Type numbers or sums (1920/2). Below, modulation: tie a parameter to audio or to the BPM.'],
    txt: ['Camadas de texto e fontes próprias.', 'Text layers and custom fonts.'],
    med: ['Imagens, vídeos, objetos 3D e fontes do projeto. Arraste arquivos para a vista.', 'Images, videos, 3D objects and fonts for the project. Drag files onto the view.'],
    aud: ['Conecte um arquivo, o microfone ou a fonte de teste. Sem fonte, os shaders usam as bandas sintéticas do BPM.', 'Connect a file, the microphone or the test source. With no source, shaders use the BPM synthetic bands.'],
    prj: ['Nome, canvas, dobras, tempo, loop e paleta do projeto.', 'Name, canvas, folds, time, loop and palette of the project.'],
    sur: ['Preset da superfície, cortes, pixel map e fatias para o Resolume. Confira a legibilidade pelo passo e pela distância.', 'Surface preset, cuts, pixel map and slices for Resolume. Check legibility by pitch and distance.'],
    isf: ['ISF: shaders que o Resolume abre. Use os da biblioteca como camadas, importe um .fs seu ou exporte os shaders do projeto.', 'ISF: shaders Resolume opens. Use the library ones as layers, import your own .fs or export the project shaders.'],
    rec: ['Receitas testadas para adicionar como camada. São vocabulário: mude os números.', 'Tested recipes to add as a layer. They are vocabulary: change the numbers.'],
    spc: ['Ficha de produção e calculadoras de LED, projeção, blend e loop.', 'Production sheet and calculators for LED, projection, blend and loop.'],
    exp: ['Exporte a sequência PNG. Teste os flashes antes, divida em partes se o arquivo for grande. O manifesto vai junto.', 'Export the PNG sequence. Test flashes first, split into parts if the file is large. The manifest goes along.'],
    gui: ['Guia rápido, atalhos e tour.', 'Quick guide, shortcuts and tour.'],
  };
  function renderHelp() {
    let h = document.getElementById('tabHelp'); const tabs = document.getElementById('tabs'); if (!h) { h = document.createElement('div'); h.id = 'tabHelp'; h.setAttribute('role', 'note'); (tabs.closest('#panelHead') || tabs).insertAdjacentElement('afterend', h); }
    const t = HELP[ST.tab]; h.hidden = !t || store.get('helpOff', false); if (t) h.innerHTML = `<b>${esc(({ gen: T3('Gerar', 'Generate'), comp: T3('Compor', 'Compose'), lay: T3('Camadas', 'Layers'), par: T3('Parâmetros', 'Parameters'), txt: T3('Texto', 'Text'), med: T3('Mídia', 'Media'), aud: T3('Áudio', 'Audio'), prj: T3('Projeto', 'Project'), sur: T3('Superfície', 'Surface'), rec: '+' + T3('Efeitos', 'Effects'), isf: 'ISF', spc: T3('Ficha', 'Sheet'), exp: T3('Exportar', 'Export'), gui: T3('Guia', 'Guide') })[ST.tab] || '')}.</b> ${esc(T3(t[0], t[1]))}${level === 'creative' ? ' <span class="lbl">' + esc(T3('Modo Criativo: Texto, Projeto, +Efeitos e Ficha estão escondidas; o botão Criativo, no topo, mostra tudo.', 'Creative mode: Text, Project, +Effects and Sheet are hidden; the Creative button at the top shows everything.')) + '</span>' : ''} <button id="helpHide" title="${esc(T3('Esconder esta linha de ajuda', 'Hide this help line'))}">×</button>`;
    const hb = document.getElementById('helpHide'); if (hb) hb.onclick = () => { store.set('helpOff', true); renderHelp(); toast(T3('Ajuda escondida. A aba Guia a traz de volta.', 'Help hidden. The Guide tab brings it back.'), 2200); };
  }
  /* atalhos: a lista abaixo é conferida contra o código do teclado por ux_check.mjs */
  const KEYS = [
    ['Espaço', 'tap tempo', 'Space', 'tap tempo'], ['Enter', 'alinhar o downbeat', 'Enter', 'align the downbeat'], ['↑ ↓', 'BPM +1 / −1 (Shift ±5)', '↑ ↓', 'BPM +1 / −1 (Shift ±5)'], ['P', 'pausar e tocar', 'P', 'pause and play'], ['E', 'mostrar as camadas em 3D', 'E', 'show the layers in 3D'],
    ['S', 'movimento em degrau ou suave', 'S', 'stepped or smooth motion'], ['C', 'trocar a cor de acento', 'C', 'cycle the accent colour'], ['A', 'áudio reativo ligado ou desligado', 'A', 'audio reactive on or off'], ['R', 'gravar a tela', 'R', 'record the screen'],
    ['H', 'esconder a interface', 'H', 'hide the interface'], ['F', 'tela cheia da viewport', 'F', 'fullscreen of the view'], ['G', 'abrir ou fechar o menu', 'G', 'open or close the menu'], [', .', 'quadro anterior / próximo (pausa)', ', .', 'previous / next frame (pauses)'],
    ['0–9', 'ligar e desligar a camada com esse número', '0–9', 'toggle the layer with that number'], ['Shift+1–9', 'ativar a composição', 'Shift+1–9', 'activate the composition'], ['Ctrl+Z / Ctrl+Y', 'desfazer / refazer', 'Ctrl+Z / Ctrl+Y', 'undo / redo'], ['Esc', 'fechar painéis e sair do modo limpo', 'Esc', 'close panels and leave the clean mode'], ['?', 'esta lista', '?', 'this list'],
  ];
  function showKeys() {
    closeKeys(); const b = document.createElement('div'); b.id = 'keysBox'; b.setAttribute('role', 'dialog'); b.setAttribute('aria-label', T3('Atalhos do teclado', 'Keyboard shortcuts'));
    b.innerHTML = `<h2 class="sec">${T3('Atalhos do teclado', 'Keyboard shortcuts')}</h2><dl>${KEYS.map(k => `<dt>${esc(ST.lang === 'en' ? k[2] : k[0])}</dt><dd>${esc(ST.lang === 'en' ? k[3] : k[1])}</dd>`).join('')}</dl><p class="note">${T3('Os atalhos não funcionam enquanto você digita num campo.', 'Shortcuts do not work while you type in a field.')}</p><div class="row"><button id="keysX">${T3('Fechar', 'Close')}</button></div>`;
    document.body.appendChild(b); document.getElementById('keysX').onclick = closeKeys; document.getElementById('keysX').focus();
  }
  const closeKeys = () => { const b = document.getElementById('keysBox'); if (b) b.remove(); };
  /* tour guiado: um passo por vez, a peça destacada e uma frase */
  const STEPS = [
    ['#tabs [data-tab="gen"]', 'Comece por Gerar: preencha o briefing e clique em Gerar e abrir. O projeto sai pronto, sem IA.', 'Start with Generate: fill in the brief and click Generate and open. The project comes out ready, with no AI.'],
    ['#vp', 'Esta é a vista. Arraste para mover a camada selecionada; Shift escala; Alt gira. A tecla E abre a pilha de camadas em 3D.', 'This is the view. Drag to move the selected layer; Shift scales; Alt rotates. The E key opens the layer stack in 3D.'],
    ['#tabs [data-tab="lay"]', 'Camadas: ligue, desligue e reordene. Cada composição tem de 6 a 10, em camadas de fundo, herói, estrutura, instrumento, informação e acabamento.', 'Layers: toggle and reorder. Each composition has 6 to 10, as ground, hero, structure, instrument, information and finish.'],
    ['#tabs [data-tab="par"]', 'Parâmetros e modulação: digite números, ou ligue um parâmetro a kick, grave, onda do BPM ou LFO.', 'Parameters and modulation: type numbers, or tie a parameter to kick, bass, a BPM wave or an LFO.'],
    ['#tabs [data-tab="aud"]', 'Áudio: conecte um arquivo, o microfone ou a fonte de teste para ver a reação de verdade.', 'Audio: connect a file, the microphone or the test source to see the real reaction.'],
    ['#tabs [data-tab="sur"]', 'Superfície: escolha o preset do seu LED ou tela, corte nas dobras e gere as fatias para o Resolume.', 'Surface: pick the preset for your LED or screen, cut at the folds and generate the slices for Resolume.'],
    ['#tabs [data-tab="exp"]', 'Exportar: teste os flashes, escolha alpha ou RGB e baixe a sequência PNG com o manifesto.', 'Export: test flashes, choose alpha or RGB and download the PNG sequence with the manifest.'],
  ];
  let tour = null;
  function tourStep(i) {
    const [sel, pt, en] = STEPS[i], el = document.querySelector(sel); if (!el || el.offsetParent === null && sel.startsWith('#tabs')) { if (i < STEPS.length - 1) return tourStep(i + 1); return endTour(); }
    tour.i = i; const r = el.getBoundingClientRect(), hi = tour.hi, pad = 4;
    Object.assign(hi.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
    const box = tour.box; box.innerHTML = `<p><b>${i + 1} / ${STEPS.length}</b> · ${esc(T3(pt, en))}</p><div class="row"><button id="tourPrev" ${i ? '' : 'disabled'}>${T3('Voltar', 'Back')}</button><span><button id="tourEnd">${T3('Sair', 'Exit')}</button> <button id="tourNext" class="on">${i < STEPS.length - 1 ? T3('Próximo', 'Next') : T3('Concluir', 'Finish')}</button></span></div>`;
    const bw = Math.min(480, innerWidth * 0.92); box.style.maxWidth = bw + 'px';
    const below = r.bottom + 14 + 140 < innerHeight; box.style.top = (below ? r.bottom + 14 : Math.max(8, r.top - 150)) + 'px'; box.style.left = Math.max(8, Math.min(innerWidth - bw - 8, r.left)) + 'px';
    document.getElementById('tourPrev').onclick = () => tourStep(Math.max(0, i - 1)); document.getElementById('tourEnd').onclick = endTour; document.getElementById('tourNext').onclick = () => i < STEPS.length - 1 ? tourStep(i + 1) : endTour(true); document.getElementById('tourNext').focus();
  }
  function startTour() { endTour(); const hi = document.createElement('div'); hi.id = 'tourHi'; const box = document.createElement('div'); box.id = 'tourBox'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', T3('Tour guiado', 'Guided tour')); document.body.append(hi, box); tour = { hi, box, i: 0 }; tourStep(0); }
  function endTour(done) { if (!tour) return; tour.hi.remove(); tour.box.remove(); tour = null; if (done === true) { store.set('tourDone', true); toast(T3('Tour concluído. Ele está sempre na aba Guia.', 'Tour finished. It is always in the Guide tab.'), 2200); } }
  function guideExtras() {
    const g = document.querySelector('[data-pane="gui"]'); if (!g || g.querySelector('#uxGuide')) return;
    const d = document.createElement('div'); d.id = 'uxGuide'; d.innerHTML = `<h2 class="sec">${T3('Ajuda rápida', 'Quick help')}</h2><div class="row"><button id="uxTour">${T3('Fazer o tour guiado', 'Take the guided tour')}</button><button id="uxKeys">${T3('Ver os atalhos', 'See the shortcuts')}</button><button id="uxHelpOn">${T3('Mostrar a linha de ajuda', 'Show the help line')}</button></div>`;
    g.prepend(d); document.getElementById('uxTour').onclick = startTour; document.getElementById('uxKeys').onclick = showKeys; document.getElementById('uxHelpOn').onclick = () => { store.set('helpOff', false); renderHelp(); };
  }
  function init() {
    const top = document.getElementById('themeBtn'); if (top && !document.getElementById('lvlBtn')) { const b = document.createElement('button'); b.id = 'lvlBtn'; top.insertAdjacentElement('beforebegin', b); b.onclick = () => setLevel(level === 'creative' ? 'advanced' : 'creative'); }
    document.body.dataset.level = level; setLevel(level, true); renderHelp(); guideExtras();
    document.getElementById('tabs').addEventListener('click', () => setTimeout(() => { renderHelp(); guideExtras(); }, 0));
    addEventListener('keydown', e => { if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey && !(e.target.closest && e.target.closest('input,textarea,select,[contenteditable]'))) { e.preventDefault(); showKeys(); } if (e.key === 'Escape') { if (tour) endTour(); closeKeys(); } if (tour && (e.key === 'ArrowRight')) document.getElementById('tourNext').click(); if (tour && e.key === 'ArrowLeft') document.getElementById('tourPrev').click(); });
    addEventListener('resize', () => { if (tour) tourStep(tour.i); });
  }
  const refresh = () => { setLevel(level, true); renderHelp(); guideExtras(); };
  return { init, refresh, setLevel, get level() { return level; }, showKeys, closeKeys, startTour, endTour, renderHelp, KEYS, STEPS, HELP, ADV_TABS, get touring() { return !!tour; } };
})();
