/* fGymRlsMultiTenant.test.js — MS-F1-01 regressietest.
 * Doel: voorkomen dat de twee MS-F1-01-fixes ooit stilzwijgend worden teruggedraaid:
 *  1) migratie_v497.sql — self-privilege-escalatie via users.gym_role/gym_id/system_role
 *  2) migratie_v498.sql — brede "authenticated"-leestoegang op organizations/teams/
 *     training_groups/seasons/macrocycles/mesocycles/microcycles
 *
 * STATISCHE CONTRACT-CHECK (altijd actief, geen netwerk nodig): bevestigt dat beide
 * migratiebestanden in de repo staan en de juiste DDL bevatten, en dat geen enkel
 * migratiebestand de oude, brede policies opnieuw toevoegt.
 *
 * LIVE-CHECK (optioneel): met SUPABASE_URL + een test-JWT zou hier een echte PATCH
 * naar /rest/v1/users kunnen worden gedaan; dat vereist een test-accountsysteem dat
 * niet veilig in deze repo hoort te staan. In lijn met het bestaande patroon
 * (fGymsRlsSecurity.test.js) blijft live-verificatie daarom OPEN/skip zonder
 * credentials, en is de daadwerkelijke live-validatie voor deze sprint apart
 * uitgevoerd en gedocumenteerd (transactie + rollback, zie MS-F1-01-rapport) i.p.v.
 * hier herhaald te worden met live secrets.
 *
 * GEEN echte gevoelige waarden worden ooit gelogd of getoond.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0, skipped = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }
function skip(label) { skipped++; msgs.push('SKIPPED — reason: ' + label); }

(function staticContractCheck() {
  // --- migratie_v497.sql: privilege-escalatie-trigger ---
  const p497 = path.join(ROOT, 'migratie_v497.sql');
  ok(fs.existsSync(p497), 'migratie_v497.sql bestaat (self-escalatie-fix)');
  if (fs.existsSync(p497)) {
    const sql = fs.readFileSync(p497, 'utf8');
    ok(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.protect_privileged_user_columns/i.test(sql),
      'migratie_v497.sql definieert protect_privileged_user_columns()');
    ok(/NEW\.gym_role\s*:=\s*OLD\.gym_role/i.test(sql) && /NEW\.system_role\s*:=\s*OLD\.system_role/i.test(sql) && /NEW\.gym_id\s*:=\s*OLD\.gym_id/i.test(sql),
      'trigger-functie beschermt gym_role, gym_id EN system_role tegen self-service-wijziging');
    ok(/auth\.role\(\)\s*IS\s+DISTINCT\s+FROM\s*'service_role'/i.test(sql),
      'bescherming geldt alleen voor niet-service_role-aanroepen (gym-team.js blijft werken)');
    ok(/CREATE\s+TRIGGER\s+trg_protect_privileged_user_columns\s+BEFORE\s+UPDATE\s+ON\s+public\.users/i.test(sql),
      'trigger is daadwerkelijk gekoppeld aan BEFORE UPDATE op public.users');
  }

  // --- migratie_v498.sql: membership-scoped RLS ---
  const p498 = path.join(ROOT, 'migratie_v498.sql');
  ok(fs.existsSync(p498), 'migratie_v498.sql bestaat (membership-scoped RLS-fix)');
  if (fs.existsSync(p498)) {
    const sql = fs.readFileSync(p498, 'utf8');
    const tables = ['organizations', 'teams', 'training_groups', 'seasons', 'macrocycles', 'mesocycles', 'microcycles'];
    tables.forEach(t => {
      ok(new RegExp('DROP\\s+POLICY\\s+IF\\s+EXISTS\\s+' + t + '_select_all\\s+ON\\s+public\\.' + t, 'i').test(sql),
        'migratie_v498.sql verwijdert de brede select_all-policy op ' + t);
      ok(new RegExp('CREATE\\s+POLICY\\s+' + t + '_select_(member|member_or_owner)\\s+ON\\s+public\\.' + t, 'i').test(sql),
        'migratie_v498.sql voegt een membership-gescoopte policy toe op ' + t);
    });
    ok(!/CREATE\s+POLICY[\s\S]{0,300}auth\.role\(\)\s*=\s*'authenticated'/i.test(sql),
      'migratie_v498.sql voegt zelf geen nieuwe brede authenticated-only policy toe (commentaar dat de oude policy citeert telt niet mee)');
  }

  // Regressiebescherming: geen enkel migratiebestand mag de oude brede policies terugzetten.
  const sqlFiles = fs.readdirSync(ROOT).filter(f => /^migratie_v\d+\.sql$/.test(f));
  const dangerousBroadPolicy = /CREATE\s+POLICY\s+\S+_select_all\s+ON\s+public\.(organizations|teams|training_groups|seasons|macrocycles|mesocycles|microcycles)[\s\S]{0,200}auth\.role\(\)\s*=\s*'authenticated'/i;
  let regressionFound = false;
  sqlFiles.forEach(f => {
    if (f === 'migratie_v498.sql') return;
    const content = fs.readFileSync(path.join(ROOT, f), 'utf8');
    if (dangerousBroadPolicy.test(content)) regressionFound = true;
  });
  ok(!regressionFound, 'geen ander migratiebestand herintroduceert de brede authenticated-only leespolicy');

  // Regressiebescherming: geen migratiebestand mag de privilege-escalatie-trigger droppen
  // zonder deze direct opnieuw aan te maken (bv. per ongeluk in een toekomstige refactor).
  sqlFiles.forEach(f => {
    if (f === 'migratie_v497.sql') return;
    const content = fs.readFileSync(path.join(ROOT, f), 'utf8');
    if (/DROP\s+TRIGGER[\s\S]{0,60}trg_protect_privileged_user_columns/i.test(content) &&
        !/CREATE\s+TRIGGER\s+trg_protect_privileged_user_columns/i.test(content)) {
      fail('migratie ' + f + ' verwijdert de privilege-escalatie-trigger zonder deze opnieuw aan te maken');
    }
  });
})();

skip('Live PATCH-simulatie tegen /rest/v1/users vereist een veilig testaccountsysteem dat niet in deze repo hoort — live-validatie is apart uitgevoerd (transactie + rollback) en gedocumenteerd in het MS-F1-01-rapport, niet hier herhaald met credentials.');

console.log('fGymRlsMultiTenant: ' + pass + ' geslaagd, ' + fail + ' mislukt, ' + skipped + ' skipped');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
