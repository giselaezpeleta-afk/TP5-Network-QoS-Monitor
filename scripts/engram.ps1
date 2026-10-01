param([Parameter(ValueFromRemainingArguments = $true)][string[]]$EngramArguments)

$ErrorActionPreference = 'Stop'
$engramProjectRoot = Split-Path $PSScriptRoot -Parent
$engramExecutable = Join-Path $env:LOCALAPPDATA 'engram\bin\engram.exe'
if (-not (Test-Path -LiteralPath $engramExecutable)) { throw 'No se encontró Engram.' }

# Memoria local separada para este TP; no utiliza un servicio de IA ni sincroniza
# con la nube. La misma ubicación se configura en el servidor MCP del proyecto.
$env:ENGRAM_DATA_DIR = Join-Path $engramProjectRoot '.tools\engram-data'
$env:ENGRAM_PROJECT = 'tp5-network'
$env:ENGRAM_CLOUD_AUTOSYNC = '0'
& $engramExecutable @EngramArguments
if ($LASTEXITCODE -ne 0) { throw "Engram terminó con código $LASTEXITCODE." }
