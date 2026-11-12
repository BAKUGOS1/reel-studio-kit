// Pull free (CC0) sound effects from Openverse into studio/sfx, then rebuild the catalog and audition page.
//   node studio/tools/sfx-pull.mjs "rain on window" --cat ambience            list the top results (adds nothing)
//   node studio/tools/sfx-pull.mjs "rain on window" --cat ambience --pick 0,2 add results 0 and 2 (cut to 12 s; --max 20 for longer)
//   node studio/tools/sfx-pull.mjs --pack universal                          add a whole pack from studio/sfx/packs/<name>.json
// Only CC0 sounds are taken, so you can use them anywhere without credit. Creators are still recorded in studio/sfx/sources.json.
// No key needed. Openverse limits anonymous use, so packs wait a moment between searches.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { args, ROOT } from './env.mjs';

const a = args();
const lib = path.join(ROOT, 'studio/tools/sfx-library.mjs');
const run = argv => spawnSync(process.execPath, [lib, ...argv], { stdio: 'inherit' }).status;
const wait = ms => new Promise(r => setTimeout(r, ms));
const catalog = () => { console.log('\nRebuilding the catalog…'); run(['catalog']); console.log('Done. Audition: studio/sfx/index.html · search: npm run sfx:find -- <words>'); };

if (a.pack) {
  const file = path.join(ROOT, 'studio/sfx/packs', `${a.pack}.json`);
  if (!fs.existsSync(file)) { console.error(`No pack ${a.pack}. Packs: ${fs.readdirSync(path.dirname(file)).map(f => f.replace('.json', '')).join(', ')}`); process.exit(1); }
  const pack = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(`Pack "${pack.name}": ${pack.items.length} searches. ${pack.about || ''}`);
  for (const it of pack.items) {
    console.log(`\n· ${it.q} → ${it.cat}`);
    run(['openverse', it.q, '--cat', it.cat, '--ids', it.ids.join(','), '--max', String(it.max || 12), ...(it.from ? ['--from', String(it.from)] : [])]);
    await wait(1500);
  }
  catalog();
} else {
  const q = a._.join(' ');
  if (!q || !a.cat) {
    console.log('Usage:\n  npm run sfx:pull -- "<what you want>" --cat <category>            show results\n  npm run sfx:pull -- "<what you want>" --cat <category> --pick 0,2  add them\n  npm run sfx:pull -- --pack universal\nCategories: ' + fs.readdirSync(path.join(ROOT, 'studio/sfx'), { withFileTypes: true }).filter(d => d.isDirectory() && d.name !== 'packs').map(d => d.name).join(', ') + ' (or a new one)');
    process.exit(1);
  }
  const extra = ['--max', String(a.max || 12), ...(a.from ? ['--from', String(a.from)] : [])];
  if (!a.pick) { run(['openverse', q, '--cat', a.cat, '--n', String(a.n || 10), '--dry', ...extra]); console.log('\nAdd the ones you want: --pick 0,2'); }
  else if (run(['openverse', q, '--cat', a.cat, '--pick', String(a.pick), ...extra]) === 0) catalog();
}
