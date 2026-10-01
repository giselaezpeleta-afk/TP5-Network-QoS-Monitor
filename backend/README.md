# Servidor de referencia de QoS

Backend propio del TP: Express para descarga/subida y sockets Node para eco
UDP. Requiere Node 22.11 o posterior. Instalar dependencias con `npm.cmd ci`.

`npm.cmd start` inicia HTTP en 5050 y UDP en 5051. `QOS_BIND` define la interfaz
(por defecto solo 127.0.0.1), `PORT` el puerto HTTP y `QOS_UDP_PORT` el de UDP.

- `GET /health`: identificación del servicio y tamaños admitidos.
- `GET /download?bytes=1048576`: descarga binaria de tamaño fijo. También admite
  5242880 y 10485760 bytes (5 y 10 MiB). Sin compresión ni caché.
- `POST /upload`: cuerpo `application/octet-stream` de uno de esos tamaños;
  responde con exactamente los mismos bytes y `X-Received-Bytes`.

Los datos de subida se mantienen transitoriamente en memoria, no se guardan.
Una ronda de descarga + subida + eco consume aproximadamente tres veces el
tamaño elegido, más cabeceras. El eco no debe contarse como descarga del test.
No ejecutar pruebas simultáneas para comparar resultados de una misma sesión.

Contenedor de referencia (Docker es opcional y no se instala en la PC):

```text
docker build -t network-qos ./backend
docker run --rm -p 5050:5050 -p 5051:5051/udp network-qos
```

El contenedor escucha en 0.0.0.0 internamente y corre sin privilegios de root.
Para un despliegue público se necesitan HTTPS y límites de acceso/tráfico;
este servidor está preparado inicialmente para pruebas en una LAN privada.

## Eco UDP

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
