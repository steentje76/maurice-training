/* fGymsRlsSecurity.test.js — P0-001 regressietest.
 * Doel: voorkomen dat public.gyms ooit weer publiek/anon leesbaar wordt
 * gemaakt zonder dat een release daarop knalt.
 *
 * Twee lagen:
 *  1) STATISCHE CONTRACT-CHECK (altijd actief, geen netwerk nodig):
 *     - migratie_v496.sql moet de permissieve policy "gyms_read" verwijderen.
 *     - geen enkel bestand in de repo mag een nieuwe CREATE POLICY toevoegen
 *       die public.gyms weer met USING (true) voor anon/public opent.
 *  2) LIVE-CHECK (optioneel, alleen als SUPABASE_URL + SUPABASE_ANON_KEY
 *     in de environment staan — bijv. in een CI-stap met secrets):
 *     echte anonieme REST-call naar /rest/v1/gyms?select=owner_email,
 *     coach_pin_hash,mollie_customer_id moet een LEGE array of een
 *     401/403 opleveren. Zonder credentials: zichtbaar "SKIPPED — reason",
 *     nooit stilzwijgend als PASS geteld.
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

// ---------------------------------------------------------------------------
// LAAG 1 — statische contract-check (altijd actief)
// ---------------------------------------------------------------------------
(function staticContractCheck() {
  const migPath = path.join(ROOT, 'migratie_v496.sql');
  ok(fs.existsSync(migPath), 'migratie_v496.sql bestaat (P0-001 fix aanwezig in repo)');
  if (fs.existsSync(migPath)) {
    const sql = fs.readFileSync(migPath, 'utf8');
    ok(/DROP\s+POLICY\s+IF\s+EXISTS\s+gyms_read\s+ON\s+public\.gyms/i.test(sql),
      'migratie_v496.sql verwijdert de permissieve gyms_read-policy');
  }

  // Doorzoek alle migratiebestanden op een regressie: een nieuwe policy die
  // public.gyms weer met USING (true) voor anon/public zou openen.
  const sqlFiles = fs.readdirSync(ROOT).filter(f => /^migratie_v\d+\.sql$/.test(f));
  let regressionFound = false;
  const dangerousPattern = /CREATE\s+POLICY\s+\S*gyms\S*\s+ON\s+public\.gyms[\s\S]{0,200}USING\s*\(\s*true\s*\)/i;
  sqlFiles.forEach(f => {
    const content = fs.readFileSync(path.join(ROOT, f), 'utf8');
    if (dangerousPattern.test(content) && f !== 'migratie_v496.sql') regressionFound = true;
  });
  ok(!regressionFound, 'geen migratiebestand voegt een USING(true)-leespolicy voor gyms opnieuw toe');
})();

// ---------------------------------------------------------------------------
// LAAG 2 — live-check (optioneel, alleen met credentials in environment)
// ---------------------------------------------------------------------------
function runLiveCheck() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    skip('SUPABASE_URL/SUPABASE_ANON_KEY niet ingesteld in deze omgeving — live anon-verificatie van public.gyms is niet uitgevoerd. Voer deze test uit met die env-vars (bijv. in een CI-stap met secrets) voor het volledige bewijs.');
    return Promise.resolve();
  }
  const endpoint = url.replace(/\/$/, '') + '/rest/v1/gyms?select=owner_email,coach_pin_hash,mollie_customer_id';
  return fetch(endpoint, { headers: { apikey: anonKey, Authorization: 'Bearer ' + anonKey } })
    .then(async (res) => {
      if (res.status === 401 || res.status === 403) {
        ok(true, 'anon-request op gyms (gevoelige velden) wordt geblokkeerd met ' + res.status);
        return;
      }
      const body = await res.json().catch(() => null);
      ok(res.status === 200 && Array.isArray(body) && body.length === 0,
        'anon-request op gyms (gevoelige velden) levert 200 met lege array op (RLS deny-all) — status was ' + res.status + ', rijen: ' + (Array.isArray(body) ? body.length : 'n.v.t.'));
    })
    .catch((e) => {
      skip('live-check kon geen verbinding maken (' + String(e.message || e).slice(0, 80) + ') — netwerktoegang tot Supabase ontbreekt mogelijk in deze omgeving.');
    });
}

runLiveCheck().then(() => {
  console.log('fGymsRlsSecurity: ' + pass + ' geslaagd, ' + fail + ' mislukt, ' + skipped + ' skipped');
  if (msgs.length) console.log(msgs.join('\n'));
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
});
