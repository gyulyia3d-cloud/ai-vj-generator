#!/usr/bin/env node
// Copia o motor para dentro da skill, que precisa ser autocontida quando instalada
// em ~/.claude/skills/ai-vj-generator. Rode depois de editar app/index.html.
import { copyFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ASSETS = join(ROOT, 'skill', 'ai-vj-generator', 'assets');
await mkdir(ASSETS, { recursive: true });
await copyFile(join(ROOT, 'app', 'index.html'), join(ASSETS, 'engine.html'));
// exemplos ficam só no repositório (formato de arquivo); a skill não os carrega para que cada briefing comece do zero
console.log('skill sincronizada: assets/engine.html');
