# Prueba en Samsung A55

No marcar pasos como aprobados sin ejecutarlos. El usuario ya confirmó tres
destinos con 10/10 sondas en el APK de latencia anterior.

1. Instalar APK ampliado con `scripts/install-standalone.ps1`. Abrirlo sin Metro.
2. Habilitar ubicación desde la app, aceptar precisa o aproximada conscientemente
   y activar Ubicación en Android. Esperar unos segundos para obtener posición.
3. Ejecutar latencia con tres hosts TCP. Abrir historial, actualizar y elegir la
   sesión; revisar gráficos y mapa. Sin fix debe informar ausencia de puntos.
4. Cerrar y abrir la app: comprobar que los registros siguen en el historial.
5. En PC, iniciar `scripts/start-backend.ps1 -BindAddress <IP LAN de la PC>`.
   Actualmente se detectó 192.168.101.3, pero puede cambiar. Misma Wi-Fi en A55.
   En velocidad ingresar `http://<IP LAN>:5050`, elegir 1 MiB y ejecutar. Deben
   completar tres descargas y tres subidas (~9 MiB). Si no conecta, comprobar
   `/health` desde el navegador del teléfono y permisos de firewall/red privada;
   no desactivar el firewall globalmente. Detener servidor con Ctrl+C al terminar.
6. Cambiar un destino de latencia por la IP PC, puerto 5051 y UDP. Los otros dos
   permanecen TCP y deben ser hosts diferentes. Verificar ecos y estadísticas.
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

## Entrega

- APK Standalone y repositorio con commits, README y backend.
- Dos sesiones reales identificables (por ejemplo Wi-Fi y 4G TCP), con gráficos
  y ubicaciones. Anotar límites del servidor LAN sin aparentar pruebas públicas.
- Video de 3–5 min: 30 s red/operador; 60 s mediciones Wi-Fi y 4G; 45 s mapa y
  gráficos; 45 s muestreo bloqueado/alerta; 30 s filtros y exportación. Mostrar
  datos obtenidos realmente, no sembrar filas de demostración.
- Confirmar destino del repositorio y requisitos de presentación con la cátedra.
