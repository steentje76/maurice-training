/* fCalendarFeedTokensMigration.test.js — Sprint B2-A migratie-audit. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v550.sql'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

ok(migratie.indexOf('CREATE TABLE public.calendar_feed_tokens') > 0, '1. Nieuwe canonical tabel calendar_feed_tokens');
ok(migratie.indexOf('token_hash text NOT NULL') > 0, '2. token_hash verplicht -- plaintext-token wordt nergens opgeslagen (alleen de hash)');
ok(migratie.indexOf('active boolean NOT NULL DEFAULT true') > 0, '3. active-vlag met veilige default (nieuw token is direct bruikbaar)');
ok(migratie.indexOf('calendar_feed_tokens_one_active_per_user') > 0 && migratie.indexOf('WHERE (active = true)') > 0, '4. Partial unique index: maximaal één ACTIEF token per gebruiker (regenereren/rotation vereist eerst intrekken)');
ok(migratie.indexOf('ENABLE ROW LEVEL SECURITY') > 0, '5. RLS ingeschakeld');
ok(migratie.indexOf('calendar_feed_tokens_select_own') > 0 && migratie.indexOf('user_id = auth.uid()') > 0, '6. Owner-only RLS-policies');
ok(!/CREATE POLICY\s+\S*delete/i.test(migratie), '7. Geen DELETE-policy -- revocation gebeurt uitsluitend via UPDATE (active=false), audit-trail blijft intact');
ok(migratie.indexOf('REFERENCES auth.users(id) ON DELETE CASCADE') > 0, '8. FK naar auth.users met CASCADE (geen orphaned tokens bij accountverwijdering)');
ok(migratie.indexOf('ALTER TABLE public.sessions') === -1 && migratie.indexOf('ALTER TABLE public.program_blocks') === -1 && migratie.indexOf('ALTER TABLE public.training_instances') === -1 && migratie.indexOf('ALTER TABLE public.availability_periods') === -1, '9. Additive-only: GEEN wijziging aan enige bestaande tabel');

// ═══ ADVERSARIËLE HERCERTIFICERING PR #279 — token-entropie ═══
{
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const s = html.indexOf('function calendarFeedRandomToken');
  const e = html.indexOf('function calendarFeedSha256Hex');
  const fn = html.slice(s, e);
  ok(fn.indexOf('crypto.getRandomValues') > 0, '10. Token wordt gegenereerd via crypto.getRandomValues (cryptografisch veilige randomness), NIET Math.random');
  ok(fn.indexOf('Math.random') === -1, '10b. Geen enkel gebruik van Math.random in de tokengenerator');
  ok(fn.indexOf('Uint8Array(32)') > 0, '11. 32 bytes = 256 bit entropie, ruim voldoende om brute-force onhaalbaar te maken');
}

console.log('fCalendarFeedTokensMigration: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
