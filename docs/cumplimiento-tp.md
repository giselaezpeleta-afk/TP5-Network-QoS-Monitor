# Seguimiento del PDF

La entrega es Android por autorización del docente comunicada por el usuario.
«Implementado» y «probado en teléfono» se registran por separado.

| Requisito | Estado de implementación; validación física separada |
|---|---|
| RF-01 Red y operador | Implementado y probado en A55 |
| RF-02 RTT, tres hosts, min/avg/max/jitter | Implementado; usuario confirmó 10/10 en tres destinos en A55 |
| RF-03 Descarga/subida Mbps y backend | Cliente nativo + Express; usuario confirmó las tres rondas en A55. Dockerfile incluido, contenedor sin ejecutar |
| RF-04 Timestamp y GPS | SQLite por muestra, LocationManager con permisos/precisión/edad; falta validación GPS A55 |
| RF-05 Historial en mapa con heatmap | OpenStreetMap + Leaflet local, calor de RTT, atribución; usuario confirmó acceso al mapa, falta comprobar dos sesiones geolocalizadas |
| RF-06 Gráficos por sesión | Series SVG RTT por host y Mbps por dirección, sin interpolar pérdidas |
| RF-07 Muestreo background y alertas | Servicio location/dataSync iniciado por usuario, 10 sondas/destino, umbrales editables; falta pantalla bloqueada A55 |
| RF-08 Exportar CSV/JSON | FileProvider y selector de Android; falta compartir archivo real |
| RF-09 Filtros de red, fechas y zona | SQLite, límites geográficos y fechas locales; tests de validación aprobados |

## Trabajo autorizado en PC

- [x] Backend Express de throughput y Dockerfile (contenedor no ejecutado).
- [x] Transferencias medidas en cliente y geolocalización con permisos.
- [x] Historial SQLite, filtros y exportación de archivos.
- [x] Mapa de calor y gráficos, sin datos simulados en la app.
- [x] Servicio Android iniciado por el usuario, notificación y umbrales configurables.
- [x] Tests de lógica, compilación Kotlin, documentación técnica y guion de prueba.
- [x] APK ampliado compilado, firma verificada e instalado en A55; apertura correcta.

El usuario confirmó acceso desde Chrome del A55 a `/health` del servidor LAN.
El usuario confirmó las tres rondas de velocidad y respuestas UDP del servidor
de eco de la PC en puerto 5051. Los DNS públicos no ofrecen ese eco UDP.

## Auditoría final de entrega

- El video debe durar 3–5 minutos y mostrar al menos dos sesiones reales en el
  mapa. Pueden ser ambas Wi-Fi; el PDF no exige dos redes distintas.
- README extendido y documentación técnica disponibles. Guion y explicación
  de parámetros en `guion-y-entrega.md` y `guia-de-mediciones.md`.
- Repositorio Git local con historial y APK disponibles; publicación del
  repositorio y video final pendientes.
- Store reactivo de resultados implementado con Context + useReducer para los
  datos consultados que consumen Historial y Mapa; SQLite conserva los registros
  incluso con la interfaz cerrada. Las bibliotecas nativas propuestas se
  sustituyeron por módulos Kotlin propios, según arquitectura y límites.

## Requiere teléfono / datos del usuario

- Aceptación o rechazo de permisos, ubicación real, Wi-Fi/4G, pantalla bloqueada,
  cierre de la interfaz y restricciones de batería del Samsung.
- Al menos dos sesiones reales para el video de 3–5 minutos. No se fabrican datos.
- Dirección pública del backend si se desea throughput/eco UDP desde 4G.
- Publicación del repositorio cuando el usuario indique el destino.

No es posible garantizar muestreo después de «Forzar detención» de Android;
debe documentarse esa limitación y probarse el comportamiento permitido.
