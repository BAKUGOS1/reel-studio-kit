// Builds a reel's soundtrack and the timing data its animation reads.
//   node studio/tools/mix.mjs src/<reel>
// Reads src/<reel>/timeline.json (which take of which line plays when, plus effects and music).
// Writes src/<reel>/assets/generated/mix.wav (mastered to the target loudness) and
// src/<reel>/assets/generated/reel-data.js, which sets window.REEL = { fps, duration, cues, captions, mouths }.
// Captions come from each take's forced alignment; mouths are per-frame loudness of each speaker's lines.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { args, ROOT } from './env.mjs';

const ffmpeg = createRequire(import.meta.url)('ffmpeg-static');
const a = args();
const reel = path.resolve(ROOT, a._[0] || '');
const T = JSON.parse(fs.readFileSync(path.join(reel, 'timeline.json'), 'utf8'));
const fps = T.fps || 30, gen = path.join(reel, 'assets', 'generated');
fs.mkdirSync(gen, { recursive: true });
const run = argv => { const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...argv], { encoding: 'utf8', maxBuffer: 64e6 }); if (r.status !== 0) throw new Error(r.stderr || `ffmpeg failed (status ${r.status}, signal ${r.signal}${r.error ? ', ' + r.error.message : ''})`); return r; };
const probe = file => { const r = spawnSync(ffmpeg, ['-hide_banner', '-i', file], { encoding: 'utf8' }); const m = r.stderr.match(/Duration: (\d+):(\d+):([\d.]+)/); if (!m) throw new Error('No duration: ' + file); return +m[1] * 3600 + +m[2] * 60 + +m[3]; };

// Place voice cues: an explicit "at", or "after" another line plus a gap (default 0.25 s).
const placed = [], byLine = {};
let cursor = T.lead ?? 0.15;
for (const c of T.cues) {
  const file = path.join(reel, 'vo', `${c.line}-${c.take || 'a'}.wav`);
  if (!fs.existsSync(file)) throw new Error(`Missing take ${path.relative(ROOT, file)}. Run el-voice.mjs first.`);
  const alignFile = file.replace(/\.wav$/, '.align.json');
  const al = fs.existsSync(alignFile) ? JSON.parse(fs.readFileSync(alignFile, 'utf8')) : null;
  const dur = probe(file);
  const at = c.at ?? (c.after ? byLine[c.after].end : cursor) + (placed.length ? (c.gap ?? 0.25) : 0);
  const cue = { line: c.line, take: c.take || 'a', speaker: al?.speaker || c.speaker || 'narrator', file, at: +at.toFixed(3), end: +(at + dur).toFixed(3), gain: c.gain || 0, align: al, caption: c.caption ?? al?.caption ?? null };
  placed.push(cue); byLine[c.line] = cue; cursor = cue.end;
}
const duration = +(T.duration === 'auto' || !T.duration ? cursor + (T.tail ?? 1.5) : T.duration).toFixed(3);

// Captions: the caption text (often Roman Hinglish) is spread over the aligned spoken words by position.
const captions = placed.filter(c => c.caption !== false).map(c => {
  const said = c.align?.words?.length ? c.align.words : [{ text: '', start: 0, end: c.end - c.at }];
  const text = c.caption || said.map(w => w.text).join(' ');
  // "::" splits a caption into two weights: the words after it are drawn big and bold on their own line.
  const tokens = text.split(/\s+/).filter(Boolean), cut = tokens.indexOf('::');
  const words = tokens.filter(t => t !== '::').map((w, i, all) => {
    const s = said[Math.min(said.length - 1, Math.floor(i * said.length / all.length))];
    const e = said[Math.min(said.length - 1, Math.floor((i + 1) * said.length / all.length - 1e-9))];
    return { w, a: +(c.at + s.start).toFixed(3), b: +(c.at + e.end).toFixed(3), ...(cut >= 0 && i >= cut ? { big: true } : {}) };
  });
  return { line: c.line, speaker: c.speaker, a: c.at, b: c.end, words };
});

// Mouths: per-frame RMS of each take, 0 (closed) to 1 (wide), placed on its speaker's track.
const frames = Math.ceil(duration * fps), mouths = {};
for (const c of placed) {
  const r = run(['-i', c.file, '-af', `aresample=48000,asetnsamples=n=${48000 / fps}:p=0,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-`, '-f', 'null', '-']);
  const db = [...r.stdout.matchAll(/RMS_level=(-?[\d.]+|-inf)/g)].map(m => m[1] === '-inf' ? -90 : +m[1]);
  const track = mouths[c.speaker] || (mouths[c.speaker] = new Array(frames).fill(0));
  const f0 = Math.round(c.at * fps);
  db.forEach((d, i) => { if (f0 + i < frames) track[f0 + i] = Math.max(track[f0 + i], +Math.min(1, Math.max(0, (d + 52) / 40)).toFixed(2)); });
}

// Audio: voices, effects and music in float; music ducks under the voices; then measured mastering.
// With music, each voice is split once more to key the ducking compressor on the bed.
// Two masters come out: mix.wav with the music bed, and mix-ig.wav without it, for Instagram,
// where the song is added in the app at upload (a downloaded song is never baked in). See mixTo() below.
const music = T.music?.file; let useMusic = false, inputs = [], chains = [], labels = [], keys = [], nIn = 0;
// "channels": 2 in timeline.json mixes in stereo: stereo effects keep their movement (whooshes sweep left to right), voices
// sit in the centre, and "pan" (-1 left … 1 right) places an effect. Mono stays the default so older reels re-mix the same.
// (earshot, 7 Nov 2026: a mono reel plays on both speakers and lands about 3 LU louder than its measured −14 LUFS.)
const STEREO = T.channels === 2, LAYOUT = STEREO ? 'stereo' : 'mono';
// An effect can be cut short: "dur" (seconds) trims it with a short fade-out, so long library files (ambiences, ticking) fit a shot;
// "from" (seconds) starts it partway in, so the useful middle of a long file (a rewind, a swell) lands on the cut.
const add = (file, at, gainDb, isVoice, dur, from = 0, pan = 0) => {
  // "from" seeks the input itself (-ss): an atrim=start inside the graph left timestamps that stalled amix (7 Nov 2026).
  const i = nIn++; if (from) inputs.push('-ss', String(from)); inputs.push('-i', file);
  const split = useMusic && isVoice ? `,asplit=2[s${i}][k${i}]` : `[s${i}]`;
  // One atrim for both the start and the length, then reset timestamps.
  const cut = dur ? `,atrim=duration=${dur},asetpts=PTS-STARTPTS` : '';
  const trim = cut + (dur ? `,afade=t=out:st=${Math.max(0, dur - Math.min(0.4, dur / 3)).toFixed(3)}:d=${Math.min(0.4, dur / 3).toFixed(3)}` : '');
  const place = STEREO && pan ? `,stereotools=balance_out=${Math.max(-1, Math.min(1, pan))}` : '';
  // Every layer is padded to the reel's full length before amix: a short layer that ends early can stall amix
  // (7 Nov 2026: one 0.8 s match strike made the mix silent alone, and endless with the others).
  chains.push(`[${i}:a]aresample=48000,aformat=channel_layouts=${LAYOUT}${trim}${place},volume=${gainDb}dB,adelay=${Math.round(at * 1000)}:all=1,apad,atrim=duration=${duration}${split}`);
  labels.push(`[s${i}]`); if (useMusic && isVoice) keys.push(`[k${i}]`);
};
// An effect or the music can be timed to a voice line: { "cue": "07", "edge": "start" | "end", "offset": -0.3 }.
const when = at => typeof at === 'number' ? at : (byLine[at.cue] ? (at.edge === 'end' ? byLine[at.cue].end : byLine[at.cue].at) + (at.offset || 0) : (() => { throw new Error(`Timeline points at unknown line ${at.cue}`); })());
// Builds the graph and masters one version of the soundtrack to gen/<name>; withMusic false leaves the bed out.
function mixTo(withMusic, name) {
inputs = []; chains = []; labels = []; keys = []; nIn = 0; useMusic = withMusic && Boolean(music);
for (const c of placed) add(c.file, c.at, c.gain, true);
for (const s of T.sfx || []) for (const at of [].concat(s.at)) add(path.join(reel, s.file), Math.max(0, when(at)), s.gain ?? -6, false, s.dur, s.from, s.pan);
const pad = `apad,atrim=duration=${duration}`;
if (useMusic) {
  const i = nIn++; inputs.push('-i', path.join(reel, music));
  // music.at starts the bed late (after a planned silence); music.fadeIn softens its entry.
  const mAt = T.music.at ? Math.max(0, when(T.music.at)) : 0, mIn = T.music.fadeIn ?? (mAt ? 1.5 : 0);
  chains.push(`[${i}:a]aresample=48000,aformat=channel_layouts=${LAYOUT},volume=${T.music.gain ?? -16}dB${mIn ? `,afade=t=in:d=${mIn}` : ''},adelay=${Math.round(mAt * 1000)}:all=1,afade=t=out:st=${Math.max(0, duration - 1.2)}:d=1.2,${pad}[bed]`);
  chains.push(T.music.duck === false || !keys.length ? '[bed]anull[duck]' : `${keys.join('')}amix=inputs=${keys.length}:normalize=0,${pad}[key];[bed][key]sidechaincompress=threshold=0.03:ratio=5:attack=15:release=350[duck]`);
  labels.push('[duck]');
}
const mixLabel = '[v]', graph = chains.join(';') + ';' + labels.join('') + `amix=inputs=${labels.length}:normalize=0,${pad}${mixLabel}`;
const pre = path.join(gen, name.replace(/\.wav$/, '-pre.wav')), out = path.join(gen, name);
// -t caps the file at the reel's length whatever the graph does (7 Nov 2026: a runaway graph wrote a 150 GB mix-pre.wav).
// The graph goes through a file: a reel with ~140 placed sounds overflowed Windows' 32 k command line.
const graphFile = pre.replace(/.wav$/, '-graph.txt'); fs.writeFileSync(graphFile, graph);
run([...inputs, '-filter_complex_script', graphFile, '-map', mixLabel, '-t', String(duration), '-ac', STEREO ? '2' : '1', '-c:a', 'pcm_f32le', pre]); fs.rmSync(graphFile, { force: true });
const target = T.master?.lufs ?? -14, ceiling = Math.pow(10, (T.master?.tp ?? -1.5) / 20);
const measure = f => { const o = spawnSync(ffmpeg, ['-hide_banner', '-i', f, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 64e6 }).stderr; const m = [...o.matchAll(/^\s+I:\s+(-?[\d.]+) LUFS/gm)].pop(), p = [...o.matchAll(/^\s+Peak:\s+(-?[\d.]+) dBFS/gm)].pop(); if (!m) throw new Error('Loudness not measured'); return { I: +m[1], TP: p ? +p[1] : null }; };
// The limiter caps sample peaks; inter-sample (true) peaks can still pass, so the ceiling tightens until TP is under target.
const tpTarget = T.master?.tp ?? -1.5;
let gain = target - measure(pre).I, limit = ceiling, got;
for (let pass = 0; pass < 5; pass++) {
  run(['-i', pre, '-af', `volume=${gain.toFixed(2)}dB,alimiter=limit=${limit.toFixed(4)}:attack=1:release=60:level=false`, '-ar', '48000', '-c:a', 'pcm_s16le', out]);
  got = measure(out);
  const loudOk = Math.abs(got.I - target) < 0.3, peakOk = got.TP === null || got.TP <= tpTarget;
  if (loudOk && peakOk) break;
  if (!loudOk) gain += target - got.I;
  if (!peakOk) limit *= Math.pow(10, -(got.TP - tpTarget + 0.2) / 20);
}
fs.rmSync(pre);
return got;
}
const got = mixTo(true, 'mix.wav');
// The Instagram master: the same voices and effects, no bed. A reel without a bed needs no second file.
const igFile = path.join(gen, 'mix-ig.wav'), ig = music ? mixTo(false, 'mix-ig.wav') : null;
if (!music && fs.existsSync(igFile)) fs.rmSync(igFile);

const data = { fps, duration, cues: placed.map(({ line, take, speaker, at, end }) => ({ line, take, speaker, at, end })), captions, mouths };
fs.writeFileSync(path.join(gen, 'reel-data.js'), '// Generated by studio/tools/mix.mjs. Do not edit; change timeline.json and re-run.\nwindow.REEL = ' + JSON.stringify(data) + ';\n');
// Keep the HyperFrames composition's length in step with the soundtrack.
const indexFile = path.join(reel, 'index.html');
if (fs.existsSync(indexFile)) {
  const html = fs.readFileSync(indexFile, 'utf8').replace(/(<[^>]*data-duration-from="reel"[^>]*>)/g, tag => tag.replace(/data-duration="[^"]*"/, `data-duration="${duration}"`));
  fs.writeFileSync(indexFile, html);
}
console.log(`mix.wav ${duration}s, ${got.I} LUFS, true peak ${got.TP} dBFS${ig ? ` · mix-ig.wav (no music, for Instagram) ${ig.I} LUFS, true peak ${ig.TP} dBFS` : ''} · ${placed.length} voice cues · captions ${captions.length} · speakers ${Object.keys(mouths).join(', ')}`);
