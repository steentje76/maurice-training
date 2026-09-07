/* nutritionSupplementEvidenceRegistry.test.js — SUP-EVIDENCE-02. */
'use strict';
const C = require('./nutritionSupplementCatalog.js');
const S = require('./nutritionSupplementSourceRegistry.js');
const E = require('./nutritionSupplementEvidenceRegistry.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- 2: unieke evidence_id ----
const evIds = E.CLAIMS.map((c) => c.evidence_id);
ok(new Set(evIds).size === evIds.length, '2: elke evidence_id is uniek (' + evIds.length + ' claims)');

// ---- 4: claim verwijst naar bestaand catalog-item ----
ok(E.CLAIMS.every((c) => !!C.getById(c.supplement_id)), '4: elke claim.supplement_id bestaat in de catalogus');

// ---- 5: source_id bestaat ----
let allSourcesResolve = true;
E.CLAIMS.forEach((c) => (c.sources || []).forEach((sid) => { if (!S.getById(sid)) allSourcesResolve = false; }));
ok(allSourcesResolve, '5: elke source_id in elke claim bestaat in de Source Registry');

// ---- 6: production claim heeft traceerbare bron ----
const productionClaimsNeedingSource = E.CLAIMS.filter((c) => c.ready_for_production && c.evidence_level !== 'E');
ok(productionClaimsNeedingSource.every((c) => (c.sources || []).length > 0),
  '6: elke production-ready, niet-architectuur (level E) claim heeft minstens één concrete bron');
ok(S.SOURCES.every((s) => !!s.title && !!s.publication_date && !!s.source_type && (!!s.doi || !!s.official_url)),
  '6b: elke bron heeft titel, publicatiedatum, type en een DOI of officiele URL (geen losse strings zoals "ISSN 2017")');
ok(S.SOURCES.every((s) => S.isValidStatus(s.source_status)), '6c: elke bron heeft een geldige source_status');

// ---- geldige evidence_level/status/output_mode ----
ok(E.CLAIMS.every((c) => E.isValidLevel(c.evidence_level)), 'elke claim heeft een geldig evidence_level (of null voor REMOVE/architectuur)');
ok(E.CLAIMS.every((c) => E.isValidStatus(c.evidence_status)), 'elke claim heeft een geldige evidence_status');
ok(E.CLAIMS.every((c) => E.isValidOutputMode(c.output_mode)), 'elke claim heeft een geldige output_mode');

// ---- 13/14 (evidence_id/source_id blijven aanwezig -- gedekt via de EducationService-tests, hier de brondata zelf) ----
ok(E.getById('CRE-PERF-001').evidence_id === 'CRE-PERF-001', '13: getById retourneert de juiste claim met evidence_id intact');
ok(S.getById('ISSN-CREATINE-2017').source_id === 'ISSN-CREATINE-2017', '14: getById retourneert de juiste bron met source_id intact');

// ---- 28/29: evidence lifecycle -- last_verified_at/review_due_at aanwezig, expired detecteerbaar ----
ok(E.CLAIMS.every((c) => !!c.last_verified_at && !!c.review_due_at), '28: elke claim heeft last_verified_at en review_due_at');
const EducationService = require('./nutritionSupplementEducationService.js');
const nietVerlopen = E.getById('CRE-PERF-001');
ok(EducationService.isExpired(nietVerlopen, '2026-09-07') === false, '29a: een claim met review_due_at in de toekomst is niet expired');
const kunstmatigVerlopen = Object.assign({}, nietVerlopen, { review_due_at: '2020-01-01' });
ok(EducationService.isExpired(kunstmatigVerlopen, '2026-09-07') === true, '29b: een claim met review_due_at in het verleden wordt gedetecteerd als expired');
// Expired betekent NIET automatisch verwijderd/veranderd -- de claim zelf blijft ongewijzigd, alleen het vlag verandert.
ok(kunstmatigVerlopen.evidence_status === 'VERIFIED' && kunstmatigVerlopen.claim === nietVerlopen.claim,
  '29c: expired verandert de inhoud van de claim niet -- uitsluitend signalering, geen automatische wijziging/verwijdering');

console.log('nutritionSupplementEvidenceRegistry: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
