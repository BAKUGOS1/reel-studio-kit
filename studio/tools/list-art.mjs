// Writes src/<slug>/assets/generated/art-ready.js: which Codex pictures (assets/art/) and app captures (ui/) exist, so the
// reel's scene.js loads only those (a missing file is a 404, which fails the HyperFrames check). new-reel.mjs runs it once;
// run it again after saving new art or captures:
//   node studio/tools/list-art.mjs src/<slug>
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './env.mjs';

export function listArt(dir) {
  const pngs = sub => { const d = path.join(dir, sub); return fs.existsSync(d) ? fs.readdirSync(d).filter(f => /\.(png|jpe?g|webp)$/i.test(f) && !f.endsWith('.diff.png')) : []; };
  const art = pngs('assets/art'), ui = pngs('ui');
  fs.mkdirSync(path.join(dir, 'assets/generated'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'assets/generated/art-ready.js'), `window.ART_READY = ${JSON.stringify(art)};\nwindow.UI_READY = ${JSON.stringify(ui)};\n`);
  return { art, ui };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))) {
  const target = process.argv[2]; if (!target) { console.error('Usage: node studio/tools/list-art.mjs src/<slug>'); process.exit(2); }
  const { art, ui } = listArt(path.resolve(ROOT, target));
  console.log('art ready:', art.length ? art.join(', ') : 'none'); console.log('ui ready:', ui.length ? ui.join(', ') : 'none');
}
