// Find and add ElevenLabs voices for casting.
//   node studio/tools/el-voices.mjs mine                         voices already in the account
//   node studio/tools/el-voices.mjs search --lang hi --gender female --age middle_aged [--q "warm mother"] [--use narrative_story]
//   node studio/tools/el-voices.mjs add <public_owner_id> <voice_id> --name "Mummy (My brand)"
//   node studio/tools/el-voices.mjs credits                      characters used and left this month
// Search results print preview URLs: listen before casting. Nothing here spends credits.
import { requireKey, args } from './env.mjs';

const API = 'https://api.elevenlabs.io';
const key = requireKey();
const a = args();
const cmd = a._[0];

async function call(path, init = {}) {
  const res = await fetch(API + path, { ...init, headers: { 'xi-api-key': key, 'Content-Type': 'application/json', ...(init.headers || {}) } });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${path}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

if (cmd === 'mine') {
  const { voices = [] } = await call('/v2/voices?page_size=100');
  for (const v of voices) console.log(`${v.voice_id}  ${v.name}  [${v.category}]  ${Object.values(v.labels || {}).join(', ')}`);
} else if (cmd === 'search') {
  const q = new URLSearchParams({ page_size: String(a.n || 25), language: a.lang || 'hi' });
  for (const [flag, param] of [['gender', 'gender'], ['age', 'age'], ['use', 'use_cases'], ['q', 'search'], ['accent', 'accent']]) if (a[flag]) q.set(param, a[flag]);
  const { voices = [] } = await call('/v1/shared-voices?' + q);
  for (const v of voices) console.log([`${v.name}`, `owner=${v.public_owner_id} voice=${v.voice_id}`, `${v.gender || ''} ${v.age || ''} ${v.accent || ''} ${v.use_case || ''}`.trim(), v.descriptive || '', v.preview_url || ''].join('\n  ') + '\n');
  if (!voices.length) console.log('No matches. Loosen a filter (age, gender) or try --q.');
} else if (cmd === 'add') {
  const [, owner, voice] = a._;
  if (!owner || !voice || !a.name) { console.error('Usage: add <public_owner_id> <voice_id> --name "Role (My brand)"'); process.exit(1); }
  const out = await call(`/v1/voices/add/${owner}/${voice}`, { method: 'POST', body: JSON.stringify({ new_name: a.name }) });
  console.log('Added. voice_id for cast.json:', out.voice_id);
} else if (cmd === 'credits') {
  const s = await call('/v1/user/subscription');
  console.log(`Plan ${s.tier}: ${s.character_count} of ${s.character_limit} characters used; resets ${new Date(s.next_character_count_reset_unix * 1000).toISOString().slice(0, 10)}.`);
} else {
  console.log('Commands: mine | search [--lang hi --gender --age --use --q] | add <owner> <voice> --name | credits');
}
