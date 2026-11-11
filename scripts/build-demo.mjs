import { mkdir, readFile, writeFile, copyFile, cp } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicRoot = join(root, 'public');
const output = join(root, 'dist');
const base = process.argv.find(arg => arg.startsWith('--base='))?.slice(7) || '/';
if (!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(base)) throw new Error('Use an absolute path ending in / for --base.');
await mkdir(join(output, 'data', 'reports'), { recursive: true });
const manifest = JSON.parse(await readFile(join(publicRoot, 'examples.json'), 'utf8'));
let html = await readFile(join(publicRoot, 'index.html'), 'utf8');
html = html.replace('<base href="/">', `<base href="${base}">`).replace('name="scholar-mode" content="live"', 'name="scholar-mode" content="demo"');
await writeFile(join(output, 'index.html'), html);
await writeFile(join(output, '.nojekyll'), '');
for (const file of ['app.mjs', 'styles.css', 'favicon.svg', 'editorial-serif.woff', 'font-license.txt']) await copyFile(join(publicRoot, file), join(output, file));
await cp(join(publicRoot, 'example-assets'), join(output, 'example-assets'), { recursive: true });
await writeFile(join(output, 'data', 'examples.json'), JSON.stringify(manifest, null, 2));
for (const { id } of manifest) {
  const report = JSON.parse(await readFile(join(publicRoot, 'reports', id + '.json'), 'utf8'));
  if (report.papers.some(p => p.abstract)) throw new Error('Public examples must not contain abstract text.');
  if (report.generation.call || report.generation.usage) throw new Error('Private model metadata in public example.');
  if (!report.personProfile?.portrait) throw new Error('Public example has no portrait.');
  report.personProfile.portrait.url = base + report.personProfile.portrait.url.replace(/^\//, '');
  report.url = base + '?report=' + id;
  await writeFile(join(output, 'data', 'reports', id + '.json'), JSON.stringify(report, null, 2));
}
console.log(`Built ${manifest.length} static examples at ${base}. No model or private runtime data included.`);
