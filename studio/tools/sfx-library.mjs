// The studio's sound-effects library: studio/sfx/<category>/<source>-<name>.<ext>
//   node studio/tools/sfx-library.mjs catalog                 measure every file → studio/sfx/catalog.json + studio/sfx/index.html (audition page)
//   node studio/tools/sfx-library.mjs find whoosh fast        search names, categories and tags
//   node studio/tools/sfx-library.mjs fetch                   restore third-party files listed in studio/sfx/sources.json that are missing here
//   node studio/tools/sfx-library.mjs import --kenney <dir> --mixkit <dir> --sonniss <dir>   (one-off: file downloaded packs into categories)
//   node studio/tools/sfx-library.mjs openverse "indian wedding dhol" --cat wedding [--n 4] [--max 12] [--from 0] [--dry]
//                                                             CC0-only search of Openverse (api.openverse.org, no key); adds the
//                                                             top matches as openverse-*.wav with creator and page in sources.json
// Sources and licences: studio/sfx/README.md. Own sounds are made by studio/tools/sfx-synth.mjs.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { args, ROOT } from './env.mjs';

const ffmpeg = createRequire(import.meta.url)('ffmpeg-static');
const LIB = path.join(ROOT, 'studio', 'sfx');
const SOURCES = path.join(LIB, 'sources.json');
const AUDIO = /\.(wav|ogg|mp3|flac|aiff?)$/i;
const a = args();
const cmd = a._[0];

const slug = s => s.normalize('NFKD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 70);
const walk = dir => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]) : [];
const rel = f => path.relative(LIB, f).split(path.sep).join('/');
const ff = argv => spawnSync(ffmpeg, ['-hide_banner', ...argv], { encoding: 'utf8', maxBuffer: 64e6 });
// Third-party files are converted to 48 kHz, 16-bit stereo WAV so every file mixes the same way.
const toWav = (src, dest) => { fs.mkdirSync(path.dirname(dest), { recursive: true }); const r = ff(['-loglevel', 'error', '-y', '-i', src, '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', dest]); if (r.status) throw new Error(r.stderr); };

const LICENCE = {
  own: 'Original (studio/tools/sfx-synth.mjs). Owned outright.',
  kenney: 'CC0 1.0 (public domain), kenney.nl. No attribution needed.',
  mixkit: 'Mixkit Sound Effects Free License: commercial use in videos, no attribution; do not redistribute the files on their own. Git-ignored.',
  sonniss: 'Sonniss GDC 2019 Game Audio Bundle licence: royalty-free, commercial use, no attribution; no resale as sound effects; no AI/ML training. Git-ignored.',
  openverse: 'CC0 1.0 (public domain), found through Openverse (mostly Freesound); creator and source page recorded in sources.json. No attribution needed.',
};
const toWavCut = (src, dest, max, from = 0) => { fs.mkdirSync(path.dirname(dest), { recursive: true }); const r = ff(['-loglevel', 'error', '-y', '-ss', String(from), '-i', src, '-t', String(max), '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', dest]); if (r.status) throw new Error(r.stderr); };

// ---------- import (one-off) ----------
function kenneyCat(pack, base) {
  const b = base.toLowerCase();
  if (pack === 'interface-sounds') return /^glitch/.test(b) ? 'glitch' : /^(confirmation|question|error|bong|pluck)/.test(b) ? 'tone' : /^(drop|glass)/.test(b) ? 'pop' : 'ui';
  if (pack === 'ui-audio') return 'ui';
  if (pack === 'impact-sounds') return /^footstep/.test(b) ? 'foley' : 'impact';
  if (pack === 'casino-audio') return /^card/.test(b) ? 'paper' : /^chip/.test(b) ? 'money' : 'foley';
  if (pack === 'rpg-audio') return /^book/.test(b) ? 'paper' : /coin/.test(b) ? 'money' : 'foley';
  if (pack === 'digital-audio') return 'digital';
  if (pack === 'sci-fi-sounds') return /^(explosioncrunch|lowfrequency_explosion|impactmetal)/.test(b) ? 'impact' : /^(computernoise|forcefield)/.test(b) ? 'glitch' : null;
  return null;
}
function sonnissCat(vendor) {
  const v = vendor.toLowerCase();
  if (/whoosh|zwoosh|swipe|transition|scene switch/.test(v)) return 'whoosh';
  if (/trailer (sound|samples)|spectral density|cymbal/.test(v)) return 'cinematic';
  if (/impact|hits|boom|accents|bass weight|metal hits/.test(v)) return 'impact';
  if (/glitch|dark atmo/.test(v)) return 'glitch';
  if (/clock|alarm/.test(v)) return 'clock';
  if (/coins|money/.test(v)) return 'money';
  if (/camera/.test(v)) return 'camera';
  if (/cartoon/.test(v)) return 'comedy';
  if (/piano mallet/.test(v)) return 'tone';
  if (/retro video game|super fx|video game/.test(v)) return 'digital';
  if (/ui|interface|app fx|text & dialogue/.test(v)) return 'ui';
  if (/foley/.test(v)) return 'foley';
  return 'misc';
}
if (cmd === 'import') {
  const sources = fs.existsSync(SOURCES) ? JSON.parse(fs.readFileSync(SOURCES, 'utf8')) : [];
  const have = new Set(sources.map(s => s.file));
  const add = s => { if (!have.has(s.file)) { sources.push(s); have.add(s.file); } };
  if (a.kenney) for (const f of walk(a.kenney).filter(f => /\.ogg$/i.test(f))) {
    const pack = path.relative(a.kenney, f).split(path.sep)[0], base = path.basename(f, '.ogg'); if (/^preview/i.test(base)) continue;
    const cat = kenneyCat(pack, base); if (!cat) continue;
    const file = `${cat}/kenney-${slug(pack.replace(/-(sounds|audio)$/, ''))}-${slug(base)}.ogg`;
    fs.mkdirSync(path.join(LIB, cat), { recursive: true }); fs.copyFileSync(f, path.join(LIB, file));
    add({ file, source: 'kenney', pack, original: base + '.ogg', url: `https://kenney.nl/assets/${pack}` });
  }
  if (a.mixkit) for (const m of JSON.parse(fs.readFileSync(path.join(a.mixkit, 'mixkit-manifest.json'), 'utf8'))) {
    const file = `${m.cat}/mixkit-${slug(m.title)}-${m.id}.wav`;
    toWav(path.join(a.mixkit, m.file), path.join(LIB, file));
    add({ file, source: 'mixkit', title: m.title, url: `https://assets.mixkit.co/active_storage/sfx/${m.id}/${m.id}.wav` });
  }
  if (a.sonniss) for (const i of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const want = path.join(a.sonniss, `want-${i}.json`); if (!fs.existsSync(want)) continue;
    const zipUrl = `https://ftpmirror.your.org/pub/misc/sonniss2019/Sonniss.com%20-%20GDC%202019%20-%20Game%20Audio%20Bundle%20Part%20${i}of8.zip`;
    for (const e of JSON.parse(fs.readFileSync(want, 'utf8'))) {
      const src = path.join(a.sonniss, 'files', e.dest); if (!fs.existsSync(src)) continue;
      const cat = sonnissCat(e.vendor), vend = slug(e.vendor.split(' - ')[0]).slice(0, 18), pk = slug(e.vendor.split(' - ').slice(1).join(' ')).slice(0, 26);
      const file = `${cat}/sonniss-${vend}-${pk}-${slug(path.basename(e.dest).replace(AUDIO, ''))}.wav`;
      toWav(src, path.join(LIB, file));
      add({ file, source: 'sonniss', vendor: e.vendor, original: e.name.split('/').pop(), zip: zipUrl, entry: { off: e.off, csize: e.csize, method: e.method } });
    }
  }
  sources.sort((x, y) => x.file.localeCompare(y.file));
  fs.writeFileSync(SOURCES, JSON.stringify(sources, null, 1) + '\n');
  console.log(`sources.json: ${sources.length} third-party files`);
}

// ---------- fetch: restore missing third-party files ----------
if (cmd === 'fetch') {
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36';
  const sources = JSON.parse(fs.readFileSync(SOURCES, 'utf8')), tmp = path.join(ROOT, '.build', 'sfx-fetch'); fs.mkdirSync(tmp, { recursive: true });
  const missing = sources.filter(s => !fs.existsSync(path.join(LIB, s.file)));
  console.log(`${missing.length} of ${sources.length} third-party files missing`);
  const kenneyZips = {};
  for (const s of missing) {
    const dest = path.join(LIB, s.file);
    if (s.source === 'mixkit') { const r = await fetch(s.url); if (!r.ok) { console.error('skip', s.file, r.status); continue; } const t = path.join(tmp, 'm.wav'); fs.writeFileSync(t, Buffer.from(await r.arrayBuffer())); toWav(t, dest); }
    if (s.source === 'sonniss') { const r = await fetch(s.zip, { headers: { Range: `bytes=${s.entry.off}-${s.entry.off + 29}` } }); const h = Buffer.from(await r.arrayBuffer()); const start = s.entry.off + 30 + h.readUInt16LE(26) + h.readUInt16LE(28);
      const d = Buffer.from(await (await fetch(s.zip, { headers: { Range: `bytes=${start}-${start + s.entry.csize - 1}` } })).arrayBuffer()); const t = path.join(tmp, 's.wav'); fs.writeFileSync(t, s.entry.method === 0 ? d : zlib.inflateRawSync(d)); toWav(t, dest); }
    if (s.source === 'openverse') { const r = await fetch(s.url); if (!r.ok) { console.error('skip', s.file, r.status); continue; } const t = path.join(tmp, 'o.' + (s.filetype || 'mp3')); fs.writeFileSync(t, Buffer.from(await r.arrayBuffer())); toWavCut(t, dest, s.max || 30, s.from || 0); }
    if (s.source === 'kenney') {
      // kenney.nl hands out a signed link per pack after a page visit; we fetch each pack's zip once and unzip with tar.
      if (!kenneyZips[s.pack]) { const page = await fetch(s.url, { headers: { 'user-agent': UA } }); const cookie = (page.headers.getSetCookie?.() || []).map(c => c.split(';')[0]).join('; ');
        const id = Buffer.from(`assets/${s.pack}`).toString('hex'); const link = await (await fetch(`https://kenney.nl/download-link/${id}`, { headers: { 'user-agent': UA, cookie, referer: s.url } })).json();
        const z = path.join(tmp, `${s.pack}.zip`); fs.writeFileSync(z, Buffer.from(await (await fetch(link.url, { headers: { 'user-agent': UA, cookie, referer: s.url } })).arrayBuffer()));
        const out = path.join(tmp, s.pack); fs.mkdirSync(out, { recursive: true }); spawnSync('tar', ['-xf', z, '-C', out]); kenneyZips[s.pack] = out; }
      const f = walk(kenneyZips[s.pack]).find(f => path.basename(f) === s.original); if (f) { fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(f, dest); }
    }
    console.log(fs.existsSync(dest) ? 'ok  ' : 'FAIL', s.file);
  }
}

// ---------- catalog ----------
const TAGS = {
  whoosh: 'transition cut swipe swish whip move', riser: 'build tension swell before-reveal', impact: 'hit thud boom title-hit punctuation', cinematic: 'trailer hit riser boom drama',
  glitch: 'digital error flash stutter', ui: 'click tap tick toggle interface', pop: 'bubble caption-pop appear', tone: 'ding chime bell success error notification', digital: 'game blip laser powerup',
  phone: 'notification ring buzz vibrate', money: 'coins cash rupees note register shagun', paper: 'page book card diary turn crumple sign', typing: 'keyboard typewriter type-on search',
  camera: 'shutter photo flash', clock: 'tick tock timer alarm countdown deadline', crowd: 'laugh applause cheer party people', comedy: 'drum joke cartoon punchline', heartbeat: 'tension nervous',
  wedding: 'dhol manjira ghungroo baraat shaadi indian', fireworks: 'diwali rocket sutli bomb fuse crackle patakha anar', foley: 'footstep cloth door bag knock', ambience: 'room-tone background rain wind birds city traffic street', misc: '',
};
function measure(f) {
  const r = ff(['-i', f, '-af', 'volumedetect', '-f', 'null', '-']);
  const d = r.stderr.match(/Duration: (\d+):(\d+):([\d.]+)/), mx = r.stderr.match(/max_volume: (-?[\d.]+)/), mn = r.stderr.match(/mean_volume: (-?[\d.]+)/);
  return { seconds: d ? +(+d[1] * 3600 + +d[2] * 60 + +d[3]).toFixed(2) : null, peakDb: mx ? +mx[1] : null, meanDb: mn ? +mn[1] : null };
}
if (cmd === 'catalog') {
  const old = fs.existsSync(path.join(LIB, 'catalog.json')) ? Object.fromEntries(JSON.parse(fs.readFileSync(path.join(LIB, 'catalog.json'), 'utf8')).sounds.map(s => [s.file, s])) : {};
  const files = walk(LIB).filter(f => AUDIO.test(f)).sort();
  const sounds = files.map((f, i) => {
    const file = rel(f), [cat, name] = file.split('/'), source = name.split('-')[0];
    const size = fs.statSync(f).size, prev = old[file];
    const m = prev && prev.bytes === size ? prev : measure(f);
    if (i % 100 === 0) console.log(`measured ${i}/${files.length}`);
    return { file, category: cat, source, name: name.replace(AUDIO, ''), seconds: m.seconds, peakDb: m.peakDb, meanDb: m.meanDb, bytes: size, tags: TAGS[cat] || '', licence: LICENCE[source] ? source : 'unknown' };
  });
  const byCat = {}; for (const s of sounds) (byCat[s.category] ||= []).push(s);
  fs.writeFileSync(path.join(LIB, 'catalog.json'), JSON.stringify({ updated: new Date().toISOString().slice(0, 10), count: sounds.length, licences: LICENCE, sounds }, null, 1) + '\n');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SFX library</title>
<style>:root{--bg:#f7f6f3;--ink:#141414;--mute:#6b6b6b;--line:#e3e1dc;--card:#fff;--acc:#8b1a3a}
@media (prefers-color-scheme:dark){:root{--bg:#121212;--ink:#f1efe9;--mute:#9a978f;--line:#2a2a2a;--card:#1b1b1b;--acc:#e0708f}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.45 system-ui,sans-serif}header{position:sticky;top:0;background:var(--bg);padding:16px;border-bottom:1px solid var(--line);z-index:2}
h1{margin:0 0 8px;font-size:20px}input{width:100%;max-width:520px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--ink);font-size:15px}
nav{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}nav a{color:var(--ink);text-decoration:none;border:1px solid var(--line);border-radius:999px;padding:3px 10px;font-size:12px}
main{padding:8px 16px 60px}h2{margin:26px 0 8px;font-size:16px}h2 small{color:var(--mute);font-weight:400}
.row{display:grid;grid-template-columns:34px 1fr auto;gap:10px;align-items:center;padding:7px 10px;background:var(--card);border:1px solid var(--line);border-radius:10px;margin:5px 0}
.row>button{width:34px;height:34px;border-radius:50%;border:0;background:var(--ink);color:var(--bg);cursor:pointer;font-size:13px}.n{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.m{color:var(--mute);font-size:12px;white-space:nowrap}.src{font-size:11px;border-radius:6px;padding:1px 6px;border:1px solid var(--line);margin-right:6px}.own{border-color:var(--acc);color:var(--acc)}
.copy{cursor:pointer;border:0;background:none;color:var(--mute);font-size:12px;text-decoration:underline}</style>
<header><h1>SFX library <small style="color:var(--mute);font-weight:400">${sounds.length} sounds</small></h1>
<input id="q" placeholder="Search: whoosh, dhol, coins, page, riser…" autocomplete="off"><nav>${Object.keys(byCat).sort().map(c => `<a href="#${c}">${c} ${byCat[c].length}</a>`).join('')}</nav></header>
<main>${Object.keys(byCat).sort().map(c => `<section id="${c}"><h2>${c} <small>${byCat[c].length} · ${esc(TAGS[c] || '')}</small></h2>${byCat[c].map(s => `<div class="row" data-k="${esc((s.file + ' ' + s.tags).toLowerCase())}"><button data-f="${esc(s.file)}" aria-label="Play ${esc(s.name)}">▶</button><div class="n"><span class="src ${s.source === 'own' ? 'own' : ''}">${s.source}</span>${esc(s.name.replace(/^(own|kenney|mixkit|sonniss)-/, ''))}</div><div class="m">${s.seconds ?? '?'} s · pk ${s.peakDb ?? '?'} dB <button class="copy" data-c="studio/sfx/${esc(s.file)}">copy path</button></div></div>`).join('')}</section>`).join('')}</main>
<script>const au=new Audio();let cur=null;document.addEventListener('click',e=>{const b=e.target.closest('button[data-f]');if(b){if(cur===b&&!au.paused){au.pause();b.textContent='▶';return}if(cur)cur.textContent='▶';au.src=b.dataset.f;au.currentTime=0;au.play();b.textContent='■';cur=b;au.onended=()=>b.textContent='▶'}
const c=e.target.closest('.copy');if(c){navigator.clipboard?.writeText(c.dataset.c);c.textContent='copied';setTimeout(()=>c.textContent='copy path',1200)}});
q.oninput=()=>{const v=q.value.toLowerCase().trim().split(/\\s+/);document.querySelectorAll('.row').forEach(r=>r.hidden=!v.every(w=>r.dataset.k.includes(w)));document.querySelectorAll('section').forEach(s=>s.hidden=![...s.querySelectorAll('.row')].some(r=>!r.hidden))}</script></html>`;
  fs.writeFileSync(path.join(LIB, 'index.html'), html);
  console.log(`catalog.json + index.html: ${sounds.length} sounds in ${Object.keys(byCat).length} categories`);
  for (const c of Object.keys(byCat).sort()) console.log(`  ${c.padEnd(10)} ${byCat[c].length}`);
}

// ---------- find ----------
if (cmd === 'find') {
  const words = a._.slice(1).map(w => w.toLowerCase());
  const { sounds } = JSON.parse(fs.readFileSync(path.join(LIB, 'catalog.json'), 'utf8'));
  const hits = sounds.filter(s => words.every(w => (s.file + ' ' + s.tags).toLowerCase().includes(w)));
  for (const s of hits.slice(0, +(a.limit || 40))) console.log(`studio/sfx/${s.file}  ${s.seconds}s  pk ${s.peakDb}dB`);
  console.log(`${hits.length} match${hits.length === 1 ? '' : 'es'}`);
}
// ---------- openverse: add CC0 recordings ----------
// Only license=cc0 results are taken, so nothing needs attribution and every file can live in git. The API needs no key;
// anonymous use is rate-limited, so this asks for one page per query.
if (cmd === 'openverse') {
  const q = a._.slice(1).join(' '), cat = a.cat, n = +(a.n || 4), max = +(a.max || 12);
  if (!q || !cat) { console.error('usage: sfx-library.mjs openverse "<query>" --cat <category> [--n 4] [--max 12] [--dry]'); process.exit(1); }
  const res = await fetch(`https://api.openverse.org/v1/audio/?q=${encodeURIComponent(q)}&license=cc0&page_size=20`, { headers: { 'user-agent': 'ReelStudioKit/1.0 (sound library builder)' } });
  if (!res.ok) { console.error('Openverse', res.status, (await res.text()).slice(0, 200)); process.exit(1); }
  // Wikimedia's LL-Q… files are word-pronunciation recordings, not sound effects: leave them out. --pick 0,2 takes listed indices.
  const all = (await res.json()).results.filter(r => r.license === 'cc0' && r.url && !/^LL-Q[0-9]/.test(r.title || '')), from = +(a.from || 0);
  const ids = a.ids ? String(a.ids).split(',') : null;
  const hits = ids ? all.filter(r => ids.some(id => String(r.id).startsWith(id))) : a.pick ? String(a.pick).split(',').map(Number).map(i => all[i]).filter(Boolean) : all.slice(0, n);
  if (ids && hits.length < ids.length) console.log(`  note: ${ids.length - hits.length} id(s) no longer in the results for "${q}"`);
  console.log(`${all.length} CC0 results for "${q}"`);
  const sources = fs.existsSync(SOURCES) ? JSON.parse(fs.readFileSync(SOURCES, 'utf8')) : [], have = new Set(sources.map(s => s.file));
  const tmp = path.join(ROOT, '.build', 'sfx-fetch'); fs.mkdirSync(tmp, { recursive: true });
  for (const r of hits) {
    const file = `${cat}/openverse-${slug(r.title || 'sound').slice(0, 48)}-${String(r.id).slice(0, 8)}.wav`;
    console.log(`${a.dry ? 'would add' : 'add'}  [${all.indexOf(r)}] ${file}  id ${String(r.id).slice(0, 8)}  ${((r.duration || 0) / 1000).toFixed(1)} s  by ${r.creator || '?'} (${r.source})`);
    if (a.dry || have.has(file)) continue;
    const d = await fetch(r.url); if (!d.ok) { console.error('  skip', d.status); continue; }
    const t = path.join(tmp, 'o.' + (r.filetype || 'mp3')); fs.writeFileSync(t, Buffer.from(await d.arrayBuffer())); toWavCut(t, path.join(LIB, file), max, from);
    sources.push({ file, source: 'openverse', title: r.title, creator: r.creator || null, license: 'cc0', license_url: r.license_url, page: r.foreign_landing_url, provider: r.source, url: r.url, filetype: r.filetype, max, from });
  }
  if (!a.dry) { sources.sort((x, y) => x.file.localeCompare(y.file)); fs.writeFileSync(SOURCES, JSON.stringify(sources, null, 1) + '\n'); console.log('Run: node studio/tools/sfx-library.mjs catalog'); }
}
if (!['import', 'fetch', 'catalog', 'find', 'openverse'].includes(cmd)) console.log('usage: sfx-library.mjs catalog | find <words> | fetch | openverse "<query>" --cat <category> | import --kenney <dir> --mixkit <dir> --sonniss <dir>');
