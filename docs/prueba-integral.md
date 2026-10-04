# Prueba en Samsung A55

No marcar pasos como aprobados sin ejecutarlos. El usuario ya confirmó tres
destinos con 10/10 sondas en el APK de latencia anterior.

1. Instalar APK ampliado con `scripts/install-standalone.ps1`. Abrirlo sin Metro.
2. Abrir **Menú → Monitoreo** y habilitar ubicación, aceptar precisa o aproximada conscientemente
   y activar Ubicación en Android. Esperar unos segundos para obtener posición.
3. Abrir **Menú → Latencia** y ejecutar la prueba con tres hosts TCP. En
   **Menú → Historial**, elegir la sesión para ver gráficos. En **Menú → Mapa**
   se cargan automáticamente las mediciones ubicadas. Sin fix se informa ausencia
   de puntos. Los filtros son compartidos entre Historial y Mapa.
4. Cerrar y abrir la app: comprobar que los registros siguen en el historial.
5. En PC, iniciar `scripts/start-backend.ps1 -BindAddress <IP LAN de la PC>`.
   Actualmente se detectó 192.168.101.3, pero puede cambiar. Misma Wi-Fi en A55.
   En **Menú → Velocidad** ingresar `http://<IP LAN>:5050`, elegir 1 MiB y ejecutar. Deben
   completar tres descargas y tres subidas (~9 MiB). Si no conecta, comprobar
   `/health` desde el navegador del teléfono y permisos de firewall/red privada;
   no desactivar el firewall globalmente. Detener servidor con Ctrl+C al terminar.
6. Cambiar un destino de latencia por la IP PC, puerto 5051 y UDP. Los otros dos
   permanecen TCP y deben ser hosts diferentes. Verificar ecos y estadísticas.
   No cambiar solo el protocolo de 1.1.1.1/8.8.8.8/9.9.9.9:53 a UDP: esos
   servicios esperan consultas DNS, no el identificador de nuestro eco. La
   ausencia de respuesta a ese protocolo no demuestra pérdida de red.
7. Cancelar una prueba y cambiar Wi-Fi a 4G durante otra: no debe mezclar redes
   ni guardar una transferencia incompleta como éxito. Repetir TCP en 4G; la IP
   privada PC no sirve para throughput móvil sin un backend público alcanzable.
8. Monitoreo: conceder notificaciones, iniciar, bloquear pantalla 3 minutos,
   desbloquear y actualizar historial. Debe haber lotes nuevos. Repetir quitando
   la app de recientes. Detener desde la notificación y verificar que no continúa.
9. Alertas: probar temporalmente RTT 1 ms (valor de prueba deliberado), iniciar
   lote completo y observar notificación; luego restaurar 500 ms. No generar
   tráfico de velocidad automático. Verificar denegación de permisos y GPS apagado.
10. Filtrar por red y día, luego por área que contenga las ubicaciones reales.
    Exportar CSV/JSON, abrir archivos y comprobar fechas, unidades y coordenadas.
    «Fecha desde» y «Fecha hasta» usan AAAA-MM-DD; el día final se incluye
    completo. Área opcional: sur,oeste,norte,este, en grados con punto decimal.
    Dejar campos vacíos incluye todas las fechas o zonas.

Si velocidad informa que no conecta al puerto 5050, comprobar que el servidor
siga ejecutándose en la PC. El 04/10 el usuario reprodujo ese error y confirmó
que las tres rondas volvieron a completar después de iniciarlo nuevamente.
Una sesión sin RTT válidos muestra explicación en vez de ejes vacíos; no es
correcto dibujar una línea de cero para intentos fallidos.

## Entrega

El usuario presentará por Meet usando scrcpy y Wi-Fi, con video de respaldo.
No se prepara una web adicional ni es necesario cambiar de red en la demostración
en vivo. Las pruebas de redes distintas se pueden documentar en el video.

El usuario confirmó el menú y acceso al mapa en A55. Para la revisión final,
volver a una prueba en curso desde el aviso y verificar que se conservan
campos/resultados. El botón Atrás vuelve
a Inicio desde las secciones; si el menú está abierto, lo cierra primero.

- APK Standalone y repositorio con commits, README y backend.
- Dos sesiones reales identificables (pueden ser ambas Wi-Fi), con gráficos
  y ubicaciones. Anotar límites del servidor LAN sin aparentar pruebas públicas.
- Video de 3–5 min: seguir [guion actualizado](guion-y-entrega.md). No es
  obligatorio mostrar dos redes distintas; mostrar datos obtenidos realmente,
  no sembrar filas de demostración.
- Confirmar destino del repositorio y requisitos de presentación con la cátedra.
