import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';

test('hosted settings keep the configured origin and private files isolated', async () => {
  const listener = net.createServer();
  listener.listen(0, '127.0.0.1'); await once(listener, 'listening');
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  const data = await mkdtemp(join(tmpdir(), 'scholar-server-test-'));
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', PUBLIC_ORIGIN: 'https://persona.example', SCHOLAR_DATA_DIR: data, SCHOLAR_DISABLE_MODEL: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const exited = once(child, 'exit');
  try {
    await Promise.race([
      once(child.stdout, 'data'),
      exited.then(() => { throw new Error('Server exited before starting'); }),
      new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('Server startup timed out')), 5000); timer.unref(); }),
    ]);
    const base = `http://127.0.0.1:${port}`;
    const statusForHost = host => new Promise((resolve, reject) => {
      http.get({ hostname: '127.0.0.1', port, path: '/healthz', headers: { Host: host } }, res => { res.resume(); resolve(res.statusCode); }).on('error', reject);
    });
    assert.equal((await fetch(base + '/healthz')).status, 200);
    assert.equal(await statusForHost('persona.example'), 200);
    assert.equal(await statusForHost('unconfigured.example'), 403);
    assert.equal((await fetch(base + '/.data/call-budget.json')).status, 404);
    const request = { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://persona.example' }, body: JSON.stringify({ input: '' }) };
    assert.equal((await fetch(base + '/api/resolve', request)).status, 400);
    assert.equal((await fetch(base + '/api/resolve', { ...request, headers: { ...request.headers, Origin: 'https://elsewhere.example' } })).status, 403);
    const status = await fetch(base + '/api/status').then(r => r.json());
    assert.equal(status.configured, false);
    assert.equal(status.calls, 0);
  } finally {
    child.kill(); await exited;
    await rm(data, { recursive: true, force: true });
  }
});
