#!/usr/bin/env node
// Copia o motor e os exemplos para dentro da skill, que precisa ser autocontida
// quando instalada em ~/.claude/skills/ai-vj-generator. Rode depois de editar app/index.html.
import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ASSETS = join(ROOT, 'skill', 'ai-vj-generator', 'assets');
await mkdir(join(ASSETS, 'examples'), { recursive: true });
await copyFile(join(ROOT, 'app', 'index.html'), join(ASSETS, 'engine.html'));
for (const f of (await readdir(join(ROOT, 'examples'))).filter(f => f.endsWith('.json'))) await copyFile(join(ROOT, 'examples', f), join(ASSETS, 'examples', f));
console.log('skill sincronizada: assets/engine.html + assets/examples/');
