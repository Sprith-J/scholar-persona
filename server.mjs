import http from 'node:http';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { AppError, resolveIdentity, authorId, loadResearch, historicalSource } from './lib/research.mjs';
import { atomicJSON, modelStatus, generateNarrative } from './lib/model.mjs';
import { enrichReportPerson } from './lib/people.mjs';

const root = fileURLToPath(new URL('./', import.meta.url));
const dataRoot = process.env.SCHOLAR_DATA_DIR || join(root, '.data');
const port = Number(process.env.PORT || process.env.SCHOLAR_PORT) || 4180;
const host = process.env.HOST || '127.0.0.1';
const publicOrigin = process.env.PUBLIC_ORIGIN ? new URL(process.env.PUBLIC_ORIGIN).origin : null;
const allowedHosts = new Set(['127.0.0.1', 'localhost', '[::1]', ...(publicOrigin ? [new URL(publicOrigin).hostname] : [])]);
const allowedOrigins = new Set([`http://127.0.0.1:${port}`, `http://localhost:${port}`, ...(publicOrigin ? [publicOrigin] : [])]);
const publicRoot = join(root, 'public');
const pending = new Map();
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.woff': 'font/woff', '.svg': 'image/svg+xml', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png' };
const reportIdValid = id => /^[0-9a-f-]{36}$/.test(id);
const actionValid = id => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

async function body(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new AppError('invalid-content-type', 'Send JSON.', 415);
  let size = 0; const chunks = [];
  for await (const chunk of req) { size += chunk.length; if (size > 24000) throw new AppError('body-too-large', 'The input is too long.', 413); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new AppError('invalid-json', 'The request could not be read. Try again.'); }
}
const send = (res, status, value) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };

async function readReport(id) {
  if (!reportIdValid(id)) throw new AppError('report-not-found', 'This portrait could not be found.', 404);
  try { return JSON.parse(await readFile(join(dataRoot, 'reports', id, 'report.json'), 'utf8')); }
  catch { throw new AppError('report-not-found', 'This portrait could not be found. Generate it on this device first.', 404); }
}

async function examples() {
  return readFile(join(publicRoot, 'examples.json'), 'utf8').then(JSON.parse).catch(() => []);
}

async function analyze(input, progress) {
  const id = authorId(input.authorId);
  if (!actionValid(input.actionId)) throw new AppError('invalid-action', 'Refresh the page and try again.');
  const requestsRoot = join(dataRoot, 'actions');
  await mkdir(requestsRoot, { recursive: true });
  const actionPath = join(requestsRoot, input.actionId + '.json');
  const prior = await readFile(actionPath, 'utf8').then(JSON.parse).catch(() => null);
  if (prior) {
    if (prior.authorId !== id) throw new AppError('action-conflict', 'This request belongs to another researcher.', 409);
    if (prior.reportId) return readReport(prior.reportId);
    throw new AppError('action-incomplete', 'This request did not finish. Use the form to explicitly try again.', 409);
  }
  await writeFile(actionPath, JSON.stringify({ authorId: id, state: 'started', startedAt: new Date().toISOString() }), { flag: 'wx', mode: 0o600 });
  try {
    const configured = await modelStatus(dataRoot);
    if (!configured.configured) throw new AppError('model-unavailable', 'Portrait generation is not connected. Saved examples remain available.', 503);
    if (!configured.remaining) throw new AppError('budget-exhausted', 'The authorized generation allowance has been used. Saved portraits are still available.', 429);
    const research = await loadResearch(id, { apiKey: process.env.OPENALEX_API_KEY, onProgress: stage => progress({ type: 'progress', stage }) });
    const reportId = randomUUID();
    const folder = join(dataRoot, 'reports', reportId);
    await mkdir(folder, { recursive: true });
    await atomicJSON(join(folder, 'research.json'), research);
    progress({ type: 'progress', stage: 'reading', count: research.papers.length, abstracts: research.corpus.withAbstract });
    const { narrative, generation } = await generateNarrative(research, { root: dataRoot, folder, reportId });
    progress({ type: 'progress', stage: 'sources' });
    const people = [narrative.person, ...narrative.alternatives];
    const bios = await Promise.all(people.map(p => historicalSource(p.wikiTitle)));
    let report = { id: reportId, schema: 'scholar-report-0.1', createdAt: new Date().toISOString(), url: `/report/${reportId}`,
      author: research.author, corpus: research.corpus, papers: research.papers, narrative, generation,
      historicalSources: bios.map((source, index) => ({ name: people[index].name, source, status: source ? 'source-found' : 'source-unavailable' })),
    };
    report = await enrichReportPerson(report, { root: dataRoot });
    await atomicJSON(join(folder, 'report.json'), report);
    await atomicJSON(actionPath, { authorId: id, reportId, state: 'complete' });
    return report;
  } catch (e) {
    await atomicJSON(actionPath, { authorId: id, state: 'failed', code: e.code ?? 'unexpected' });
    throw e;
  }
}

await mkdir(dataRoot, { recursive: true });
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'");
  try {
    if (!allowedHosts.has(String(req.headers.host ?? '').replace(/:\d+$/, ''))) throw new AppError('invalid-host', 'Host is not configured.', 403);
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (req.method === 'POST') {
      const origin = req.headers.origin;
      if (origin && !allowedOrigins.has(origin)) throw new AppError('invalid-origin', 'Open this form from the app’s configured address.', 403);
      if (url.pathname === '/api/resolve') {
        const input = await body(req);
        return send(res, 200, await resolveIdentity(input.input, { apiKey: process.env.OPENALEX_API_KEY }));
      }
      if (url.pathname === '/api/analyze') {
        const input = await body(req);
        if (!actionValid(input.actionId)) throw new AppError('invalid-action', 'Refresh the page and try again.');
        authorId(input.authorId);
        res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' });
        const progress = value => { if (!res.destroyed) res.write(JSON.stringify(value) + '\n'); };
        try {
          let active = pending.get(input.actionId);
          if (active && active.authorId !== input.authorId) throw new AppError('action-conflict', 'This request belongs to another researcher.', 409);
          if (!active) {
            const task = analyze(input, progress);
            active = { authorId: input.authorId, task }; pending.set(input.actionId, active);
            task.finally(() => pending.delete(input.actionId)).catch(() => {});
          }
          const report = await active.task;
          progress({ type: 'result', report });
        } catch (e) { progress({ type: 'error', code: e.code ?? 'unexpected', message: e instanceof AppError ? e.message : 'This portrait could not be completed. Please try again.' }); }
        return res.end();
      }
      throw new AppError('not-found', 'Not found.', 404);
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new AppError('method-not-allowed', 'Method not allowed.', 405);
    if (url.pathname === '/healthz') return send(res, 200, { status: 'ok' });
    if (url.pathname === '/api/status') return send(res, 200, { version: '0.1.0', ...await modelStatus(dataRoot) });
    if (url.pathname === '/api/examples') return send(res, 200, await examples());
    const portraitRequest = /^\/api\/people\/(Q\d{1,14})\/portrait$/.exec(url.pathname);
    if (portraitRequest) {
      const folder = join(dataRoot, 'people', portraitRequest[1]);
      const profile = await readFile(join(folder, 'profile.json'), 'utf8').then(JSON.parse).catch(() => null);
      if (!profile?.portrait) throw new AppError('not-found', 'Portrait not found.', 404);
      const bytes = await readFile(join(folder, 'portrait.bin')).catch(() => null);
      if (!bytes) throw new AppError('not-found', 'Portrait not found.', 404);
      res.writeHead(200, { 'Content-Type': profile.portrait.mime, 'Cache-Control': 'public, max-age=86400' });
      return res.end(req.method === 'HEAD' ? undefined : bytes);
    }
    if (url.pathname.startsWith('/api/reports/')) {
      const id = url.pathname.slice('/api/reports/'.length);
      let report;
      try { report = await readReport(id); } catch (e) {
        report = await readFile(join(publicRoot, 'reports', reportIdValid(id) ? id + '.json' : '__invalid__'), 'utf8').then(JSON.parse).catch(() => null);
        if (!report) throw e;
      }
      return send(res, 200, await enrichReportPerson(report, { root: dataRoot }));
    }
    const path = url.pathname === '/' || /^\/report\/[0-9a-f-]{36}$/.test(url.pathname) ? '/index.html' : decodeURIComponent(url.pathname);
    const file = resolve(publicRoot, '.' + path);
    if (!file.startsWith(resolve(publicRoot) + '\\') && !file.startsWith(resolve(publicRoot) + '/')) throw new AppError('not-found', 'Not found.', 404);
    let bytes;
    try { if (!(await stat(file)).isFile()) throw new Error(); bytes = await readFile(file); }
    catch { throw new AppError('not-found', 'Not found.', 404); }
    res.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream', 'Cache-Control': path.endsWith('.woff') ? 'public, max-age=604800' : 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch (e) {
    if (!res.headersSent) send(res, e.status ?? 500, { code: e.code ?? 'unexpected', message: e instanceof AppError ? e.message : 'Something went wrong. Please try again.' });
    else res.end();
  }
});
server.requestTimeout = 240000;
server.listen(port, host, () => {
  console.log(`Scholar Persona: ${publicOrigin || `http://127.0.0.1:${port}`}`);
  if (process.platform === 'win32' && process.argv.includes('--open')) execFile('rundll32.exe', ['url.dll,FileProtocolHandler', `http://127.0.0.1:${port}`], { windowsHide: true });
});
