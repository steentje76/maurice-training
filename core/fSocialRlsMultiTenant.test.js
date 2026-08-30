/* fSocialRlsMultiTenant.test.js — MS-F9-01 regressietest.
 *
 * Doel: voorkomen dat de drie live-ontdekte, kritieke MS-F9-01-fixes ooit
 * stilzwijgend worden teruggedraaid. STATISCHE CONTRACT-CHECK (geen netwerk
 * nodig). De daadwerkelijke live-adversarial-validatie is apart uitgevoerd
 * op de productiedatabase (transactie + rollback per scenario), consistent
 * met het bestaande patroon (fGymRlsMultiTenant.test.js).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v503.sql'), 'utf8');

// ---- Fix 1: anonieme-toegang-preventie ----
ok(/social_profiles_lezen_conform_privacy[\s\S]{0,50}using\s*\(\s*auth\.uid\(\) is not null/i.test(migratie),
  'A1: social_profiles_lezen_conform_privacy begint met auth.uid() IS NOT NULL');

// ---- Fix 2: block-check via SECURITY DEFINER, geen directe subquery ----
ok(migratie.includes('social_is_blocked_pair'), 'B1: social_is_blocked_pair-functie bestaat');
ok(/create or replace function public\.social_is_blocked_pair[\s\S]{0,100}security definer/i.test(migratie),
  'B2: social_is_blocked_pair is expliciet SECURITY DEFINER');
ok(/set search_path\s*=\s*public/i.test(migratie), 'B3: de functie heeft een vastgezette search_path');
ok(migratie.includes('not public.social_is_blocked_pair(auth.uid(), social_profiles.user_id)'),
  'B4: de leespolicy gebruikt de SECURITY DEFINER-functie, geen directe subquery');
ok(!/social_profiles_lezen_conform_privacy[\s\S]*?exists\s*\(\s*select 1 from public\.social_blocks b/i.test(migratie),
  'B5: geen teruggekeerde directe EXISTS-subquery-variant');

// ---- Fix 3: geen FOR ALL voor de follower (self-elevation-preventie) ----
ok(!migratie.includes('social_connections_follower_beheer'), 'C1: de oude, kwetsbare FOR ALL-followerpolicy bestaat niet meer');
ok(/create policy social_connections_follower_insert[\s\S]{0,80}for insert/i.test(migratie),
  'C2: de follower heeft uitsluitend een INSERT-policy');
ok(/create policy social_connections_follower_delete[\s\S]{0,80}for delete/i.test(migratie),
  'C3: de follower heeft uitsluitend een DELETE-policy');
ok(/create policy social_connections_followee_accepteren[\s\S]{0,150}for update/i.test(migratie),
  'C4: uitsluitend de followee heeft een UPDATE-policy');

// ---- Fix 4: anon mag social_is_blocked_pair niet uitvoeren ----
ok(/revoke execute on function public\.social_is_blocked_pair\(uuid, uuid\) from anon/i.test(migratie),
  'D1: expliciete REVOKE EXECUTE FROM anon');

// ---- Fix 5: reports blijven vertrouwelijk ----
ok(migratie.includes('social_reports_reporter_lezen_eigen') && migratie.includes('reporter_user_id = auth.uid()'),
  'E1: reporter kan uitsluitend eigen reports lezen');
ok(!/create policy[\s\S]{0,80}on public\.social_reports[\s\S]{0,150}target_user_id = auth\.uid\(\)/i.test(migratie),
  'E2: geen policy geeft target_user_id leestoegang tot reports over zichzelf');
ok(migratie.includes('social_reports_no_self_report'), 'E3: een reporter kan zichzelf niet rapporteren');

console.log('fSocialRlsMultiTenant: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
