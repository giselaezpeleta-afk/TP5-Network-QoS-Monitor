param([string]$Device)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'environment.ps1')

# El APK debug necesita Metro; este comando no recompila ni reinstala la app.
try {
    $response = Invoke-WebRequest 'http://127.0.0.1:8081/status' -UseBasicParsing -TimeoutSec 5
    $status = $response.Content
    if ($status -is [byte[]]) { $status = [Text.Encoding]::UTF8.GetString($status) }
    if ($status -notmatch 'packager-status:running') { throw 'Servidor inesperado.' }
} catch {
    throw 'Metro no esta listo. En otra terminal, entrar en mobile y ejecutar npm.cmd start.'
}

if (-not $Device) {
    $devices = @(& adb devices | ForEach-Object {
        if ($_ -match '^(\S+)\s+device$') { $Matches[1] }
    })
    if ($devices.Count -ne 1) {
        throw 'Debe haber un telefono autorizado conectado. Si hay varios, usar -Device con su identificador.'
    }
    $Device = $devices[0]
}

# Esta redireccion puede perderse al reconectar el Wi-Fi o reiniciar ADB.
& adb -s $Device reverse tcp:8081 tcp:8081
if ($LASTEXITCODE -ne 0) { throw 'No se pudo conectar el telefono con Metro.' }
& adb -s $Device shell am force-stop com.networkqosmonitor
if ($LASTEXITCODE -ne 0) { throw 'No se pudo cerrar la app de prueba.' }
& adb -s $Device shell am start -W -n com.networkqosmonitor/.MainActivity
if ($LASTEXITCODE -ne 0) { throw 'No se pudo abrir la app de prueba.' }
