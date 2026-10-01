param([string]$Device, [string]$Address)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'environment.ps1')
$standaloneApk = Join-Path $projectRoot 'mobile\android\app\build\outputs\apk\release\app-release.apk'
if (-not (Test-Path -LiteralPath $standaloneApk)) {
    throw 'Primero compilá con scripts/build-android.ps1 -Mode Standalone.'
}

# Address es el puerto de conexión de la pantalla principal de depuración
# inalámbrica, no el puerto temporal usado para vincular con código.
if ($Address) {
    & adb connect $Address
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo conectar al teléfono.' }
}
if (-not $Device) {
    $connectedDevices = @(& adb devices | ForEach-Object {
        if ($_ -match '^(\S+)\s+device$') { $Matches[1] }
    })
    if ($connectedDevices.Count -ne 1) {
        throw 'Se necesita un único teléfono autorizado. Revisá adb devices o indicá -Device.'
    }
    $Device = $connectedDevices[0]
}

& adb -s $Device install -r $standaloneApk
if ($LASTEXITCODE -ne 0) { throw 'La instalación del APK falló.' }
& adb -s $Device shell am force-stop com.networkqosmonitor
if ($LASTEXITCODE -ne 0) { throw 'No se pudo cerrar la versión anterior.' }
& adb -s $Device shell am start -W -n com.networkqosmonitor/.MainActivity
if ($LASTEXITCODE -ne 0) { throw 'No se pudo abrir la app.' }
# Esta variante incluye JavaScript; no necesita Metro ni adb reverse.
