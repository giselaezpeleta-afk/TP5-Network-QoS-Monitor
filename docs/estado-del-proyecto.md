# Estado para retomar sin repetir la exploración

Actualizado: 2026-10-04.

## Preparación de entrega y acordeón de Historial

- Cada sesión despliega su gráfico inmediatamente debajo de su fecha y se
  cierra con otro toque; usuario confirmó ambos comportamientos en A55.
- Auditoría PDF: video de 3–5 minutos con al menos dos sesiones reales en mapa;
  pueden ser ambas Wi-Fi. No exige web ni dos redes diferentes para el video.
- Agregado HistoryProvider (Context + useReducer) para resultados compartidos
  por Historial/Mapa, conforme a la arquitectura del PDF; SQLite persiste datos.
- Guía de todos los parámetros: docs/guia-de-mediciones.md. Guion y entregables:
  docs/guion-y-entrega.md. Cumplimiento actualizado con UDP/velocidad confirmados.
- scripts/show-phone.ps1 -Record prepara MP4 sin audio en grabaciones/ (ignorada
  por Git). No se inició una grabación ni se inventaron evidencias.
- TypeScript, ESLint y 31 Jest aprobados tras el store. Sintaxis PowerShell
  del script de grabación validada; falta probar una toma real.
- Pendientes físicos: dos sesiones GPS/mapa, filtros y exportación real,
  monitoreo bloqueado y detención. Pendientes de entrega: video y destino
  del repositorio. Usuario prefiere completar personalmente los datos de
  integrantes: dejarlos pendientes y no volver a pedirlos.

## Correcciones de claridad tras prueba del usuario

- Capturas: UDP contra servidores DNS no recibía eco; velocidad agotaba conexión
  a PC; el monitoreo sí generaba notificaciones pero sus controles no eran claros;
  gráficos sin respuestas tenían ejes vacíos y filtros sin títulos visibles.
- Reiniciado backend LAN 192.168.101.3:5050/5051. Usuario confirmó que velocidad
  volvió a completar las tres rondas. Mantener servidor encendido para medir.
- Usuario confirmó respuestas y RTT UDP usando la PC:5051 como destino 1,
  con los otros dos destinos en TCP:53. Los DNS no eran servidores de eco.
- Nuevos títulos y ejemplos persistentes para fechas/área en Historial y Mapa.
  Gráficos explican ausencia de datos, un solo punto o cortes, y separan TCP/UDP.
- Monitoreo: panel visible de estado, botones iniciando/activo/deteniendo,
  destinos y pausa; confirmación del servicio cada 2 s. Velocidad: estado,
  indicador de actividad, contador de transferencias y errores de conexión claros.
  Aviso específico al elegir UDP para configurar servidor de eco en vez de DNS.
- TypeScript/ESLint y 31 Jest aprobados. APK compilado (4m11s), firma verificada,
  instalado y abierto en A55. SHA256:
  d5f9eaadc5f5d0a94bf69145a1dbc27fcb203cb3a043e2775f4cc71463f54bb1.
  Falta confirmación visual del usuario sobre estos nuevos estados y títulos.

## Navegación por secciones

- Menú fijo con Inicio, Latencia, Velocidad, Monitoreo, Historial y Mapa.
  El mapa tiene acceso directo; filtros plegables y recarga al entrar.
- Las secciones visitadas conservan campos/resultados. Navegar no cancela una
  medición manual; un aviso permite volver a la prueba activa. Salir de la app
  o cambiar de red mantiene las cancelaciones anteriores.
- TypeScript, ESLint y 28 pruebas Jest aprobados, incluidas tres de navegación.
- APK de navegación compilado (5m34s), instalado y abierto en A55 el 04/10.
  Tamaño: 20941549 bytes. SHA256:
  bda33f6c23ed5de5861857ac06126fe10c9ffeaeb129a672821a8606084aa04c.
  scrcpy abierto para la prueba. El usuario confirmó las seis secciones del menú
  y que puede entrar directamente al mapa. Navegación guardada en Git: 83eb251.
- Usuario confirmó scrcpy visible y eligió presentar por Wi-Fi con video de
  respaldo, sin desarrollar web ni resolver USB para la demostración en vivo.
- Evitar búsquedas en dependencias/build/cachés. `android/app/src` contiene
  código propio; consultar acceso si el usuario lo mantiene excluido.

## Último avance (prevalece sobre antecedentes)

- Usuario ya en casa; APK anterior de latencia instalado y confirmado 10/10
  sondas en los tres destinos. No guardar códigos de vinculación.
- Ampliación implementada: Express HTTP + UDP y Dockerfile; throughput nativo;
  SQLite/GPS por muestra; filtros/CSV/JSON; Leaflet/OpenStreetMap con calor RTT;
  gráficos SVG; servicio foreground con notificación y umbrales configurables.
- 25 tests Jest aprobados, TypeScript y ESLint sin errores. Backend: tres pruebas
  HTTP/UDP aprobadas. APK completo compiló (10m21s), firma verificada, instalado
  y abierto correctamente en A55. Tamaño 20933121 bytes (~19.96 MiB).
  SHA256: d5187f6632d85672ea491f1587e82c23d64eabfbae92bd78fe8da79f8540e674.
- PC Wi-Fi detectada 192.168.101.3, backend para LAN en 5050 TCP / 5051 UDP.
  Puede cambiar la IP. Sin firewall modificado ni servidor público.
  Servidor ejecutándose; usuario confirmó `/health` desde Chrome en A55.
  El usuario confirmó que velocidad completó las tres rondas de 1 MiB.
  Habilitó ubicación pero aún no ve mapa: la vista actual requiere muestras de
  latencia válidas con posición y actualizar historial; velocidad sola no genera
  puntos de RTT. Se explicaron los pasos. Referencia del docente: panel web;
  el proyecto actual es APK Android y backend API, sin interfaz web.
- Dependencias nuevas fijadas: Express 5.2.1, WebView 14.0.1, SVG 15.15.5,
  Leaflet 1.9.4, leaflet.heat 0.2.0. Assets mapa locales con licencias; regenerar
  con `node scripts/bundle-map.cjs`.
- Guía integral y límites en `docs/prueba-integral.md` y
  `docs/arquitectura-y-limites.md`. Velocidad confirmada y mapa encontrado por
  el usuario. Pendientes físicos: validar coordenadas y filtros del mapa,
  exportación, bloqueo/cierre UI/alertas y video de dos sesiones reales.
- Git tiene commit inicial de telefonía/latencia, backend `83370f9` y ampliación
  móvil/documentación `5964162` y navegación `83eb251`.

## Preferencias del usuario

Presentación: scrcpy 4.1 portable descargado del GitHub oficial, SHA256 verificado.
Se abrió correctamente por ADB inalámbrico en A55 Android 16, renderer Direct3D11,
590x1280, 30 fps máximo, 2 Mbps, sin audio ni grabación. Ventana «A55 - Network QoS».
Reabrir con `scripts/show-phone.ps1`. Compartir esa ventana en Meet. Conservar
Wi-Fi mientras se use la conexión inalámbrica; para desconectarlo, resolver USB.
El usuario encontró el mapa en la app y confirmó las tres rondas de velocidad.

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

## Prueba real y ampliación en curso

- El A55 volvió a conectarse y se instaló el APK Standalone de latencia.
- El usuario confirmó 10/10 sondas en los tres destinos y valores visibles
  de RTT/jitter. Los números reportados no se asignan a una métrica sin captura.
- Decisiones autorizadas: mapa OpenStreetMap sin clave; servidor de velocidad
  primero en la PC con URL editable; intervalos y umbrales configurables con
  valores iniciales de prueba documentados.
- Backend Express en preparación: descarga y eco de subida de 1, 5 y 10 MiB.
- La ampliación todavía no está en el APK instalado: GPS, historial SQLite,
  mapa, gráficos, muestreo en segundo plano, alertas y exportación pendientes.

## Comandos del proyecto

```powershell
# Desde mobile
npm.cmd run lint
npx.cmd tsc --noEmit
npm.cmd test -- --runInBand
# Desde la raíz
.\scripts\build-android.ps1 -Mode Standalone
```

Requisitos completos en el PDF raíz y decisiones previas en `README.md`.
Pendientes de entrega: validación física ampliada, video, destino del repositorio
y backend público si se necesita probar velocidad por 4G.
