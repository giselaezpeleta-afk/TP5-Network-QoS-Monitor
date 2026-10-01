# Implementación y decisiones del TP

## Componentes

React Native muestra red/operador, configuraciones, resultados e historial. Los
TurboModules Kotlin ejecutan telefonía, sondas, transferencias, ubicación y
SQLite. Los sockets y el tráfico HTTP se asocian a la red activa capturada para
evitar mezclar Wi-Fi y datos móviles. El servicio Android reutiliza las sondas
nativas y guarda muestras aunque no esté abierta la interfaz React Native.

No se requiere Android Studio ni emulador: herramientas portables, JDK 17 y
compilación ARM64 con un trabajador. El APK Standalone incorpora JavaScript.
La firma es de desarrollo para este TP, no una clave de distribución pública.

## Qué se mide

- TCP: tiempo de establecimiento de conexión, excluido DNS. Fallos de conexión
  no se etiquetan como pérdida de paquetes.
- UDP: eco exacto de un identificador único. Ausencia de eco en 2 s no distingue
  pérdida, servidor caído, filtro ni demora excesiva. Errores locales/DNS anulan
  el porcentaje UDP de una serie.
- Jitter: media de diferencias absolutas entre RTT válidos consecutivos. Un
  fallo corta la pareja. Sin pares suficientes se muestra ausencia de dato.
- Velocidad: tres rondas secuenciales descarga/subida de 1, 5 o 10 MiB. Mbps =
  bytes completos × 8 / segundos / 1 000 000. Tiempo monotónico desde el inicio
  de la solicitud; incluye establecimiento y procesamiento del servidor. La
  subida termina al recibir confirmación HTTP; después valida el eco completo
  sin sumarlo a su duración. No mide capacidad máxima contratada. Cada ronda
  transfiere aproximadamente tres payloads (descarga + subida + eco).
- La app bloquea pruebas manuales simultáneas y pide detener el monitoreo antes
  de medir manualmente. Una transferencia incompleta no se guarda como éxito.

## Persistencia y ubicación

SQLite `qos.db`, tabla `samples`: sesión, tipo, timestamp, red, coordenadas
opcionales y payload JSON. Índices por fecha y sesión. Cada sonda y transferencia
completa se guarda inmediatamente, incluyendo parciales de una sesión cancelada.
El GPS asociado se toma al registrar la muestra; conserva su propio timestamp,
precisión y edad, por lo que no se confunde con el inicio de una transferencia.
Las posiciones de más de 60 s se marcan `stale` y no aparecen en el mapa.
Sin permisos, ubicación apagada o sin fix, se guarda el motivo y no coordenadas
ficticias. Android puede entregar ubicación aproximada si así lo elige el usuario.

Se puede habilitar ubicación para las pruebas manuales. Al salir de la app se
detiene esa suscripción; habilitarla de nuevo al volver si se desea seguir
georreferenciando. Si está activo el servicio, este conserva su suscripción.
Datos internos sin copia de seguridad Android. Desinstalar borra el historial.

La vista carga hasta 2000 muestras recientes que coincidan con los filtros. Un
gráfico de sesión puede ser parcial si excede ese límite. CSV/JSON exportan todas
las filtradas hasta 50000 por archivo; si se exceden, se pide acotar fechas, sin
truncar silenciosamente. CSV incluye métricas en columnas y JSON completo, con
escape de fórmulas en campos de texto. Android permite elegir dónde compartir;
no se envían datos automáticamente. Los archivos incluyen ubicaciones reales.

## Mapa y gráficos

Leaflet 1.9.4 y Leaflet.heat 0.2.0 se empaquetan localmente; licencias junto al
archivo generado. Regenerar con `node scripts/bundle-map.cjs` tras cambiar esas
dependencias. Solo los mosaicos OpenStreetMap requieren Internet. Se conserva
atribución, User-Agent identificable y caché normal; no hay descarga masiva ni
modo offline. CSP y navegación limitan el WebView al contenido del mapa.

Heatmap de RTT válido: peso relativo al umbral configurado (inicial 500 ms),
saturado en 1. El calor también depende de densidad y zoom: no es una estimación
de cobertura celular ni una clasificación universal de calidad. Los puntos
permiten consultar RTT y precisión. Los gráficos SVG separan hosts/direcciones,
usan el tiempo real y cortan la línea cuando no existe una respuesta válida.

## Segundo plano y alertas

Servicio `location|dataSync` iniciado expresamente desde una app visible, con
notificación persistente y acción Detener. Requiere ubicación y, en Android 13+,
permiso de notificaciones. No solicita permiso de ubicación permanente, no se
inicia al encender el teléfono y no se reinicia automáticamente si Android lo mata.

Valores de prueba autorizados, no impuestos por la cátedra:

| Parámetro | Inicial | Rango |
|---|---:|---:|
| Pausa después de cada lote | 60 s | 60–3600 s |
| Alerta RTT medio | 500 ms | 1–10000 ms |
| Alerta jitter | 100 ms | 1–10000 ms |
| Fallos TCP / ecos UDP ausentes | 50 % | 1–100 % |

Cada lote mide 10 sondas por destino de la última prueba manual, sin descargas
automáticas. La pausa empieza al terminar el lote; no promete periodicidad
exacta. Alerta cuando un destino completa 10 intentos y supera un umbral; máximo
una notificación de degradación cada 5 minutos. Un fallo DNS no se convierte en
pérdida UDP. Un cambio de red interrumpe el lote y el siguiente captura la nueva.
Wake lock acotado al trabajo, no a toda la sesión. Doze/ahorro de batería pueden
retrasar los lotes. Android 15+ limita dataSync a 6 horas por 24 horas; el callback
de timeout detiene el servicio. «Forzar detención» interrumpe todo por decisión
del sistema, no se intenta eludirlo. Validación específica en Samsung pendiente.

## Backend

Express 5.2.1 con descarga fija y eco de subida. Node genera payload aleatorio
fuera de las solicitudes, deshabilita compresión/caché y limita tamaño a 10 MiB.
UDP restringe formato y tasa. Consultar `backend/README.md` y su Dockerfile.
Por ahora se prueba en PC/LAN. HTTP en la app admite solo IPv4 privada literal;
para Internet exige HTTPS y valida certificados. No hay servidor público ni
reglas de firewall creadas automáticamente. El contenedor está preparado pero
no se ha ejecutado Docker en esta PC.

## Fuentes técnicas

- [Tipos de foreground service](https://developer.android.com/develop/background-work/services/fgs/service-types)
- [Límites de tiempo](https://developer.android.com/develop/background-work/services/fgs/timeout)
- [Política de mosaicos OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/)
- [Leaflet 1.9.4](https://leafletjs.com/reference.html)
- [Express](https://expressjs.com/en/api/)
- [WebView](https://github.com/react-native-webview/react-native-webview/blob/master/docs/Reference.md)
- [SVG](https://github.com/software-mansion/react-native-svg/blob/main/USAGE.md)
