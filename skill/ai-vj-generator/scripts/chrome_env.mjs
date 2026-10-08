// Ajustes comuns para abrir o Chrome/Edge headless (usado por cdp.mjs, contact_sheet.mjs e loop_check.mjs).
//  - extraCandidates: Chromium instalado pelo Playwright (PLAYWRIGHT_BROWSERS_PATH ou ~/.cache/ms-playwright)
//  - chromeFlags: --no-sandbox como root (contêineres, CI; AIVJ_NO_SANDBOX=1 força) e WebGL por software (SwiftShader),
//    para que máquinas sem GPU renderizem igual em vez de deixar o WebGL nulo
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const root = process.getuid?.() === 0;
// SwiftShader só em contêiner/CI (root) ou com AIVJ_SOFTWARE_GL=1: forçá-lo em máquina com GPU muda os pixels e as notas do avaliador.
export const chromeFlags = [...((root || process.env.AIVJ_NO_SANDBOX === '1') ? ['--no-sandbox'] : []),
  ...((root || process.env.AIVJ_SOFTWARE_GL === '1') ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [])];

export function extraCandidates() {
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, join(homedir(), '.cache', 'ms-playwright')].filter(r => r && existsSync(r));
  const out = [];
  for (const r of roots) {
    for (const d of readdirSync(r).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
      for (const sub of ['chrome-linux/chrome', 'chrome-linux64/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome-win/chrome.exe']) out.push(join(r, d, sub));
    }
  }
  return out;
}
