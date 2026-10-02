# AI VJ Generator - installs the skill into ~/.claude/skills (or $env:CLAUDE_SKILLS_DIR)
# ASCII only: Windows PowerShell 5.1 reads .ps1 files without BOM as ANSI.
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = Join-Path $here 'skill\ai-vj-generator'
$base = if ($env:CLAUDE_SKILLS_DIR) { $env:CLAUDE_SKILLS_DIR } else { Join-Path $HOME '.claude\skills' }
$dest = Join-Path $base 'ai-vj-generator'

if (-not (Test-Path (Join-Path $src 'SKILL.md'))) {
  Write-Error 'Run this script from inside the ai-vj-generator folder.'
}
if (Get-Command node -ErrorAction SilentlyContinue) {
  node (Join-Path $here 'scripts\sync-skill.mjs') | Out-Null
}
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Copy-Item -Path (Join-Path $src '*') -Destination $dest -Recurse -Force
Write-Output "Skill instalada em $dest"
Write-Output 'Reinicie o Claude Code e escreva: "quero visuais para meu set".'
Write-Output "Gerador sem Claude: abra $(Join-Path $here 'app\index.html')"
