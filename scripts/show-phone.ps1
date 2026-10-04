param([string]$Device, [switch]$Record)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'environment.ps1')
$scrcpyExecutable = Join-Path $projectRoot '.tools/scrcpy/scrcpy-win64-v4.1/scrcpy.exe'
if (-not (Test-Path -LiteralPath $scrcpyExecutable)) { throw 'No se encuentra scrcpy portable en .tools/scrcpy.' }
if (-not $Device) {
    $connectedDevices = @(& adb devices | ForEach-Object {
        if ($_ -match '^(\S+)\s+device$') { $Matches[1] }
    })
    if ($connectedDevices.Count -ne 1) { throw 'Conecta un telefono por ADB o indica -Device con su identificador.' }
    $Device = $connectedDevices[0]
}
# Reutiliza el ADB del proyecto para no reiniciar la conexion con otro binario.
$previousAdb = $env:ADB
try {
    $env:ADB = Join-Path $env:ANDROID_HOME 'platform-tools/adb.exe'
    $captureArguments = @('--serial', $Device, '--no-audio', '--max-size=1280', '--max-fps=30', '--video-bit-rate=2M', '--window-title=A55 - Network QoS')
    if ($Record) {
        # La grabacion es optativa; cada archivo tiene nombre unico para conservar tomas anteriores.
        $recordingDirectory = Join-Path $projectRoot 'grabaciones'
        New-Item -ItemType Directory -Path $recordingDirectory -Force | Out-Null
        $recordingPath = Join-Path $recordingDirectory ('demo-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff') + '.mp4')
        $captureArguments += @('--record', $recordingPath)
        Write-Host "Grabando sin audio en $recordingPath. Cerra la ventana para finalizar el MP4."
    }
    & $scrcpyExecutable @captureArguments
    if ($LASTEXITCODE -ne 0) { throw 'scrcpy termino con un error; revisar la conexion del telefono.' }
} finally { $env:ADB = $previousAdb }
