// Renders an Instagram carousel built as HTML: every <section class="slide"> in src/<slug>/carousel.html becomes one PNG.
//   node studio/tools/carousel.mjs src/<slug> --version v1 [--force]
// Writes campaigns/<slug>/<version>/slide-01.png … and contact-sheet.png. Slides are 1080×1350 (4:5).
// The page sets window.__slidesReady once its fonts and images have loaded. Refuses to overwrite without --force.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { ROOT, args } from './env.mjs';

const a = args(), src = a._[0] && path.resolve(a._[0]), page = src && path.join(src, 'carousel.html');
if (!page || !fs.existsSync(page)) { console.error('Usage: carousel.mjs src/<slug> --version v1  (needs src/<slug>/carousel.html)'); process.exit(1); }
const slug = path.basename(src), out = path.join(ROOT, 'campaigns', slug, a.version || 'v1');
if (fs.existsSync(out) && !a.force) { console.error(`${path.relative(ROOT, out)} exists. Use a new --version, or --force.`); process.exit(1); }
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
try {
  const p = await browser.newPage({ viewport: { width: 1200, height: 1400 }, deviceScaleFactor: 1 }); const errors = [];
  p.on('pageerror', e => errors.push(e.message)); p.on('requestfailed', r => errors.push('failed: ' + r.url()));
  await p.goto(pathToFileURL(page).href); await p.waitForFunction(() => window.__slidesReady === true, null, { timeout: 30000 });
  const slides = p.locator('section.slide'), n = await slides.count(), files = [];
  for (let i = 0; i < n; i++) { const f = path.join(out, `slide-${String(i + 1).padStart(2, '0')}.png`); await slides.nth(i).screenshot({ path: f }); files.push(f); }
  // Contact sheet: all slides in a row at a third of their size.
  const thumbs = await Promise.all(files.map(f => sharp(f).resize({ width: 360 }).toBuffer()));
  await sharp({ create: { width: 360 * n + 20 * (n - 1), height: 450, channels: 3, background: '#222' } })
    .composite(thumbs.map((b, i) => ({ input: b, left: i * 380, top: 0 }))).png().toFile(path.join(out, 'contact-sheet.png'));
  console.log(`${n} slides → ${path.relative(ROOT, out)}${errors.length ? '\n' + errors.join('\n') : ''}`);
} finally { await browser.close(); }
