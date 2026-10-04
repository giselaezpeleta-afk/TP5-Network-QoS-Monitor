# Preparación de entrega y video (3–5 minutos)

## Documentos y archivos

- Código e historial Git: este repositorio. Falta indicar dónde publicarlo o entregarlo.
- APK de prueba Android: `mobile/android/app/build/outputs/apk/release/app-release.apk`.
  Incluye JavaScript; no necesita Metro. Compilado para ARM64 y firmado para pruebas.
- Documento técnico: [README principal](../README.md) y
  [arquitectura, decisiones y límites](arquitectura-y-limites.md).
- Backend y despliegue: [instrucciones del servidor](../backend/README.md).
  Incluye Dockerfile; su ejecución en Docker todavía no fue validada.
- [Cumplimiento del PDF](cumplimiento-tp.md), con pruebas reales y pendientes separados.
- [Guía de mediciones](guia-de-mediciones.md), para estudiar y preparar la explicación.
- Video: pendiente de grabar con la app real, después de las comprobaciones siguientes.

No adjuntar `node_modules`, SDK, JDK, cachés, claves ni códigos de depuración.
El APK sí es un entregable aunque su carpeta de compilación esté excluida de Git.
La consigna pide un README extendido; no obliga a convertirlo a PDF.
Datos de portada/integrantes y destino de entrega: el usuario los completará.

| Datos para completar antes de entregar | Valor |
|---|---|
| Integrante(s) | Pendiente |
| Legajo(s) | Pendiente |
| Comisión | Pendiente |
| Enlace del repositorio / destino de entrega | Pendiente |

## Comprobaciones antes de filmar

1. Mantener PC y A55 en el mismo Wi-Fi. Encender el backend y confirmar su URL
   desde el teléfono. Usar 1 MiB para que velocidad sea breve.
2. En Monitoreo, habilitar ubicación y esperar una posición válida. Sin iniciar
   el monitoreo, ejecutar dos sesiones manuales de Latencia y verificar puntos
   reales en Mapa. Si es práctico, desplazarse unos metros dentro del alcance
   Wi-Fi; no inventar ubicaciones si el GPS no diferencia los puntos.
3. Verificar que al seleccionar cada fecha en Historial aparecen sus gráficos
   justo debajo. Comprobar filtro Wi-Fi y fechas; luego limpiar filtros.
4. Exportar CSV y JSON, guardarlos y abrir ambos para comprobar fecha, red,
   valores y coordenadas cuando correspondan. El selector de compartir por sí
   solo no demuestra que el archivo se guardó correctamente.
5. Iniciar Monitoreo, bloquear la pantalla unos minutos, volver y comprobar
   nuevas sesiones. Detenerlo, actualizar después de la pausa y verificar que
   no se siguen agregando lotes. Registrar el resultado real, incluso si falla.

La consigna exige al menos **dos sesiones reales** en el mapa; no exige dos
redes distintas. Es válido hacer la demostración por Wi-Fi. Una prueba de
velocidad contra la PC local debe explicarse como medición del trayecto local.

## Guion sugerido: aproximadamente cuatro minutos

| Tiempo | Mostrar | Explicación sugerida |
|---|---|---|
| 0:00–0:25 | Inicio: red y operador | «Esta aplicación Android mide calidad de red. Distingue la conexión activa y muestra la información celular disponible.» |
| 0:25–1:15 | Latencia: tres destinos; iniciar prueba | «Cada destino recibe diez sondas. TCP mide el establecimiento de la conexión; UDP necesita nuestro servidor de eco. RTT es ida y vuelta y jitter es su variación.» |
| 1:15–1:55 | Velocidad: servidor, 1 MiB, resultados | «Hacemos tres rondas de descarga y subida contra el backend propio. El resultado se expresa en Mbps. Hoy el servidor está en esta red Wi-Fi.» |
| 1:55–2:30 | Historial: desplegar fechas y gráficos | «Cada sesión conserva sus muestras. Los intentos fallidos no se dibujan como cero; podemos filtrar y exportar CSV o JSON.» |
| 2:30–3:10 | Mapa con las dos sesiones reales preparadas | «Cada medición con posición válida queda georreferenciada. El calor representa calidad por RTT, no cobertura de señal celular.» |
| 3:10–3:45 | Monitoreo: parámetros, iniciar y estado activo | «Esto repite lotes de latencia, espera la pausa y evalúa umbrales configurables. Tiene una notificación y puede continuar con pantalla bloqueada.» |
| 3:45–4:10 | Detener monitoreo; cierre | «Lo detenemos manualmente. El historial queda local. Android limita el trabajo de fondo y el servidor local necesita estar encendido.» |

Los tiempos son orientativos. Si una prueba tarda más, ajustar la explicación
para mantenerse entre 3 y 5 minutos; no sustituir resultados por datos ficticios.
Mostrar una alerta solo si ocurrió realmente; no afirmar una falla de Internet
cuando el destino UDP no responde por configuración.

## Grabación

La ventana de scrcpy que ya usamos permite mostrar el teléfono en la PC y
compartirla por Meet. Para guardar un video sin audio desde PowerShell:

```powershell
.\scripts\show-phone.ps1 -Record
```

Se guarda un MP4 con fecha y hora en `grabaciones/`. Cerrar la ventana de scrcpy
finaliza el archivo. El script no graba el micrófono: si querés narración, usar
una herramienta de grabación de ventana y micrófono, o añadir la voz después.
Antes de empezar, abrir únicamente la app y evitar mostrar notificaciones
personales o la pantalla de vinculación. La grabación es de la pantalla del
teléfono, por lo que también capturaría cualquier otra app que abras.

Reproducir el video completo antes de entregar y verificar legibilidad, duración
y las dos sesiones del mapa. No iniciar la grabación final mientras seguimos
instalando o verificando la aplicación.
