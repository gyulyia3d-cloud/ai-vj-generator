#!/usr/bin/env node
// Embute os módulos JS de app/ (genai.js, evaluate.js) em app/index.html entre os marcadores /*__NOME_START__*/ ... /*__NOME_END__*/.
// A fonte de verdade é o arquivo em app/; o trecho dentro do index.html é gerado. Uso: node scripts/embed-modules.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = path.join(root, 'app', 'index.html');
const MODULES = [['CREATIVEDATA', 'creative-data.js'], ['CREATIVE', 'creative.js'], ['COMPOSITIONDATA', 'composition-data.js'], ['COMPOSITION', 'composition.js'], ['GENAI', 'genai.js'], ['EVAL', 'evaluate.js'], ['UICORE', 'ui-core.js'], ['WEBGL', 'webgl.js'], ['SURFX', 'surface.js'], ['SURFUI', 'surface-ui.js'], ['FLASH', 'flash.js'], ['ONSET', 'onset.js'], ['MODUI', 'mod-ui.js'], ['ISF', 'isf.js'], ['MP4', 'mp4.js'], ['FX', 'fx.js'], ['SYNTH', 'synth.js'], ['BLOBS', 'blobs.js'], ['RENDERGRAPH', 'rendergraph.js'], ['TEMPORAL', 'temporal.js'], ['UX', 'ux.js']];
let t = fs.readFileSync(html, 'utf8');
const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
let next = t;
for (const [name, file] of MODULES) {
  const js = fs.readFileSync(path.join(root, 'app', file), 'utf8').replace(/\r\n/g, '\n').trimEnd();
  if (js.includes('</script')) { console.error(file + ' contém "</script": escape antes de embutir'); process.exit(2); }
  const re = new RegExp(String.raw`/\*__${name}_START__\*/[\s\S]*?/\*__${name}_END__\*/`);
  if (!re.test(next)) { console.error(`marcadores ${name} ausentes em app/index.html`); process.exit(2); }
  next = next.replace(re, () => `/*__${name}_START__*/\n${js}\n/*__${name}_END__*/`);
}
if (process.argv.includes('--check')) { if (next !== t) { console.error('módulos embutidos estão velhos: rode node scripts/embed-modules.mjs'); process.exit(1); } console.log('módulos embutidos em dia (' + MODULES.map(m => m[0]).join(', ') + ')'); process.exit(0); }
fs.writeFileSync(html, crlf ? next.replace(/\n/g, '\r\n') : next, 'utf8');
console.log('embutidos: ' + MODULES.map(m => m[0]).join(', '));
