# Ejecutar con dot-sourcing: . .\scripts\environment.ps1
# Las variables duran solamente durante esta sesion de PowerShell.
$projectRoot = Split-Path $PSScriptRoot -Parent
$jdkDirectory = Get-ChildItem (Join-Path $projectRoot '.tools\java') -Directory | Select-Object -First 1
if (-not $jdkDirectory) { throw 'Primero ejecutar scripts/prepare-tools.ps1.' }
$env:JAVA_HOME = $jdkDirectory.FullName
$env:ANDROID_HOME = Join-Path $projectRoot '.tools\android-sdk'
$env:GRADLE_USER_HOME = Join-Path $projectRoot '.gradle-local'
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:PATH"
