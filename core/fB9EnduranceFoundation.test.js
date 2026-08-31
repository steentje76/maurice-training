/* fB9EnduranceFoundation.test.js — B9-01 Endurance Data Foundation.
 * Bewaakt schema/units/enums/FKs, RLS-least-privilege, dataminimalisatie/
 * provenance-onderscheid, dedupe, backward compatibility (sessions blijft
 * ongewijzigd), calculation-architectuur (geen shadow calculation), en
 * account-deletion-completeness (inclusief de bewuste, gedocumenteerde
 * uitzondering voor activity_laps).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v533.sql'), 'utf8');
const deleteAccount = fs.readFileSync(path.join(ROOT, 'netlify/functions/delete-account.js'), 'utf8');

// ---- A. Schema: SI-units expliciet, gesloten enums, FKs, dedupe-unique ----
['distance_meters', 'duration_seconds', 'elevation_gain_meters', 'avg_heart_rate_bpm', 'avg_power_watts', 'avg_cadence_rpm'].forEach(function (veld) {
  ok(migratie.includes(veld), 'A: activities bevat het SI-explicite veld "' + veld + '" (nooit een ongemarkeerd getal)');
});
ok(migratie.includes("sport text not null check (sport in ('running','cycling','rowing','swimming'))"),
  'A2: sport is een gesloten enum met de 4 verplichte foundation-sporten');
ok(migratie.includes("source_provenance text not null check (source_provenance in ('manual','device_measured','provider_derived','trainingskompas_calculated','user_corrected'))"),
  'A3: source_provenance onderscheidt expliciet manual/device_measured/provider_derived/calculated/user_corrected (nooit provider-derived == device-measured verward)');
ok(migratie.includes('user_id uuid not null references auth.users(id) on delete cascade'),
  'A4: activities heeft een verplichte, correcte FK naar auth.users met CASCADE');
ok(migratie.includes('create unique index idx_activities_user_dedupe on public.activities(user_id, dedupe_key) where dedupe_key is not null'),
  'A5: dedupe is uniek per (user_id, dedupe_key), niet globaal uniek (verschillende gebruikers mogen dezelfde provider-ID hebben)');
ok(migratie.includes('create unique index idx_activity_laps_unique on public.activity_laps(activity_id, lap_index)'),
  'A6: laps hebben een stabiele, unieke volgorde per activity');

// ---- B. Geen dubbel-opgeslagen, afgeleide pace/speed op lapniveau (architectuurkeuze) ----
{
  const lapsBlok = migratie.split('create table public.activity_laps')[1].split('alter table public.activity_laps')[0];
  ok(!lapsBlok.match(/pace|speed/i),
    'B1: activity_laps slaat geen pace/speed-kolom op -- deterministisch berekend via core/cardio.js bij weergave, nooit dubbel opgeslagen');
}

// ---- C. athlete_endurance_profile: user-entered strikt gescheiden van calculated ----
ok(migratie.includes('ftp_watts_user_entered numeric') && migratie.includes('ftp_watts_calculated numeric'),
  'C1: user-entered FTP en calculated FTP zijn twee, expliciet gescheiden velden -- nooit onder één veldnaam verstopt');
ok(migratie.includes('calculated_source_calculation_id text') && migratie.includes('calculated_source_calculation_version text'),
  'C2: een calculated waarde draagt expliciet zijn calculation-ID en -versie (traceerbaarheid)');

// ---- D. RLS + least privilege op alle drie tabellen ----
['activities', 'activity_laps', 'athlete_endurance_profile'].forEach(function (tabel) {
  ok(migratie.includes('alter table public.' + tabel + ' enable row level security'),
    'D: RLS is expliciet ingeschakeld op ' + tabel);
  ok(migratie.includes('revoke all on public.' + tabel + ' from anon'),
    'D2: anon heeft geen enkele toegang tot ' + tabel + ' (least privilege vanaf dag 1, geen herhaling van de F13-P2-bevinding)');
});

// ---- E. Geen shadow calculation geintroduceerd ----
ok(!migratie.match(/create (or replace )?function.*critical_speed|create (or replace )?function.*critical_power/i),
  'E1: geen nieuwe Critical Speed/Power-berekening in SQL geintroduceerd -- de bestaande, canonieke core/cardio.js-implementatie blijft de enige bron');
{
  const cardioSrc = fs.readFileSync(path.join(ROOT, 'core/cardio.js'), 'utf8');
  ok(cardioSrc.includes('NOOIT automatisch op trainingsgeschiedenis gewired') || cardioSrc.includes('NOOIT automatisch op trainingsgeschiedenis'),
    'E2: de bestaande, architecturele beperking van criticalSpeed/criticalPower (geen automatische wiring) blijft ongewijzigd gedocumenteerd -- B9-01 heeft dit niet stilzwijgend "opgelost" door automatische integratie toe te voegen');
}

// ---- F. Backward compatibility: sessions-schema zelf niet gewijzigd ----
ok(!migratie.match(/alter table public\.sessions/i),
  'F1: sessions wordt op geen enkele manier gewijzigd -- activities is een aanvullend, parallel model, geen migratie van bestaande data');

// ---- G. Account deletion completeness (inclusief de bewuste activity_laps-uitzondering) ----
ok(deleteAccount.includes("'activities',") && deleteAccount.includes("'athlete_endurance_profile',"),
  'G1: activities en athlete_endurance_profile staan in de generieke USER_DATA_TABLES-lijst (hebben een eigen user_id-kolom)');
ok(!deleteAccount.match(/'activity_laps',/),
  'G2: activity_laps staat NIET in de generieke lijst (heeft geen eigen user_id-kolom -- zou daar een foutieve query genereren)');
ok(deleteAccount.includes('activity_laps staat BEWUST NIET in deze lijst'),
  'G3: de reden voor de activity_laps-uitzondering is expliciet, transparant gedocumenteerd in delete-account.js zelf');

console.log('fB9EnduranceFoundation: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
