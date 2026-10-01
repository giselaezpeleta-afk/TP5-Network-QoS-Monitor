import express from 'express';
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createEchoServer } from './echo-server.mjs';

export const MAX_BYTES = 10 * 1024 * 1024;
const sizes = new Set([1, 5, 10].map(mib => mib * 1024 * 1024));
// Datos aleatorios preparados fuera del tiempo de cada solicitud. Sin compresión
// ni caché HTTP: el cliente cuenta los bytes realmente recibidos.
const payload = randomBytes(MAX_BYTES);

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.disable('etag');
  app.use((_req, res, next) => {
    res.set({ 'Cache-Control': 'no-store, no-transform', 'X-Content-Type-Options': 'nosniff' });
    next();
  });
  app.get('/health', (_req, res) => res.json({ service: 'network-qos', version: 1, sizes: [...sizes] }));
  app.get('/download', (req, res) => {
    const bytes = Number(req.query.bytes);
    if (!sizes.has(bytes)) return res.status(400).json({ error: 'bytes debe ser 1048576, 5242880 o 10485760' });
    res.type('application/octet-stream').send(payload.subarray(0, bytes));
  });
  app.post('/upload', express.raw({ type: 'application/octet-stream', limit: MAX_BYTES, inflate: false }), (req, res) => {
    if (!Buffer.isBuffer(req.body) || !sizes.has(req.body.length)) {
      return res.status(400).json({ error: 'Enviar un payload binario de 1, 5 o 10 MiB' });
    }
    // El eco y su longitud permiten al cliente verificar la transferencia.
    res.set('X-Received-Bytes', String(req.body.length));
    res.type('application/octet-stream').send(req.body);
  });
  app.use((error, _req, res, _next) => {
    res.status(error.status === 413 ? 413 : 400).json({ error: 'Payload no permitido' });
  });
  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 5050);
  const udpPort = Number(process.env.QOS_UDP_PORT ?? 5051);
  const host = process.env.QOS_BIND ?? '127.0.0.1';
  if (![port, udpPort].every(value => Number.isInteger(value) && value > 0 && value <= 65535)) throw new Error('Puerto inválido');
  const http = createApp().listen(port, host, () => console.log(`Throughput HTTP: ${host}:${port}`));
  http.requestTimeout = 30000;
  http.headersTimeout = 10000;
  const udp = createEchoServer();
  const close = () => {
    http.close(); http.closeAllConnections();
    try { udp.close(); } catch { /* Puede no haber llegado a vincular el puerto. */ }
  };
  const failed = error => { console.error(error.message); process.exitCode = 1; close(); };
  http.on('error', failed);
  udp.on('error', failed);
  udp.bind(udpPort, host, () => console.log(`Eco UDP: ${host}:${udpPort}`));
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
}
