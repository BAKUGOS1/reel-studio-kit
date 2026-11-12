// Checks and renders a living-illustration reel with HyperFrames, then lays the mastered mix in and runs QA.
//   node studio/tools/render.mjs src/<slug> --version v1 [--draft] [--force] [--cover-at 9.3]
// Output in reels/<slug>/: <slug>-<version>.mp4 (or draft-preview.mp4), cover-<version>.png,
// contact-sheet-<version>.png and quality-report-<version>.json, plus <slug>-<version>-ig.mp4 (no music bed, for Instagram,
// where the song is added at upload) when mix.mjs wrote mix-ig.wav. A finished version is never overwritten without --force.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { args, ROOT } from './env.mjs';
import { syncRuntime } from './runtime.mjs';

const ffmpeg = createRequire(import.meta.url)('ffmpeg-static');
const a = args();
const reel = path.resolve(ROOT, a._[0] || ''), slug = path.basename(reel);
if (!fs.existsSync(path.join(reel, 'index.html'))) { console.error('Usage: render.mjs src/<slug> --version v1 [--draft]'); process.exit(1); }
for (const f of ['assets/generated/mix.wav', 'assets/generated/reel-data.js']) if (!fs.existsSync(path.join(reel, f))) { console.error(`Missing ${f}. Run: node studio/tools/mix.mjs ${path.relative(ROOT, reel)}`); process.exit(1); }
const draft = !!a.draft, version = a.version || 'v1', outDir = path.join(ROOT, 'reels', slug);
const final = path.join(outDir, draft ? 'draft-preview.mp4' : `${slug}-${version}.mp4`);
if (!draft && fs.existsSync(final) && !a.force) { console.error(`${path.relative(ROOT, final)} exists. Use a new --version, or --force to replace an unpublished file.`); process.exit(1); }
fs.mkdirSync(outDir, { recursive: true });
syncRuntime(reel);

// HyperFrames needs ffmpeg and ffprobe on PATH; winget installs them into WinGet\Links.
const env = { ...process.env };
const links = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Links');
if (fs.existsSync(links)) env.PATH = links + path.delimiter + (env.PATH || env.Path || '');
// The pinned CLI from node_modules, run with this Node: no shell, no network install.
const hfBin = path.join(ROOT, 'node_modules/hyperframes/bin/hyperframes.mjs');
const hf = (...argv) => spawnSync(process.execPath, [hfBin, ...argv], { cwd: reel, env, encoding: 'utf8', maxBuffer: 64e6 });

// The check sometimes fails only because its own browser did not exit in time ("Browser process did not exit after forced
// shutdown", seen about 1 run in 3 on a 4-core server with every sample passing). That says nothing about
// the reel, so it is tried again after a 15 s pause (back-to-back tries failed three in a row), up to five times. Any other finding stops the render at once.
let report;
for (let attempt = 1; attempt <= 5; attempt++) {
  const check = hf('check', '--json'), json = check.stdout.slice(check.stdout.indexOf('{'));
  try { report = JSON.parse(json); } catch { console.error(check.stdout.slice(-2000), check.stderr.slice(-2000)); process.exit(1); }
  if (report.ok) break;
  const found = [...(report.errors || []), ...Object.values(report).flatMap(v => (v && Array.isArray(v.findings) ? v.findings : []).filter(f => f.severity === 'error'))];
  const onlyShutdown = found.length > 0 && found.every(f => /did not exit after forced shutdown/i.test(f.message || ''));
  if (onlyShutdown && attempt < 5) { console.warn(`HyperFrames check: its browser did not shut down cleanly (try ${attempt} of 5), checking again in 15 s...`); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 15000); continue; }
  console.error('HyperFrames check failed:\n' + found.map(e => `- ${e.code}: ${e.message}${e.fix ? ' Fix: ' + e.fix : ''}`).join('\n')); process.exit(1);
}
for (const w of report.warnings || []) console.warn(`warning ${w.code}: ${w.message}`);

const raw = path.join(os.tmpdir(), `${slug}-${Date.now()}.mp4`);
// Parallel Chrome workers: HF_WORKERS (or --workers N), else HyperFrames' "auto". A 4-core server works well with 4:
// measured on a draft reel: auto picked 3 = 64.9 s, 4 = 55.3 s, 6 or 8 = 54 s, identical output.
const workers = String(a.workers || process.env.HF_WORKERS || 'auto');
const r = hf('render', '--output', raw, '--fps', '30', '--quality', draft ? 'draft' : 'high', '--workers', workers);
if (r.status !== 0 || !fs.existsSync(raw)) { console.error(r.stdout.slice(-3000), r.stderr.slice(-3000)); process.exit(1); }

const run = argv => { const p = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...argv], { encoding: 'utf8', maxBuffer: 64e6 }); if (p.status !== 0) throw new Error(p.stderr); return p; };
// The mastered mix replaces whatever the browser mixed, so loudness is exactly what mix.mjs measured.
// Re-encoded at CRF 19 (visually clean, about a fifth of HyperFrames' "high" size), so exports stay well under
// GitHub's 100 MB file limit; Instagram recompresses uploads anyway.
run(['-i', raw, '-i', path.join(reel, 'assets/generated/mix.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-crf', draft ? '24' : '19', '-preset', draft ? 'veryfast' : 'slow', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '48000', '-b:a', '192k', '-shortest', '-movflags', '+faststart', final]);
fs.rmSync(raw);

const info = spawnSync(ffmpeg, ['-hide_banner', '-i', final], { encoding: 'utf8' }).stderr;
const dur = (m => m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0)(info.match(/Duration: (\d+):(\d+):([\d.]+)/));
const loud = spawnSync(ffmpeg, ['-hide_banner', '-i', final, '-af', 'ebur128=peak=true,silencedetect=n=-45dB:d=0.6', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 64e6 }).stderr;
const I = +([...loud.matchAll(/^\s+I:\s+(-?[\d.]+) LUFS/gm)].pop() || [])[1], TP = +([...loud.matchAll(/^\s+Peak:\s+(-?[\d.]+) dBFS/gm)].pop() || [])[1];
const silences = [...loud.matchAll(/silence_start: ([\d.]+)/g)].map(m => +m[1]);
const tag = draft ? 'draft' : version;
// The cover is frame 0 unless --cover-at <seconds> picks a stronger frame (e.g. the fully decorated moment).
run([...(a['cover-at'] ? ['-ss', String(a['cover-at'])] : []), '-i', final, '-frames:v', '1', path.join(outDir, `cover-${tag}.png`)]);
const step = Math.max(.5, dur / 24);
run(['-i', final, '-vf', `fps=1/${step.toFixed(3)},scale=270:480,tile=6x4`, '-frames:v', '1', path.join(outDir, `contact-sheet-${tag}.png`)]);
// The Instagram file: the same picture with mix-ig.wav, the master without the music bed, because
// the song is added in Instagram at upload. Finals only; mix.mjs writes mix-ig.wav whenever the reel has a bed.
const igMix = path.join(reel, 'assets/generated/mix-ig.wav'), igFile = final.replace(/\.mp4$/, '-ig.mp4');
let ig = null;
if (!draft && fs.existsSync(igMix)) {
  if (fs.existsSync(igFile) && !a.force) { console.error(`${path.relative(ROOT, igFile)} exists. Use a new --version, or --force.`); process.exit(1); }
  run(['-i', final, '-i', igMix, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-ar', '48000', '-b:a', '192k', '-shortest', '-movflags', '+faststart', igFile]);
  const l = spawnSync(ffmpeg, ['-hide_banner', '-i', igFile, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 64e6 }).stderr;
  ig = { file: path.relative(ROOT, igFile).replaceAll('\\', '/'), use: 'Instagram: add the song in the app at upload', integratedLUFS: +([...l.matchAll(/^\s+I:\s+(-?[\d.]+) LUFS/gm)].pop() || [])[1], truePeakDBFS: +([...l.matchAll(/^\s+Peak:\s+(-?[\d.]+) dBFS/gm)].pop() || [])[1] };
}
const q = { file: path.relative(ROOT, final).replaceAll('\\', '/'), duration: dur, video: /Video: h264.*yuv420p.*1080x1920/.test(info) ? 'H.264 yuv420p 1080x1920' : 'UNEXPECTED', audio: /Audio: aac.*48000 Hz/.test(info) ? 'AAC 48 kHz' : 'UNEXPECTED', fps: /30 fps/.test(info) ? 30 : 'check', integratedLUFS: I, truePeakDBFS: TP, silencesOver600ms: silences, ...(ig ? { instagram: ig } : {}), hyperframesWarnings: (report.warnings || []).map(w => w.code), checkedAt: new Date().toISOString(), limits: 'Measured, not heard. Watch and listen on a phone before posting.' };
fs.writeFileSync(path.join(outDir, `quality-report-${tag}.json`), JSON.stringify(q, null, 2) + '\n');
console.log(`${q.file}  ${dur.toFixed(2)} s  ${q.video}  ${q.audio}  ${I} LUFS  TP ${TP} dBFS  silences: ${silences.length}`);
if (ig) console.log(`${ig.file}  (no music bed, for Instagram: add the song in the app)  ${ig.integratedLUFS} LUFS  TP ${ig.truePeakDBFS} dBFS`);
