# Archivos de entrega

- **TP5-Network-QoS-Guia.docx**: explicación breve, instalación y uso. Completar
  institución, carrera, asignatura/comisión, nombre, legajo, docente, fecha y
  enlaces del repositorio/video. Se puede abrir y editar en Word o LibreOffice.
- **NetworkQoSMonitor-Android.apk**: copia local del último APK instalado y
  confirmado por el usuario. ARM64, firma de pruebas, JavaScript incorporado.
  El binario se entrega aparte y no se guarda en el historial Git.
- **SHA256SUMS.txt**: checksum local del APK para verificar la copia.
- **Video(s)**: adjuntar por separado. La consigna exige una demostración de
  3–5 minutos. La última duración comunicada fue 2:54; falta confirmar la toma
  corregida o añadir una portada de 15 s para llegar a 3:09.

El código fuente y el README extendido se entregan mediante el repositorio.
Las instrucciones técnicas del backend están en `backend/README.md`.
La carpeta `mobile/ios` es parte de la plantilla; la entrega y validación son
solo Android. Conservar el código Android: no es una carpeta descartable.

No subir cachés, SDK/JDK, node_modules, configuración local del asistente ni
exportaciones personales con coordenadas. Esos datos no son necesarios para
compilar el proyecto. No se eliminaron las herramientas locales para mantener
posible una corrección final y no obligar a descargarlas otra vez.

Para regenerar el Word, si se dispone de Python y python-docx:
`python scripts/generar-word.py`. Este comando reemplaza la guía generada;
no ejecutarlo sobre una portada completada sin guardar antes una copia.
