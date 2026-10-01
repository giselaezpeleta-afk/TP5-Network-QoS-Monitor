# Seguimiento del PDF

La entrega es Android por autorización del docente comunicada por el usuario.
«Implementado» y «probado en teléfono» se registran por separado.

| Requisito | Situación al iniciar esta ampliación |
|---|---|
| RF-01 Red y operador | Implementado y probado en A55 |
| RF-02 RTT, tres hosts, min/avg/max/jitter | Implementado, tests y APK; falta A55 |
| RF-03 Descarga/subida Mbps y backend | Pendiente |
| RF-04 Timestamp y GPS | Timestamp parcial; falta GPS/persistencia |
| RF-05 Historial en mapa con heatmap | Pendiente |
| RF-06 Gráficos por sesión | Pendiente |
| RF-07 Muestreo background y alertas | Pendiente; sujeto a restricciones Android |
| RF-08 Exportar CSV/JSON | Pendiente |
| RF-09 Filtros de red, fechas y zona | Pendiente |

## Trabajo autorizado en PC

- [ ] Backend Express de throughput y contenedor.
- [ ] Transferencias medidas en cliente y geolocalización con permisos.
- [ ] Historial SQLite, filtros y exportación de archivos.
- [ ] Mapa de calor y gráficos de sesiones reales.
- [ ] Servicio Android iniciado por el usuario, notificación y umbrales configurables.
- [ ] Tests de lógica y compilación APK, documentación técnica y guion de prueba.

## Requiere teléfono / datos del usuario

- Aceptación o rechazo de permisos, ubicación real, Wi-Fi/4G, pantalla bloqueada,
  cierre de la interfaz y restricciones de batería del Samsung.
- Al menos dos sesiones reales para el video de 3–5 minutos. No se fabrican datos.
- Dirección pública del backend si se desea throughput/eco UDP desde 4G.
- Publicación del repositorio cuando el usuario indique el destino.

No es posible garantizar muestreo después de «Forzar detención» de Android;
debe documentarse esa limitación y probarse el comportamiento permitido.
