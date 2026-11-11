import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../dist/', import.meta.url));
const base = process.argv.find(arg => arg.startsWith('--base='))?.slice(7) || '/';
const port = Number(process.env.DEMO_PORT) || 4192;
const mime = { '.html':'text/html', '.mjs':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.woff':'font/woff', '.jpg':'image/jpeg', '.png':'image/png' };
http.createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (!path.startsWith(base)) { res.writeHead(404); return res.end(); }
  const file = resolve(root, '.' + '/' + decodeURIComponent(path.slice(base.length) || 'index.html'));
  if (!file.startsWith(resolve(root) + '/') && !file.startsWith(resolve(root) + '\\')) { res.writeHead(404); return res.end(); }
  try { const bytes = await readFile(file); res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' }); res.end(bytes); }
  catch { res.writeHead(404); res.end(); }
}).listen(port, '127.0.0.1', () => console.log(`Static demo: http://127.0.0.1:${port}${base}`));
