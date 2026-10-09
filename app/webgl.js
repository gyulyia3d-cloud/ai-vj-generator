/* WebGLRenderer (fase 2): contexto WebGL2, compilação e cache de programas, primitiva de tela cheia (VAO), texturas, framebuffers e estado.
   Só conhece GPU: nada de interface, projeto, Creative IR ou regra de negócio. O motor chama este módulo por glInit/glProg/glFrameUniforms (index.html).
   Autoria dos shaders: o corpo continua sendo GLSL no dialeto ES 1.00 (gl_FragColor, texture2D, varying), porque é esse o formato guardado nos projetos,
   nas receitas e na biblioteca ISF. O renderizador compila tudo como GLSL ES 3.00 (#version 300 es) com um cabeçalho de #define (a mesma técnica do three.js),
   sem reescrever o código do shader: mesmo comportamento, novo backend. Não há volta silenciosa ao WebGL1: sem WebGL2, glInit devolve null e GL.failure diz o motivo.
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html. */
const WEBGL = (() => {
  const VERT = '#version 300 es\nlayout(location = 0) in vec2 a;\nvoid main(){gl_Position=vec4(a,0.,1.);}';
  /* cabeçalho de compatibilidade: 8 linhas; o deslocamento entra no mapa de erros */
  const COMPAT = ['#version 300 es', '#define varying in', '#define attribute in', '#define texture2D texture', '#define gl_FragColor fragColor', 'precision highp float;', 'precision highp int;', 'out highp vec4 fragColor;'].join('\n') + '\n';
  const COMPAT_LINES = COMPAT.split('\n').length - 1;

  /* GLSL ES 3.00 proíbe redeclarar função embutida (o ES 1.00 permitia: vários shaders de terceiros definem o próprio sign ou round).
     Se o código define uma função com nome de função embutida, todas as ocorrências ganham o prefixo aivj_: o shader usa a versão dele, como antes. */
  const BUILTIN_FN = new Set(('radians degrees sin cos tan asin acos atan sinh cosh tanh asinh acosh atanh pow exp log exp2 log2 sqrt inversesqrt abs sign floor trunc round roundEven ceil fract mod modf min max clamp mix step smoothstep ' +
    'isnan isinf floatBitsToInt floatBitsToUint intBitsToFloat uintBitsToFloat length distance dot cross normalize faceforward reflect refract matrixCompMult outerProduct transpose determinant inverse ' +
    'lessThan lessThanEqual greaterThan greaterThanEqual equal notEqual any all not texture textureProj textureLod textureOffset texelFetch textureGrad textureSize dFdx dFdy fwidth').split(' '));
  function legalize(src) {
    const names = new Set(), re = /\b(?:void|bool|int|uint|float|[iub]?vec[234]|mat[234])\s+([A-Za-z_]\w*)\s*\(/g; let m;
    while ((m = re.exec(src))) if (BUILTIN_FN.has(m[1])) names.add(m[1]);
    for (const n of names) src = src.replace(new RegExp('\\b' + n + '\\b', 'g'), 'aivj_' + n);
    return src;
  }

  function support() {
    if (typeof WebGL2RenderingContext === 'undefined') return { ok: false, why: 'Este navegador não tem WebGL2 (WebGL2RenderingContext ausente). Use uma versão recente do Chrome, Edge, Firefox ou Safari.' };
    return { ok: true, why: '' };
  }

  function create(canvas, attrs) {
    const sup = support(); if (!sup.ok) return { error: sup.why };
    const gl = canvas.getContext('webgl2', Object.assign({ premultipliedAlpha: false, preserveDrawingBuffer: true, alpha: true, antialias: false }, attrs || {}));
    if (!gl) return { error: 'O navegador recusou criar um contexto WebGL2 (placa de vídeo, driver ou aceleração desativados). O motor não usa WebGL1.' };
    const r = {
      gl, canvas, version: 2, tick: 0,
      progs: new Map(), errors: new Map(), keyOf: new Map(),
      stats: { compiles: 0, programs: 0, draws: 0, shaderSwitches: 0, textureAllocs: 0, framebufferAllocs: 0 },
      state: { prog: null, vao: null, vw: 0, vh: 0, unit: -1, tex: new Map() },
      caps: {
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE), maxDrawBuffers: gl.getParameter(gl.MAX_DRAW_BUFFERS), maxColorAttachments: gl.getParameter(gl.MAX_COLOR_ATTACHMENTS),
        colorBufferFloat: !!gl.getExtension('EXT_color_buffer_float'), colorBufferHalfFloat: !!gl.getExtension('EXT_color_buffer_half_float'), floatLinear: !!gl.getExtension('OES_texture_float_linear'),
        instancing: true, transformFeedback: true, texture3D: true, multipleRenderTargets: true,   /* no núcleo do WebGL2: usados nas fases 3, 4 e 13 */
      },
    };
    /* primitiva de tela cheia: um triângulo, VAO fixo, nunca recriado por quadro */
    const vbo = gl.createBuffer(), vao = gl.createVertexArray();
    gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null);
    r.fullscreen = { vao, vbo };

    const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(s); gl.deleteShader(s); throw new Error(log); } return s; };
    const TYPES = {}; for (const k of ['FLOAT', 'FLOAT_VEC2', 'FLOAT_VEC3', 'FLOAT_VEC4', 'INT', 'BOOL', 'SAMPLER_2D', 'FLOAT_MAT2', 'FLOAT_MAT3', 'FLOAT_MAT4']) TYPES[gl[k]] = k;

    /* programa: key identifica o corpo (o chamador escolhe); source é o GLSL de autoria sem cabeçalho de versão; lineOffset diminui os números de linha das mensagens */
    r.program = (key, source, opts) => {
      let e = r.progs.get(key); if (e) { e.lastUsed = r.tick; return e; }
      const o = Object.assign({ defines: '', lineOffset: 0 }, opts || {});
      if (r.progs.size > 48) { const old = [...r.progs.entries()].sort((x, y) => x[1].lastUsed - y[1].lastUsed); for (const [k, v] of old) { if (v.prog) gl.deleteProgram(v.prog); r.progs.delete(k); if (r.progs.size < 24) break; } }
      e = { key, prog: null, uniforms: new Map(), schema: [], attributes: ['a'], defines: o.defines, status: 'error', lastUsed: r.tick, source: COMPAT + o.defines + source };
      try {
        const vs = compile(gl.VERTEX_SHADER, VERT);
        let fs;
        try { fs = compile(gl.FRAGMENT_SHADER, e.source); }
        catch (err) {   /* só se o ES 3.00 recusar a redeclaração de função embutida, tenta de novo com o nome do usuário trocado */
          if (!/cannot be redeclared/.test(String(err.message))) throw err;
          const alt = COMPAT + o.defines + legalize(source); if (alt === e.source) throw err;
          fs = compile(gl.FRAGMENT_SHADER, alt); e.source = alt;
        }
        const prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.bindAttribLocation(prog, 0, 'a'); gl.linkProgram(prog);
        gl.deleteShader(vs); gl.deleteShader(fs);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { const log = gl.getProgramInfoLog(prog); gl.deleteProgram(prog); throw new Error(log); }
        e.prog = prog; e.status = 'ok'; r.errors.delete(key); r.stats.compiles++;
        const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < n; i++) { const u = gl.getActiveUniform(prog, i); const name = u.name.replace(/\[0\]$/, ''); e.schema.push({ name, type: TYPES[u.type] || String(u.type), size: u.size }); e.uniforms.set(name, gl.getUniformLocation(prog, u.name)); }
      } catch (err) {
        const shift = COMPAT_LINES + (o.defines ? o.defines.split('\n').length - 1 : 0) + o.lineOffset;
        r.errors.set(key, String(err.message || err).replace(/ERROR: 0:(\d+)/g, (m, l) => 'LINHA ' + Math.max(1, l - shift)));
      }
      r.progs.set(key, e); r.stats.programs = r.progs.size; return e.status === 'ok' ? e : null;
    };
    r.use = e => { if (r.state.prog !== e) { gl.useProgram(e.prog); r.state.prog = e; r.stats.shaderSwitches++; } };
    r.loc = (e, name) => e.uniforms.has(name) ? e.uniforms.get(name) : null;   /* localização em cache; null se o shader não usa o uniform (o GL ignora null) */
    r.viewport = (w, h) => { if (r.state.vw !== w || r.state.vh !== h) { gl.viewport(0, 0, w, h); r.state.vw = w; r.state.vh = h; } };
    r.resize = (w, h) => { if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; r.state.vw = r.state.vh = 0; } };
    r.clear = () => { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); };
    r.drawFullscreen = () => { if (r.state.vao !== vao) { gl.bindVertexArray(vao); r.state.vao = vao; } gl.drawArrays(gl.TRIANGLES, 0, 3); r.stats.draws++; r.tick++; };

    /* texturas e framebuffers (interfaces para as fases 3 e 4; hoje a camada fx usa uploadCanvas) */
    r.texture = (w, h, o) => {
      const t = Object.assign({ format: 'rgba8', filter: 'linear', wrap: 'clamp' }, o || {}), tex = gl.createTexture();
      const fmt = { rgba8: [gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE], rgba16f: [gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT], rgba32f: [gl.RGBA32F, gl.RGBA, gl.FLOAT] }[t.format];
      if (!fmt) throw new Error('formato de textura desconhecido: ' + t.format);
      if (t.format !== 'rgba8' && !r.caps.colorBufferFloat) throw new Error('formato ' + t.format + ' indisponível neste dispositivo (EXT_color_buffer_float)');
      gl.bindTexture(gl.TEXTURE_2D, tex); gl.texStorage2D(gl.TEXTURE_2D, 1, fmt[0], w, h); r.sampler(tex, t); r.stats.textureAllocs++;
      return { tex, w, h, format: t.format };
    };
    r.sampler = (tex, t) => { const f = t.filter === 'nearest' ? gl.NEAREST : gl.LINEAR, w = t.wrap === 'repeat' ? gl.REPEAT : t.wrap === 'mirror' ? gl.MIRRORED_REPEAT : gl.CLAMP_TO_EDGE;
      gl.bindTexture(gl.TEXTURE_2D, tex.tex || tex); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, w); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, w); };
    /* sobe um canvas/imagem para uma textura (de cabeça para baixo, para bater com a origem do canvas 2D); realoca só quando o tamanho muda */
    r.uploadCanvas = (slot, src, unit) => {
      if (!slot.tex) { slot.tex = gl.createTexture(); r.stats.textureAllocs++; slot.w = slot.h = 0; }
      gl.activeTexture(gl.TEXTURE0 + (unit || 0)); gl.bindTexture(gl.TEXTURE_2D, slot.tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      r.sampler(slot, { filter: 'linear', wrap: 'clamp' }); slot.w = src.width; slot.h = src.height; return slot;
    };
    r.framebuffer = t => { const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.tex, 0);
      const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE; gl.bindFramebuffer(gl.FRAMEBUFFER, null); if (!ok) throw new Error('framebuffer incompleto'); r.stats.framebufferAllocs++; return fb; };
    return r;
  }
  return { create, support, legalize, COMPAT, COMPAT_LINES };
})();
