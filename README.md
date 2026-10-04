# Network QoS Monitor — TP5

Aplicación de React Native para medir, guardar y visualizar la calidad de red.
La consigna original está en `TP5 Network_QoS_Monitor.pdf`.

## Decisiones acordadas

- Entrega para Android, según la autorización del docente comunicada por el alumno.
- Dispositivo de prueba: Samsung Galaxy A55 5G con Android 16.
- Diseño sencillo y prolijo. La propuesta visual todavía debe revisarse.
- Desarrollo por etapas, con explicaciones y comentarios útiles en el código.
- Equipo de desarrollo con 8 GB de RAM: usar el teléfono físico y evitar el emulador.

## Preparación del entorno

Node.js, npm y Git están disponibles. La base de React Native 0.87.1 está en
`mobile/`. Los scripts de `scripts/` preparan un JDK portable y las herramientas
del SDK de Android dentro de `.tools/`, sin modificar el PATH global.

La plantilla declara SDK 37, Build Tools 37.0.0, NDK 27.1.12297006 y Android
mínimo 24. El target es 36 (Android 16). Compilar con SDK 37 no exige que el
teléfono tenga Android 17. El primer build también solicitó Build Tools 36.0.0
para una dependencia; esa versión está incluida en el script de instalación.

Desde PowerShell, en la carpeta raíz:

```powershell
# Descargar Java y el administrador del SDK, verificando sus checksums.
.\scripts\prepare-tools.ps1
# Incorporar herramientas solo a la terminal actual.
. .\scripts\environment.ps1
# Revisar y aceptar las licencias que solicite Android.
sdkmanager.bat --licenses
# Instalar los paquetes concretos requeridos por el proyecto.
.\scripts\install-sdk.ps1
# Compilar el APK de desarrollo para ARM64.
.\scripts\build-android.ps1
```

El APK se genera en `mobile/android/app/build/outputs/apk/debug/app-debug.apk`.
La compilación debug necesita Metro para cargar JavaScript. En otra terminal:

```powershell
cd mobile
npm.cmd start
```

En la primera terminal, con depuración USB activada y el teléfono conectado:

```powershell
adb devices
# Aceptar en el teléfono la autorización de depuración de esta PC.
adb reverse tcp:8081 tcp:8081
adb install -r mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Después, abrir la app desde el teléfono. Si `adb devices` no muestra el estado
`device`, resolver primero la conexión USB y la autorización.

### Recuperar la conexión durante el desarrollo

El APK debug depende de Metro en la PC. Si aparece `Unable to load script`,
comprobar que Metro esté ejecutándose (`cd mobile`, luego `npm.cmd start`) y
que la PC y el teléfono sigan conectados a la misma red Wi-Fi.
Con el dispositivo autorizado, ejecutar desde la raíz:

```powershell
.\scripts\open-android.ps1
```

El script comprueba Metro, restaura `adb reverse tcp:8081 tcp:8081` y reinicia
solamente nuestra app. La redirección puede perderse al reconectar la depuración
inalámbrica; no hace falta recompilar por ese motivo.

### APK de prueba independiente de Metro

Para cambiar entre Wi-Fi, 4G y modo avión sin depender de la PC:

```powershell
.\scripts\build-android.ps1 -Mode Standalone
. .\scripts\environment.ps1
adb install -r mobile/android/app/build/outputs/apk/release/app-release.apk
adb shell am start -n com.networkqosmonitor/.MainActivity
```

Esta variante incluye JavaScript y Hermes dentro del APK. No requiere Metro ni
`adb reverse` para funcionar. Conserva la firma local de pruebas de la plantilla:
sirve para el TP, no para publicar una app en una tienda. Reemplaza la variante
debug instalada; para ver cambios de código hay que volver a compilar e instalar.

## Ajustes para la PC de 8 GB

- Gradle: un worker, sin compilación paralela y sin daemon persistente.
- Kotlin: compilación dentro del proceso de Gradle.
- Metro: un worker.
- Script de build: solo ARM64 para las pruebas en el teléfono.
- No se instala emulador ni imágenes de sistema.

Estos ajustes reducen concurrencia a costa de tiempo de compilación; no
garantizan un límite de consumo total de RAM. El heap de Gradle conserva 2 GB.
Las herramientas, descargas y cachés están excluidas de Git.

El SDK, las dependencias y las cachés de compilación igualmente ocupan espacio.
La primera compilación requiere descargas y puede consumir bastante memoria.

## Etapas

1. Configurar el entorno y ejecutar la app inicial en el teléfono.
2. Detectar la conexión y desarrollar el módulo nativo de telefonía.
3. Implementar sondas TCP y el backend de descarga/subida.
4. Guardar mediciones reales con ubicación y fecha.
5. Incorporar historial, mapa de calor y gráficos.
6. Agregar muestreo en segundo plano, notificaciones, filtros y exportación.
7. Documentar limitaciones, verificar funcionamiento y preparar la demo.

## Estado

Primera pantalla de Inicio implementada con detección real de conexión mediante
`@react-native-community/netinfo` (12.0.1). Muestra tipo de red, conectividad,
acceso a Internet y clasificación de costo de datos de Android. En una conexión
celular muestra la generación y el operador si el sistema los informa.

La pantalla se actualiza al recibir eventos de red y tiene un botón para
actualizar manualmente. Los valores desconocidos se muestran como pendientes
o no disponibles; no se usan mediciones simuladas.

### Cómo está organizado el código

- `mobile/App.tsx`: entrada de la interfaz y áreas seguras de Android.
- `mobile/src/screens/HomeScreen.tsx`: pantalla, estilos y acción de actualizar.
- `mobile/src/network/connectionSummary.ts`: interpreta los datos de NetInfo
  y distingue red conectada, Internet disponible y datos desconocidos.
- `mobile/src/theme.ts`: colores compartidos.
- `mobile/src/specs/NativeNetworkTelephony.ts`: contrato de Codegen del módulo propio.
- `mobile/android/app/src/main/java/com/networkqosmonitor/telephony/`: módulo Kotlin
  que consulta TelephonyManager fuera del hilo de interfaz y filtra datos inválidos.
- `mobile/src/telephony/`: permiso, ciclo de consultas y presentación de la señal.
- `mobile/__tests__/`: casos de desconexión, falta de Internet, datos ausentes,
  actualización de la interfaz y error al actualizar.

NetInfo aporta los permisos normales `ACCESS_NETWORK_STATE` y
`ACCESS_WIFI_STATE` mediante la combinación de manifiestos de Android.
La sección "Señal celular" usa el módulo Kotlin propio. Solicita
`READ_PHONE_STATE` únicamente al tocar "Habilitar señal celular". Rechazar el
permiso mantiene operativo el estado básico de red; si Android bloquea futuras
solicitudes, se ofrece abrir los ajustes. No se consultan contactos, números,
identificadores personales ni historial de llamadas. Todavía no se solicita
ubicación, ni se lee SSID o GPS.

### Interpretación de la telefonía

- Se consulta la suscripción de datos activa (la predeterminada en Android 7–10),
  contemplando que el teléfono pueda tener más de una SIM.
- La tarjeta celular describe esa SIM incluso cuando Internet sale por Wi-Fi.
  No se atribuye esa señal al enlace Wi-Fi.
- LTE muestra RSRP y RSSI por separado cuando están disponibles; NR muestra
  SS-RSRP. Un RSSI ausente no se reemplaza por RSRP. GSM informa RSSI; WCDMA y
  TD-SCDMA, RSCP; CDMA/EVDO, la potencia que Android entrega en dBm.
- Android 10 o posterior permite el detalle por tecnología. En versiones previas
  se conserva la información básica y se indica que el detalle no está soportado.
- Se muestran la hora de consulta y, desde Android 11, la antigüedad de la señal
  reportada por el módem. Consultar de nuevo no fuerza al módem a medir de nuevo.
- Un valor desconocido, sin permiso, sin suscripción o restringido se presenta
  explícitamente. Los sentinelas de Android no se muestran como números de señal.
- `dataNetworkType` puede seguir informando LTE en 5G NSA. No se deduce 5G del
  modelo del teléfono ni del icono de la barra de estado.
- Se consulta cada 5 segundos en primer plano y al volver a la app. Las consultas
  se suspenden en background y se liberan al desmontar la pantalla. No es todavía
  el servicio de muestreo en segundo plano requerido por el TP.

### Entorno y pruebas en el teléfono

Java, SDK, NDK, CMake y ADB instalados localmente. Compilación debug ARM64
completada correctamente; APK disponible en la ruta indicada arriba.
El A55 quedó vinculado y autorizado por depuración inalámbrica. El APK se
instaló correctamente y se inició en el teléfono, con el puerto 8081 redirigido
a Metro. El usuario confirmó la pantalla inicial de React Native antes de
reemplazarla por Inicio. El motor RTT se agregó en la etapa descrita más abajo;
throughput sigue pendiente.
La conexión USB quedó pendiente por falta de autorización.
La viabilidad y las restricciones del muestreo en
segundo plano se verificarán en Android antes de prometer su comportamiento.

Verificaciones de Inicio: ESLint, TypeScript (`tsc --noEmit`), seis pruebas
automatizadas y compilación debug ARM64 pasaron. El APK actualizado se instaló
en el A55. Se verificó visualmente la pantalla mostrando Wi-Fi, conexión activa
e Internet disponible. Los cambios a datos móviles y la desconexión todavía
requieren una prueba manual en el teléfono.
Las pruebas cubren errores al actualizar, cambios de
conexión, falta de Internet y datos desconocidos. Los casos simulados se usan
solo en Jest; la app usa los eventos reales de NetInfo.

Para revisar Inicio manualmente: comprobar el tipo de conexión contra los
ajustes del teléfono y tocar "Actualizar conexión". La generación y el
operador aparecen únicamente cuando la red activa es celular. Si se apaga el
Wi-Fi para probar datos móviles, también se interrumpe la depuración inalámbrica;
volver a la misma red para continuar el desarrollo. Con el APK Standalone la app
debe continuar funcionando sin esa conexión. La tarjeta separada de señal celular
puede mostrar la SIM incluso mientras se usa Wi-Fi.

Para verificar telefonía: probar rechazo y aceptación del permiso desde su botón,
cambiar Wi-Fi/datos, comprobar operador y tecnología con los ajustes del equipo,
y probar modo avión. Los datos de señal pueden tardar en cambiar porque Android
entrega la última lectura del módem. No se fijan umbrales de calidad todavía.

Verificaciones de la etapa de telefonía: ESLint, TypeScript, diez pruebas Jest
y dos pruebas unitarias Kotlin pasaron. Se cubren la pausa de consultas al pasar
a segundo plano, las respuestas tardías, los errores, el permiso bloqueado y los
valores desconocidos de Android. El APK Standalone ARM64 (17,7 MiB) se instaló
en el A55 y abrió correctamente sin redirección del puerto de Metro; se comprobó
visualmente la tarjeta de señal y su botón de permiso. El paquete contiene
`assets/index.android.bundle`. La validación de las lecturas reales queda
pendiente de aceptar el permiso en el teléfono; el cambio a datos móviles con
esta versión todavía requiere confirmación manual.

## Motor de latencia TCP y eco UDP

Inicio permite editar tres hosts distintos, sus puertos y el protocolo. Los
destinos iniciales autorizados son Cloudflare (`1.1.1.1`), Google (`8.8.8.8`) y
Quad9 (`9.9.9.9`), mediante conexiones TCP al puerto 53. La app no modifica la
configuración DNS del teléfono ni envía consultas DNS a esos servicios.

- Cada serie ejecuta diez sondas por destino, secuencialmente, con pausas de
  250 ms entre sondas del mismo host. Plazo de respuesta: 2 s. Si se ingresa un
  dominio, su resolución tiene un plazo adicional de 2 s y no integra el RTT.
- TCP mide el establecimiento de conexión con un socket nuevo por intento.
  No es ping ICMP ni una medición de descarga o TLS. Sus fallos no se presentan
  como pérdida de paquetes, porque TCP puede retransmitir internamente.
- UDP envía un identificador único y acepta únicamente su eco exacto desde el
  destino. No retransmite. Requiere el servidor de `backend/README.md`.
  El porcentaje sin eco en plazo no distingue pérdida de ida/vuelta de demora,
  filtrado o servidor sin respuesta. Errores de resolución/socket se muestran
  separados e invalidan ese porcentaje en la serie.
- RTT mínimo/promedio/máximo se calculan solo sobre respuestas válidas. Jitter
  es la media de diferencias absolutas entre RTT consecutivos válidos; un fallo
  corta el par. No equivale al jitter RTP ni a retardo unidireccional. Con datos
  insuficientes se muestra un guion, nunca un cero inventado.
- Kotlin ejecuta los sockets en un trabajador; el reloj es monotónico. Cada
  socket queda asociado a la red activa de Android y se cierra al terminar.
  El usuario puede cancelar; salir de la app o cambiar de red interrumpe la
  serie y conserva los resultados parciales sin mezclar conexiones.
- Las muestras se guardan en SQLite con sesión, timestamp, red y posición
  disponible. Las sesiones parciales se conservan. Historial, filtros,
  exportación CSV/JSON, gráficos y mapa están implementados en la ampliación.

Se usa un segundo TurboModule propio (`NativeNetworkProbe`) con sockets nativos
de Java/Kotlin. El PDF propone `react-native-tcp-socket` como librería sugerida;
esta implementación conserva las sondas reales, permite ligar el socket a una
red concreta y mide dentro de Kotlin, sin añadir esa dependencia.

Prueba manual: tocar **Iniciar medición**, esperar las 30 sondas y revisar cada
destino. Repetir después de cambiar a datos móviles. Para UDP, reemplazar uno
de los hosts por un servidor de eco propio y su puerto; una IP privada de la PC
solo sirve mientras teléfono y PC comparten una red alcanzable. No hay servidor
público desplegado ni reglas de firewall añadidas automáticamente.

Verificación de latencia: seis pruebas Kotlin y pruebas de JavaScript aprobadas;
el usuario confirmó 10/10 sondas en los tres destinos desde el A55. En la
ampliación pasaron TypeScript, ESLint, 28 pruebas Jest y tres Node; Kotlin
compiló. La validación física de las funciones nuevas sigue pendiente.
Guía: `docs/prueba-integral.md`; comando de actualización:
`scripts/install-standalone.ps1`.

## Velocidad, historial y monitoreo

Usar el botón **Menú** de la cabecera para ir a **Inicio**, **Latencia**,
**Velocidad**, **Monitoreo**, **Historial** o **Mapa**. La cabecera permanece
visible: cada sección tiene su propio desplazamiento y mantiene su estado.
El mapa tiene acceso directo; ya no hay que buscarlo dentro del historial.
Para habilitar ubicación y configurar alertas, entrar en **Monitoreo**.

Backend propio con Express, descarga fija y eco de subida; tres rondas de
1/5/10 MiB desde Kotlin, sin compresión ni resultados inventados. Para LAN:

```powershell
cd backend
npm.cmd ci
cd ..
.\scripts\start-backend.ps1 -BindAddress '<IP LAN de tu PC>'
```

En la app ingresar `http://<IP LAN>:5050`. PC y teléfono deben compartir una red
alcanzable. Para 4G se necesita desplegar el backend en una dirección pública
HTTPS; no se ha desplegado. Dockerfile opcional en `backend`.

Habilitar ubicación antes de medir para asociar coordenadas reales. El historial
permite filtros de red, fecha local y área (sur,oeste,norte,este), gráficos por
sesión, mapa OpenStreetMap con calor de RTT y archivos CSV/JSON. Exportar comparte
también las ubicaciones: elegir conscientemente el destinatario en Android.

El monitoreo se inicia y detiene desde la app/notificación, reutiliza los destinos
de la última medición y no hace speed tests automáticos. Intervalos/umbrales se
pueden editar. Android y el ahorro de batería pueden limitar su funcionamiento.

Documentación: [decisiones y límites](docs/arquitectura-y-limites.md),
[prueba y entrega](docs/prueba-integral.md), [seguimiento del PDF](docs/cumplimiento-tp.md).

## Memoria de desarrollo

Se configuró Engram v2.2.1 para conservar contexto local de este TP, a pedido del
usuario. El MCP está en `.codex/config.toml`; su carga requiere recargar Codex.
La memoria queda en `.tools/engram-data`, fuera de Git, sin sincronización cloud.
También puede consultarse con `scripts/engram.ps1 context tp5-network`.
El resumen legible se conserva en `docs/estado-del-proyecto.md`.
Gentle AI completo permanece suspendido por una detección de Defender;
no se agregaron excepciones al antivirus ni revisores adicionales.

## Referencias

- [Entorno de React Native](https://reactnative.dev/docs/set-up-your-environment)
- [Herramientas del SDK de Android](https://developer.android.com/tools/sdkmanager)
- [Ejecutar React Native en un teléfono](https://reactnative.dev/docs/running-on-device)
- [API y limitaciones de NetInfo](https://github.com/react-native-netinfo/react-native-netinfo)
- [TurboModules de Android](https://reactnative.dev/docs/turbo-native-modules-android)
- [TelephonyManager](https://developer.android.com/reference/android/telephony/TelephonyManager)
- [Señal y antigüedad de la lectura](https://developer.android.com/reference/android/telephony/SignalStrength)
