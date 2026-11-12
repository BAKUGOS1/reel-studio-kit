// Builds studio/prompt-studio.html: every prompt in the reel-studio skill as an editable card with a copy button.
//   node studio/tools/build-prompt-studio.mjs        (npm run prompts:studio)
// The prompts' source of truth stays in skills/reel-studio/prompts/*.md; re-run after editing them.
// The page is static: no API calls, no tracking. Open it in any browser, fill the [BRACKETS], copy into Codex or Claude.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './env.mjs';

const dir = path.join(ROOT, 'skills/reel-studio/prompts');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

const cards = [];
for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort()) {
  const md = fs.readFileSync(path.join(dir, file), 'utf8');
  const title = (md.match(/^# (.+)$/m) || [, file])[1];
  const intro = md.split('\n').filter(l => l && !l.startsWith('#') && !l.startsWith('```') && !l.startsWith('|')).slice(0, 2).join(' ');
  let section = null, n = 0;
  const parts = md.split(/^```text\n/m);
  for (let i = 1; i < parts.length; i++) {
    const before = parts[i - 1], heading = [...before.matchAll(/^## (.+)$/gm)].pop();
    section = heading ? heading[1] : null;
    const body = parts[i].split(/^```$/m)[0].replace(/\n$/, '');
    cards.push({ id: `${file.replace('.md', '')}-${++n}`, group: title, sub: section, intro: n === 1 ? intro : '', body });
  }
}
const brand = fs.readFileSync(path.join(ROOT, 'skills/reel-studio/references/brand-context.md'), 'utf8').split('```')[1].replace(/^\n/, '');
cards.unshift({ id: 'brand-context', group: 'Brand context block', sub: 'Paste before any strategy, script or caption prompt', intro: '', body: brand.trimEnd() });

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Prompt studio</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{--canvas:#F6F5F2;--paper:#FFFFFF;--tint:#EEEDE8;--ink:#141414;--muted:#3A322B;--accent:#8B1A3A;--pen:#D0213B;--line:#D9D4CB}
@media (prefers-color-scheme:dark){:root{--canvas:#17130F;--paper:#211B16;--tint:#2A231D;--ink:#F3EFE8;--muted:#CFC6BA;--accent:#E0708F;--pen:#FF5A6E;--line:#3A3129}}
*{box-sizing:border-box}body{margin:0;background:var(--canvas);color:var(--ink);font:16px/1.55 Outfit,system-ui,sans-serif}
.wrap{max-width:980px;margin:0 auto;padding:32px 16px 80px}
h1{font:700 clamp(40px,7vw,64px)/1 "Cormorant Garamond",serif;margin:8px 0 6px}h1 em{color:var(--accent)}
.lede{color:var(--muted);max-width:640px;margin:0 0 22px}
.bar{position:sticky;top:0;z-index:5;background:var(--canvas);padding:12px 0;display:flex;gap:10px;flex-wrap:wrap;border-bottom:1px solid var(--line)}
.bar input{flex:1;min-width:220px;font:inherit;padding:10px 14px;border:1.5px solid var(--line);border-radius:12px;background:var(--paper);color:var(--ink)}
.bar a{font-size:14px;color:var(--muted);text-decoration:none;padding:10px 4px}
.card{background:var(--paper);border:1.5px solid var(--line);border-radius:18px;margin:18px 0;overflow:hidden}
.head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:16px 18px;border-bottom:1px solid var(--line)}
.head h2{font:700 24px/1.15 "Cormorant Garamond",serif;margin:0}.head p{margin:4px 0 0;color:var(--muted);font-size:14px}
.sub{display:inline-block;margin-top:6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);font-weight:600}
button{font:600 14px Outfit,sans-serif;background:var(--ink);color:var(--canvas);border:0;border-radius:12px;padding:10px 16px;cursor:pointer;white-space:nowrap}
button.done{background:var(--accent)}
textarea{display:block;width:100%;min-height:220px;border:0;padding:16px 18px;background:var(--tint);color:var(--ink);font:13px/1.7 "JetBrains Mono",monospace;resize:vertical}
textarea:focus{outline:2px solid var(--accent);outline-offset:-2px}
code{font:13px "JetBrains Mono",monospace;background:var(--tint);padding:1px 5px;border-radius:5px}
.hint{font-size:13px;color:var(--muted);padding:8px 18px 14px}
@media (max-width:600px){.head{flex-direction:column}button{width:100%}}
</style></head><body><div class="wrap">
<p class="sub">Reel studio</p>
<h1>Prompt <em>studio</em></h1>
<p class="lede">Every prompt the reel studio uses, ready to fill and copy. Image prompts go to <strong>Codex</strong> (opened in your project folder, with the named references attached). Script, voice, caption and planning prompts go to Claude. Fill the <code>[BRACKETS]</code>; edits here aren't saved, so keep final versions in the reel's folder.</p>
<div class="bar"><input id="q" type="search" placeholder="Filter: cover, voice, mouth, hooks, weekly…" aria-label="Filter prompts"><a href="#brand-context">Context block</a><a href="#01-style-lock-1">Codex</a><a href="#08-elevenlabs-hindi-formatter-1">Voice</a><a href="#10-weekly-command-center-1">Weekly</a></div>
${cards.map(c => `<section class="card" id="${c.id}" data-text="${esc((c.group + ' ' + (c.sub || '') + ' ' + c.body).toLowerCase())}">
<div class="head"><div><h2>${esc(c.group)}</h2>${c.sub ? `<span class="sub">${esc(c.sub)}</span>` : ''}${c.intro ? `<p>${inline(c.intro)}</p>` : ''}</div><button type="button" data-copy="${c.id}-t">Copy prompt</button></div>
<textarea id="${c.id}-t" spellcheck="false" aria-label="${esc(c.group)} prompt">${esc(c.body)}</textarea></section>`).join('\n')}
<p class="hint">Generated from <code>skills/reel-studio/prompts/</code> by <code>npm run prompts:studio</code>. Edit the Markdown, not this page.</p>
</div>
<script>
document.querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',async()=>{const t=document.getElementById(b.dataset.copy);try{await navigator.clipboard.writeText(t.value)}catch(e){t.select();document.execCommand('copy')}const o=b.textContent;b.textContent='Copied';b.classList.add('done');setTimeout(()=>{b.textContent=o;b.classList.remove('done')},1600)}));
document.getElementById('q').addEventListener('input',e=>{const q=e.target.value.trim().toLowerCase();document.querySelectorAll('.card').forEach(c=>{c.hidden=q&&!c.dataset.text.includes(q)})});
</script></body></html>
`;
fs.writeFileSync(path.join(ROOT, 'studio/prompt-studio.html'), html);
console.log(`studio/prompt-studio.html: ${cards.length} prompts`);
