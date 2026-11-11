import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Use an existing Playwright installation; this optional QA script installs nothing.
const modulePath = process.env.PLAYWRIGHT_MODULE || join(process.env.LOCALAPPDATA, 'hermes/node/node_modules/@playwright/cli/node_modules/playwright/index.mjs');
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE || join(process.env.LOCALAPPDATA, 'ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe');
const { chromium } = await import(pathToFileURL(modulePath).href);
const root = fileURLToPath(new URL('../', import.meta.url));
const base = process.env.DEMO_ORIGIN || 'http://127.0.0.1:4192/scholar-persona/';
const manifest = JSON.parse(await readFile(join(root, 'public/examples.json'), 'utf8'));
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true });
const errors = [], requests = [], checks = [];
page.on('pageerror', e => errors.push(e.message));
page.on('request', r => requests.push(r.url()));
const check = name => { checks.push(name); console.log('PASS ' + name); };
const fit = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Horizontal overflow');
const images = async () => assert.ok(await page.locator('.person-picture img').evaluate(img => img.complete && img.naturalWidth > 0));
try {
  await page.goto(base); await page.locator('#example-links a').first().waitFor();
  assert.equal(await page.locator('#search-form').isVisible(), false);
  assert.equal(await page.locator('#example-links a').count(), 3);
  check('Static home has examples and no paid-generation form');
  for (const sample of manifest) {
    await page.goto(base + '?report=' + sample.id);
    await page.locator('#report').waitFor({ state: 'visible' });
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.person-picture img').waitFor(); await images();
    assert.match(await page.locator('.portrait-opening h2').innerText(), new RegExp(sample.match.en));
    assert.ok(await page.locator('.person-achievements a').count());
    assert.ok(await page.locator('.person-picture figcaption a').count());
    check(`${sample.authorName}: direct report link, portrait, achievements and credit`);
    for (const width of [320, 390, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
      await fit();
      await page.locator('#lang-zh').click(); await fit();
      await page.locator('#lang-en').click();
    }
    check(`${sample.authorName}: both languages fit five viewport widths`);
  }
  await page.locator('.connection [data-paper]').first().click();
  assert.ok(await page.locator('.paper[open]').count());
  assert.match(await page.locator('.paper[open] .paper-detail').innerText(), /original analysis/);
  check('Citations reveal paper metadata and abstract-source notice');
  const download = page.waitForEvent('download');
  await page.locator('[data-action="download"]').click();
  assert.match(await readFile(await (await download).path(), 'utf8'), /Life|https:\/\//);
  check('Portrait download includes source links');
  await page.reload(); await page.locator('#report').waitFor({ state: 'visible' }); await images();
  await page.locator('[data-action="back"]').click();
  assert.equal(new URL(page.url()).search, '');
  await page.locator('#example-links a').first().click(); await page.locator('#report').waitFor({ state: 'visible' });
  await page.goBack(); await page.locator('#home').waitFor({ state: 'visible' });
  check('Refresh, back action and browser history work under the project path');
  assert.equal(requests.some(url => /\/api\//.test(url)), false);
  assert.equal(errors.length, 0, errors.join('\n'));
  check('Static browsing makes no API requests and has no browser errors');
  await mkdir(join(root, '.data'), { recursive: true });
  await writeFile(join(root, '.data/release-qa.json'), JSON.stringify({ checkedAt: new Date().toISOString(), checks, errors }, null, 2));
} finally { await browser.close(); }
