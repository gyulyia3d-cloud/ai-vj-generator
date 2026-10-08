# Claude Code adapter: installs the main skill (skill/ai-vj-generator) and the commands /vj, /vj-reference,
# /vj-critique and /how-to-use (adapters/claude/skills) into ~/.claude/skills (or $env:CLAUDE_SKILLS_DIR).
# Only Claude Code needs this. Any other AI reads skill/ai-vj-generator/portable/PROMPT.md (see adapters/README.md).
# ASCII only: Windows PowerShell 5.1 reads .ps1 files without BOM as ANSI.
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = (Resolve-Path (Join-Path $here '..\..')).Path
$base = if ($env:CLAUDE_SKILLS_DIR) { $env:CLAUDE_SKILLS_DIR } else { Join-Path $HOME '.claude\skills' }

if (-not (Test-Path (Join-Path $root 'skill\ai-vj-generator\SKILL.md'))) {
  Write-Error "Could not find skill\ai-vj-generator at the repository root ($root)."
}
if (Get-Command node -ErrorAction SilentlyContinue) {
  node (Join-Path $root 'scripts\sync-skill.mjs') | Out-Null
}
New-Item -ItemType Directory -Force -Path $base | Out-Null
$dirs = @(Get-Item (Join-Path $root 'skill\ai-vj-generator')) + @(Get-ChildItem -Path (Join-Path $here 'skills') -Directory)
foreach ($d in $dirs) {
  $dest = Join-Path $base $d.Name
  if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
  New-Item -ItemType Directory -Force -Path $dest | Out-Null
  Copy-Item -Path (Join-Path $d.FullName '*') -Destination $dest -Recurse -Force
  Write-Output "  instalada: $($d.Name)"
}
Write-Output "Skills em $base"
Write-Output 'Reinicie o Claude Code e digite: /vj <seu briefing>'
Write-Output 'Analise de imagem e video (opcional): pip install pillow numpy  (video tambem precisa de ffmpeg)'
Write-Output "Sem IA: abra $(Join-Path $root 'app\index.html')"
