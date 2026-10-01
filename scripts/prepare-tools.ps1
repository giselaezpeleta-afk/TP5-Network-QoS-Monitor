$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$projectRoot = Split-Path $PSScriptRoot -Parent
$toolsRoot = Join-Path $projectRoot '.tools'
$downloadsRoot = Join-Path $projectRoot '.downloads'
New-Item -ItemType Directory -Force -Path $toolsRoot, $downloadsRoot | Out-Null

# Java portable queda dentro del proyecto; no modifica el PATH de Windows.
$javaRoot = Join-Path $toolsRoot 'java'
if (-not (Test-Path $javaRoot)) {
    $releases = Invoke-RestMethod 'https://api.adoptium.net/v3/assets/latest/17/hotspot?architecture=x64&image_type=jdk&os=windows&vendor=eclipse'
    $package = $releases[0].binary.package
    $javaZip = Join-Path $downloadsRoot 'jdk17.zip'
    Write-Output 'Descargando JDK 17...'
    Invoke-WebRequest $package.link -OutFile $javaZip -UseBasicParsing
    if ((Get-FileHash $javaZip -Algorithm SHA256).Hash -ne $package.checksum) {
        throw 'El checksum del JDK no coincide.'
    }
    Expand-Archive -LiteralPath $javaZip -DestinationPath $javaRoot
}

# Se descarga solo el administrador del SDK. Los paquetes se instalan despues,
# segun las versiones que declare la plantilla de React Native.
$sdkRoot = Join-Path $toolsRoot 'android-sdk'
$cliRoot = Join-Path $sdkRoot 'cmdline-tools'
$sdkManager = Join-Path $cliRoot 'latest\bin\sdkmanager.bat'
if (-not (Test-Path $sdkManager)) {
    $sdkZip = Join-Path $downloadsRoot 'android-command-line.zip'
    Write-Output 'Descargando herramientas de Android...'
    Invoke-WebRequest 'https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip' -OutFile $sdkZip -UseBasicParsing
    if ((Get-FileHash $sdkZip -Algorithm SHA256).Hash -ne '90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a') {
        throw 'El checksum de las herramientas de Android no coincide.'
    }
    Expand-Archive -LiteralPath $sdkZip -DestinationPath $cliRoot
    # Ambos destinos son fijos y pertenecen a .tools dentro del proyecto.
    Rename-Item -LiteralPath (Join-Path $cliRoot 'cmdline-tools') -NewName 'latest'
}

. (Join-Path $PSScriptRoot 'environment.ps1')
& java -version
if ($LASTEXITCODE -ne 0) { throw 'No se pudo ejecutar Java.' }
Write-Output 'Java y administrador del SDK preparados. Falta instalar los paquetes del SDK.'
