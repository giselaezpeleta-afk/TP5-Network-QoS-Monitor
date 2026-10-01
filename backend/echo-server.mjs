import dgram from 'node:dgram';
import { pathToFileURL } from 'node:url';

// Solo devuelve nuestro datagrama pequeño, con el mismo tamaño. No responde
// a mensajes arbitrarios ni agrega contenido a la respuesta.
export function validProbe(message) {
  return message.length === 40 && /^NQ1:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(message.toString('ascii'));
}

export function createEchoServer() {
  const socket = dgram.createSocket('udp4');
  let windowStart = Date.now();
  let replies = 0;
  socket.on('message', (message, peer) => {
    if (!validProbe(message)) return;
    // Tope global sencillo para este backend de referencia, no un servicio público.
    if (Date.now() - windowStart >= 1000) {
      replies = 0;
      windowStart = Date.now();
    }
    if (replies++ >= 100) return;
    socket.send(message, peer.port, peer.address, error => {
      if (error) console.error('No se pudo enviar el eco:', error.message);
    });
  });
  return socket;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.QOS_UDP_PORT ?? 5051);
  const host = process.env.QOS_BIND ?? '127.0.0.1';
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('QOS_UDP_PORT inválido');
  const server = createEchoServer();
  server.on('error', error => { console.error(error.message); server.close(); process.exitCode = 1; });
  server.bind(port, host, () => console.log(`Eco UDP escuchando en ${host}:${port}`));
  process.on('SIGINT', () => server.close());
  process.on('SIGTERM', () => server.close());
}
