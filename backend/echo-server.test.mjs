import test from 'node:test';
import assert from 'node:assert/strict';
import dgram from 'node:dgram';
import { once } from 'node:events';
import { createEchoServer, validProbe } from './echo-server.mjs';

test('el servidor devuelve exactamente el identificador enviado', async t => {
  const server = createEchoServer();
  const client = dgram.createSocket('udp4');
  t.after(() => { client.close(); server.close(); });
  server.bind(0, '127.0.0.1');
  await once(server, 'listening');
  const payload = Buffer.from('NQ1:12345678-1234-1234-1234-123456789abc');
  const received = once(client, 'message', { signal: AbortSignal.timeout(2000) });
  client.send(payload, server.address().port, '127.0.0.1');
  const [response] = await received;
  assert.deepEqual(response, payload);
});

test('rechaza mensajes ajenos, truncados o demasiado grandes', () => {
  assert.equal(validProbe(Buffer.from('GET / HTTP/1.1')), false);
  assert.equal(validProbe(Buffer.from('NQ1:1234')), false);
  assert.equal(validProbe(Buffer.alloc(1000)), false);
});
