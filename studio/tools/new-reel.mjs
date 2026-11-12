// Starts a new living-illustration reel as a HyperFrames project.
//   node studio/tools/new-reel.mjs <slug> "<Working title>"
// Creates src/<slug>/ from studio/template, copies the runtime (GSAP, living.js, the shared stopwatch) into assets/lib,
// and leaves the story, voice, cast, timeline and Codex prompt files ready to fill. Exports go to reels/<slug>/.
import fs from 'node:fs';
import path from 'node:path';
import { args, ROOT } from './env.mjs';
import { syncRuntime } from './runtime.mjs';
import { listArt } from './list-art.mjs';

const a = args();
const [slug, title = slug] = a._;
if (!slug || !/^[a-z0-9-]+$/.test(slug)) { console.error('Usage: new-reel.mjs <lowercase-slug> "<Working title>"'); process.exit(1); }
const dest = path.join(ROOT, 'src', slug);
if (fs.existsSync(dest) && !a.force) { console.error(`src/${slug} already exists.`); process.exit(1); }

fs.cpSync(path.join(ROOT, 'studio/template'), dest, { recursive: true });
syncRuntime(dest);
for (const f of ['story.md', 'codex-prompts.md', 'codex-cover-prompt.md', 'voice.md']) {
  const p = path.join(dest, f); if (fs.existsSync(p)) fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replaceAll('{{TITLE}}', title).replaceAll('{{SLUG}}', slug));
}
listArt(dest);   // assets/generated/art-ready.js, which index.html loads (re-run: node studio/tools/list-art.mjs src/<slug>)
fs.writeFileSync(path.join(dest, 'meta.json'), JSON.stringify({ id: slug, name: title, createdAt: new Date().toISOString() }, null, 2) + '\n');
fs.mkdirSync(path.join(ROOT, 'reels', slug), { recursive: true });
console.log(`Created src/${slug}. Next: fill story.md, then codex-prompts.md (your image prompts), then voice.md and cast.json.`);

