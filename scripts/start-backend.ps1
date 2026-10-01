param([string]$BindAddress = '127.0.0.1')
$ErrorActionPreference = 'Stop'
$backendRoot = Join-Path (Split-Path $PSScriptRoot -Parent) 'backend'
if (-not (Test-Path (Join-Path $backendRoot 'node_modules/express'))) {
    throw 'Faltan dependencias: ejecutar npm.cmd ci dentro de backend.'
}
# La interfaz se elige explícitamente; el script no abre puertos del firewall.
$previousBind = $env:QOS_BIND
try {
    $env:QOS_BIND = $BindAddress
    Write-Host "Servidor HTTP: http://${BindAddress}:5050 | Eco UDP: ${BindAddress}:5051"
    & node (Join-Path $backendRoot 'server.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'El servidor terminó con un error.' }
} finally {
    $env:QOS_BIND = $previousBind
}
