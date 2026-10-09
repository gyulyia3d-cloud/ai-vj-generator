/* RenderGraph (fase 4): a pipeline de um quadro como grafo explícito de nós. Cada nó declara de quem depende; o grafo valida, ordena (estável: na ordem em que os nós
   foram registrados, respeitando as dependências), executa e devolve cada recurso temporário ao pool quando o último consumidor termina.
   Tipos de nó: Source, Generator, Shader, Effect, Mask, Composite, History, Feedback, Output (Scene3D, ParticleSystem e Camera entram nas fases 12 e 13).
   O grafo não sabe de canvas, GPU nem projeto: o chamador dá funções run e um pool (acquire/release). Fonte de verdade: este arquivo;
   node scripts/embed-modules.mjs embute no index.html. */
const RG = (() => {
  const NODE_TYPES = {
    Source: 'produz a primeira imagem (fundo, cor de base)',
    Generator: 'desenha uma camada sem ler as outras (formas, texto, mídia)',
    Shader: 'camada de GPU sem entrada (shader, ISF, cadeia)',
    Effect: 'lê a imagem acumulada abaixo (fx, manchas)',
    Mask: 'recorta ou pondera outra imagem',
    Composite: 'soma uma camada ao acumulado (blend e opacidade); reaproveita o acumulado',
    History: 'lê quadros anteriores guardados (slit scan, deslocamento temporal)',
    Feedback: 'lê a própria saída do quadro anterior (trilha, feedback)',
    Output: 'o resultado do quadro; nunca é devolvido ao pool',
  };

  class Graph {
    constructor(name) { this.name = name || 'graph'; this.nodes = []; this.byId = new Map(); this.plan = null; this.lastRun = null; }
    /* run(inputs, ctx) devolve o recurso do nó. inplace: o nó devolve o primeiro dos inputs (ele fica com a posse). */
    add(n) {
      if (!n || !n.id || typeof n.run !== 'function') throw new Error('nó inválido: precisa de id e run');
      if (!NODE_TYPES[n.type]) throw new Error(`nó ${n.id}: tipo desconhecido "${n.type}" (use ${Object.keys(NODE_TYPES).join(', ')})`);
      if (this.byId.has(n.id)) throw new Error(`nó repetido: ${n.id}`);
      const node = { id: n.id, type: n.type, deps: n.deps || [], run: n.run, inplace: !!n.inplace, index: this.nodes.length };
      this.nodes.push(node); this.byId.set(node.id, node); this.plan = null; return node.id;
    }
    /* valida dependências, ordena (Kahn estável), conta consumidores de cada recurso */
    compile() {
      for (const n of this.nodes) for (const d of n.deps) if (!this.byId.has(d)) throw new Error(`nó ${n.id} depende de "${d}", que não existe`);
      const left = new Map(this.nodes.map(n => [n.id, n.deps.length])), users = new Map(this.nodes.map(n => [n.id, []]));
      for (const n of this.nodes) for (const d of n.deps) users.get(d).push(n.id);
      const order = [], ready = this.nodes.filter(n => !n.deps.length).map(n => n.id), seen = new Set();
      while (ready.length) {
        ready.sort((a, b) => this.byId.get(a).index - this.byId.get(b).index);
        const id = ready.shift(); if (seen.has(id)) continue; seen.add(id); order.push(id);
        for (const u of users.get(id)) { left.set(u, left.get(u) - 1); if (left.get(u) === 0) ready.push(u); }
      }
      if (order.length !== this.nodes.length) throw new Error('ciclo no grafo: ' + this.nodes.filter(n => !seen.has(n.id)).map(n => n.id).join(', '));
      const outputs = this.nodes.filter(n => n.type === 'Output');
      if (outputs.length !== 1) throw new Error(`o grafo precisa de exatamente um Output (tem ${outputs.length})`);
      this.plan = { order, consumers: new Map(this.nodes.map(n => [n.id, users.get(n.id).length])), output: outputs[0].id };
      return this.plan;
    }
    /* executa o plano. pool: { release(recurso) } opcional. Devolve { output, order, released } */
    execute(ctx, pool) {
      const plan = this.plan || this.compile(), res = new Map(), refs = new Map(), released = []; ctx = ctx || {};
      const drop = r => { if (r == null || !pool || !pool.release) return; pool.release(r); released.push(r); };
      for (const id of plan.order) {
        const n = this.byId.get(id), inputs = n.deps.map(d => res.get(d)), out = n.run(inputs, ctx, n);
        res.set(id, out);
        const consumers = plan.consumers.get(id);
        if (out != null) refs.set(out, (refs.get(out) || 0) + (n.type === 'Output' ? 1e9 : consumers));
        /* cada dependência perdeu um consumidor; se o nó devolveu o próprio input (inplace), a contagem já foi somada acima */
        for (const d of n.deps) { const r = res.get(d); if (r == null) continue; const c = (refs.get(r) || 0) - 1; refs.set(r, c); if (c <= 0) drop(r); }
        if (out != null && refs.get(out) <= 0) drop(out);   /* nó sem consumidores que não é o Output */
      }
      const output = res.get(plan.output); this.lastRun = { order: plan.order.slice(), released: released.length };
      return { output, order: plan.order, released: released.length };
    }
  }

  /* pool de canvas 2D por tamanho: o grafo da composição usa um canvas por camada em voo, não um por camada por quadro */
  class CanvasPool {
    constructor() { this.free = new Map(); this.stats = { allocs: 0, reuses: 0 }; }
    acquire(w, h) { const k = w + 'x' + h, l = this.free.get(k); let c = l && l.pop(); if (c) this.stats.reuses++; else { c = document.createElement('canvas'); c.width = w; c.height = h; this.stats.allocs++; } c.__k = k; return c; }
    release(c) { if (!c || !c.__k) return; if (!this.free.has(c.__k)) this.free.set(c.__k, []); this.free.get(c.__k).push(c); }
    trim() { const keep = new Set(); this.free.forEach((l, k) => { if (l.length > 6) l.length = 6; }); return keep; }
  }
  return { NODE_TYPES, Graph, CanvasPool, create: name => new Graph(name) };
})();
