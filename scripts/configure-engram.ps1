$ErrorActionPreference = 'Stop'
$engramProjectRoot = Split-Path $PSScriptRoot -Parent
$engramConfigDirectory = Join-Path $engramProjectRoot '.codex'
$engramConfigPath = Join-Path $engramConfigDirectory 'config.toml'
if (Test-Path -LiteralPath $engramConfigPath) {
    throw 'Ya existe configuración local de Codex. Revisarla antes de combinar cambios.'
}
$engramExecutable = (Join-Path $env:LOCALAPPDATA 'engram\bin\engram.exe').Replace('\', '/')
$engramData = (Join-Path $engramProjectRoot '.tools\engram-data').Replace('\', '/')
New-Item -ItemType Directory -Path $engramConfigDirectory -Force | Out-Null
$engramConfiguration = @"
# Integración local del TP; Gentle AI completo permanece deshabilitado.
[mcp_servers.engram]
enabled = true
command = '$engramExecutable'
args = ['mcp', '--tools=agent', '--project', 'tp5-network']

[mcp_servers.engram.env]
ENGRAM_DATA_DIR = '$engramData'
ENGRAM_CLOUD_AUTOSYNC = '0'
"@
[IO.File]::WriteAllText($engramConfigPath, $engramConfiguration, [Text.UTF8Encoding]::new($false))
Write-Output 'Engram configurado solamente para TP5-Network.'
