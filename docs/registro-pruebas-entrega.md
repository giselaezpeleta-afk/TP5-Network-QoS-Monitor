# Registro de pruebas para la entrega

## Monitoreo y detención comprobados en la interfaz

La captura del usuario muestra nuevas sesiones entre aproximadamente 21:14 y
21:20 del 04/10/2026, varias de 30 muestras y la última de 15 (21:20:43).
Una sesión parcial es compatible con detener un lote; no se atribuye una causa
definitiva únicamente a partir de la captura.
Después de indicar detener, esperar 90 segundos y actualizar, el usuario
confirmó: detuvo, actualizó y no aparecieron nuevos datos. No confirmó de forma
explícita el tiempo esperado ni que la pantalla permaneciera bloqueada durante
los tres minutos de la prueba anterior. Quedan comprobados generación de
sesiones y ausencia de nuevos datos tras detener/actualizar; la condición de
pantalla bloqueada sigue pendiente de confirmación explícita.

## Exportación CSV comprobada

Archivo aportado: `qos-1791157338260.csv`. Lectura UTF-8 con parser CSV correcta:
627 filas, 19 columnas, 27 sesiones Wi-Fi; 591 muestras de latencia y 36 de
velocidad. Los 627 payloads de la columna data_json se pudieron analizar.
447 muestras tienen estado GPS ok y coordenadas numéricas dentro de rango.
RTT y Mbps presentes se interpretan como números; no se copian coordenadas aquí.

El conjunto no es el mismo que el JSON: abarca del 01/10/2026 20:17:12 al
04/10/2026 20:40:31 (hora argentina) y no incluye la sesión de las 20:54.
Tiene 553 IDs en común con el JSON y sus payloads coinciden en todos los casos.
Hay 74 filas adicionales en CSV y 30 adicionales en JSON. No se atribuye esta
diferencia a corrupción: son exportaciones de conjuntos/momentos distintos.
Queda comprobada exportación real en ambos formatos. Para entregar archivos
comparables, exportar ambos consecutivamente con los mismos filtros y sin
mediciones nuevas entre exportaciones.

Pendientes actuales: monitoreo con pantalla bloqueada y detención, claridad
del indicador GPS y grabación del video final sin audio.

## Exportación JSON comprobada

Archivo aportado por el usuario: `qos-1791158906605.json`, exportado desde el
A55, compartido por WhatsApp y descargado en la PC. Se pudo analizar como JSON:
583 filas, total declarado 583, 24 sesiones, todas Wi-Fi del 04/10/2026.

Dos sesiones recientes verificadas (hora de Argentina):

| Sesión | Muestras de latencia | Respuestas válidas | Ubicaciones válidas |
|---|---:|---:|---:|
| 20:40:22 | 30 | 30 | 30 |
| 20:54:16 | 30 | 30 | 30 |

En ambas, coordenadas numéricas dentro de rango y estado GPS `ok`. Edad de
posición menor de 4,5 segundos; precisión informada entre aproximadamente
10 y 100 metros según muestra. No se copian coordenadas personales al documento.
Quedan comprobadas persistencia, exportación JSON y dos sesiones reales con
RTT y GPS aptas para el mapa. Los pendientes sobre identificar estas sesiones
en las notas anteriores quedan resueltos por esta exportación.

Pendientes: exportación CSV, monitoreo con pantalla bloqueada y detención,
y video final sin audio. El indicador fijo de ubicación sigue siendo una
limitación de claridad de la interfaz, no evidencia de ausencia de coordenadas.

## 4 de octubre de 2026 — preparación del video sin audio

Evidencia: capturas del A55 compartidas por el usuario; no son datos simulados.

- Mapa: carga OpenStreetMap y muestra puntos y calor. La consulta informa 657
  muestras; esa cantidad es el total consultado, no la cantidad de puntos GPS.
- Historial: muestra 28 sesiones y 657 muestras.
- Sesión seleccionada: 4/10/2026, 20:54:16, Wi-Fi, latencia, 30 muestras.
- Serie UDP de la PC:5051: 10/10 muestras con datos y gráfico visible debajo
  del botón de la sesión. La serie TCP de 8.8.8.8:53 también indica 10/10
  muestras con datos. La tercera serie no aparece en esta captura.
- La captura del historial confirma persistencia y visualización de esa
  sesión, pero no demuestra por sí sola que sus muestras tengan GPS.
- Tras indicar filtro Wi-Fi y fechas desde/hasta 2026-10-04, el usuario envió
  una captura con 583 muestras y puntos/calor visibles (antes 657). Confirma
  cambio del conjunto consultado y presencia de datos geolocalizados en él;
  los campos de red/fecha quedan fuera de la captura, por lo que no se verifican
  visualmente sus valores. Tampoco identifica todavía dos sesiones con GPS.
- Pendiente: aislar las sesiones recientes en el mapa; exportar y comprobar
  coordenadas por sesión; monitoreo con pantalla bloqueada y detención.

La interfaz mantiene avisos fijos sobre habilitar/buscar ubicación; esos textos
no reflejan el estado GPS actual. Evitar interpretarlos como un error o una
confirmación de posición. El video final todavía no se grabó.
