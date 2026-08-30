/* fSocialSharingRls.test.js — MS-F9-03 regressietest. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v506.sql'), 'utf8');

ok(migratie.includes('training_instance_id uuid references public.training_instances(id)'),
  'A1: social_shared_activities verwijst naar training_instances, geen tweede waarheid');
ok(!/hrv|readiness|recovery_score|bodyweight|cyclus_fase/i.test(migratie.split('SCOPE-BEPERKING')[0]),
  'A2: geen enkel gevoelig veld in de social_shared_activities-tabeldefinitie zelf');

ok(migratie.includes('not public.social_is_blocked_pair(auth.uid(), athlete_id)'),
  'B1: de leespolicy controleert een block, ook voor visibility=public');
ok(/social_shared_activities_lezen[\s\S]*?visibility = 'public'[\s\S]*?visibility = 'connections'/i.test(migratie),
  'B2: zowel public als connections vallen onder de block-check');

ok(!/create policy social_notifications[\s\S]{0,80}for insert/i.test(migratie) &&
   !/create policy social_notifications[\s\S]{0,80}for all/i.test(migratie),
  'C1: geen INSERT/FOR ALL-policy voor social_notifications');
ok(migratie.includes('social_notifications_recipient_leest') && migratie.includes('recipient_id = auth.uid()'),
  'C2: uitsluitend de recipient kan eigen notificaties lezen');
{
  const tabelDef = migratie.match(/create table if not exists public\.social_notifications[\s\S]*?\);/);
  ok(!!tabelDef && !/sensitive|hrv|symptom/i.test(tabelDef[0]),
    'C3: geen gevoelig veld in de notifications-tabeldefinitie');
}

ok(migratie.includes('DEFERRED') && migratie.toLowerCase().includes('push'),
  'D1: push/e-mail-infrastructuur expliciet als DEFERRED gedocumenteerd');

console.log('fSocialSharingRls: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
