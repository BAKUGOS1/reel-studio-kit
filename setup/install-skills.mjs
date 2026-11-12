// Installs the reel skills for Claude Code (and Codex, if you want it).
//   node setup/install-skills.mjs            Claude Code only
//   node setup/install-skills.mjs --codex    also Codex (~/.agents/skills)
//   node setup/install-skills.mjs --core     only the kit's own skills + the three required companions
// 1. Copies this kit's own skills (skills/reel-studio, skills/video-studio) to ~/.claude/skills.
// 2. Runs `npx skills add` for the companion skills, straight from their authors' GitHub repos.
// Safe to run again: it overwrites the kit's own skills with this copy and updates the companions.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const flags = new Set(process.argv.slice(2));
const codex = flags.has('--codex'), core = flags.has('--core');
const SKILLS_CLI = 'skills@1.8.1';

const OWN = ['reel-studio', 'video-studio'];
const COMPANIONS = [
  // Required: the reel-studio skill reads these.
  { repo: 'heygen-com/hyperframes', skills: ['hyperframes', 'hyperframes-cli', 'hyperframes-registry', 'media-use'], why: 'HyperFrames: HTML → video renderer' },
  { repo: 'greensock/gsap-skills', skills: ['gsap-core', 'gsap-timeline', 'gsap-performance'], why: 'GSAP animation' },
  { repo: 'elevenlabs/skills', skills: ['text-to-speech', 'speech-to-text', 'music', 'sound-effects', 'setup-api-key'], why: 'ElevenLabs voice, music, SFX' },
  // Recommended: better motion taste.
  { repo: 'lottiefiles/motion-design-skill', skills: ['motion-design'], why: 'Motion design principles', optional: true },
  { repo: 'kylezantos/design-motion-principles', skills: ['design-motion-principles'], why: 'Timing and easing', optional: true },
  { repo: 'emilkowalski/skills', skills: ['animate', 'choreograph', 'review-animations', 'improve-animations', 'animation-performance', 'emil-design-eng'], why: 'Animation craft', optional: true },
];

const targets = [path.join(os.homedir(), '.claude', 'skills')];
if (codex) targets.push(path.join(os.homedir(), '.agents', 'skills'));

console.log('\n1) Kit skills');
for (const dir of targets) {
  fs.mkdirSync(dir, { recursive: true });
  for (const s of OWN) {
    const src = path.join(ROOT, 'skills', s), dest = path.join(dir, s);
    fs.rmSync(dest, { recursive: true, force: true });
    fs.cpSync(src, dest, { recursive: true });
    console.log(`   ✓ ${s} → ${dest}`);
  }
}

console.log('\n2) Companion skills (from GitHub, via npx skills)');
const agents = codex ? ['claude-code', 'codex'] : ['claude-code'];
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const failed = [];
for (const c of COMPANIONS) {
  if (core && c.optional) continue;
  const argv = ['-y', SKILLS_CLI, 'add', c.repo, '-g', '-y', '--copy', '-a', ...agents, '-s', ...c.skills];
  console.log(`   … ${c.repo}  (${c.why})`);
  const r = spawnSync(npx, argv, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) failed.push(c.repo);
}

console.log(failed.length
  ? `\nDone, but these did not install: ${failed.join(', ')}.\nRun again, or by hand: npx skills add <repo> -g`
  : '\nAll skills installed. Restart Claude Code, then run: npm run studio:doctor');
