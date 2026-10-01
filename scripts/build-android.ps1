param([ValidateSet('Debug', 'Standalone')][string]$Mode = 'Debug')

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'environment.ps1')

Push-Location (Join-Path $projectRoot 'mobile\android')
try {
    # Para las pruebas en el A55 solo compilamos ARM64; evita trabajo para emuladores.
    # Release incorpora JavaScript al APK y no requiere Metro. La firma sigue
    # siendo local de pruebas, como define app/build.gradle; no es para publicar.
    $buildTask = if ($Mode -eq 'Standalone') { 'assembleRelease' } else { 'assembleDebug' }
    & .\gradlew.bat $buildTask '-PreactNativeArchitectures=arm64-v8a' --max-workers=1 --no-daemon
    if ($LASTEXITCODE -ne 0) { throw 'La compilacion Android fallo.' }
} finally {
    Pop-Location
}
