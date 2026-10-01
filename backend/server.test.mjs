import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from './server.mjs';

test('descarga y eco preservan exactamente el tamaño, sin compresión ni caché', async t => {
  const server = createApp().listen(0, '127.0.0.1');
  t.after(() => { server.closeAllConnections(); server.close(); });
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(`${base}/download?bytes=1048576`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-encoding'), null);
  assert.match(response.headers.get('cache-control'), /no-store/);
  const payload = Buffer.from(await response.arrayBuffer());
  assert.equal(payload.length, 1048576);
  const echo = await fetch(`${base}/upload`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: payload });
  assert.equal(echo.headers.get('x-received-bytes'), '1048576');
  assert.deepEqual(Buffer.from(await echo.arrayBuffer()), payload);
  assert.equal((await fetch(`${base}/download?bytes=1`)).status, 400);
  assert.equal((await fetch(`${base}/upload`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: Buffer.alloc(10) })).status, 400);
});
