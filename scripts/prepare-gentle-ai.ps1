$ErrorActionPreference = 'Stop'
throw 'Instalación suspendida: Windows Defender puso Gentle AI 3.7.0 en cuarentena (Trojan:Win32/Bearfoos.A!ml). Resolver la alerta antes de reintentar; no agregar exclusiones automáticamente.'
$gentleProjectRoot = Split-Path $PSScriptRoot -Parent
$gentleTools = Join-Path $gentleProjectRoot '.tools\gentle-ai'
$gentleDownloads = Join-Path $gentleProjectRoot '.downloads'
New-Item -ItemType Directory -Force -Path $gentleTools, $gentleDownloads | Out-Null

# Instalación portable y reproducible: no cambia PATH ni instala Go globalmente.
# Hash publicado en go.dev/dl; Gentle AI se verifica con la base de checksums de Go.
$goArchive = Join-Path $gentleDownloads 'go1.27.1.windows-amd64.zip'
$goChecksum = 'a3911b5e0e1b1053f25ed0675f4c1c6aad1e2bfcf253df2b9be4caabd2edd95d'
$goBinary = Join-Path $gentleTools 'go\bin\go.exe'
$goReady = Join-Path $gentleTools 'go-1.27.1.ready'
if (-not (Test-Path -LiteralPath $goReady)) {
    if (-not (Test-Path -LiteralPath $goArchive) -or
        (Get-FileHash -LiteralPath $goArchive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $goChecksum) {
        # curl evita la sobrecarga de progreso de Windows PowerShell y reanuda
        # una descarga interrumpida sin volver a transferir todo el archivo.
        & curl.exe --fail --location --silent --show-error --continue-at - --output $goArchive 'https://go.dev/dl/go1.27.1.windows-amd64.zip'
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo descargar Go.' }
    }
    if ((Get-FileHash -LiteralPath $goArchive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $goChecksum) {
        throw 'El archivo de Go no coincide con el checksum oficial.'
    }
    & tar.exe -xf $goArchive -C $gentleTools
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo extraer Go.' }
    New-Item -ItemType File -Path $goReady -Force | Out-Null
}

$env:GOPATH = Join-Path $gentleTools 'gopath'
$env:GOBIN = Join-Path $gentleTools 'bin'
$env:GOCACHE = Join-Path $gentleTools 'build-cache'
$env:GOMODCACHE = Join-Path $gentleTools 'module-cache'
$env:GOTOOLCHAIN = 'local'
$env:GOMAXPROCS = '2'
$env:GOFLAGS = '-p=1'
$env:GOSUMDB = 'sum.golang.org'
$env:GOPROXY = 'https://proxy.golang.org'

# Una compilación a la vez para limitar la carga de la PC de 8 GB.
& $goBinary install github.com/gentleman-programming/gentle-ai/v3/cmd/gentle-ai@v3.7.0
if ($LASTEXITCODE -ne 0) { throw 'No se pudo compilar Gentle AI.' }
& (Join-Path $env:GOBIN 'gentle-ai.exe') version
if ($LASTEXITCODE -ne 0) { throw 'No se pudo verificar Gentle AI.' }
