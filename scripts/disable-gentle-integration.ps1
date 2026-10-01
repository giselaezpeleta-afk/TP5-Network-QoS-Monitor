$ErrorActionPreference = 'Stop'
$gentleProjectRoot = Split-Path $PSScriptRoot -Parent
$globalCodexConfig = 'C:\Users\iCentro\.codex\config.toml'
$backupPath = Join-Path $gentleProjectRoot '.downloads\gentle-integration-disabled-backup.toml'

# Deshabilita únicamente las entradas que agregó Engram durante esta instalación.
# Conserva el resto de los ajustes de Codex y una copia local previa al cambio.
Copy-Item -LiteralPath $globalCodexConfig -Destination $backupPath
$lines = Get-Content -LiteralPath $globalCodexConfig -Encoding utf8
$section = ''
$output = foreach ($line in $lines) {
    if ($line -match '^\[') { $section = $line.Trim() }
    if ($line -match '^# engram-windows-hook-command-v1:') { continue }
    if ($line -match '^(model_instructions_file|experimental_compact_prompt_file)\s*=' -and $line -match 'engram-') { continue }
    if ($section -eq '[mcp_servers.engram]' -and $line -eq '[mcp_servers.engram]') {
        $line
        'enabled = false'
        continue
    }
    if ($section -eq '[plugins."engram@engram"]' -and $line -match '^enabled\s*=') {
        'enabled = false'
        continue
    }
    $line
}
[IO.File]::WriteAllLines($globalCodexConfig, [string[]]$output, [Text.UTF8Encoding]::new($false))

# El manifiesto del instalador confirma que estos siete archivos NO existían
# antes. Se quitan solo esos archivos, sin borrar directorios ni otros ajustes.
$generatedFiles = @('AGENTS.md', 'config.toml', 'engram-compact-prompt.md',
    'engram-instructions.md', 'sdd-cheap.config.toml', 'sdd-mid.config.toml', 'sdd-strong.config.toml')
foreach ($name in $generatedFiles) {
    $generatedPath = Join-Path $gentleProjectRoot ('.codex\' + $name)
    if (Test-Path -LiteralPath $generatedPath) { Remove-Item -LiteralPath $generatedPath }
}
Write-Output 'Integración Engram deshabilitada; ajustes anteriores de Codex conservados.'
