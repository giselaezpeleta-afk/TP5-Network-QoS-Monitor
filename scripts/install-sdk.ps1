$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'environment.ps1')

# Versiones declaradas por mobile/android/build.gradle (React Native 0.87.1).
# No se descargan imagenes de sistema ni el emulador.
# Google publica API 37 con el identificador android-37.0.
# Una dependencia tambien solicita Build Tools 36; se verifico en el primer build.
& sdkmanager.bat --sdk_root=$env:ANDROID_HOME 'platform-tools' 'platforms;android-37.0' 'build-tools;37.0.0' 'build-tools;36.0.0' 'ndk;27.1.12297006' 'cmake;3.22.1'
if ($LASTEXITCODE -ne 0) { throw 'No se pudo completar la instalacion del SDK.' }
