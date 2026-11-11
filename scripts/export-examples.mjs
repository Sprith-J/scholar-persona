// Curate only the explicitly listed examples. This uses public biography APIs,
// never the model, and keeps the full analysis evidence in the private data dir.
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { enrichReportPerson } from '../lib/people.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dataRoot = process.env.SCHOLAR_DATA_DIR || join(root, '.data');
const publicRoot = join(root, 'public');
const examples = JSON.parse(await readFile(join(publicRoot, 'examples.json'), 'utf8'));
await mkdir(join(publicRoot, 'example-assets'), { recursive: true });
const attribution = [];
for (const example of examples) {
  const file = join(publicRoot, 'reports', example.id + '.json');
  const privateFile = join(dataRoot, 'reports', example.id, 'report.json');
  let original = await readFile(privateFile, 'utf8').catch(() => readFile(file, 'utf8'));
  // Preserve the local full-text fixture before preparing its public version.
  await mkdir(join(dataRoot, 'release-originals'), { recursive: true });
  await writeFile(join(dataRoot, 'release-originals', example.id + '.json'), original, { flag: 'wx' }).catch(e => { if (e.code !== 'EEXIST') throw e; });
  const report = await enrichReportPerson(JSON.parse(original), { root: dataRoot });
  report.isExample = true;
  report.generation = { mode: 'ai', model: report.generation.model };
  report.papers = report.papers.map(({ abstract, ...paper }) => ({ ...paper, abstractWithheld: Boolean(abstract) || Boolean(paper.abstractWithheld) }));
  report.historicalSources = report.historicalSources.map(({ source, ...entry }) => ({ ...entry,
    source: source ? { title: source.title, url: source.url, wikidata: source.wikidata, checkedAt: source.checkedAt } : null,
  }));
  const person = report.personProfile;
  if (!person?.portrait || !/public domain|cc0|cc by/i.test(person.portrait.license)) throw new Error('A reusable portrait is required for ' + example.authorName);
  const extension = person.portrait.mime === 'image/png' ? 'png' : 'jpg';
  const asset = `example-assets/${person.qid}.${extension}`;
  const source = join(dataRoot, 'people', person.qid, 'portrait.bin');
  await copyFile(source, join(publicRoot, asset));
  person.portrait.url = '/' + asset;
  attribution.push({ person: person.name, qid: person.qid, asset, ...person.portrait,
    sha256: createHash('sha256').update(await readFile(source)).digest('hex'),
    displayChanges: 'Displayed in grayscale with CSS; original file preserved.',
  });
  await writeFile(file, JSON.stringify(report, null, 2) + '\n');
  console.log(`Exported ${example.authorName}: metadata, interpretation, licensed portrait.`);
}
await writeFile(join(publicRoot, 'example-assets', 'attributions.json'), JSON.stringify(attribution, null, 2) + '\n');
