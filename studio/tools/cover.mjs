// Renders a reel's designed cover: src/<slug>/cover/cover.html (a 1080×1920 canvas that sets window.__coverReady).
//   node studio/tools/cover.mjs src/<slug> --version v1 [--force]
// Writes reels/<slug>/cover-designed-<version>.png and cover-designed-<version>-grid.png (the centre 1080×1350 the
// Instagram profile grid shows). Refuses to overwrite a version without --force.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { ROOT, args } from './env.mjs';
import { syncRuntime } from './runtime.mjs';

const a = args(), reel = a._[0] && path.resolve(a._[0]), page = reel && path.join(reel, 'cover/cover.html');
if (!page || !fs.existsSync(page)) { console.error('Usage: cover.mjs src/<slug> --version v1  (needs src/<slug>/cover/cover.html)'); process.exit(1); }
const slug = path.basename(reel), version = a.version || 'v1', out = path.join(ROOT, 'reels', slug);
const file = path.join(out, `cover-designed-${version}.png`), grid = path.join(out, `cover-designed-${version}-grid.png`);
if (fs.existsSync(file) && !a.force) { console.error(`${path.relative(ROOT, file)} exists. Use a new --version, or --force.`); process.exit(1); }
fs.mkdirSync(out, { recursive: true }); syncRuntime(reel);

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
try {
  const p = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 }); const errors = [];
  p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(pathToFileURL(page).href); await p.waitForFunction(() => window.__coverReady === true, null, { timeout: 30000 });
  await p.locator('canvas').screenshot({ path: file });
  const art = await p.evaluate(() => window.__coverArt || 'unknown');
  await sharp(file).extract({ left: 0, top: 285, width: 1080, height: 1350 }).toFile(grid);
  console.log(`${path.relative(ROOT, file)} · grid ${path.relative(ROOT, grid)} · art: ${art}${errors.length ? '\n' + errors.join('\n') : ''}`);
} finally { await browser.close(); }
