// Our own signature sound effects, synthesized here (no samples), so we own them outright.
//   node studio/tools/sfx-synth.mjs            (writes studio/sfx/<category>/own-*.wav, 48 kHz stereo 16-bit)
// Every sound is seeded, so a re-run writes identical files.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './env.mjs';

const SR = 48000, OUT = path.join(ROOT, 'studio', 'sfx');
const TAU = Math.PI * 2;
let seed = 1;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const noise = () => rnd() * 2 - 1;

function buf(sec) { const n = Math.ceil(sec * SR); return { L: new Float32Array(n), R: new Float32Array(n), n }; }
// One-pole filters, state kept per call site.
const lp = () => { let y = 0; return (x, f) => (y += (1 - Math.exp(-TAU * f / SR)) * (x - y)); };
const hp = () => { const l = lp(); return (x, f) => x - l(x, f); };
// State-variable band-pass (Q ~ res), good for swept whooshes.
const bp = () => { let lo = 0, ba = 0; return (x, f, q = 2) => { const F = 2 * Math.sin(Math.PI * Math.min(f, SR / 6) / SR); const hi = x - lo - ba / q; ba += F * hi; lo += F * ba; return ba; }; };
// Simple stereo reverb: a few feedback delays per side.
function reverb(b, mix = .25, size = 1) {
  const taps = [[1557, 1617, 1491, 1422], [1277, 1356, 1188, 1116]].map(s => s.map(d => Math.round(d * size)));
  const out = [b.L, b.R].map((ch, c) => { const lines = taps[c].map(d => ({ d, buf: new Float32Array(d), i: 0 })); const y = new Float32Array(ch.length);
    for (let n = 0; n < ch.length; n++) { let s = 0; for (const l of lines) { const v = l.buf[l.i]; s += v; l.buf[l.i] = ch[n] * .3 + v * .78; l.i = (l.i + 1) % l.d; } y[n] = ch[n] * (1 - mix) + s * mix * .35; } return y; });
  b.L = out[0]; b.R = out[1]; return b;
}
function write(cat, name, b, peakDb = -1) {
  let peak = 0; for (let i = 0; i < b.n; i++) peak = Math.max(peak, Math.abs(b.L[i]), Math.abs(b.R[i]));
  const g = Math.pow(10, peakDb / 20) / (peak || 1), data = Buffer.alloc(44 + b.n * 4);
  data.write('RIFF', 0); data.writeUInt32LE(36 + b.n * 4, 4); data.write('WAVE', 8); data.write('fmt ', 12); data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(2, 22);
  data.writeUInt32LE(SR, 24); data.writeUInt32LE(SR * 4, 28); data.writeUInt16LE(4, 32); data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(b.n * 4, 40);
  // 3 ms fade in/out so nothing clicks.
  const f = Math.round(.003 * SR);
  for (let i = 0; i < b.n; i++) { const e = Math.min(1, i / f, (b.n - 1 - i) / f); data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, b.L[i] * g * e)) * 32767), 44 + i * 4); data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, b.R[i] * g * e)) * 32767), 46 + i * 4); }
  const dir = path.join(OUT, cat); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `own-${name}.wav`), data); console.log(`${cat}/own-${name}.wav  ${(b.n / SR).toFixed(2)} s`);
}
const pan = (b, i, v, p) => { b.L[i] += v * (1 - p) * .5 * 2 ** .5; b.R[i] += v * (1 + p) * .5 * 2 ** .5; };

// --- Whooshes: band-passed noise whose centre sweeps up then down, panning across. ---
function whoosh(name, sec, fLo, fHi, peakAt = .55, panFrom = -.7, panTo = .7, q = 1.6, s = 11) {
  seed = s; const b = buf(sec), f1 = bp(), f2 = bp();
  for (let i = 0; i < b.n; i++) { const t = i / b.n, env = t < peakAt ? Math.pow(t / peakAt, 2.2) : Math.pow(1 - (t - peakAt) / (1 - peakAt), 1.6);
    const fc = fLo + (fHi - fLo) * Math.sin(Math.PI * Math.min(1, t / peakAt) / 2) ** 2 * (t < peakAt ? 1 : 1 - .4 * (t - peakAt) / (1 - peakAt));
    const x = noise(); const v = (f1(x, fc, q) * .7 + f2(x, fc * 2.1, q * 1.4) * .3) * env; pan(b, i, v, panFrom + (panTo - panFrom) * t); }
  write('whoosh', name, reverb(b, .18, .7), -2);
}
whoosh('whoosh-soft', .9, 300, 1800, .6, -.5, .5, 1.2, 3);
whoosh('whoosh-medium', .7, 400, 3200, .5, -.8, .8, 1.6, 5);
whoosh('whoosh-fast', .35, 600, 5000, .45, -.9, .9, 2, 7);
whoosh('whip-pan', .22, 900, 7000, .35, -1, 1, 2.4, 9);
whoosh('swish-paper', .3, 1500, 6500, .3, .3, -.3, 1, 13);

// --- Risers: noise sweep plus a rising tone stack, crescendo, ending dead (the edit cuts on the hit). ---
function riser(name, sec, s = 21) {
  seed = s; const b = buf(sec), f = bp(), h = hp(); let ph = [0, 0, 0];
  for (let i = 0; i < b.n; i++) { const t = i / b.n, env = Math.pow(t, 2.4);
    const fc = 200 * Math.pow(40, t); const nz = f(noise(), fc, 1.3) * .8;
    const base = 110 * Math.pow(4, t * t); let tone = 0; [1, 1.5, 2.01].forEach((m, k) => { ph[k] += TAU * base * m / SR; tone += Math.sin(ph[k]) / (k + 1); });
    const trem = 1 + .35 * Math.sin(TAU * (3 + 14 * t * t) * i / SR);
    const v = h((nz + tone * .25) * env * trem, 60); pan(b, i, v, .35 * Math.sin(TAU * .8 * t)); }
  write('riser', name, reverb(b, .25, 1), -2);
}
riser('riser-1s', 1.0, 21); riser('riser-2s', 2.0, 23); riser('riser-4s', 4.0, 25);
// Reverse swell: a reversed hit + reverb tail, swelling into the downbeat.
{ seed = 31; const b = buf(2.0), f = lp();
  for (let i = 0; i < b.n; i++) { const t = (b.n - i) / SR; const env = Math.exp(-t * 2.2); const v = f(noise(), 2500) * env * .6 + Math.sin(TAU * 55 * t) * Math.exp(-t * 1.5) * .5; pan(b, i, v, 0); }
  write('riser', 'reverse-swell-2s', reverb(b, .45, 1.3), -2); }

// --- Impacts: sub drop + transient click + body noise + tail. ---
function impact(name, sec, f0, f1, body = .5, tail = .3, s = 41, size = 1.2) {
  seed = s; const b = buf(sec), l = lp(); let ph = 0;
  for (let i = 0; i < b.n; i++) { const t = i / SR; const f = f1 + (f0 - f1) * Math.exp(-t * 18); ph += TAU * f / SR;
    const sub = Math.sin(ph) * Math.exp(-t * (3 / sec)); const click = noise() * Math.exp(-t * 400) * .8;
    const nz = l(noise(), 1200) * Math.exp(-t * 9) * body; pan(b, i, sub + click + nz, 0); }
  write('impact', name, reverb(b, tail, size), -1);
}
impact('hit-sub', 1.6, 120, 38, .2, .15, 41);
impact('hit-thud', .7, 180, 60, .6, .1, 43, .6);
impact('hit-cinematic', 3.2, 150, 32, .9, .4, 45, 1.6);
impact('boom-long', 4.5, 90, 28, .7, .5, 47, 2);
// Tape stop: a chord that pitches down to nothing (for "record stops" moments).
{ seed = 51; const b = buf(1.0); let ph = [0, 0, 0];
  for (let i = 0; i < b.n; i++) { const t = i / b.n, sp = Math.pow(1 - t, 1.8); let v = 0; [220, 277.2, 329.6].forEach((f, k) => { ph[k] += TAU * f * sp / SR; v += Math.sin(ph[k]) + .3 * Math.sin(2 * ph[k]); }); pan(b, i, v * .3 * (1 - t * .3), 0); }
  write('glitch', 'tape-stop', b, -3); }

// --- UI: ticks, clicks, pops, key taps. ---
function ping(cat, name, sec, f, decay, partials = [[1, 1]], noiseAmt = 0, s = 61, p = 0) {
  seed = s; const b = buf(sec), h = hp();
  for (let i = 0; i < b.n; i++) { const t = i / SR; let v = 0; for (const [m, a] of partials) v += a * Math.sin(TAU * f * m * t) * Math.exp(-t * decay * (1 + m * .15));
    v += h(noise(), 2000) * Math.exp(-t * 600) * noiseAmt; pan(b, i, v, p); }
  write(cat, name, b, -3);
}
ping('ui', 'tick', .06, 3200, 90, [[1, 1], [2.3, .3]], .6, 61);
ping('ui', 'click-soft', .08, 1800, 70, [[1, 1]], .4, 63);
ping('ui', 'key-tap', .07, 2600, 80, [[1, .4], [3.1, .2]], 1, 65);
// Bubble pop: a fast upward pitch blip.
{ const b = buf(.12); let ph = 0; for (let i = 0; i < b.n; i++) { const t = i / SR; ph += TAU * (380 + 2600 * t / .12) / SR; pan(b, i, Math.sin(ph) * Math.exp(-t * 38), 0); } write('pop', 'pop-bubble', b, -3); }
{ const b = buf(.18); let ph = 0; for (let i = 0; i < b.n; i++) { const t = i / SR; ph += TAU * (900 - 600 * Math.min(1, t / .05)) / SR; pan(b, i, Math.sin(ph) * Math.exp(-t * 30), 0); } write('pop', 'pop-drop', b, -3); }

// --- Tones: the bell ding (a soft bell on D), a double ding, a success chime. ---
const D5 = 587.33, BELL = [[1, 1], [2.76, .45], [5.4, .2], [8.93, .08]];
ping('tone', 'ding-bell', 2.2, D5 * 2, 2.6, BELL, .05, 71);
{ seed = 73; const b = buf(2.4); for (let i = 0; i < b.n; i++) { const t = i / SR; let v = 0;
    for (const [t0, f, p] of [[0, D5 * 2, -.25], [.14, D5 * 3, .25]]) { const u = t - t0; if (u < 0) continue; for (const [m, a] of BELL) v += a * Math.sin(TAU * f * m * u) * Math.exp(-u * 2.8 * (1 + m * .15)) * (1 + p * (b.L === b.R ? 0 : 1)); }
    pan(b, i, v * .6, 0); } write('tone', 'ding-double', reverb(b, .2, .8), -3); }
{ seed = 75; const b = buf(2.6), notes = [1, 5 / 4, 3 / 2, 2]; for (let i = 0; i < b.n; i++) { const t = i / SR; let v = 0;
    notes.forEach((r, k) => { const u = t - k * .075; if (u > 0) for (const [m, a] of BELL) v += a * Math.sin(TAU * D5 * r * m * u) * Math.exp(-u * 3 * (1 + m * .2)); });
    pan(b, i, v * .35, .2 * Math.sin(t * 6)); } write('tone', 'chime-success', reverb(b, .3, 1), -3); }
// Error buzz: two low square-ish blips ("nope").
{ const b = buf(.42); for (let i = 0; i < b.n; i++) { const t = i / SR; const on = (t < .16) || (t > .22 && t < .38); const v = on ? Math.tanh(4 * Math.sin(TAU * 150 * t)) * .5 : 0; pan(b, i, v, 0); } write('tone', 'error-buzz', b, -4); }

// --- Phone buzz: a 170 Hz vibration motor in two pulses (notification arriving). ---
{ seed = 81; const b = buf(1.1), l = lp(); for (let i = 0; i < b.n; i++) { const t = i / SR, on = (t < .4) || (t > .55 && t < .95);
    const env = on ? Math.min(1, ((t < .4 ? t : t - .55)) / .02) : 0; const v = l(Math.sign(Math.sin(TAU * 170 * t)) * .6 + noise() * .2, 900) * env; pan(b, i, v, 0); }
  write('phone', 'phone-buzz', b, -4); }

// --- Glitch: short bit-crushed noise and tone bursts. ---
function glitch(name, sec, s) { seed = s; const b = buf(sec); let hold = 0, hv = 0, f = 400 + rnd() * 2000, ph = 0;
  for (let i = 0; i < b.n; i++) { if (hold-- <= 0) { hold = Math.floor(30 + rnd() * 900); hv = rnd() < .3 ? 0 : 1; f = 200 + rnd() * 4000; }
    ph += TAU * f / SR; const crush = Math.round((Math.sign(Math.sin(ph)) * .5 + noise() * .5) * 4) / 4; pan(b, i, crush * hv * .6, (rnd() - .5) * .8); }
  write('glitch', name, b, -4); }
glitch('glitch-short', .25, 91); glitch('glitch-stutter', .6, 93);

// --- Heartbeat: lub-dub at 70 bpm, two beats. ---
{ const b = buf(1.8); for (let i = 0; i < b.n; i++) { const t = i / SR; let v = 0;
    for (const t0 of [0, .86]) for (const [d, a] of [[0, 1], [.16, .7]]) { const u = t - t0 - d; if (u > 0) v += a * Math.sin(TAU * (55 + 30 * Math.exp(-u * 30)) * u) * Math.exp(-u * 22); }
    pan(b, i, v, 0); } write('heartbeat', 'heartbeat-2', b, -2); }

// --- Wedding colour (instruments as sound, not as music beds): dhol hits, a dhol roll, manjira, ghungroo. ---
function dhol(b, at, low = true, amp = 1) { const s0 = Math.floor(at * SR), l = lp();
  for (let n = 0; n < SR * .6 && s0 + n < b.n; n++) { const t = n / SR; let v;
    if (low) v = Math.sin(TAU * (70 + 60 * Math.exp(-t * 25)) * t) * Math.exp(-t * 7) + l(noise(), 600) * Math.exp(-t * 40) * .4;
    else v = Math.sin(TAU * (330 + 120 * Math.exp(-t * 60)) * t) * Math.exp(-t * 26) * .6 + noise() * Math.exp(-t * 90) * .5;
    pan(b, s0 + n, v * amp, low ? -.15 : .2); } }
{ seed = 101; const b = buf(1.0); dhol(b, 0, true); write('wedding', 'dhol-hit', reverb(b, .15, .8), -1); }
{ seed = 103; const b = buf(.6); dhol(b, 0, false); write('wedding', 'dhol-slap', reverb(b, .12, .6), -2); }
{ seed = 105; const b = buf(2.2); let t = 0, k = 0; while (t < 1.5) { dhol(b, t, k % 2 === 0, .45 + .55 * t / 1.5); t += .12 - .06 * t / 1.5; k++; } dhol(b, 1.55, true, 1.2); dhol(b, 1.55, false, .8); write('wedding', 'dhol-roll-hit', reverb(b, .18, 1), -1); }
// Manjira: two small brass cymbals; inharmonic high partials with a long ring.
{ seed = 107; const b = buf(2.4); for (let i = 0; i < b.n; i++) { const t = i / SR; let v = 0; for (const [f, a, d] of [[2310, 1, 2], [3512, .7, 2.6], [5203, .5, 3.4], [6890, .3, 4.5], [8120, .2, 6]]) v += a * Math.sin(TAU * f * t + f) * Math.exp(-t * d) * (1 + .3 * Math.sin(TAU * 5.5 * t));
    v += noise() * Math.exp(-t * 120) * .4; pan(b, i, v * .3, .25); } write('wedding', 'manjira-ting', reverb(b, .25, 1), -3); }
// Ghungroo: a shake of small bells (many short metallic grains).
{ seed = 109; const b = buf(1.2); for (let g = 0; g < 70; g++) { const at = Math.pow(rnd(), 1.3) * .8, f = 4000 + rnd() * 3500, s0 = Math.floor(at * SR), p = rnd() * 1.4 - .7;
    for (let n = 0; n < SR * .25 && s0 + n < b.n; n++) { const t = n / SR; pan(b, s0 + n, (Math.sin(TAU * f * t) + .5 * Math.sin(TAU * f * 1.48 * t)) * Math.exp(-t * 30) * .15, p); } }
  write('wedding', 'ghungroo-shake', reverb(b, .2, .7), -3); }

// --- Money: a single coin drop and a "ka-ching" register (bell + drawer). ---
{ seed = 111; const b = buf(1.2); for (const [at, f] of [[0, 4200], [.11, 4700], [.19, 4400], [.25, 4900], [.29, 4600]]) { const s0 = Math.floor(at * SR);
    for (let n = 0; n < SR * .5 && s0 + n < b.n; n++) { const t = n / SR; pan(b, s0 + n, (Math.sin(TAU * f * t) + .6 * Math.sin(TAU * f * 2.41 * t) + noise() * Math.exp(-t * 300)) * Math.exp(-t * 14) * .3, .1); } }
  write('money', 'coin-drop', reverb(b, .15, .6), -3); }
{ seed = 113; const b = buf(1.6), l = lp(); for (let i = 0; i < b.n; i++) { const t = i / SR; let v = 0;
    if (t < .12) v += l(noise(), 3000) * .6 * Math.sin(Math.PI * t / .12);           // drawer slide
    const u = t - .1; if (u > 0) for (const [m, a] of BELL) v += a * Math.sin(TAU * 2349 * m * u) * Math.exp(-u * 4 * (1 + m * .2)) * .5;
    pan(b, i, v, 0); } write('money', 'ka-ching', reverb(b, .2, .8), -2); }
// Note count: a fast riffle of paper notes through a counting machine.
{ seed = 115; const b = buf(1.4), h = hp(); for (let k = 0; k < 28; k++) { const s0 = Math.floor((.04 + k * .045) * SR);
    for (let n = 0; n < SR * .03 && s0 + n < b.n; n++) { const t = n / SR; pan(b, s0 + n, h(noise(), 1800) * Math.exp(-t * 160) * .7, .1); } }
  write('money', 'note-count', b, -3); }

console.log('done');
