// Copies the browser runtime a reel needs into its assets/lib: GSAP, living.js, the shared stopwatch and the motion kit.
// new-reel.mjs uses it to scaffold; render.mjs runs it before every render so reels pick up runtime fixes.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './env.mjs';

export function syncRuntime(dir) {
  const lib = path.join(dir, 'assets/lib'); fs.mkdirSync(lib, { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'node_modules/gsap/dist/gsap.min.js'), path.join(lib, 'gsap.min.js'));
  fs.copyFileSync(path.join(ROOT, 'studio/lib/living.js'), path.join(lib, 'living.js'));
  fs.copyFileSync(path.join(ROOT, 'studio/shared/stopwatch.js'), path.join(lib, 'stopwatch.js'));
  fs.copyFileSync(path.join(ROOT, 'studio/shared/motion-kit.js'), path.join(lib, 'motion-kit.js'));   // premium motion helpers (playbooks/premium-motion.md)
  const fonts = path.join(dir, 'assets/fonts');
  if (!fs.existsSync(fonts)) fs.cpSync(path.join(ROOT, 'studio/template/assets/fonts'), fonts, { recursive: true });
}
