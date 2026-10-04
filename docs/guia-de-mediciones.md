# Cómo entender Network QoS Monitor

## Qué mide cada sección

**Inicio** identifica la conexión y muestra información que entrega Android.
**Latencia** envía sondas pequeñas para medir cuánto tarda una respuesta.
**Velocidad** transfiere archivos para calcular descarga y subida.
**Monitoreo** repite automáticamente pruebas de latencia mientras está activo.
**Historial** conserva las muestras y permite ver cada sesión, filtrar y exportar.
**Mapa** ubica las mediciones de latencia que tienen coordenadas reales.

QoS significa calidad de servicio. No existe un único número que describa toda
la conexión: puede haber mucha velocidad, pero respuestas lentas o inestables.

## Latencia: destinos, sondas y resultados

| Campo | Significado |
|---|---|
| Host / IP | Equipo al que se envía la prueba. Una IP es su dirección en la red. |
| Puerto | Servicio dentro de ese equipo. Usamos TCP 53 en los destinos DNS y UDP 5051 en nuestro servidor de eco. |
| TCP | La prueba mide cuánto tarda en establecerse una conexión. No descarga una página ni hace un ping ICMP. |
| UDP | Envía un mensaje pequeño y espera que el servidor devuelva exactamente ese mensaje. Necesita un servidor de eco compatible. |
| Sonda | Un intento individual. Cada destino recibe 10 intentos por lote. |
| 10/10 sondas | Se completaron los 10 intentos; no significa que todos hayan respondido. Mirar también la cantidad de respuestas. |
| RTT (ms) | Tiempo de ida y vuelta. 1.000 ms = 1 segundo. Generalmente, menos es mejor para ese mismo destino y protocolo. |
| RTT mínimo / promedio / máximo | La respuesta más rápida, la media y la más lenta entre las respuestas válidas. Los intentos fallidos no cuentan como cero. |
| Jitter de RTT (ms) | Promedio de las diferencias absolutas entre RTT consecutivos válidos. Menor variación indica más estabilidad. Un fallo interrumpe esa comparación. |
| Fallos TCP (%) | Proporción de intentos que no pudieron conectar. No equivale a porcentaje de paquetes perdidos. |
| Sin eco UDP en plazo (%) | Proporción de mensajes enviados que no recibieron el eco esperado dentro del plazo. Puede deberse a pérdida, demora, filtros o al servidor. |
| — | No hay datos válidos suficientes para calcular ese valor. No significa cero. |
| Último fallo | Motivo del último intento fallido; ayuda a interpretar un resultado incompleto. |

Ejemplo didáctico, **no resultado del teléfono**: RTT de 20, 30 y 25 ms da
mínimo 20, promedio 25, máximo 30 y jitter (10 + 5) / 2 = 7,5 ms.

El plazo de respuesta es 2.000 ms por intento, con 250 ms entre sondas.
Resolver un nombre de host tiene un plazo separado de 2.000 ms; ese tiempo no
forma parte del RTT. Cambiar de red durante una prueba invalida su continuidad.

Los DNS públicos no son servidores de eco UDP: que no respondan a nuestro
mensaje no demuestra una falla de Internet. En esta práctica, UDP se probó
contra el servidor propio de la PC. TCP y UDP miden operaciones diferentes;
no conviene comparar sus valores como si fueran la misma prueba.

## Velocidad

| Campo | Significado |
|---|---|
| URL del servidor | Dirección del backend propio, incluido el puerto HTTP 5050. La dirección privada de la PC funciona desde su misma red local. |
| Descarga | Datos que viajan del servidor al teléfono. |
| Subida | Datos que viajan del teléfono al servidor. |
| Mbps | Millones de bits por segundo; más indica mayor tasa observada en esa transferencia. No son megabytes por segundo: 8 bits = 1 byte. |
| MiB | Tamaño del archivo: 1 MiB = 1.048.576 bytes. No es una velocidad. |
| Tres rondas / seis transferencias | Cada ronda hace una descarga y una subida. |

La fórmula es `bytes × 8 / segundos / 1.000.000`. Incluye el establecimiento de
la conexión y la respuesta del servidor, por lo que no representa exactamente
la velocidad contratada. El equipo servidor y el Wi-Fi también influyen.
Una prueba contra la PC local mide ese trayecto local, no toda la salida a Internet.

El servidor devuelve también el contenido subido para verificarlo. Por eso el
consumo aproximado de tres rondas es 9, 45 o 90 MiB al elegir 1, 5 o 10 MiB,
más cabeceras. El tiempo de subida termina al recibir la confirmación; la
comprobación posterior del eco no se suma a ese tiempo.

## Monitoreo: sí hace mediciones

1. Elegís los destinos en Latencia y ejecutás una prueba para guardarlos.
2. En Monitoreo habilitás los permisos necesarios y tocás **Iniciar**.
3. El servicio hace un lote de 10 sondas por destino, guarda cada resultado y
   revisa los umbrales. Cada lote constituye una sesión del historial.
4. Cuando termina el lote, espera la pausa configurada y vuelve a empezar.
5. Lo detenés con el botón de la app o con **Detener** en su notificación.

Podés dejarlo activo durante la observación, incluso con la pantalla bloqueada.
No realiza descargas/subidas de velocidad automáticas. Para medir manualmente,
primero detené el monitoreo y así evitás mezclar pruebas simultáneas.

| Ajuste inicial | Para qué sirve |
|---|---|
| Pausa: 60 s | Espera después de terminar cada lote. El tiempo entre inicios es duración del lote + pausa, no exactamente 60 s. Admite 60 a 3.600 s. |
| RTT: 500 ms | Alerta si el promedio del destino alcanza o supera este valor. Editable de 1 a 10.000 ms. |
| Jitter: 100 ms | Alerta si la variación calculada alcanza o supera este valor. Editable de 1 a 10.000 ms. |
| Fallos / sin eco: 50 % | Umbral de intentos fallidos TCP o ausencia de eco UDP. Editable de 1 a 100 %. |
| Separación de alertas: 5 min | Evita notificar continuamente el mismo tipo de problema; no significa que se haya detenido la medición. |

Son **valores iniciales de prueba configurables**, no límites fijados por la
cátedra ni una norma universal de buena conexión. Las alertas se evalúan al
completar los 10 intentos de un destino. Los errores locales que impiden enviar
UDP no se presentan como pérdida de ecos enviados.

La notificación «monitoreo activo» indica que el servicio funciona; no es un
error. «Posible degradación» indica que se superó al menos un umbral; no prueba
por sí sola que el proveedor de Internet sea responsable.

No es un servicio perpetuo: Android puede limitarlo por batería o tiempo de
ejecución; este tipo de servicio tiene límites en versiones recientes. No se
reinicia automáticamente al encender el teléfono ni después de **Forzar detención**.
Mantenerlo activo usa batería y tráfico. Los detalles técnicos están en
[arquitectura y límites](arquitectura-y-limites.md).

## Red y señal celular

| Dato | Cómo leerlo |
|---|---|
| Wi-Fi / móvil | Conexión activa usada por las pruebas. |
| Operador | Compañía de la SIM, cuando Android entrega ese dato. |
| LTE / 4G, NR / 5G | Tecnología celular informada por Android. |
| IWLAN | Tecnología relacionada con acceso del operador a través de Wi-Fi; no es una medición de velocidad. |
| RSSI (dBm) | Potencia de señal recibida que informa el módem. |
| RSRP LTE / SS-RSRP NR (dBm) | Potencia de señales de referencia de LTE o 5G. No es la misma magnitud que RSSI. |
| Edad de señal | Antigüedad del dato del módem. Puede ser una lectura anterior y no una actualización instantánea. |

Para **la misma magnitud y tecnología**, un valor menos negativo representa
mayor potencia: −90 dBm es más fuerte que −110 dBm. No convertir estos números
directamente en Mbps ni comparar RSSI con RSRP como equivalentes. Android puede
seguir ofreciendo una lectura celular mientras la conexión activa es Wi-Fi.

## Ubicación, historial, mapa y filtros

- **Timestamp / fecha:** cuándo se registró la muestra; las fechas de la interfaz
  se muestran en hora local.
- **Latitud / longitud:** coordenadas geográficas; valores negativos son normales.
- **Precisión (metros):** incertidumbre estimada de la posición; menor suele ser
  más preciso, pero no es una garantía de ubicación exacta.
- **Edad de ubicación:** tiempo desde la posición recibida. La app no adjunta una
  posición de más de 60 s como si fuera actual. Sin permiso o sin posición válida,
  conserva la medición indicando la falta de ubicación.
- **Sesión:** grupo de mediciones de una ejecución. Una prueba normal de latencia
  con tres destinos tiene 30 muestras; velocidad completa tiene 6. Una ejecución
  interrumpida puede tener menos. Tocá su fecha para desplegar el gráfico debajo.
- **Gráfico sin línea:** puede no haber RTT válidos, haber un único punto o existir
  intentos fallidos que interrumpen la serie. La app explica estos casos.
- **Mapa de calor:** representa RTT de muestras geolocalizadas, no cobertura de
  antenas ni intensidad celular. La densidad de puntos y el zoom afectan el color;
  consultá los puntos para leer los valores. Los mapas de OpenStreetMap requieren Internet.
- **Filtro de red:** todas, Wi-Fi o móvil.
- **Desde / hasta:** fechas locales `AAAA-MM-DD`; «hasta» incluye ese día completo.
- **Área:** cuatro coordenadas `sur,oeste,norte,este` que delimitan un rectángulo.
  Si no querés recortar por zona, dejá el campo vacío. No se escribe una dirección postal.
- **CSV:** tabla para abrir en una planilla. **JSON:** datos estructurados para
  conservar o procesar. Ambos respetan los filtros aplicados.

El historial muestra hasta 2.000 muestras; la exportación admite hasta 50.000
por archivo. Los registros incluyen ubicaciones: revisá qué compartís al entregar.
