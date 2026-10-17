/* Gerar briefing: auditoria, mídias e descrição visual num só assistente. Sempre gera pelas regras locais (GENAI, sem rede); se ENDPOINT apontar para o Worker
   (worker/README.md), uma IA gratuita preenche só o que a pessoa deixou em branco. Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html.
   Regras: nada de rede no boot (só ao clicar em Gerar, com o aceite marcado); o que a pessoa respondeu nunca é sobrescrito; texto e logos exatos só vêm da pessoa;
   o que a IA devolve passa por sanitizeSpec (listas fechadas) antes de virar brief. As partes puras (sem DOM) são testadas por briefgen_check.mjs. */
const BRIEFGEN = (() => {
  const LIMIT = 14;
  /* URL do Worker que fala com Groq e Gemini (worker/README.md). Vazio = este site gera só pelas regras locais e o assistente avisa. */
  const ENDPOINT = '';
  const MOODS = ['industrial', 'organic', 'cosmic', 'urban', 'ritual', 'glitch', 'minimal', 'liquid', 'crystalline', 'retro', 'aggressive', 'calm'];
  const MOOD_PT = { industrial: 'industrial', organic: 'orgânico', cosmic: 'cósmico', urban: 'urbano', ritual: 'ritual', glitch: 'glitch', minimal: 'minimalista', liquid: 'líquido', crystalline: 'cristalino', retro: 'retrô', aggressive: 'agressivo', calm: 'calmo' };
  const VERBS = ['grow', 'contract', 'accumulate', 'fracture', 'drift', 'orbit', 'breathe', 'pulse', 'erode', 'bloom', 'collapse', 'stretch', 'fold', 'scatter', 'converge', 'oscillate', 'morph', 'repel', 'attract', 'trace', 'flow', 'hesitate', 'freeze', 'release', 'compress', 'expand', 'fragment', 'assemble', 'dissolve', 'emerge', 'sink', 'rise'];
  const ARCHS = ['pulse', 'breathe', 'glide', 'surge', 'stutter', 'orbit', 'ripple', 'settle'];
  const DENS = ['sparse', 'balanced', 'dense'], SCHEMES = ['mono', 'analogous', 'complement', 'split', 'triad', 'tetrad'], STRATS = ['none', 'subtle', 'structural', 'rhythmic', 'full'];
  const TYPES = ['screen', 'led', 'projection', 'mapping', 'multi'], FPS = [24, 25, 30, 50, 60], BARS = [1, 2, 4, 8, 16, 32], OUTS = ['rgb', 'alpha', 'white-alpha'];
  const ENUMS = { mood: MOODS, verbs: VERBS, motionArchetype: ARCHS, density: DENS, scheme: SCHEMES, strategy: STRATS };

  /* ---- auditoria: o que muda o resultado (pesos e perguntas de scripts/brief_check.py); conta como respondido o que a pessoa tocou ---- */
  const FIELDS = [
    [14, 'surface.type', 'Qual é a superfície: parede de LED, projeção, objeto mapeado ou tela comum?', 'What is the surface: LED wall, projection, mapped object, or a plain screen?'],
    [14, 'surface.viewingDistanceM', 'De que distância mínima e máxima a tela é vista (em metros)?', 'From what nearest and farthest distance is it seen (in metres)?'],
    [12, 'mood', 'Escolha 1 a 3 climas.', 'Pick 1 to 3 moods.'],
    [10, 'focalEvent', 'Qual é a ÚNICA coisa em que o olho precisa pousar em cada peça?', 'What is the ONE thing the eye must land on in each piece?'],
    [10, 'audio.strategy', 'O quanto a música comanda a imagem?', 'How much does the music drive the picture?'],
    [8, 'palette', 'Já existe uma cor (marca, matiz) ou o conceito deve escolher?', 'Is there a colour already (a brand, a hue) or should the concept choose it?'],
    [8, 'banned', 'Cite 3 efeitos que NÃO podem aparecer.', 'Name 3 effects that must NOT appear.'],
    [6, 'energy', 'Energia de 0 (calma) a 1 (implacável)?', 'Energy from 0 (calm) to 1 (relentless)?'],
    [6, 'surface.fps', 'Taxa de quadros da saída?', 'Output frame rate?'],
    [6, 'output.mode', 'Entregar colorido, com alpha ou branco sobre alpha?', 'Deliver coloured, with alpha, or white-on-alpha?'],
    [4, 'text.words', 'Há palavras, nomes ou logos exatos na tela? (precisam ser fornecidos)', 'Any exact words, names or logos on screen? (they must be supplied)'],
    [2, 'density', 'Rarefeito, equilibrado ou denso?', 'Sparse, balanced or dense?'],
  ];
  function auditOf(touched, lang) {
    const total = FIELDS.reduce((a, f) => a + f[0], 0), got = FIELDS.filter(f => touched.has(f[1])).reduce((a, f) => a + f[0], 0);
    const ask = FIELDS.filter(f => !touched.has(f[1])).sort((a, b) => b[0] - a[0]).slice(0, 4).map(f => ({ key: f[1], q: lang === 'en' ? f[3] : f[2] }));
    return { score: Math.round(40 + 60 * got / total), ask };
  }

  /* ---- formulário -> brief (schema/brief.schema.json). Campo que a pessoa não tocou fica de fora: vale o padrão do gerador ---- */
  const num = x => (x === '' || x == null || !isFinite(+x)) ? null : +x;
  const list = s => String(s || '').split(/[,;|\n]+/).map(x => x.trim()).filter(Boolean);
  function briefFromForm(v) {
    const t = k => v.touched.has(k), concept = String(v.concept || '').trim();
    const name = String(v.name || '').trim() || concept.split(/\s+/).slice(0, 3).join(' ').toUpperCase().slice(0, 40) || 'PROJETO';
    const b = { name: name.length < 2 ? 'PROJETO' : name, lang: v.lang === 'en' ? 'en' : 'pt', concept, surface: { type: v.type, w: Math.round(+v.w), h: Math.round(+v.h), fps: +v.fps }, time: { bpm: +v.bpm, bars: +v.bars } };
    const d0 = num(v.dist0), d1 = num(v.dist1); if (t('surface.viewingDistanceM') && d0 != null && d1 != null) b.surface.viewingDistanceM = [Math.min(d0, d1), Math.max(d0, d1)];
    const pitch = num(v.pitch); if (pitch != null && pitch > 0) b.surface.pitchMm = pitch;
    const folds = list(v.folds).map(Number).filter(x => Number.isInteger(x) && x > 0); if (folds.length) b.surface.folds = folds;
    if (t('mood') && v.mood.length) b.mood = v.mood.slice(0, 3);
    if (t('energy')) b.energy = +v.energy;
    if (t('density')) b.density = v.density;
    if (t('palette')) {
      if (v.palMode === 'hue') { b.palette = { hue: Math.min(360, Math.max(0, +v.hue || 0)), scheme: v.scheme }; }
      else if (v.palMode === 'colors' && v.colors.length === 4 && v.colors.every(c => /^#[0-9A-Fa-f]{6}$/.test(c))) b.palette = { colors: v.colors.slice() };
    }
    if (t('audio.strategy')) { b.audio = { strategy: v.strategy }; if (v.strategy === 'none') b.audio.reason = String(v.audioWhy || '').trim() || (b.lang === 'pt' ? 'A peça é muda ou independe da música.' : 'The piece is silent or music-independent.'); }
    if (t('focalEvent') && String(v.focal || '').trim()) b.focalEvent = String(v.focal).trim();
    const banned = list(v.banned); if (t('banned') && banned.length) b.banned = banned.slice(0, 8);
    const words = list(v.words), title = String(v.title || '').trim();
    if (title || words.length) { b.text = {}; if (title) b.text.title = title; if (words.length) b.text.words = words.slice(0, 12); }
    if (t('output.mode')) b.output = { mode: v.out };
    if (t('compositions')) b.compositions = Math.min(6, Math.max(1, Math.round(+v.comps || 3)));
    if (v.verbs && v.verbs.length) b.verbs = v.verbs.filter(x => VERBS.includes(x)).slice(0, 6);
    return b;
  }

  /* ---- o que a IA devolve: só listas fechadas e números limitados; nome, conceito, superfície, tempo e texto nunca vêm dela ---- */
  const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
  const pickIn = (x, set) => (typeof x === 'string' && set.includes(x)) ? x : null;
  function sanitizeSpec(raw) {
    const o = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {}, out = {};
    if (Array.isArray(o.mood)) { const m = [...new Set(o.mood.map(x => pickIn(x, MOODS)).filter(Boolean))].slice(0, 3); if (m.length) out.mood = m; }
    if (Array.isArray(o.verbs)) { const v = [...new Set(o.verbs.map(x => pickIn(x, VERBS)).filter(Boolean))].slice(0, 6); if (v.length) out.verbs = v; }
    if (typeof o.energy === 'number' && isFinite(o.energy)) out.energy = Math.round(Math.min(1, Math.max(0, o.energy)) * 100) / 100;
    const d = pickIn(o.density, DENS); if (d) out.density = d;
    const a = pickIn(o.motionArchetype, ARCHS); if (a) out.motionArchetype = a;
    if (o.palette && typeof o.palette === 'object') { const sc = pickIn(o.palette.scheme, SCHEMES); if (typeof o.palette.hue === 'number' && isFinite(o.palette.hue) && sc) out.palette = { hue: Math.round(Math.min(360, Math.max(0, o.palette.hue))), scheme: sc }; }
    const st = pickIn(o.audioStrategy, STRATS); if (st) out.audioStrategy = st;
    const f = clean(o.focalEvent, 200); if (f.length >= 3) out.focalEvent = f;
    if (Array.isArray(o.banned)) { const b = o.banned.map(x => clean(x, 40)).filter(x => x.length >= 2).slice(0, 6); if (b.length) out.banned = b; }
    const n = clean(o.notes, 600); if (n) out.notes = n;
    return out;
  }
  /* a pessoa manda: a IA só preenche o que ela deixou sem tocar */
  function mergeSpec(brief, touched, spec) {
    const b = JSON.parse(JSON.stringify(brief)), filled = [], free = k => !touched.has(k);
    if (spec.mood && free('mood')) { b.mood = spec.mood; filled.push('mood'); }
    if (spec.verbs) { b.verbs = [...new Set([...(b.verbs || []), ...spec.verbs])].slice(0, 6); filled.push('verbs'); }
    if (spec.energy != null && free('energy')) { b.energy = spec.energy; filled.push('energy'); }
    if (spec.density && free('density')) { b.density = spec.density; filled.push('density'); }
    if (spec.motionArchetype) { b.motionArchetype = spec.motionArchetype; filled.push('motionArchetype'); }
    if (spec.palette && free('palette')) { b.palette = spec.palette; filled.push('palette'); }
    if (spec.audioStrategy && free('audio.strategy')) { b.audio = { strategy: spec.audioStrategy }; if (spec.audioStrategy === 'none') b.audio.reason = b.lang === 'pt' ? 'A peça independe da música (sugestão da IA).' : 'The piece is music-independent (AI suggestion).'; filled.push('audio.strategy'); }
    if (spec.focalEvent && free('focalEvent')) { b.focalEvent = spec.focalEvent; filled.push('focalEvent'); }
    if (spec.banned && free('banned')) { b.banned = spec.banned; filled.push('banned'); }
    return { brief: b, filled };
  }

  /* ---- prompt para colar em qualquer IA de chat (Carregar briefing); as listas vêm das mesmas constantes do formulário ---- */
  function promptText(lang) {
    const en = lang === 'en', L = a => a.join(', ');
    const head = en
      ? `You are an art director of generative visuals for LED walls, projection and video. I will describe a set and may attach references.\n\n1) Ask questions in rounds of at most 4, only what changes the result: surface (type, real pixel size, fps, viewing distances), concept (what the audience should feel), 1-3 moods, energy (0-1), how much the music drives the picture, the one focal event, 3 banned effects, exact words (only if I supply them), delivery (rgb, alpha, white-alpha).\n2) Never invent text, logos or fonts. References become principles, never copies.\n3) When you have enough, reply with ONLY one JSON code block like this (optional fields may be left out):`
      : `Você é diretor de arte de visuais generativos para telas de LED, projeção e vídeo. Vou descrever um set e posso anexar referências.\n\n1) Pergunte em rodadas de no máximo 4, só o que muda o resultado: superfície (tipo, tamanho real em pixels, fps, distâncias de visão), conceito (o que o público deve sentir), 1 a 3 climas, energia (0 a 1), quanto a música comanda a imagem, o evento focal, 3 efeitos proibidos, palavras exatas (só se eu fornecer), entrega (rgb, alpha, white-alpha).\n2) Nunca invente texto, logos nem fontes. Referências viram princípios, nunca cópias.\n3) Quando tiver o suficiente, responda SÓ com um bloco de código JSON assim (campos opcionais podem faltar):`;
    const shape = '{\n  "name": "NAME",\n  "lang": "' + (en ? 'en' : 'pt') + '",\n  "concept": "' + (en ? 'one or two sentences: what it is about and what the audience feels' : 'uma ou duas frases: sobre o que é e o que o público sente') + '",\n  "mood": ["industrial"],\n  "energy": 0.6,\n  "density": "balanced",\n  "surface": { "type": "led", "w": 1920, "h": 1080, "fps": 30 },\n  "time": { "bpm": 120, "bars": 4 },\n  "audio": { "strategy": "rhythmic" },\n  "palette": { "hue": 250, "scheme": "analogous" },\n  "focalEvent": "...",\n  "banned": ["..."],\n  "verbs": ["compress", "release"],\n  "compositions": 3\n}';
    const vals = (en ? 'Allowed values' : 'Valores permitidos') + `:\n- mood (1-3): ${L(MOODS)}\n- verbs (0-6): ${L(VERBS)}\n- density: ${L(DENS)}; palette.scheme: ${L(SCHEMES)}\n- audio.strategy: ${L(STRATS)}\n- surface.type: ${L(TYPES)}; fps: ${L(FPS)}; time.bars: ${L(BARS)}; bpm 40-240; energy 0-1; compositions 1-6\n- output.mode (optional): ${L(OUTS)}`;
    return head + '\n' + shape + '\n\n' + vals;
  }

  /* ---- como fazer, por assistente de IA. Os apps mudam: os passos são genéricos de propósito e dizem o que confirmar ---- */
  const AIS = [
    { id: 'gemini', name: 'Gemini', url: 'gemini.google.com', pt: 'Abra o Gemini (gemini.google.com ou o app), cole o prompt e use o botão de anexar para enviar as imagens de referência. O Google AI Studio (aistudio.google.com) também serve.', en: 'Open Gemini (gemini.google.com or the app), paste the prompt and use the attach button to send the reference images. Google AI Studio (aistudio.google.com) also works.' },
    { id: 'gpt', name: 'GPT', url: 'chatgpt.com', pt: 'Abra o ChatGPT (chatgpt.com), cole o prompt e anexe as imagens pelo botão de anexar (clipe ou +). O plano gratuito costuma limitar anexos por dia: confira no app.', en: 'Open ChatGPT (chatgpt.com), paste the prompt and attach the images with the attach button (clip or +). The free plan usually limits attachments per day: check in the app.' },
    { id: 'claude', name: 'Claude', url: 'claude.ai', pt: 'Abra o Claude (claude.ai), cole o prompt e anexe as imagens pelo clipe. Quem usa o Claude Code pode instalar a skill e digitar /vj para o fluxo completo (adapters/claude/INSTALL.md).', en: 'Open Claude (claude.ai), paste the prompt and attach the images with the clip. Claude Code users can install the skill and type /vj for the full flow (adapters/claude/INSTALL.md).' },
    { id: 'grok', name: 'Grok', url: 'grok.com', pt: 'Abra o Grok (grok.com ou o Grok dentro do X), cole o prompt e anexe as imagens pelo clipe. O plano gratuito limita análises de imagem por dia (o limite muda): confira no app.', en: 'Open Grok (grok.com or Grok inside X), paste the prompt and attach the images with the clip. The free plan limits image analyses per day (the limit changes): check in the app.' },
    { id: 'deepseek', name: 'DeepSeek', url: 'chat.deepseek.com', pt: 'Abra o DeepSeek (chat.deepseek.com) e cole o prompt. Atenção: relatos de usuários indicam que o chat pode ler só o TEXTO das imagens (OCR), sem entender a cena; não confirmei isso com a DeepSeek. Se for o seu caso, descreva as referências em palavras.', en: 'Open DeepSeek (chat.deepseek.com) and paste the prompt. Note: user reports say the chat may read only the TEXT in images (OCR), not the scene; I did not confirm this with DeepSeek. If so, describe the references in words.' },
  ];
  const COMMON = [
    ['Copie o prompt abaixo e cole como primeira mensagem de um chat novo.', 'Copy the prompt below and paste it as the first message of a new chat.'],
    ['Anexe as imagens de referência (opcional) e descreva o set: o que é, onde será exibido, tamanho real em pixels e a sensação.', 'Attach the reference images (optional) and describe the set: what it is, where it will be shown, real pixel size and the feeling.'],
    ['Responda às perguntas (no máximo 4 por rodada). No fim, a IA entrega um bloco de código JSON.', 'Answer the questions (at most 4 per round). At the end the AI delivers a JSON code block.'],
    ['Copie o bloco, cole no campo abaixo e clique em Importar JSON. O motor monta o projeto no seu computador, sem enviar nada a ninguém.', 'Copy the block, paste it in the field below and click Import JSON. The engine builds the project on your computer, sending nothing to anyone.'],
    ['Mídias: o JSON não carrega imagens. Depois de importar, arraste imagens, vídeos e fontes para a vista (ou use a aba Mídia). Mapa de pixels (CSV ou PNG) entra na aba Superfície.', 'Media: the JSON does not carry images. After importing, drag images, videos and fonts onto the view (or use the Media tab). A pixel map (CSV or PNG) goes in the Surface tab.'],
  ];

  /* ---------- só daqui para baixo precisa de DOM ---------- */
  const SURFACES = [['', 'Personalizada', 'Custom', null], ['hd', 'Tela Full HD · 1920×1080', 'Full HD screen · 1920×1080', ['screen', 1920, 1080, 30]], ['uhd', 'Tela 4K · 3840×2160', '4K screen · 3840×2160', ['screen', 3840, 2160, 30]],
    ['vert', 'Vertical · 1080×1920', 'Vertical · 1080×1920', ['screen', 1080, 1920, 30]], ['led', 'LED em L · 4500×800', 'L-shaped LED · 4500×800', ['led', 4500, 800, 30]], ['ultra', 'Ultrawide · 5120×500', 'Ultrawide · 5120×500', ['led', 5120, 500, 30]]];
  const S = { files: [], map: null, touched: new Set(), busy: false, v: null };
  let opener = null, endpoint = ENDPOINT; /* gancho de teste: setEndpoint (briefgen_check.mjs troca o fetch da página); quem já executa script na página não ganha nada com ele */
  const q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)];
  const how = (pt, en) => `<details class="bgHow"><summary>${T3('Como fazer', 'How to')}</summary><p>${T3(pt, en)}</p></details>`;

  function css() {
    if (document.getElementById('bgCss')) return;
    const s = document.createElement('style'); s.id = 'bgCss';
    s.textContent = `#genBr{position:fixed;inset:0;background:rgba(0,0,0,.86);z-index:21;display:grid;place-items:center;padding:16px}#genBr[hidden]{display:none}
#genBr .box{background:var(--bg);border:1px solid var(--fg);width:min(820px,100%);max-height:calc(100% - 32px);overflow-y:auto;padding:22px}
#genBr h2{font:700 30px/1 var(--display);margin:0 0 6px;text-transform:uppercase;letter-spacing:-.01em}#genBr h3{font-family:var(--font-title);font-size:var(--fs-s);letter-spacing:.12em;text-transform:uppercase;margin:20px 0 6px;padding-top:12px;border-top:1px solid var(--rule)}
#genBr .step{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 16px;margin-top:8px}#genBr .f{display:flex;flex-direction:column;gap:5px;min-width:0}#genBr .f.full{grid-column:1/-1}
#genBr .f input:not([type=checkbox]):not([type=range]):not([type=color]),#genBr .f select,#genBr .f textarea{width:100%}#genBr .acts{display:flex;gap:6px;justify-content:space-between;margin-top:16px;flex-wrap:wrap}
.bgHow{margin:4px 0 6px;font-size:var(--fs-s);color:var(--dim)}.bgHow summary{cursor:pointer;display:inline-block;letter-spacing:.08em;text-transform:uppercase;font-size:var(--fs-xs)}.bgHow summary::before{content:'+ '}.bgHow[open] summary::before{content:'\u2212 '}.bgHow p{margin:6px 0 0;line-height:1.6;max-width:70ch}
.bgChips{display:flex;flex-wrap:wrap;gap:4px}.bgChip{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--rule);padding:3px 8px;font-size:var(--fs-xs);letter-spacing:.06em;text-transform:uppercase;cursor:pointer}.bgChip:has(input:checked){background:var(--fg);color:var(--bg)}.bgChip input{position:absolute;opacity:0;pointer-events:none}.bgChip:has(input:focus-visible){outline:2px solid var(--fg);outline-offset:2px}
#bgAudit{border:1px solid var(--rule);padding:8px 10px;font-size:var(--fs-s);line-height:1.6}#bgAudit ol{margin:4px 0 0;padding-left:18px}#bgStatus{min-height:1.4em;font-size:var(--fs-s);line-height:1.5}#bgStatus.err{color:var(--fg);border-left:3px solid var(--fg);padding-left:8px}
.bgSmall{font-size:var(--fs-xs);color:var(--dim);line-height:1.5}.bgFiles{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}.bgFiles span{border:1px solid var(--rule);padding:2px 6px;font-size:var(--fs-xs)}
#wizAi{margin:10px 0 14px;border:1px solid var(--rule);padding:8px 12px}#wizAi>summary{cursor:pointer;font-family:var(--font-title);font-size:var(--fs-s);letter-spacing:.1em;text-transform:uppercase}#wizAi ol{padding-left:20px;line-height:1.7;font-size:var(--fs-s)}#wizAi textarea{width:100%;font-size:var(--fs-xs)}
#wizAi .bgTabs{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0}#wizAi .bgTabs button[aria-selected=true]{background:var(--fg);color:var(--bg)}#wizAi .bgPanel{font-size:var(--fs-s);line-height:1.6;margin:4px 0 8px}
@media (max-width:640px){#genBr .step{grid-template-columns:1fr}#genBr .box{padding:16px}}
/* faixa estreita (701 a 920 px): a zona direita do topo já ocupa o espaço e cobriria o botão Briefing; o caminho é Carregar briefing > Gerar briefing aqui. Abaixo de 700 px o topo rola na horizontal e o botão fica */
@media (min-width:701px) and (max-width:920px){#top .grp:has(>#genBtn){display:none}}`;
    document.head.appendChild(s);
  }

  const opt = (arr, cur, lab) => arr.map(x => `<option value="${esc(x)}" ${String(x) === String(cur) ? 'selected' : ''}>${esc(lab ? lab(x) : x)}</option>`).join('');
  const chips = (name, arr, lab) => `<div class="bgChips" role="group" aria-label="${esc(name)}">${arr.map(x => `<label class="bgChip"><input type="checkbox" data-grp="${name}" value="${esc(x)}">${esc(lab(x))}</label>`).join('')}</div>`;
  const TYPE_LAB = { screen: ['Tela', 'Screen'], led: ['Parede de LED', 'LED wall'], projection: ['Projeção', 'Projection'], mapping: ['Objeto mapeado', 'Mapped object'], multi: ['Várias telas', 'Multi-screen'] };
  const STRAT_LAB = { none: ['nenhuma', 'none'], subtle: ['sutil', 'subtle'], structural: ['estrutural', 'structural'], rhythmic: ['rítmica', 'rhythmic'], full: ['total', 'full'] };
  const DENS_LAB = { sparse: ['rarefeita', 'sparse'], balanced: ['equilibrada', 'balanced'], dense: ['densa', 'dense'] };

  function formHtml() {
    return `<p class="lbl">AI VJ Generator</p><h2 id="bgT">${T3('Gerar briefing', 'Generate briefing')}</h2>
<p class="note">${T3('Responda a auditoria, junte as mídias e descreva o projeto. O motor monta as composições com a biblioteca do projeto, no seu computador.', 'Answer the audit, add your media and describe the project. The engine builds the compositions from the project library, on your computer.')}</p>
<h3>${T3('1. Auditoria', '1. Audit')}</h3>
${how('Responda o que souber; o que ficar em branco vira um padrão assumido e aparece na lista de pendências. Quanto mais respondido, melhor o resultado. Só o que você tocar é considerado respondido.', 'Answer what you know; what stays blank becomes an assumed default and shows in the pending list. The more you answer, the better the result. Only what you touch counts as answered.')}
<div class="step">
  <div class="f"><label class="lbl" for="bgPre">${T3('Modelo de superfície', 'Surface model')}</label><select id="bgPre">${SURFACES.map(s => `<option value="${s[0]}">${esc(T3(s[1], s[2]))}</option>`).join('')}</select></div>
  <div class="f"><label class="lbl" for="bgType">${T3('Tipo de superfície', 'Surface type')}</label><select id="bgType" data-q="surface.type">${opt(TYPES, 'screen', x => T3(...TYPE_LAB[x]))}</select></div>
  <div class="f"><label class="lbl" for="bgW">${T3('Largura real (px)', 'Real width (px)')}</label><input type="number" id="bgW" min="16" max="16384" value="1920" inputmode="numeric"></div>
  <div class="f"><label class="lbl" for="bgH">${T3('Altura real (px)', 'Real height (px)')}</label><input type="number" id="bgH" min="16" max="16384" value="1080" inputmode="numeric"></div>
  <div class="f"><label class="lbl" for="bgFps">FPS</label><select id="bgFps" data-q="surface.fps">${opt(FPS, 30)}</select></div>
  <div class="f"><label class="lbl" for="bgBpm">BPM</label><input type="number" id="bgBpm" min="40" max="240" step="0.1" value="120"></div>
  <div class="f"><label class="lbl" for="bgBars">${T3('Compassos do loop', 'Loop bars')}</label><select id="bgBars">${opt(BARS, 4)}</select></div>
  <div class="f"><label class="lbl" for="bgComps">${T3('Composições', 'Compositions')}</label><select id="bgComps" data-q="compositions">${opt([1, 2, 3, 4, 5, 6], 3)}</select></div>
  <div class="f"><label class="lbl" for="bgD0">${T3('Distância de visão mínima (m)', 'Nearest viewing distance (m)')}</label><input type="number" id="bgD0" min="0.3" step="0.1" data-q="surface.viewingDistanceM"></div>
  <div class="f"><label class="lbl" for="bgD1">${T3('Distância de visão máxima (m)', 'Farthest viewing distance (m)')}</label><input type="number" id="bgD1" min="0.3" step="0.1" data-q="surface.viewingDistanceM"></div>
  <div class="f"><label class="lbl" for="bgPitch">${T3('Passo do LED (mm), se houver', 'LED pitch (mm), if any')}</label><input type="number" id="bgPitch" min="0.5" max="60" step="0.1"></div>
  <div class="f"><label class="lbl" for="bgFolds">${T3('Dobras (x em px, separadas por vírgula)', 'Folds (x in px, comma separated)')}</label><input type="text" id="bgFolds" placeholder="2250"></div>
  <div class="f full"><span class="lbl">${T3('Clima (1 a 3)', 'Mood (1 to 3)')}</span>${chips('mood', MOODS, x => T3(MOOD_PT[x], x))}</div>
  <div class="f"><label class="lbl" for="bgEn">${T3('Energia', 'Energy')}: <b id="bgEnV">0.5</b></label><input type="range" id="bgEn" min="0" max="1" step="0.05" value="0.5" data-q="energy"></div>
  <div class="f"><label class="lbl" for="bgDens">${T3('Densidade', 'Density')}</label><select id="bgDens" data-q="density">${opt(DENS, 'balanced', x => T3(...DENS_LAB[x]))}</select></div>
  <div class="f"><label class="lbl" for="bgAud">${T3('Quanto a música comanda a imagem', 'How much the music drives the picture')}</label><select id="bgAud" data-q="audio.strategy">${opt(STRATS, 'rhythmic', x => T3(...STRAT_LAB[x]))}</select></div>
  <div class="f"><label class="lbl" for="bgOut">${T3('Entrega', 'Delivery')}</label><select id="bgOut" data-q="output.mode">${opt(OUTS, 'rgb', x => ({ rgb: T3('colorido (rgb)', 'coloured (rgb)'), alpha: T3('com alpha', 'with alpha'), 'white-alpha': T3('branco sobre alpha', 'white on alpha') }[x]))}</select></div>
  <div class="f"><label class="lbl" for="bgPal">${T3('Paleta', 'Palette')}</label><select id="bgPal" data-q="palette"><option value="concept">${T3('O conceito escolhe', 'The concept chooses')}</option><option value="hue">${T3('Um matiz (0 a 360)', 'One hue (0 to 360)')}</option><option value="colors">${T3('4 cores exatas', '4 exact colours')}</option></select></div>
  <div class="f" id="bgPalHue" hidden><label class="lbl" for="bgHue">${T3('Matiz e esquema', 'Hue and scheme')}</label><span class="row"><input type="number" id="bgHue" min="0" max="360" value="250"><select id="bgSch" aria-label="${T3('Esquema', 'Scheme')}">${opt(SCHEMES, 'analogous')}</select></span></div>
  <div class="f" id="bgPalCols" hidden><span class="lbl">${T3('Fundo, primária, secundária, acento', 'Background, primary, secondary, accent')}</span><span class="row">${['#000000', '#FFFFFF', '#888888', '#FF8800'].map((c, i) => `<input type="color" id="bgC${i}" value="${c}" aria-label="${T3('Cor', 'Colour')} ${i + 1}">`).join('')}</span></div>
  <div class="f full"><label class="lbl" for="bgFocal">${T3('O evento focal: a ÚNICA coisa em que o olho deve pousar', 'The focal event: the ONE thing the eye must land on')}</label><input type="text" id="bgFocal" data-q="focalEvent" maxlength="200"></div>
  <div class="f full"><label class="lbl" for="bgBan">${T3('3 efeitos proibidos (separe por vírgula)', '3 banned effects (comma separated)')}</label><input type="text" id="bgBan" data-q="banned" placeholder="${T3('explosões de partículas, brilho em tudo', 'particle bursts, glow everywhere')}"></div>
  <div class="f"><label class="lbl" for="bgTitle">${T3('Título exato na tela (opcional)', 'Exact title on screen (optional)')}</label><input type="text" id="bgTitle" data-q="text.words" maxlength="80"></div>
  <div class="f"><label class="lbl" for="bgWords">${T3('Palavras exatas (separe por vírgula)', 'Exact words (comma separated)')}</label><input type="text" id="bgWords" data-q="text.words"></div>
</div>
<div id="bgAudit" role="status" aria-live="polite"></div>
<h3>${T3('2. Mídias', '2. Media')}</h3>
${how('Imagens de referência (até 3) ajudam a IA a entender o clima e o layout; elas são analisadas e viram princípios, nunca cópias. O mapa de pixels (CSV nome,x,y,w,h ou PNG em que o que não é preto está ativo) vira as regiões da superfície, medidas aqui mesmo, sem IA. Marque a opção abaixo só se quiser as imagens também como camadas do projeto.', 'Reference images (up to 3) help the AI understand mood and layout; they are analysed and become principles, never copies. The pixel map (CSV name,x,y,w,h or a PNG where anything not black is active) becomes the surface regions, measured right here, without AI. Tick the option below only if you also want the images as project layers.')}
<div class="step">
  <div class="f"><span class="lbl">${T3('Imagens de referência', 'Reference images')}</span><label class="filebtn">${T3('Adicionar imagens', 'Add images')}<input type="file" id="bgImgs" accept="image/*" multiple></label><div class="bgFiles" id="bgImgList"></div></div>
  <div class="f"><span class="lbl">${T3('Mapa de pixels (CSV ou PNG)', 'Pixel map (CSV or PNG)')}</span><label class="filebtn">${T3('Adicionar mapa', 'Add map')}<input type="file" id="bgMap" accept=".csv,.txt,image/png,.png"></label><div class="bgFiles" id="bgMapList"></div></div>
  <div class="f full"><label class="bgChip" style="align-self:flex-start"><input type="checkbox" id="bgUseImgs">${T3('Também adicionar as imagens ao projeto (aba Mídia)', 'Also add the images to the project (Media tab)')}</label></div>
</div>
<h3>${T3('3. Descrição visual', '3. Visual description')}</h3>
${how('Descreva a peça como contaria a um diretor de arte: sobre o que é, o que o público deve sentir, o que se move e como. Pelo menos duas frases. Verbos visuais (opcional) dizem COMO a imagem se comporta e pesam mais que o clima.', 'Describe the piece as you would to an art director: what it is about, what the audience should feel, what moves and how. At least two sentences. Visual verbs (optional) say HOW the image behaves and weigh more than the mood.')}
<div class="step">
  <div class="f full"><label class="lbl" for="bgName">${T3('Nome do projeto', 'Project name')}</label><input type="text" id="bgName" maxlength="40" placeholder="${T3('opcional: sai do começo da descrição', 'optional: taken from the start of the description')}"></div>
  <div class="f full"><label class="lbl" for="bgConcept">${T3('Descreva o projeto', 'Describe the project')}</label><textarea id="bgConcept" rows="5" maxlength="1200" placeholder="${T3('Ex.: a pressão de uma cidade que não dorme; blocos de luz que se comprimem até quebrar e soltam, num ritmo seco, sem curvas.', 'E.g. the pressure of a city that never sleeps; light blocks compress until they break and release, dry rhythm, no curves.')}"></textarea></div>
  <div class="f full"><span class="lbl">${T3('Verbos visuais (opcional, até 6)', 'Visual verbs (optional, up to 6)')}</span>${chips('verbs', VERBS, x => x)}</div>
</div>
<h3>${T3('4. Gerar', '4. Generate')}</h3>
${how('Gerar monta o projeto pelas regras locais e o abre no modo Briefing. Com a IA marcada, ela só completa o que você deixou em branco e nunca muda o que você respondeu. Depois ajuste nas abas e use Salvar JSON (aba Projeto) para guardar.', 'Generate builds the project with the local rules and opens it in Briefing mode. With the AI ticked, it only completes what you left blank and never changes what you answered. Then adjust in the tabs and use Save JSON (Project tab) to keep it.')}
<label class="bgChip" style="align-self:flex-start"><input type="checkbox" id="bgAi">${T3('Usar IA gratuita (envia a descrição e as imagens a serviços externos)', 'Use the free AI (sends the description and images to external services)')}</label>
<p class="bgSmall" id="bgAiNote"></p>
<div id="bgStatus" role="status" aria-live="polite"></div>
<p class="bgSmall" id="bgLimit"></p>
<div class="acts"><span class="row"><button id="bgClose" title="Esc">${T3('Fechar', 'Close')}</button></span><span class="row"><button id="bgGo" class="on">${T3('GERAR BRIEFING', 'GENERATE BRIEFING')}</button></span></div>`;
  }

  /* ---- ler e escrever o formulário (para trocar de idioma sem perder o que foi digitado) ---- */
  const val = id => { const e = document.getElementById(id); return e ? e.value : ''; };
  function readForm() {
    return { lang: ST.lang === 'en' ? 'en' : 'pt', touched: S.touched, name: val('bgName'), concept: val('bgConcept'), type: val('bgType'), w: val('bgW'), h: val('bgH'), fps: val('bgFps'), bpm: val('bgBpm'), bars: val('bgBars'), comps: val('bgComps'),
      dist0: val('bgD0'), dist1: val('bgD1'), pitch: val('bgPitch'), folds: val('bgFolds'), mood: qa('#genBr [data-grp=mood]:checked').map(e => e.value), verbs: qa('#genBr [data-grp=verbs]:checked').map(e => e.value),
      energy: val('bgEn'), density: val('bgDens'), strategy: val('bgAud'), audioWhy: '', out: val('bgOut'), palMode: val('bgPal'), hue: val('bgHue'), scheme: val('bgSch'), colors: [0, 1, 2, 3].map(i => val('bgC' + i)),
      focal: val('bgFocal'), banned: val('bgBan'), title: val('bgTitle'), words: val('bgWords') };
  }
  function writeForm(v) {
    const set = (id, x) => { const e = document.getElementById(id); if (e && x != null) e.value = x; };
    set('bgName', v.name); set('bgConcept', v.concept); set('bgType', v.type); set('bgW', v.w); set('bgH', v.h); set('bgFps', v.fps); set('bgBpm', v.bpm); set('bgBars', v.bars); set('bgComps', v.comps); set('bgD0', v.dist0); set('bgD1', v.dist1); set('bgPitch', v.pitch); set('bgFolds', v.folds);
    set('bgEn', v.energy); set('bgDens', v.density); set('bgAud', v.strategy); set('bgOut', v.out); set('bgPal', v.palMode); set('bgHue', v.hue); set('bgSch', v.scheme); (v.colors || []).forEach((c, i) => set('bgC' + i, c)); set('bgFocal', v.focal); set('bgBan', v.banned); set('bgTitle', v.title); set('bgWords', v.words);
    qa('#genBr [data-grp=mood]').forEach(e => { e.checked = v.mood.includes(e.value); }); qa('#genBr [data-grp=verbs]').forEach(e => { e.checked = v.verbs.includes(e.value); });
  }
  function note() {
    const a = auditOf(S.touched, ST.lang), el = q('#bgAudit');
    el.innerHTML = `<b>${T3('Auditoria', 'Audit')}: ${a.score}/100</b>${a.ask.length ? `<br>${T3('Pendente (vale o padrão assumido):', 'Pending (the assumed default applies):')}<ol>${a.ask.map(x => `<li>${esc(x.q)}</li>`).join('')}</ol>` : `<br>${T3('Nada importante falta.', 'Nothing important is missing.')}`}`;
    q('#bgEnV').textContent = (+val('bgEn')).toFixed(2).replace(/0$/, '');
    q('#bgPalHue').hidden = val('bgPal') !== 'hue'; q('#bgPalCols').hidden = val('bgPal') !== 'colors';
    const live = !!endpoint, ai = q('#bgAi'); ai.disabled = !live; if (!live) ai.checked = false;
    q('#bgAiNote').textContent = live ? T3('IA: conectada. A descrição e as imagens marcadas vão a serviços de IA gratuitos (Groq e Google), que têm termos próprios.', 'AI: connected. The description and the selected images go to free AI services (Groq and Google), which have their own terms.')
      : T3('IA: ainda não conectada neste site. O briefing é gerado pelas regras locais, sem enviar nada.', 'AI: not connected on this site yet. The briefing is built by the local rules, sending nothing.');
    q('#bgLimit').textContent = T3(`Limite: ${LIMIT} gerações por dia, compartilhadas por todos (cota gratuita, zera às 00:00 UTC). Esgotado, o gerador por regras continua funcionando.`, `Limit: ${LIMIT} generations per day, shared by everyone (free quota, resets at 00:00 UTC). When used up, the rule-based generator keeps working.`);
  }
  function lists() {
    q('#bgImgList').innerHTML = S.files.map((f, i) => `<span>${esc(f.name)} <button data-rm="img${i}" aria-label="${T3('Remover', 'Remove')} ${esc(f.name)}">×</button></span>`).join('');
    q('#bgMapList').innerHTML = S.map ? `<span>${esc(S.map.name)} <button data-rm="map" aria-label="${T3('Remover', 'Remove')} ${esc(S.map.name)}">×</button></span>` : '';
  }
  function status(msg, err) { const e = q('#bgStatus'); e.textContent = msg || ''; e.classList.toggle('err', !!err); }

  function build(keep) {
    const box = q('#genBr .box'), v = keep ? readForm() : null;
    box.innerHTML = formHtml(); if (v) writeForm(v); lists(); note();
  }

  /* ---- geração ---- */
  const dataUrl = f => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(''); r.readAsDataURL(f); });
  async function shrink(f, max = 768) {
    const url = await dataUrl(f), img = new Image(); img.src = url; await img.decode();
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.72);
  }
  async function readMap(brief) {
    const f = S.map; if (!f) return null;
    if (/\.png$/i.test(f.name) || f.type === 'image/png') {
      const url = await dataUrl(f), img = new Image(); img.src = url; await img.decode();
      const k = Math.min(1, 1024 / img.naturalWidth), w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k)), c = document.createElement('canvas'); c.width = w; c.height = h;
      const cx = c.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0, w, h);
      const r = SURFX.maskToRects(cx.getImageData(0, 0, w, h).data, w, h, brief.surface.w, brief.surface.h); r.source = 'mask'; return r;
    }
    const r = SURFX.parseCsv(await f.text(), brief.surface.w, brief.surface.h); r.source = 'list'; return r;
  }
  async function callAI(payload) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 60000);
    try { const r = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), signal: ctl.signal }); const j = await r.json().catch(() => ({})); return { status: r.status, j }; }
    finally { clearTimeout(t); }
  }
  const MSG = { budget: ['A cota gratuita de hoje acabou. Gerei pelas regras locais.', 'Today\'s free quota is used up. I built it with the local rules.'], busy: ['A IA está ocupada. Gerei pelas regras locais.', 'The AI is busy. I built it with the local rules.'], upstream: ['A IA não respondeu. Gerei pelas regras locais.', 'The AI did not answer. I built it with the local rules.'] };

  async function generate() {
    if (S.busy) return; S.busy = true; const go = q('#bgGo'); go.disabled = true;
    try {
      const v = readForm(), brief = briefFromForm(v); let errs = GENAI.checkBrief(brief);
      if (errs.length) { status(errs.join(' · '), true); return; }
      let filled = [], aiNote = '', aiMsg = '';
      if (q('#bgAi').checked && endpoint) {
        status(T3('Consultando a IA…', 'Asking the AI…'));
        try {
          const images = []; for (const f of S.files.slice(0, 3)) { try { images.push(await shrink(f)); } catch (e) { /* imagem ilegível: segue sem ela */ } }
          const r = await callAI({ v: 1, lang: brief.lang, brief, images });
          if (r.status === 200 && r.j && r.j.ok) { const spec = sanitizeSpec(r.j.spec), m = mergeSpec(brief, S.touched, spec); Object.assign(brief, m.brief); filled = m.filled; aiNote = spec.notes || ''; }
          else { const k = (r.j && r.j.error) || 'upstream'; aiMsg = T3(...(MSG[k] || MSG.upstream)); }
        } catch (e) { aiMsg = T3(...MSG.upstream); }
      }
      errs = GENAI.checkBrief(brief); if (errs.length) { status(errs.join(' · '), true); return; }
      status(T3('Montando as composições…', 'Building the compositions…'));
      let regions = null;
      try { regions = await readMap(brief); } catch (e) { status(T3('Não consegui ler o mapa de pixels: ', 'Could not read the pixel map: ') + e.message, true); return; }
      if (regions && regions.errs && regions.errs.length) { status(regions.errs.join(' · '), true); return; }
      if (regions && regions.rects && regions.rects.length) brief.surface.regions = regions.rects.map(r => Object.assign({ x: r.x, y: r.y, w: r.w, h: r.h, name: r.name }, regions.source === 'mask' ? { source: 'mask' } : {}));
      const project = GENAI.build(brief);
      /* o que foi assumido fica registrado, como o /vj faz: quem abrir o projeto vê o que não foi respondido */
      const assumed = auditOf(S.touched, ST.lang).ask.map(x => ({ field: x.key, why: 'not answered in the audit; the generator default was used', risk: 'confirm with the client before delivery' }));
      if (project.meta.spec) project.meta.spec.assumed = (project.meta.spec.assumed || []).concat(assumed);
      project.meta.generator = { tool: 'briefgen', ai: filled.length > 0, aiFilled: filled };
      if (!importJson(project)) { status(T3('Não consegui abrir o projeto gerado.', 'Could not open the generated project.'), true); return; }
      if (q('#bgUseImgs').checked) for (const f of S.files) await importFile(f);
      close(true);
      toast((filled.length ? T3('IA preencheu: ', 'AI filled: ') + filled.join(', ') + '. ' : '') + (aiMsg ? aiMsg + ' ' : '') + (aiNote ? aiNote : ''), 6000);
    } catch (e) { status(T3('Algo deu errado: ', 'Something went wrong: ') + (e && e.message || e), true); }
    finally { S.busy = false; const g = q('#bgGo'); if (g) g.disabled = false; }
  }

  function open() {
    opener = document.activeElement; const w = q('#wiz'); if (w) w.hidden = true;
    q('#genBr').hidden = false; setTimeout(() => { const b = q('#genBr .box'), c = q('#bgPre'); if (b) b.scrollTop = 0; if (c) c.focus({ preventScroll: true }); }, 30);
  }
  function close(done) { q('#genBr').hidden = true; if (!done && opener && opener.focus) opener.focus(); }
  function bind() {
    const root = q('#genBr');
    root.addEventListener('input', e => {
      const t = e.target, k = t.dataset && t.dataset.q; if (k) S.touched.add(k);
      if (t.dataset && t.dataset.grp === 'mood') { const on = qa('#genBr [data-grp=mood]:checked'); if (on.length > 3) t.checked = false; if (qa('#genBr [data-grp=mood]:checked').length) S.touched.add('mood'); else S.touched.delete('mood'); }
      if (t.dataset && t.dataset.grp === 'verbs' && qa('#genBr [data-grp=verbs]:checked').length > 6) t.checked = false;
      if (t.id === 'bgPre') { const p = SURFACES.find(s => s[0] === t.value); if (p && p[3]) { [['bgType', p[3][0]], ['bgW', p[3][1]], ['bgH', p[3][2]], ['bgFps', p[3][3]]].forEach(([i, x]) => { q('#' + i).value = x; }); S.touched.add('surface.type'); S.touched.add('surface.fps'); } }
      if (t.id === 'bgPal' && t.value === 'concept') S.touched.delete('palette');
      if (t.id === 'bgD0' || t.id === 'bgD1') { if (val('bgD0') !== '' && val('bgD1') !== '') S.touched.add('surface.viewingDistanceM'); else S.touched.delete('surface.viewingDistanceM'); }
      if (t.id === 'bgFocal' && !t.value.trim()) S.touched.delete('focalEvent'); if (t.id === 'bgBan' && !t.value.trim()) S.touched.delete('banned');
      if ((t.id === 'bgTitle' || t.id === 'bgWords') && !val('bgTitle').trim() && !val('bgWords').trim()) S.touched.delete('text.words');
      note();
    });
    root.addEventListener('change', e => {
      const t = e.target;
      if (t.id === 'bgImgs') { S.files = S.files.concat([...t.files]).filter(f => /^image\//.test(f.type)).slice(0, 3); t.value = ''; lists(); }
      if (t.id === 'bgMap') { S.map = t.files[0] || null; t.value = ''; lists(); }
    });
    root.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.id === 'bgClose') close(); else if (b.id === 'bgGo') generate();
      else if (b.dataset.rm) { if (b.dataset.rm === 'map') S.map = null; else S.files.splice(+b.dataset.rm.slice(3), 1); lists(); }
    });
    addEventListener('keydown', e => { if (e.key === 'Escape' && !root.hidden) close(); });
    root.addEventListener('pointerdown', e => { if (e.target === root) close(); });
  }

  /* ---- Carregar briefing: como gerar o JSON em cada IA ---- */
  function wizHtml() {
    const en = ST.lang === 'en';
    return `<summary>${T3('Como gerar o JSON com a sua IA (Gemini, GPT, Claude, Grok, DeepSeek)', 'How to generate the JSON with your AI (Gemini, GPT, Claude, Grok, DeepSeek)')}</summary>
<p class="note">${T3('Qualquer IA de chat serve, de graça. Ela entrevista você e entrega um briefing em JSON; o motor monta as composições aqui, pelas regras do projeto.', 'Any chat AI works, for free. It interviews you and delivers a JSON briefing; the engine builds the compositions here, with the project rules.')}</p>
<ol>${COMMON.map(c => `<li>${esc(en ? c[1] : c[0])}</li>`).join('')}</ol>
<div class="row"><button id="wzCopy" class="on">${T3('Copiar prompt', 'Copy prompt')}</button></div>
<textarea id="wzPrompt" rows="6" readonly aria-label="${T3('Prompt para colar na IA', 'Prompt to paste into the AI')}">${esc(promptText(ST.lang))}</textarea>
<div class="bgTabs" role="tablist" aria-label="${T3('Escolha a IA', 'Choose the AI')}">${AIS.map((a, i) => `<button role="tab" id="wzT_${a.id}" aria-selected="${i === 0}" aria-controls="wzP_${a.id}" data-ai="${a.id}">${a.name}</button>`).join('')}</div>
${AIS.map((a, i) => `<div class="bgPanel" role="tabpanel" id="wzP_${a.id}" aria-labelledby="wzT_${a.id}" ${i ? 'hidden' : ''}>${esc(en ? a.en : a.pt)}</div>`).join('')}
<p class="bgSmall">${T3('Os apps mudam com frequência: se não achar o botão de anexar, descreva as imagens em palavras. Planos gratuitos têm limites diários próprios.', 'Apps change often: if you cannot find the attach button, describe the images in words. Free plans have their own daily limits.')}</p>`;
  }
  function mountWiz() {
    const box = q('#wiz .box'); if (!box) return;
    let d = q('#wizAi'); if (!d) { d = document.createElement('details'); d.id = 'wizAi'; const anchor = q('#wiz .f.full'); box.insertBefore(d, anchor); const acts = q('#wiz .acts .row'); if (acts) { const g = document.createElement('button'); g.id = 'wGen'; g.textContent = T3('Gerar briefing aqui', 'Generate briefing here'); g.onclick = open; acts.appendChild(g); } }
    const was = d.open; d.innerHTML = wizHtml(); d.open = was; const g = q('#wGen'); if (g) g.textContent = T3('Gerar briefing aqui', 'Generate briefing here');
    d.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.id === 'wzCopy') copyText(q('#wzPrompt').value, T3('Prompt copiado', 'Prompt copied'));
      else if (b.dataset.ai) { qa('#wizAi [role=tab]').forEach(t => t.setAttribute('aria-selected', String(t === b))); qa('#wizAi [role=tabpanel]').forEach(p => { p.hidden = p.id !== 'wzP_' + b.dataset.ai; }); }
    };
  }

  function refresh() { if (typeof document === 'undefined' || !q('#genBr')) return; build(true); mountWiz(); const b = q('#genBtn'); if (b) b.textContent = T3('Gerar briefing', 'Generate briefing'); }
  function init() {
    css();
    const host = q('#wizBtn'); if (!host || q('#genBtn')) return;
    const btn = document.createElement('button'); btn.id = 'genBtn'; btn.textContent = T3('Gerar briefing', 'Generate briefing'); btn.title = T3('Responder a auditoria, juntar mídias e descrever o projeto: o motor monta as composições', 'Answer the audit, add media and describe the project: the engine builds the compositions');
    /* grupo próprio com .keep: em telas de até 520 px o grupo do Carregar briefing some por desenho; este fica */
    const grp = document.createElement('div'); grp.className = 'grp keep'; grp.appendChild(btn); host.parentNode.parentNode.insertBefore(grp, host.parentNode); btn.onclick = open;
    const dlg = document.createElement('div'); dlg.id = 'genBr'; dlg.hidden = true; dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true'); dlg.setAttribute('aria-labelledby', 'bgT'); dlg.innerHTML = '<div class="box"></div>';
    document.body.appendChild(dlg); build(false); bind(); mountWiz();
  }
  if (typeof document !== 'undefined' && typeof $ === 'function') init();
  return { LIMIT, ENDPOINT, setEndpoint: u => { endpoint = String(u || ''); if (typeof document !== 'undefined' && q('#genBr')) note(); }, ENUMS, FIELDS, AIS, COMMON, auditOf, briefFromForm, sanitizeSpec, mergeSpec, promptText, open, close, refresh, generate };
})();
