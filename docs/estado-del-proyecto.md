# Estado para retomar sin repetir la exploración

Actualizado: 2026-10-01.

## Preferencias del usuario

- Español claro, explicar cambios y agregar comentarios útiles al código.
- Entrega solo Android autorizada por la cátedra según el usuario.
- Diseño sencillo y cuidado. Consultar datos faltantes, no inventarlos.
- Priorizar ahorro de tokens/créditos: lecturas acotadas, sin revisiones repetidas
  ni agentes adicionales salvo pedido explícito.

## Verificado

- React Native CLI en `mobile`; entorno Android portable en `.tools`.
- Samsung A55 Android 16 vinculado por ADB inalámbrico.
- APK Standalone instalado: funciona sin Metro al pasar de Wi-Fi a datos.
- Inicio con NetInfo y TurboModule Kotlin de telefonía.
- Capturas del usuario: Personal, IWLAN con Wi-Fi y 4G/LTE con datos;
  se muestran RSRP/RSSI reales. Diez pruebas Jest y dos Kotlin pasaron en esa etapa.

## Etapa de mediciones TCP/UDP

Se escribieron `mobile/src/measurements`, `NativeNetworkProbe.ts`, el motor
Kotlin `probes/SocketProbe.kt` y `NetworkProbeModule.kt`, más servidor de eco
UDP en `backend`. Tres destinos TCP iniciales autorizados por el usuario:
Cloudflare 1.1.1.1, Google 8.8.8.8 y Quad9 9.9.9.9, puerto 53. Editables.

- TypeScript y ESLint pasaron; se excluyeron los reportes generados de Gradle.
- Pasaron 19 pruebas Jest, seis Kotlin (cuatro de sockets y dos de telefonía)
  y dos del backend Node. El error previo `spawn EPERM` se resolvió ejecutando
  las pruebas Node con permiso fuera del sandbox.
- Compilaron Kotlin, Codegen y el APK Standalone ARM64 (`assembleRelease`).
  CMake se detuvo dentro del sandbox; el reintento fuera del sandbox terminó
  correctamente. No se repitieron las pruebas ya aprobadas.
- El usuario está en remoto y autorizó avanzar sin teléfono. Instalación y
  validación real del nuevo APK quedan para cuando vuelva a casa. El A55 conserva
  la versión verificada de telefonía.
- Guía de prueba: `docs/prueba-latencia.md`; instalador: `scripts/install-standalone.ps1`.
- TCP informa fallos de conexión, no pérdida de paquetes. UDP estima ecos
  ausentes dentro del plazo con identificador único; requiere servidor propio.
- No hay servidor público UDP desplegado ni firewall modificado.

## Antecedente de Gentle AI

Se intentó instalar Gentle AI a pedido del usuario, recomendado por su profesor.
Su preocupación es el consumo de IA, no la lentitud de la PC.
Versión estable confirmada por GitHub: v3.7.0 (23/09/2026). Windows requiere
compilar desde Go; script portable en `scripts/prepare-gentle-ai.ps1`.
**Instalación suspendida:** Go 1.27.1 portable se instaló y Gentle AI 3.7.0
se compiló y ejecutó. Luego Windows Defender lo puso en cuarentena con la
detección `Trojan:Win32/Bearfoos.A!ml` (ThreatID 2147731250). No se confirmó
que sea un falso positivo. No restaurar ni agregar exclusiones automáticamente.

El instalador llegó a añadir Engram a Codex, incluso entradas globales pese al
scope workspace. Tras detectar la cuarentena se deshabilitaron su MCP y plugin
en la configuración global y se retiraron los siete archivos locales nuevos,
cuyo manifiesto confirmó que no existían previamente. Se conservaron los ajustes
anteriores ajenos a Engram. La memoria no está activa. Engram descargado permanece
en `C:/Users/iCentro/AppData/Local/engram/bin/engram.exe`, sin habilitarse en Codex.
El script `prepare-gentle-ai.ps1` está bloqueado explícitamente para impedir
reintentos inadvertidos. Se inició Git local (`main`), sin commits ni publicación.

## Engram habilitado por separado

El usuario autorizó usar solamente Engram por ahora y dejar Gentle AI completo
para evaluar en un próximo proyecto. Engram v2.2.1 pasó un análisis específico
de Defender sin detecciones reportadas; eso no implica garantía absoluta.

- Configuración nueva y local: `.codex/config.toml`, con ruta absoluta al binario.
- Proyecto: `tp5-network`; datos locales en `.tools/engram-data` (excluidos de Git).
- MCP y plugin globales de Engram siguen deshabilitados. Solo se habilita el MCP
  de este proyecto; no se agregaron orquestadores ni revisores automáticos.
- `scripts/engram.ps1` permite leer/escribir memoria ahora; la integración MCP
  requiere recargar Codex para estar disponible en una nueva sesión.
- Diagnóstico inicial: 9 comprobaciones correctas, sin advertencias ni errores.
- Instrucciones breves de continuidad y ahorro de tokens en `AGENTS.md`.

Engram MCP se verificó después del reinicio de VS Code y recuperó la memoria.
Próximo paso del TP: instalar/probar el APK de latencia en el A55 cuando
el usuario vuelva a casa. No repetir las pruebas ya aprobadas sin cambios nuevos.

## Comandos del proyecto

```powershell
# Desde mobile
npm.cmd run lint
npx.cmd tsc --noEmit
npm.cmd test -- --runInBand
# Desde la raíz (evitar compilar hasta terminar la tarea Gentle AI)
.\scripts\build-android.ps1 -Mode Standalone
```

Requisitos completos en el PDF raíz y decisiones previas en `README.md`.
Pendientes posteriores: throughput, GPS, SQLite, mapa, gráficos, background,
notificaciones, exportación, Git y documentación de entrega.
