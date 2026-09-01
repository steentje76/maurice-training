/* fDuplicateSessionPrevention.test.js — F13 Post-Audit Remediation P1-04.
 * Bewaakt dat een verloren HTTP-response + offline-queue-retry nooit een
 * echte duplicate sessions/race_segments-rij kan opleveren: de client
 * genereert vooraf een eigen, stabiel id, en zowel het directe
 * schrijfpad (sbPostQ) als de offline-flush (flushOfflineQueue) gebruiken
 * een idempotente upsert (Prefer: resolution=merge-duplicates) voor die
 * tabellen.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// ---- A. sbPostQ genereert een client-id voor idempotente tabellen ----
{
  const fnBlok = html.split('async function sbPostQ(t,d){')[1].split('async function sbPatchQ')[0];
  ok(fnBlok.includes('newClientRowId()'), 'A1: sbPostQ() genereert een client-side, stabiel id voor de idempotente tabellen vóórdat de POST/queue-toevoeging plaatsvindt');
  ok(fnBlok.includes("resolution=merge-duplicates"), 'A2: sbPostQ() gebruikt de idempotente upsert-header voor die tabellen');
}

// ---- B. De idempotente-tabellenlijst bevat expliciet sessions, race_segments en nutrition_entries ----
ok(html.match(/IDEMPOTENT_TABELLEN_MET_CLIENT_ID\s*=\s*\{\s*sessions:\s*true,\s*race_segments:\s*true,\s*nutrition_entries:\s*true\s*\}/),
  'B1: sessions, race_segments en nutrition_entries (B9-10) staan expliciet in de idempotente-tabellenlijst (alle drie gebruiken een server-gegenereerd/client-gegenereerd uuid, hetzelfde dubbeltel-risico bij een offline-replay)');

// ---- C. flushOfflineQueue() gebruikt DEZELFDE upsert-header voor deze tabellen bij een retry ----
{
  const fnBlok = html.split('async function flushOfflineQueue(){')[1].split('async function wearableSyncSilent')[0];
  ok(fnBlok.includes('resolution=merge-duplicates'), 'C1: flushOfflineQueue() gebruikt ook de idempotente upsert-header -- zonder dit zou een al succesvol geschreven item (response verloren) hier een 409-conflict geven i.p.v. een onschadelijke no-op');
  ok(fnBlok.includes('IDEMPOTENT_TABELLEN_MET_CLIENT_ID[item.table]'), 'C2: flushOfflineQueue() controleert dit per item.table, niet blind voor alle tabellen (voorkomt onbedoeld upsert-gedrag voor tabellen die dit niet verwachten)');
}

// ---- D. newClientRowId() gebruikt crypto.randomUUID() met een veilige fallback (consistent met het bestaande newTrainingInstanceId()-patroon) ----
ok(html.match(/function newClientRowId\(\)\{\s*return\s*\(typeof crypto/),
  'D1: newClientRowId() gebruikt crypto.randomUUID() met een fallback, consistent met het bestaande, bewezen newTrainingInstanceId()-patroon');

console.log('fDuplicateSessionPrevention: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
