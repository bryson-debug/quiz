// Headless check of the full flow at phone / tablet / desktop widths.
// Serves public/ locally, walks intro -> 5 pillars -> gate -> results, checks for
// horizontal overflow, downloads the PDF, and saves screenshots to screenshots/.
//
// Usage: npm run screenshots   (needs Playwright; uses a global install if not local)
//   WIDTHS=390,768,1440 npm run screenshots

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = path.join(root, 'public');
const outDir = path.join(root, 'screenshots');
fs.mkdirSync(outDir, { recursive: true });

function loadPlaywright() {
  const req = createRequire(import.meta.url);
  try { return req('playwright'); } catch { /* fall through */ }
  const globalRoot = execSync('npm root -g').toString().trim();
  return createRequire(`${globalRoot}/`)('playwright');
}
const { chromium } = loadPlaywright();

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ttf': 'font/ttf', '.json': 'application/json',
};
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let file = path.join(pub, decodeURIComponent(url.pathname));
  if (!file.startsWith(pub)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404).end('not found'); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const widths = (process.env.WIDTHS || '360,390,768,1024,1280,1440').split(',').map(Number);
const heights = { 360: 740, 390: 844, 768: 1024, 1024: 768, 1280: 800, 1440: 900 };
// Respect an outbound HTTPS proxy (e.g. CI / cloud sandboxes) but keep the local server direct.
const args = process.env.HTTPS_PROXY ? [`--proxy-server=${process.env.HTTPS_PROXY}`, '--proxy-bypass-list=127.0.0.1;localhost'] : [];
const browser = await chromium.launch({ args });
const problems = [];

async function checkOverflow(page, label) {
  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  if (o.sw > o.cw) problems.push(`${label}: horizontal overflow (${o.sw} > ${o.cw})`);
}

async function shot(page, w, name) {
  await page.waitForTimeout(350); // let transitions settle
  await checkOverflow(page, `${w}px ${name}`);
  await page.screenshot({ path: path.join(outDir, `${w}-${name}.png`), fullPage: true });
}

// Answer pattern -> scores 23, 17, 12, 17, 21: growth = Inclusion & Differentiation.
const PATTERN = [[5, 5, 4, 4, 5], [4, 3, 4, 3, 3], [2, 3, 2, 3, 2], [3, 4, 3, 4, 3], [4, 5, 4, 4, 4]];

for (const w of widths) {
  const context = await browser.newContext({
    viewport: { width: w, height: heights[w] || 900 },
    deviceScaleFactor: w < 768 ? 2 : 1,
    hasTouch: w < 1024,
    ignoreHTTPSErrors: true,
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => problems.push(`${w}px page error: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`${w}px console error: ${m.text()}`); });

  await page.goto(base, { waitUntil: 'networkidle' }).catch(() => page.goto(base));
  await page.evaluate(() => document.fonts.ready);
  await shot(page, w, '1-intro');

  await page.click('[data-action="start"]');
  await page.waitForSelector('.screen--about');
  await shot(page, w, '1b-about');
  await page.click('[data-action="begin"]');
  for (let step = 0; step < 5; step += 1) {
    const next = page.locator('[data-action="next"]');
    if (!(await next.isDisabled())) problems.push(`${w}px pillar ${step + 1}: Next enabled before answering`);
    for (let i = 0; i < 5; i += 1) {
      await page.locator(`.statement >> nth=${i}`).locator(`label >> nth=${PATTERN[step][i] - 1}`).click();
    }
    if (await next.isDisabled()) problems.push(`${w}px pillar ${step + 1}: Next still disabled after answering`);
    if (step === 0) {
      // Rating row must fit on one line without wrapping.
      const tops = await page.locator('.statement >> nth=0').locator('.rating label').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().top));
      if (new Set(tops.map(Math.round)).size !== 1) problems.push(`${w}px: rating buttons wrap`);
      const sizes = await page.locator('.rating label').evaluateAll((els) => els.map((e) => [e.offsetWidth, e.offsetHeight]));
      if (sizes.some(([sw, sh]) => sw < 44 || sh < 44)) problems.push(`${w}px: rating touch target < 44px`);
      await page.evaluate(() => window.scrollTo(0, 0));
      await shot(page, w, '2-question');
    }
    if (step === 2) await shot(page, w, '3-question-inclusion');
    await next.click();
  }

  // Gate: Flodesk may be blocked here, so wait for either the form or the fallback.
  await page.waitForSelector('#screen-heading');
  await shot(page, w, '4-gate');
  await page.waitForSelector('[data-gate-blocked]:not([hidden]), .fd-container form', { timeout: 15000 }).catch(() => {});
  await shot(page, w, '5-gate-after-wait');
  const blockedVisible = await page.locator('[data-gate-blocked]:not([hidden])').count();
  if (blockedVisible) await page.click('[data-action="skip-gate"]');
  else problems.push(`${w}px: Flodesk form rendered; submit manually to test (skipped)`);

  await page.waitForSelector('.screen--results', { timeout: 5000 }).catch(() => problems.push(`${w}px: results not shown`));
  await page.evaluate(() => document.fonts.ready);
  await shot(page, w, '6-results');
  await page.locator('[data-chart]').screenshot({ path: path.join(outDir, `${w}-7-chart.png`) });
  const clipped = await page.locator('[data-chart] .radar-label').evaluateAll((els) => els.some((e) => {
    const r = e.getBoundingClientRect();
    return r.left < 0 || r.right > document.documentElement.clientWidth;
  }));
  if (clipped) problems.push(`${w}px: radar label runs off screen`);

  // Cookie bar dismiss + PDF download (once, at 390).
  if (w === 390) {
    await page.fill('#print-name', 'Test Teacher');
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.click('[data-action="download"]')]);
    const pdfPath = path.join(outDir, download.suggestedFilename());
    await download.saveAs(pdfPath);
    const size = fs.statSync(pdfPath).size;
    console.log(`PDF saved: ${pdfPath} (${size} bytes)`);
    if (download.suggestedFilename() !== 'My-Elementary-Music-Success-Scorecard.pdf') problems.push(`bad PDF filename ${download.suggestedFilename()}`);
  }
  await context.close();
}

// Landscape phone + tablet spot checks of a question screen.
for (const [w, h] of [[844, 390], [1180, 820]]) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  await page.goto(base).catch(() => {});
  await page.click('[data-action="start"]');
  await page.click('[data-action="begin"]');
  await page.waitForSelector('.statement');
  await shot(page, `${w}x${h}`, 'landscape-question');
  await context.close();
}

await browser.close();
server.close();
console.log(problems.length ? `\nIssues:\n- ${problems.join('\n- ')}` : '\nNo issues found.');
console.log(`Screenshots in ${outDir}`);
