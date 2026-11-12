// Renders single frames of a reel's scene in a headless browser, for checking without a full render.
//   node studio/tools/frames.mjs src/<slug> <out-prefix> <t1> <t2> ...   → <out-prefix>-<t>.png (prefix under .build/ is usual)
import { chromium } from 'playwright'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
const [dir, out, ...times] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.addInitScript(() => { window.__timelines = {}; });
await p.goto(pathToFileURL(path.resolve(dir, 'index.html')).href); await p.waitForTimeout(1500);
for (const t of times) { await p.evaluate(t => { const c = document.getElementById('stage'); Scene.renderAt(c.getContext('2d'), +t); }, t); await p.locator('#stage').screenshot({ path: `${out}-${t}.png` }); }
console.log('errors:', errs.slice(0, 5)); await b.close();
