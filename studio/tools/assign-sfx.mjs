// Rank the sound library against the visible event list in scene.js, then optionally apply reviewed matches.
//   node studio/tools/assign-sfx.mjs src/<slug> [--event <id>] [--apply] [--replace] [--allow-unknown]
// Add window.REEL_EVENTS = [{ id, at, query, category, gain, pan, existingSfxIndex? }, ...] to scene.js.
// Ranking and trim search share one Python process so earshot loads its models only once.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { args, ROOT } from './env.mjs';

const a = args(), reel = path.resolve(ROOT, a._[0] || '');
if (!a._[0]) { console.error('Usage: node studio/tools/assign-sfx.mjs src/<slug> [--event <id>] [--apply]'); process.exit(2); }
const sceneFile = path.join(reel, 'scene.js'), timelineFile = path.join(reel, 'timeline.json');
if (!fs.existsSync(sceneFile) || !fs.existsSync(timelineFile)) throw new Error(`Expected scene.js and timeline.json in ${reel}`);
const scene = fs.readFileSync(sceneFile, 'utf8');
const marker = scene.indexOf('window.REEL_EVENTS');
const arrayStart = marker < 0 ? -1 : scene.indexOf('[', marker);
let depth = 0, string = false, escape = false, arrayEnd = -1;
for (let i = arrayStart; i >= 0 && i < scene.length; i++) {
  const ch = scene[i];
  if (string) { if (escape) escape = false; else if (ch === '\\') escape = true; else if (ch === '"') string = false; continue; }
  if (ch === '"') string = true;
  else if (ch === '[') depth++;
  else if (ch === ']' && --depth === 0) { arrayEnd = i; break; }
}
if (arrayStart < 0 || arrayEnd < 0) throw new Error('scene.js must declare window.REEL_EVENTS as a JSON array. Each item needs id, at, query and category.');
const events = JSON.parse(scene.slice(arrayStart, arrayEnd + 1));
const chosen = a.event ? events.filter(e => e.id === a.event) : events;
if (!chosen.length) throw new Error(a.event ? `No scene event named ${a.event}` : 'No scene events to assign');
for (const e of chosen) {
  if (!e.id || typeof e.query !== 'string' || !e.query.trim() || !/^[a-z0-9-]+$/i.test(e.category || '')) throw new Error(`Event needs id, query and a simple category folder name: ${JSON.stringify(e)}`);
  const times = Array.isArray(e.at) ? e.at : [e.at];
  if (!times.length || times.some(t => typeof t !== 'number' || !Number.isFinite(t) || t < 0)) throw new Error(`Event ${e.id} needs a non-negative numeric at time or array of times`);
}

const library = path.join(ROOT, 'studio', 'sfx');
const sources = JSON.parse(fs.readFileSync(path.join(library, 'sources.json'), 'utf8'));
const sourceByFile = new Map(sources.map(s => [s.file.replaceAll('\\', '/'), s.source]));
const ffmpeg = createRequire(import.meta.url)('ffmpeg-static');
const probeSeconds = file => { const m = spawnSync(ffmpeg, ['-hide_banner', '-i', file], { encoding: 'utf8' }).stderr.match(/Duration: (\d+):(\d+):([\d.]+)/); return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0; };
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]);
const licensedSources = new Set(['own', 'kenney', 'openverse', 'mixkit', 'sonniss']);
const payload = chosen.map(e => {
  const dir = path.join(library, e.category);
  if (!fs.existsSync(dir)) throw new Error(`Unknown sound category folder: ${e.category}`);
  const candidates = walk(dir)
    .filter(f => /\.(wav|ogg|mp3|flac|aiff?)$/i.test(f))
    .filter(f => licensedSources.has(sourceByFile.get(path.relative(library, f).split(path.sep).join('/'))));
  if (!candidates.length) throw new Error(`No eligible sounds in ${e.category}; restore the sound kit with sfx-library.mjs fetch if needed`);
  return { event: e, candidates };
});

const toolDir = process.env.EARSHOT_PYTHON ? null : spawnSync('uv', ['tool', 'dir'], { encoding: 'utf8' });
const python = process.env.EARSHOT_PYTHON || (toolDir?.status === 0
  ? path.join(toolDir.stdout.trim(), 'earshot', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')
  : null);
if (!python || !fs.existsSync(python)) throw new Error('Cannot find earshot Python. Install earshot with uv, or set EARSHOT_PYTHON to its environment Python.');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reel-assign-sfx-'));
const inputFile = path.join(tempDir, 'events.json');
try {
  fs.writeFileSync(inputFile, JSON.stringify(payload));
  const py = String.raw`import json, sys
from earshot.search import rank, find
items = json.load(open(sys.argv[1], encoding='utf-8'))
out = []
for item in items:
    event = item['event']
    ranked = rank(item['candidates'], event['query'], top=12)
    selected = next((r for r in ranked['results'] if not r['near_silent'] and r['verdict'] in ('strong', 'plausible')), None)
    if selected is None:
        out.append({'event': event, 'error': 'No audible candidate found', 'ranked': ranked['results']})
        continue
    kind = 'texture' if event.get('texture') else 'auto'
    trims = find(selected['path'], event['query'], top=1, kind=kind)
    segments = trims.get('segments', [])
    out.append({'event': event, 'rank': selected, 'trim': segments[0] if segments else None, 'ranked': ranked['results']})
print(json.dumps(out, ensure_ascii=False))`;
  const result = spawnSync(python, ['-c', py, inputFile], { encoding: 'utf8', maxBuffer: 64e6, env: { ...process.env, EARSHOT_OFFLINE: '1' } });
  if (result.status !== 0) throw new Error(`earshot assignment failed: ${(result.stderr || result.stdout).trim()}`);
  const suggestions = JSON.parse(result.stdout.trim());
  const timeline = JSON.parse(fs.readFileSync(timelineFile, 'utf8'));
  timeline.sfx ||= [];
  for (const s of suggestions) {
    if (s.error) { console.log(`${s.event.id}: ${s.error}`); continue; }
    const relativeLib = path.relative(library, s.rank.path).split(path.sep).join('/');
    const source = sourceByFile.get(relativeLib);
    // Licence-unknown creator packs you add yourself (sources named viewcci or care14) are skipped unless you opt in for a reel with --allow-unknown.
    if ((source === 'viewcci' || source === 'care14') && !a['allow-unknown']) { console.log(`${s.event.id}: best result is licence-unknown ${source}; skipped (pass --allow-unknown to use it)`); continue; }
    // Trim only long files (ambiences, swells). A one-shot plays whole: earshot's window can start after a click's
    // transient (8 Nov 2026: a 0.62 s Kenney switch was trimmed to 0.102–0.150 s, which is digital silence).
    const length = probeSeconds(s.rank.path), long = length > 2;
    const trim = long ? (s.trim || {}) : {};
    const from = Number.isFinite(trim.start) ? trim.start : 0;
    const dur = Number.isFinite(trim.end) && trim.end > from ? trim.end - from : (long ? (s.event.dur || 2) : null);
    // Keep library files in studio/sfx so source/licence tracking and git-ignore rules remain intact.
    const file = path.posix.join('..', '..', 'studio', 'sfx', relativeLib);
    console.log(`${s.event.id} @ ${[].concat(s.event.at).map(t => `${t.toFixed(2)}s`).join(', ')}: ${relativeLib} (${s.rank.verdict}, z=${s.rank.z}); ${dur === null ? `whole file (${length.toFixed(2)} s)` : `from ${from.toFixed(3)}s, dur ${dur.toFixed(3)}s`}`);
    if (!a.apply || !['strong', 'plausible'].includes(s.rank.verdict)) continue;
    const entry = { eventId: s.event.id, file, at: s.event.at, gain: s.event.gain ?? -10, ...(from ? { from } : {}), ...(dur === null ? {} : { dur }), ...(s.event.pan === undefined ? {} : { pan: s.event.pan }) };
    // The event's current sound: one tagged with its id, or the untagged entry named by existingSfxIndex.
    const indexed = Number.isInteger(s.event.existingSfxIndex) ? timeline.sfx[s.event.existingSfxIndex] : null;
    const existing = timeline.sfx.find(x => x.eventId === s.event.id) || indexed;
    if (existing && !a.replace) { console.log(`  kept current assignment; pass --replace only after reviewing the alternative`); continue; }
    // A hand-placed sound without an eventId at the same times would play twice next to the new one.
    const sameTimes = x => JSON.stringify([].concat(x.at)) === JSON.stringify([].concat(s.event.at));
    const clash = !existing && timeline.sfx.find(x => !x.eventId && sameTimes(x));
    if (clash) { console.log(`  skipped: ${clash.file} already plays at these times; set existingSfxIndex to ${timeline.sfx.indexOf(clash)} and pass --replace to swap it`); continue; }
    if (existing) { for (const k of ['from', 'dur', 'pan']) delete existing[k]; Object.assign(existing, entry); } else timeline.sfx.push(entry);
  }
  if (a.apply) fs.writeFileSync(timelineFile, JSON.stringify(timeline, null, 2) + '\n');
  if (!a.apply) console.log('Suggestions only. Review them, then rerun with --apply to write them into timeline.json (the sounds stay in studio/sfx).');
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
