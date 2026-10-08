#!/usr/bin/env sh
# Adaptador do Claude Code: instala a skill principal (skill/ai-vj-generator) e os comandos /vj, /vj-reference,
# /vj-critique e /how-to-use (adapters/claude/skills) em ~/.claude/skills (ou em $CLAUDE_SKILLS_DIR).
# Só o Claude Code precisa disto. Qualquer outra IA lê skill/ai-vj-generator/portable/PROMPT.md (veja adapters/README.md).
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
BASE="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"

if [ ! -f "$ROOT/skill/ai-vj-generator/SKILL.md" ]; then
  echo "Erro: nao achei skill/ai-vj-generator na raiz do repositorio ($ROOT)." >&2
  exit 1
fi
if command -v node >/dev/null 2>&1; then
  node "$ROOT/scripts/sync-skill.mjs" >/dev/null
fi
mkdir -p "$BASE"
for d in "$ROOT/skill/ai-vj-generator" "$HERE"/skills/*; do
  name="$(basename "$d")"
  rm -rf "$BASE/$name"
  mkdir -p "$BASE/$name"
  cp -R "$d/." "$BASE/$name/"
  echo "  instalada: $name"
done
echo "Skills em $BASE"
echo "Reinicie o Claude Code e digite: /vj <seu briefing>"
echo "Analise de imagem e video (opcional): pip install pillow numpy  (video tambem precisa de ffmpeg)"
echo "Sem IA: abra $ROOT/app/index.html"
