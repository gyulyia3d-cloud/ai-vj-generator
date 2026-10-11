/* Depth IR (fase 11, 2.5D): porta de skill/ai-vj-generator/scripts/depth_ir.py. As camadas geradas ficam em planos de profundidade (layer.z, -1 longe a +1 perto) e uma câmera por composição
   (composition.camera) move os planos: paralaxe (planos próximos deslizam contra os distantes), perspectiva (empurra e recua), névoa (o que está longe escurece e perde cor) e foco
   (o que está fora do plano de foco desfoca). Texto, medidores, o fundo e o acabamento ficam no plano da tela. A câmera roda em ciclos inteiros do loop (o loop fecha) e nunca ouve o áudio.
   O arquétipo do Animation IR escolhe a câmera; uma restrição dura de dobra ou de área ativa (Surface IR) deixa só o puxar de foco: nada desliza nem cresce por cima de uma costura.
   Os dados vêm de registry/depth.json, copiados para app/depth-data.js por node scripts/registry.mjs --write. Python e navegador dão o mesmo IR e as mesmas transformações (scripts/depth_check.mjs).
   Isto não é 3D (sem malha, sem câmera numa cena): é planos. A camada `parallax` (foto com mapa de profundidade) e `splat` continuam como estão.
   Depende de GENAI (pyRound), AUDIOSEM (tierOf) e SURFACEIR (hard) só em tempo de execução: embutido depois deles.
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html. */
const DEPTH = (() => {
  const D = DEPTH_DATA, CAMERAS = D.cameras, Z = D.zRange;
  const R = (x, nd) => GENAI.pyRound(x, nd), r2 = x => R(x, 2), r3 = x => R(x, 3), r4 = x => R(x, 4);
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  const tierOf = L => AUDIOSEM.tierOf(L);
  const surfaceUnit = (W, H) => Math.min(H, W * 0.5625);
  const isNum = v => typeof v === 'number' && Number.isFinite(v);
  const isInt = v => typeof v === 'number' && Number.isInteger(v);

  function assignPlanes(layers) {
    const by = {}, out = new Map();
    layers.forEach((L, i) => { if (L.on === false) return; const t = tierOf(L); if (t && D.planes[t]) (by[t] = by[t] || []).push(i); });
    for (const t of Object.keys(by)) {
      const [lo, hi] = D.planes[t].range, idx = by[t];
      idx.forEach((i, j) => out.set(i, [t, r2(idx.length === 1 ? (lo + hi) / 2 : lo + (hi - lo) * j / (idx.length - 1))]));
    }
    return out;
  }
  function planeEffect(cam, z, S, focus) {
    const f = focus === undefined ? cam.focus : focus;
    return { fog: r3(cam.fog * clamp((f - z) / D.fogSpan, 0, 1)), blurPx: r2(cam.dof * S * Math.max(0, Math.abs(z - f) - D.deadzone)) };
  }

  function compile(layers, an, cmp, sx, W, H) {
    const arch = an ? an.archetype : undefined;
    let camId = D.archetypeCamera[arch] || 'sway';
    const axis = cmp ? cmp.movementAxis : undefined;
    camId = (D.axisSwap[axis] || {})[camId] || camId;
    let seam = null;
    if (sx && (SURFACEIR.hard(sx, 'foldBands') || SURFACEIR.hard(sx, 'activeArea'))) {
      if (CAMERAS[camId].moves) { seam = { hard: true, rule: D.seamReason, from: camId }; camId = D.seamSafe; } else seam = { hard: true, rule: null, from: camId };
    }
    const c = CAMERAS[camId], planes = assignPlanes(layers), hz = [];
    planes.forEach(([t, z]) => { if (t === 'hero') hz.push(z); });
    const focus = hz.length ? r2(hz.reduce((a, b) => a + b, 0) / hz.length) : D.focusDefault;
    const bars = an && an.timing && an.timing.bars !== undefined ? an.timing.bars : 4, rule = D.cycles[camId];
    const cycles = rule === 'none' ? 0 : rule === 'half' ? Math.max(1, Math.trunc(bars) >> 1) : 1;
    const energy = an && an.axes && an.axes.energy !== undefined ? an.axes.energy : 0.5;
    let amp = camId !== 'still' ? r4(c.amp * (D.energy.lo + D.energy.span * energy)) : 0;
    if (camId === 'rack') amp = Math.min(1.0, amp);
    const cam = { move: camId, amp, cycles, phase: 0, focus, fog: D.fog[camId] !== undefined ? D.fog[camId] : D.fog.default, dof: D.dof[camId] !== undefined ? D.dof[camId] : D.dof.default };
    const steps = camId === 'sway' ? D.archetypeSteps[arch] : undefined; if (steps) cam.steps = steps;
    const S = surfaceUnit(W, H), rows = []; let far = 0;
    [...planes.keys()].sort((a, b) => a - b).forEach(i => {
      const [t, z] = planes.get(i), e = planeEffect(cam, z, S);
      rows.push({ name: layers[i].name === undefined ? null : layers[i].name, tier: t, z, fog: e.fog, blurPx: e.blurPx }); far = Math.max(far, Math.abs(z - focus));
    });
    const ax = c.axes, zs = [...planes.values()].map(v => v[1]);
    const shiftX = ax.includes('x') ? r2(amp * S * far) : 0, shiftY = ax.includes('y') ? r2(amp * S * far * (ax.includes('x') ? 0.5 : 1)) : 0;
    const scale = ax.includes('scale') ? r2(amp * 100 * Math.max(0, ...zs.map(z => (z + 1) / 2))) : 0;
    const screen = layers.filter((L, i) => L.on !== false && !planes.has(i)).map(L => L.name === undefined ? null : L.name);
    return {
      version: 1, archetype: arch === undefined ? null : arch, camera: cam, description: seam && seam.rule ? seam.rule : (D.reasons[arch] || c.description),
      focus: { z: focus, tier: hz.length ? D.focusTier : 'default' },
      planes: rows, screen,
      parallax: { shiftXPx: shiftX, shiftYPx: shiftY, scalePct: scale, unitPx: r2(S), blurMaxPx: Math.max(0, ...rows.map(r => r.blurPx)), fogMax: Math.max(0, ...rows.map(r => r.fog)) },
      seam: seam || { hard: false, rule: null, from: camId },
      loop: { closes: true, wholeCycles: true, audio: false },
    };
  }
  function apply(comp, layers, ir) {
    const planes = assignPlanes(layers);
    layers.forEach((L, i) => { if (planes.has(i)) L.z = planes.get(i)[1]; else delete L.z; });
    comp.camera = JSON.parse(JSON.stringify(ir.camera));
    return comp;
  }

  /* a câmera num quadro: offsets (fração da unidade), dolly (fração de escala) e plano de foco; fase ph em [0, 1) */
  function state(cam, ph) {
    const still = { cx: 0, cy: 0, dz: 0, focus: cam.focus };
    if (cam.move === 'still' || !cam.cycles) return still;
    let s = cam.cycles * ph + (cam.phase || 0);
    if (cam.steps) s = Math.floor(s * cam.steps) / cam.steps;
    const phi = 2 * Math.PI * s, a = cam.amp;
    switch (cam.move) {
      case 'sway': return Object.assign(still, { cx: a * Math.sin(phi) });
      case 'crane': return Object.assign(still, { cy: a * Math.sin(phi) });
      case 'orbit': return Object.assign(still, { cx: a * Math.sin(phi), cy: 0.5 * a * Math.cos(phi) });
      case 'dolly': return Object.assign(still, { dz: a * Math.sin(phi) });
      case 'rack': return Object.assign(still, { focus: clamp(cam.focus + a * Math.sin(phi), Z[0], Z[1]) });
    }
    return still;
  }
  /* o que a câmera faz a uma camada no plano z: deslocamentos em pixels, escala, raio de desfoque, opacidade e saturação */
  function transform(cam, st, z, S) {
    const f0 = cam.focus, f = st.focus, fog = cam.fog * clamp((f - z) / D.fogSpan, 0, 1);
    return { dx: -st.cx * S * (z - f0), dy: -st.cy * S * (z - f0), scale: 1 + st.dz * (z + 1) / 2, blur: cam.dof * S * Math.max(0, Math.abs(z - f) - D.deadzone), alpha: 1 - fog, sat: 1 - D.fogSat * fog };
  }
  /* aplica a câmera aos parâmetros de uma camada num quadro (o motor chama isto em paintLayer); sem câmera ou sem z devolve p intacto: projeto antigo abre como sempre */
  function adjust(p, L, comp, F, W, H) {
    const cam = comp && comp.camera;
    if (!cam || !CAMERAS[cam.move] || typeof L.z !== 'number') return p;
    const t = transform(cam, state(cam, F.ph), L.z, surfaceUnit(W, H)), q = Object.assign({}, p);
    q.x = p.x + t.dx; q.y = p.y + t.dy; q.sx = p.sx * t.scale; q.sy = p.sy * t.scale; q.blur = (p.blur || 0) + t.blur; q.sat = p.sat * t.sat; q._alpha = t.alpha;
    return q;
  }

  function audit(comp, canvas) {
    const e = [], w = [], cam = comp.camera, layers = comp.layers || [], zs = layers.filter(L => 'z' in L).map(L => [L, L.z]);
    for (const [L, z] of zs) {
      const nm = L.name || L.type;
      if (!isNum(z) || z < Z[0] || z > Z[1]) { e.push(`${nm}.z: um número de ${Z[0]} (longe) a ${Z[1]} (perto)`); continue; }
      const t = tierOf(L); if (D.screenSpace.includes(t)) w.push(`${nm}: camada ${t} deve ficar no plano da tela (sem z): ${D.screenWhy}`);
    }
    if (cam === undefined || cam === null) { if (zs.length) w.push('camadas têm `z` mas a composição não tem `camera`: os planos não fazem nada até a câmera existir (depth_ir.py ou plan_ir.py --apply)'); return { errors: e, warnings: w }; }
    if (typeof cam !== 'object' || !CAMERAS[cam.move]) { e.push(`camera.move: um de ${Object.keys(CAMERAS).join(', ')}`); return { errors: e, warnings: w }; }
    const c = CAMERAS[cam.move], num = (k, lo, hi) => isNum(cam[k]) && cam[k] >= lo && cam[k] <= hi, ampMax = cam.move === 'rack' ? 1.0 : 0.25;
    if (!num('amp', 0, ampMax)) e.push(`camera.amp: um número de 0 a ${ampMax}`);
    if (!num('focus', Z[0], Z[1])) e.push('camera.focus: um plano de -1 a 1');
    if (!num('fog', 0, 1)) e.push('camera.fog: de 0 a 1');
    if (!num('dof', 0, 0.1)) e.push('camera.dof: de 0 a 0.1');
    if ('phase' in cam && !num('phase', 0, 1)) e.push('camera.phase: de 0 a 1');
    if ('steps' in cam && !(isInt(cam.steps) && cam.steps >= 2 && cam.steps <= 32)) e.push('camera.steps: um inteiro de 2 a 32');
    if (cam.move !== 'still' && !(isInt(cam.cycles) && cam.cycles >= 1)) e.push('camera.cycles: um número inteiro de ciclos por loop (no mínimo 1), senão o loop não fecha');
    if (c.moves && canvas && canvas.folds && canvas.folds.length) e.push(`camera.move ${cam.move} move camadas por cima das dobras declaradas: use rack ou still numa superfície dobrada`);
    if (!zs.length) w.push('a composição tem câmera mas nenhuma camada tem `z`: nada está num plano');
    else if (isNum(cam.amp) && c.moves && cam.move !== 'dolly') {
      const far = Math.max(0, ...zs.filter(([, z]) => isNum(z)).map(([, z]) => Math.abs(z - (cam.focus || 0))));
      if (cam.amp * far > D.maxShift) w.push(`camera: o plano mais distante desloca ${(cam.amp * far).toFixed(3)} da unidade (acima de ${D.maxShift}): a paralaxe pode mostrar bordas esticadas`);
    }
    return { errors: e, warnings: w };
  }
  return { compile, apply, state, transform, adjust, audit, assignPlanes, surfaceUnit, DATA: D };
})();
