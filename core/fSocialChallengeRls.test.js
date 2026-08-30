/* fSocialChallengeRls.test.js — MS-F9-02 regressietest. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v505.sql'), 'utf8');

ok(migratie.includes("metric_type in ('completed_sessions_count')"),
  'A1: de database-CHECK-constraint staat uitsluitend completed_sessions_count toe');

ok(migratie.includes('starts_at date not null') && migratie.includes('ends_at date not null'),
  'B1: starts_at/ends_at zijn DATE-kolommen, geen timestamptz');

ok(!/create policy social_challenge_participants[\s\S]{0,80}for update/i.test(migratie),
  'C1: geen enkele UPDATE-policy voor social_challenge_participants');

const participantsTableMatch = migratie.match(/create table if not exists public\.social_challenge_participants[\s\S]*?\);/);
ok(!!participantsTableMatch && !participantsTableMatch[0].includes('role text'),
  'C2: social_challenge_participants heeft geen rol-kolom');

ok(migratie.includes('not public.social_is_blocked_pair(auth.uid(), c.creator_id)'),
  'D1: de join-policy controleert expliciet op een block met de creator');

ok(migratie.includes('group_id is null or public.social_is_group_member(auth.uid(), group_id)'),
  'E1: de leespolicy vereist membership voor group-scoped challenges');

ok(/social_challenges_lezen[\s\S]{0,50}using\s*\(\s*auth\.uid\(\) is not null/i.test(migratie),
  'F1: social_challenges_lezen vereist auth.uid() IS NOT NULL');

console.log('fSocialChallengeRls: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
