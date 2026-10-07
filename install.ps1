# AI VJ Generator - installs the skills (ai-vj-generator, vj, vj-reference, vj-critique)
# into ~/.claude/skills (or $env:CLAUDE_SKILLS_DIR). The /vj, /vj-reference and /vj-critique
# commands point to the main skill in the sibling folder, so install them together.
# ASCII only: Windows PowerShell 5.1 reads .ps1 files without BOM as ANSI.
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = Join-Path $here 'skill'
$base = if ($env:CLAUDE_SKILLS_DIR) { $env:CLAUDE_SKILLS_DIR } else { Join-Path $HOME '.claude\skills' }

if (-not (Test-Path (Join-Path $src 'ai-vj-generator\SKILL.md'))) {
  Write-Error 'Run this script from inside the ai-vj-generator folder.'
}
if (Get-Command node -ErrorAction SilentlyContinue) {
  node (Join-Path $here 'scripts\sync-skill.mjs') | Out-Null
}
New-Item -ItemType Directory -Force -Path $base | Out-Null
foreach ($d in Get-ChildItem -Path $src -Directory) {
  $dest = Join-Path $base $d.Name
  if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
  New-Item -ItemType Directory -Force -Path $dest | Out-Null
  Copy-Item -Path (Join-Path $d.FullName '*') -Destination $dest -Recurse -Force
  Write-Output "  instalada: $($d.Name)"
}
Write-Output "Skills em $base"
Write-Output 'Reinicie o Claude Code e digite: /vj <seu briefing>'
Write-Output 'Analise de imagem e video (opcional): pip install pillow numpy  (video tambem precisa de ffmpeg)'
Write-Output "Gerador sem Claude: abra $(Join-Path $here 'app\index.html')"
