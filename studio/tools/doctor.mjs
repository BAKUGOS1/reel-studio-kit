// Checks that the reel studio can run on this machine. Prints what is missing and how to fix it; changes nothing.
//   npm run studio:doctor            (add -- --online to also test the ElevenLabs key without spending credits)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { args, loadEnv, ROOT } from './env.mjs';

const a = args(), rows = [];
const win = process.platform === 'win32', mac = process.platform === 'darwin';
const ok = (name, pass, detail, fix) => rows.push({ name, pass, detail, fix });
const extraDirs = [path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Links'), path.join(os.homedir(), '.local', 'bin'), '/opt/homebrew/bin', '/usr/local/bin'];
const which = bin => { for (const dir of [...extraDirs, ...(process.env.PATH || process.env.Path || '').split(path.delimiter)]) for (const ext of ['', '.exe', '.cmd']) { const p = path.join(dir, bin + ext); if (dir && fs.existsSync(p)) return p; } return null; };
const install = { ffmpeg: win ? 'winget install --id Gyan.FFmpeg -e' : mac ? 'brew install ffmpeg' : 'sudo apt install ffmpeg', uv: win ? 'winget install --id astral-sh.uv -e' : 'curl -LsSf https://astral.sh/uv/install.sh | sh' };

ok('Node.js 22+', +process.versions.node.split('.')[0] >= 22, process.versions.node, 'Install Node 22 or newer from nodejs.org (HyperFrames needs it).');
for (const dep of ['hyperframes', 'gsap', 'ffmpeg-static', 'playwright', 'sharp']) ok(`npm: ${dep}`, fs.existsSync(path.join(ROOT, 'node_modules', dep)), '', 'Run: npm install  (in this folder)');
const ff = which('ffmpeg'), fp = which('ffprobe');
ok('FFmpeg and FFprobe on PATH (HyperFrames encodes with them)', !!(ff && fp), ff || 'not found', `${install.ffmpeg}  (then open a new terminal)`);
const chromes = win ? ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe']
  : mac ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'] : ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
const chrome = chromes.find(p => fs.existsSync(p));
ok('Chrome (HyperFrames renders in it)', !!chrome, chrome || 'not found', 'Install Google Chrome, or run: npx hyperframes browser ensure');
for (const f of ['Outfit.ttf', 'Kalam-Bold.ttf', 'BodoniModa.ttf', 'CormorantGaramond.ttf']) ok(`Font ${f}`, fs.existsSync(path.join(ROOT, 'studio/template/assets/fonts', f)), '', 'Restore studio/template/assets/fonts from git.');

// Skills count when they are in the user's Claude folder or in this project.
const skillDirs = [path.join(os.homedir(), '.claude', 'skills'), path.join(ROOT, '.claude', 'skills'), path.join(os.homedir(), '.agents', 'skills'), path.join(ROOT, '.agents', 'skills')];
const hasSkill = s => skillDirs.some(d => fs.existsSync(path.join(d, s, 'SKILL.md')));
for (const s of ['reel-studio', 'video-studio']) ok(`Skill ${s}`, hasSkill(s), '', 'Run the setup script: setup/install.ps1 (Windows) or setup/install.sh (Mac/Linux)');
for (const s of ['hyperframes', 'gsap-timeline', 'text-to-speech']) ok(`Skill ${s}`, hasSkill(s), '', 'Run the setup script (it runs npx skills add for the companion skills)');

loadEnv();
const hasKey = !!process.env.ELEVENLABS_API_KEY;
ok('ElevenLabs key in .env', hasKey, hasKey ? 'set (not shown)' : 'empty', 'Copy .env.example to .env and paste your own key after ELEVENLABS_API_KEY=');
if (a.online && hasKey) {
  const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY } }).catch(e => ({ ok: false, status: e.message }));
  let detail = String(res.status); if (res.ok) { const s = await res.json(); detail = `${s.tier}: ${s.character_count}/${s.character_limit} characters used`; }
  ok('ElevenLabs key works', res.ok, detail, '401 means the key is wrong or revoked; make a new one in ElevenLabs settings.');
}
const earshot = process.env.EARSHOT || which('earshot');
ok('earshot (optional: lets the agent "hear" sound timing)', !!earshot, earshot || 'not installed', `Optional: ${install.uv}, then: uv tool install earshot`);
const blender = which('blender') || (win ? ['C:/Program Files/Blender Foundation'] : ['/Applications/Blender.app']).find(p => fs.existsSync(p));
ok('Blender (optional: 2.5D diorama shots)', !!blender, blender || 'not installed', win ? 'Optional: winget install --id BlenderFoundation.Blender -e' : 'Optional: blender.org');

for (const r of rows) console.log(`${r.pass ? '✓' : '✗'} ${r.name}${r.detail ? '  ' + r.detail : ''}${r.pass ? '' : '\n    → ' + r.fix}`);
const required = rows.filter(r => !r.name.includes('optional') && !r.pass);
console.log(required.length ? `\n${required.length} thing(s) to fix before rendering.` : '\nReady.');
process.exitCode = required.length ? 1 : 0;
