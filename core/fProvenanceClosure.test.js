/* fProvenanceClosure.test.js — MS-F3-10 regressietest (GAP-P1-007-closure).
 *
 * A. Functionele tests voor per-veld provenance (tkMergeHealthRow, index.html) --
 *    inclusief het KRITIEKE mixed-source-scenario (wearable-HRV + latere handmatige
 *    RHR-correctie mag de HRV-bron niet overschrijven).
 * B. Functionele tests voor de server-kant (buildRow, _wearableSyncLib.js) -- zelfde
 *    mixed-source-garantie, symmetrisch aan de client.
 * C. Immutability-test voor het Decision Evidence-snapshotmechanisme (buildDecisionEvidence/
 *    readDecisionEvidence) -- bewijst dat een gelezen snapshot nooit de huidige logica
 *    herberekent.
 * D. GAP-P1-007-closure-guard: bevestigt dat de drie provenance-kolommen daadwerkelijk in
 *    de codebase worden geschreven (niet alleen in de migratie gedefinieerd).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const wearableLib = require(path.join(ROOT, 'netlify/functions/_wearableSyncLib.js'));
const DecisionCore = require(path.join(ROOT, 'core/decision.js'));

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

function extractFunctionBody(source, name) {
  const re = new RegExp('function\\s+' + name + '\\s*\\(');
  const m = re.exec(source);
  if (!m) return null;
  const braceStart = source.indexOf('{', m.index);
  if (braceStart === -1) return null;
  let depth = 0;
  for (let i = braceStart; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(braceStart, i + 1);
    }
  }
  return null;
}

// ---- A. Client-kant (tkMergeHealthRow): per-veld provenance ----
{
  const body = extractFunctionBody(html, 'tkMergeHealthRow');
  ok(body !== null, 'tkMergeHealthRow() wordt gevonden');
  // eslint-disable-next-line no-new-func
  const tkMergeHealthRow = new Function('existing', 'incoming', body.slice(body.indexOf('{') + 1, body.lastIndexOf('}')));

  const vers = tkMergeHealthRow(null, { hrv: 55, rhr: 60, sleep: 7.5 });
  ok(vers.hrv_source === 'manual' && vers.rhr_source === 'manual' && vers.sleep_source === 'manual',
    'tkMergeHealthRow: verse, volledig handmatige invoer -> alle 3 bronnen "manual"');

  const bestaandeWearableRij = { hrv: 42, hrv_source: 'wearable', rhr: null, rhr_source: null, sleep: 7.2, sleep_source: 'wearable' };
  const naHandmatigeRhr = tkMergeHealthRow(bestaandeWearableRij, { rhr: 58 });
  ok(naHandmatigeRhr.hrv_source === 'wearable',
    'MIXED-SOURCE: een handmatige RHR-aanvulling overschrijft de bestaande wearable-HRV-bron NIET (per-veld provenance werkt)');
  ok(naHandmatigeRhr.rhr_source === 'manual',
    'MIXED-SOURCE: het daadwerkelijk handmatig ingevulde RHR-veld krijgt correct "manual"');
  ok(naHandmatigeRhr.sleep_source === 'wearable',
    'MIXED-SOURCE: het ongewijzigde slaap-veld behoudt zijn bestaande wearable-bron');
  ok(naHandmatigeRhr.hrv === 42, 'MIXED-SOURCE: de bestaande HRV-waarde zelf blijft ook behouden (geen dataverlies)');
}

// ---- B. Server-kant (buildRow): symmetrische mixed-source-garantie ----
{
  const bestaand = { hrv: null, hrv_source: null, rhr: 60, rhr_source: 'manual', sleep: null, sleep_source: null, note: null };
  const { row } = wearableLib.buildRow('2026-08-28', 'user-1', { hrv: 48 }, bestaand);
  ok(row.hrv_source === 'wearable', 'buildRow: nieuw aangeleverde HRV krijgt "wearable"');
  ok(row.rhr_source === 'manual', 'MIXED-SOURCE (server): het bestaande, handmatig ingevoerde RHR-veld blijft "manual" -- wearable-sync overschrijft dit niet stiekem');
  ok(row.rhr === 60, 'buildRow: de bestaande, handmatige RHR-waarde zelf blijft behouden');
}

// ---- C. Decision Evidence-snapshot: bewezen immutability ----
{
  const snap1 = DecisionCore.buildDecisionEvidence({
    raw: { kg: 100, reps: 5, rpe: 8 },
    calculated: { e1rm: 117 },
    decision: { outcome: 'increase', ruleId: 'DEC-PROG-001', ruleVersion: 'progression.v1' },
    at: '2026-08-28T10:00:00.000Z'
  });
  ok(snap1.geldig === true, 'buildDecisionEvidence: een volledige invoer levert een geldig snapshot op');
  const teruggelezen1 = DecisionCore.readDecisionEvidence(snap1);
  ok(JSON.stringify(teruggelezen1) === JSON.stringify(DecisionCore.readDecisionEvidence(snap1)),
    'readDecisionEvidence: twee keer lezen van hetzelfde snapshot geeft identiek resultaat (determinisme)');

  teruggelezen1.decision.outcome = 'GEMANIPULEERD';
  const opnieuwGelezen = DecisionCore.readDecisionEvidence(snap1);
  ok(opnieuwGelezen.decision.outcome === 'increase',
    'IMMUTABILITY: het opgeslagen snapshot blijft ongewijzigd nadat een eerder teruggelezen KOPIE is gemuteerd -- readDecisionEvidence() geeft een echte kopie, geen referentie naar levende state');

  const reprodOk = DecisionCore.evidenceReproduceerbaar(snap1, { outcome: 'increase', ruleId: 'DEC-PROG-001', ruleVersion: 'progression.v1' });
  ok(reprodOk.reproduceerbaar === true, 'evidenceReproduceerbaar: identieke opnieuw-genomen beslissing -> reproduceerbaar');
  const reprodNiet = DecisionCore.evidenceReproduceerbaar(snap1, { outcome: 'deload', ruleId: 'DEC-PROG-001', ruleVersion: 'progression.v1' });
  ok(reprodNiet.reproduceerbaar === false && reprodNiet.reden === 'andere_uitkomst',
    'evidenceReproduceerbaar: een afwijkende uitkomst bij dezelfde regelversie wordt correct herkend als "andere_uitkomst", niet stilzwijgend goedgekeurd');
}

// ---- D. GAP-P1-007-closure-guard ----
ok(html.includes('out.hrv_source=src(') && html.includes('out.rhr_source=src(') && html.includes('out.sleep_source=src('),
  'GAP-P1-007-closure: de client-schrijfpad (tkMergeHealthRow) schrijft daadwerkelijk alle 3 provenance-velden');
ok(fs.readFileSync(path.join(ROOT, 'netlify/functions/_wearableSyncLib.js'), 'utf8').includes('hrv_source:   srcOf('),
  'GAP-P1-007-closure: het server-schrijfpad (buildRow) schrijft daadwerkelijk de provenance-velden');
ok(fs.existsSync(path.join(ROOT, 'migratie_v499.sql')), 'GAP-P1-007-closure: de forward-only migratie bestaat in de repo');

console.log('fProvenanceClosure: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
