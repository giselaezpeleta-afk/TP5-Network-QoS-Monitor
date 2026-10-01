# Servidor de eco UDP

Parte del motor de latencia del TP. No incluye todavía los endpoints de
throughput. Usa únicamente módulos estándar de Node y no necesita instalar
dependencias. Node 22.11 o posterior.

```powershell
cd backend
npm.cmd test
npm.cmd run start:echo
```

Por defecto escucha solo en `127.0.0.1:5051`. Para probar desde el teléfono en
el mismo Wi-Fi, iniciar con la IP LAN real de la PC:

```powershell
$env:QOS_BIND = '<IP LAN de la PC>'
npm.cmd run start:echo
```

En la app, reemplazar uno de los tres destinos por esa IP, puerto `5051`, modo
UDP. Los otros dos pueden seguir en TCP. El firewall debe permitir ese puerto
UDP en la red privada. No se abre ni modifica automáticamente. Una IP privada
de la PC no es accesible desde 4G: para esa prueba se necesita un servidor
alcanzable por Internet; no hay ningún despliegue público configurado.

Protocolo: un datagrama ASCII `NQ1:<UUID>` de 40 bytes; la respuesta debe ser
idéntica y venir del destino elegido. El cliente usa un UUID nuevo por sonda,
no retransmite y espera hasta 2 segundos. El servidor limita globalmente a
100 respuestas/s y descarta formatos ajenos. Ese límite también puede provocar
ausencias de eco: esta herramienta es un backend de referencia para pruebas.

La proporción sin eco dentro del plazo es una estimación de pérdida de sondas
de ida y vuelta; no permite separar pérdida de red, respuesta tardía, filtrado,
servidor detenido ni sentido del fallo. Los errores locales/de resolución se
muestran separados y anulan el porcentaje de esa serie. TCP informa fallos de
conexión, nunca los presenta como pérdida de paquetes.
