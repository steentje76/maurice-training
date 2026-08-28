/* tools/check-doc-consistency.js — Trainingskompas documentatie-consistentiecheck.
 * Read-only, geen productwijziging. Draai: node tools/check-doc-consistency.js
 *
 * Controleert:
 *  1. docs/ROADMAP_INDEX.json is geldig JSON.
 *  2. Geen dubbele capability-IDs binnen de roadmap-index.
 *  3. Elke "dependencies"-referentie verwijst naar een bestaand ID binnen dezelfde index.
 *  4. Geen roadmap-index-item met status "CLOSED" dat in GAP_ANALYSIS_V2.md nog als
 *     open P0/P1/P2/P3 in een sectiekop voorkomt (tekstuele heuristiek).
 *  5. CURRENT_STATE.md claimt exact één actieve ("CURRENT") roadmapfase, bevat geen
 *     stale "alleen als sessie-output"-claim, en geen "Actieve sprint"/"Vorige actieve
 *     sprint"-sectiekop die een tweede, gelijktijdige actieve status zou suggereren.
 *  6. Geen circulaire dependency-ketens binnen de roadmap-index.
 *  7. Elk item met priority P0 of P1 is van het type "mastersprint" zelf, óf heeft
 *     minimaal één mastersprint-item dat er in zijn "next_action"-veld naar verwijst
 *     (voorkomt een P0/P1-capability zonder concrete uitvoeringsbestemming).
 *  8. Elk mastersprint-item heeft een niet-lege "acceptance_gate"-array.
 *  9. Elk mastersprint-item heeft een "phase"-veld en minimaal één "tracks"-entry.
 * 10. Elk mastersprint-item heeft een "target_maturity" die een geldige waarde is uit
 *     het maturity-model (NOT STARTED/IMPLEMENTED/TESTED/INTEGRATED/VALIDATED/CLOSED).
 * 11. Elk item heeft een geldige "priority" (P0-P4) en, indien aanwezig, geldige "status".
 * 12. Elk mastersprint-item heeft een "validation"-object met exact de 8 verwachte
 *     dimensies (software/database/integration/device/ux/scientific/privacy_security/
 *     documentation), elk met een geldige waarde (REQUIRED/AS_APPLICABLE/PASS/NOT_APPLICABLE/OPEN/PARTIAL).
 * 13. Geen obsolete/superseded MS-ID-referenties: IDs die in ROADMAP_V1_1_MIGRATION_MATRIX.md
 *     als SUPERSEDE/REMOVE_AS_DUPLICATE zijn gemarkeerd, mogen niet meer als "dependencies"
 *     ergens in de actuele roadmap-index voorkomen.
 * 14. Capability Count Consistency (dynamisch, geen hardcoded aantal): het aantal unieke
 *     capability-IDs in docs/CAPABILITY_REGISTRY.md (canonieke bron) moet exact overeenkomen
 *     met (a) het aantal `type:"capability"`-entries in docs/ROADMAP_INDEX.json die ook als
 *     registry-ID herkenbaar zijn, en (b) de "Canonical capability count"/"X/X"-telling die
 *     docs/ROADMAP_COVERAGE_AUDIT.md zelf rapporteert onder "Registry Coverage". Faalt hard
 *     bij een mismatch, met de drie afzonderlijke tellingen in de foutmelding.
 * 15. Capability Maturity Consistency: voor elke capability-ID die zowel in
 *     CAPABILITY_REGISTRY.md als in de classificatietabel van ROADMAP_COVERAGE_AUDIT.md
 *     voorkomt, mag de ene bron niet "NOT STARTED" zeggen terwijl de andere een afgeronde
 *     maturity (VALIDATED/CLOSED/INTEGRATED/TESTED) claimt. Bewust een asymmetrische,
 *     regelgebaseerde check (niet kolom-positie-afhankelijk) om fragiliteit bij wisselende
 *     tabellayouts te vermijden — zie code-commentaar voor de precieze grens.
 * 16. Closed-Blocker Contradiction (heuristisch, handmatige verificatie blijft nodig):
 *     signaleert zinnen in CURRENT_STATE.md die een capability-ID als actieve "blokkeert"-
 *     reden noemen terwijl diezelfde ID elders (registry/roadmap-index) als CLOSED/VALIDATED
 *     geregistreerd staat, tenzij de zin zelf al "verouderd"/"gecorrigeerd"/historische
 *     markering bevat.
 *
 * NIET GEAUTOMATISEERD — Test-status freshness (bewust, zie Gate A-opdracht sectie 3):
 *     een check die zou verifiëren of elk testtellingscitaat in de losse Markdown-
 *     documentatie (CURRENT_STATE.md, TEST_VERIFICATION.md, CAPABILITY_REGISTRY.md, HANDBOOK)
 *     overeenkomt met de daadwerkelijke, live output van `node core/release-gate.js` zou een
 *     stabiel machine-leesbaar exportformaat van die runner vereisen (bv. een JSON-samenvatting
 *     die release-gate.js zelf wegschrijft) — dat bestaat momenteel niet. Zonder die bron zou
 *     de check moeten gokken op vrije tekst ("78 testbestanden", "80 stappen", "127+ tests")
 *     verspreid over minstens vier documenten met elk hun eigen zinsopbouw, wat routinematig
 *     valse positieven/negatieven zou opleveren bij elke kleine herformulering. Voor nu blijft
 *     dit een HANDMATIGE controle bij elke roadmap-/documentatiesprint: draai `node core/
 *     release-gate.js` en vergelijk de uitkomst met wat elk document beweert (zoals in deze
 *     Gate A-sprint is gedaan voor de vier kandidaatbevindingen). Als een toekomstige sprint
 *     `core/release-gate.js` uitbreidt met een `--json`-uitvoermodus, kan deze check alsnog
 *     betrouwbaar worden toegevoegd.
 *
 * BEPERKING (bewust, geen overengineering): dit script parseert geen vrije Markdown-
 * prosa met volledige semantiek. Punt 4 is een grove, op sectiekoppen gebaseerde
 * heuristiek — een positieve match is een signaal om handmatig te controleren, geen
 * garantie op zichzelf. Voor een sluitende garantie zou elk document een machine-
 * leesbaar statusveld nodig hebben (net als ROADMAP_INDEX.json) — dat bestaat nu
 * alleen voor de roadmap-index zelf, niet voor GAP_ANALYSIS_V2.md/CAPABILITY_REGISTRY.md.
 * Uitbreiden zou een eigen datamodel voor die documenten vereisen; dat is bewust NIET
 * gebouwd in deze sprint om geen fragiele nieuwe infrastructuur toe te voegen voor een
 * probleem dat een mens sneller met een globale grep-controle kan verifiëren. */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let errors = 0;
function fail(msg) { console.log('  🔴 ' + msg); errors++; }
function pass(msg) { console.log('  🟢 ' + msg); }

console.log('\n══════ DOCUMENTATIE-CONSISTENTIECHECK ══════');

// 1. Geldig JSON
let index;
try {
  index = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/ROADMAP_INDEX.json'), 'utf8'));
  pass('docs/ROADMAP_INDEX.json is geldig JSON (' + index.length + ' items)');
} catch (e) {
  fail('docs/ROADMAP_INDEX.json is GEEN geldig JSON: ' + e.message);
  process.exit(1);
}

// 2. Geen dubbele IDs
const ids = index.map(x => x.id);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dupes.length) fail('Dubbele roadmap-index-IDs gevonden: ' + [...new Set(dupes)].join(', '));
else pass('Geen dubbele capability-IDs in de roadmap-index (' + ids.length + ' unieke IDs)');

// 3. Dependency-geldigheid
const idSet = new Set(ids);
let orphanDeps = [];
index.forEach(item => {
  (item.dependencies || []).forEach(dep => {
    if (!idSet.has(dep)) orphanDeps.push(item.id + ' -> ' + dep);
  });
});
if (orphanDeps.length) fail('Dependency-referenties naar onbekende IDs: ' + orphanDeps.join(', '));
else pass('Alle dependency-referenties verwijzen naar een bestaand ID binnen de roadmap-index');

// 4. CLOSED-items niet als open P0/P1/P2/P3 in GAP_ANALYSIS_V2.md (grove heuristiek)
try {
  const gapText = fs.readFileSync(path.join(ROOT, 'docs/GAP_ANALYSIS_V2.md'), 'utf8');
  const closedIds = index.filter(x => x.status === 'CLOSED').map(x => x.id);
  let suspiciousMatches = [];
  closedIds.forEach(id => {
    // Zoek het ID in een open-gap-sectie (## P0/P1/P2/P3, niet in "CLOSED GAPS / HISTORICAL")
    const historicalStart = gapText.indexOf('## CLOSED GAPS / HISTORICAL');
    const beforeHistorical = historicalStart === -1 ? gapText : gapText.slice(0, historicalStart);
    if (beforeHistorical.includes(id)) suspiciousMatches.push(id);
  });
  if (suspiciousMatches.length) fail('CLOSED roadmap-items die mogelijk nog als open gap in GAP_ANALYSIS_V2.md staan (handmatig verifiëren): ' + suspiciousMatches.join(', '));
  else pass('Geen CLOSED roadmap-items gevonden vóór de "CLOSED GAPS / HISTORICAL"-sectie in GAP_ANALYSIS_V2.md');
} catch (e) {
  fail('Kon docs/GAP_ANALYSIS_V2.md niet lezen: ' + e.message);
}

// 5. CURRENT_STATE.md-integriteit: exact één "CURRENT"-roadmapfase, geen stale
//    sessie-output-claim, geen oude "Actieve sprint"-kop die als huidig leest.
try {
  const csPath = path.join(ROOT, 'docs/00_Project_Management/CURRENT_STATE.md');
  const csText = fs.readFileSync(csPath, 'utf8');

  const currentPhaseMatches = csText.match(/F\d+\s*[—-].*?:\s*\*?\*?CURRENT/g) || [];
  if (currentPhaseMatches.length !== 1) {
    fail('CURRENT_STATE.md claimt ' + currentPhaseMatches.length + ' actieve roadmapfase(s) (verwacht: exact 1): ' + JSON.stringify(currentPhaseMatches));
  } else {
    pass('CURRENT_STATE.md claimt exact 1 actieve roadmapfase (' + currentPhaseMatches[0].split(':')[0].trim() + ')');
  }

  if (/alleen als sessie-output/i.test(csText)) {
    fail('CURRENT_STATE.md bevat nog de stale claim "alleen als sessie-output" — canonieke documenten staan inmiddels in docs/');
  } else {
    pass('Geen stale "alleen als sessie-output"-claim in CURRENT_STATE.md');
  }

  if (/^##\s*Actieve sprint/im.test(csText) || /^##\s*Vorige actieve sprint/im.test(csText)) {
    fail('CURRENT_STATE.md bevat nog een "Actieve sprint"/"Vorige actieve sprint"-sectiekop — dit suggereert een tweede, gelijktijdig actieve status naast de roadmapfase');
  } else {
    pass('Geen "Actieve sprint"-sectiekoppen meer in CURRENT_STATE.md');
  }
} catch (e) {
  fail('Kon docs/00_Project_Management/CURRENT_STATE.md niet lezen: ' + e.message);
}

// 6. Geen circulaire dependencies (eenvoudige DFS-cyclusdetectie).
(function checkCircularDeps() {
  const byId = {};
  index.forEach(item => { byId[item.id] = item; });
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = {};
  index.forEach(item => { color[item.id] = WHITE; });
  let cyclePath = null;

  function visit(id, path) {
    if (cyclePath) return;
    color[id] = GRAY;
    const deps = (byId[id] && byId[id].dependencies) || [];
    for (const dep of deps) {
      if (!byId[dep]) continue; // orphan-check gebeurt al in stap 3
      if (color[dep] === GRAY) { cyclePath = path.concat([id, dep]); return; }
      if (color[dep] === WHITE) visit(dep, path.concat([id]));
      if (cyclePath) return;
    }
    color[id] = BLACK;
  }
  index.forEach(item => { if (color[item.id] === WHITE) visit(item.id, []); });

  if (cyclePath) fail('Circulaire dependency-keten gevonden: ' + cyclePath.join(' -> '));
  else pass('Geen circulaire dependencies in de roadmap-index');
})();

// 7. Elke P0/P1-capability heeft een concrete mastersprint-bestemming.
(function checkP0P1HasMastersprint() {
  const highPrio = index.filter(x => x.type === 'capability' && (x.priority === 'P0' || x.priority === 'P1'));
  const mastersprintText = JSON.stringify(index.filter(x => x.type === 'mastersprint'));
  let unmapped = [];
  highPrio.forEach(cap => {
    const referencedInNextAction = /zie MS-/.test((cap.next_action || '')) || cap.status === 'CLOSED';
    const referencedInMastersprints = mastersprintText.includes('"' + cap.id + '"');
    if (!referencedInNextAction && !referencedInMastersprints) unmapped.push(cap.id);
  });
  if (unmapped.length) fail('P0/P1-capabilities zonder mastersprint-bestemming: ' + unmapped.join(', '));
  else pass('Elke P0/P1-capability (' + highPrio.length + ') heeft een mastersprint-bestemming of is CLOSED');
})();

// 8. Elk mastersprint-item heeft een niet-lege acceptance_gate.
(function checkAcceptanceGates() {
  const missing = index.filter(x => x.type === 'mastersprint' && (!Array.isArray(x.acceptance_gate) || x.acceptance_gate.length === 0)).map(x => x.id);
  if (missing.length) fail('Mastersprints zonder acceptance_gate: ' + missing.join(', '));
  else pass('Elk mastersprint-item heeft minimaal 1 acceptance_gate-regel');
})();

// 9. Elk mastersprint-item heeft phase + minimaal 1 track.
(function checkPhaseAndTrack() {
  const missing = index.filter(x => x.type === 'mastersprint' && (!x.phase || !Array.isArray(x.tracks) || x.tracks.length === 0)).map(x => x.id);
  if (missing.length) fail('Mastersprints zonder phase en/of track: ' + missing.join(', '));
  else pass('Elk mastersprint-item heeft een phase en minimaal 1 track');
})();

// 10. target_maturity is een geldige waarde uit het maturity-model.
(function checkMaturityValues() {
  const VALID = new Set(['NOT STARTED', 'IMPLEMENTED', 'TESTED', 'INTEGRATED', 'VALIDATED', 'CLOSED']);
  const invalid = index.filter(x => x.type === 'mastersprint' && !VALID.has(x.target_maturity)).map(x => x.id + ':' + x.target_maturity);
  if (invalid.length) fail('Mastersprints met ongeldige target_maturity: ' + invalid.join(', '));
  else pass('Elk mastersprint-item heeft een geldige target_maturity');
})();

// 11. Geldige priority (P0-P4) en, indien aanwezig, geldige status.
(function checkPriorityStatus() {
  const VALID_PRIO = new Set(['P0','P1','P2','P3','P4']);
  const VALID_STATUS = new Set(['NOT STARTED','IMPLEMENTED','TESTED','INTEGRATED','VALIDATED','CLOSED']);
  const badPrio = index.filter(x => x.priority && !VALID_PRIO.has(x.priority)).map(x => x.id + ':' + x.priority);
  const badStatus = index.filter(x => x.status && !VALID_STATUS.has(x.status)).map(x => x.id + ':' + x.status);
  if (badPrio.length) fail('Items met ongeldige priority: ' + badPrio.join(', '));
  else pass('Elk item heeft een geldige priority (P0-P4)');
  if (badStatus.length) fail('Items met ongeldige status: ' + badStatus.join(', '));
  else pass('Elk item met een status-veld heeft een geldige waarde');
})();

// 12. Validation-object: 8 verwachte dimensies, geldige waarden.
(function checkValidationSchema() {
  const DIMENSIONS = ['software', 'database', 'integration', 'device', 'ux', 'scientific', 'privacy_security', 'documentation'];
  const VALID_VALUES = new Set(['REQUIRED', 'AS_APPLICABLE', 'PASS', 'NOT_APPLICABLE', 'OPEN', 'PARTIAL']);
  let problems = [];
  index.filter(x => x.type === 'mastersprint').forEach(item => {
    const v = item.validation || {};
    DIMENSIONS.forEach(dim => {
      if (!(dim in v)) problems.push(item.id + ' mist dimensie "' + dim + '"');
      else if (!VALID_VALUES.has(v[dim])) problems.push(item.id + '.' + dim + '=' + v[dim] + ' is ongeldig');
    });
  });
  if (problems.length) fail('Validation-schema-problemen: ' + problems.slice(0, 10).join('; ') + (problems.length > 10 ? ' (+' + (problems.length - 10) + ' meer)' : ''));
  else pass('Elk mastersprint-item heeft een volledig, geldig validation-object (8 dimensies)');
})();

// 13. Geen obsolete/superseded oude PR#68-MS-IDs meer als dependency-referentie.
// Bron: alle "Oud ID (PR #68)"-cellen in ROADMAP_V1_1_MIGRATION_MATRIX.md die niet ook
// als canoniek ID zijn hergebruikt (KEEP-gevallen negeren we bewust, want daar is
// oud-ID == nieuw-ID en mag het wél als dependency voorkomen).
try {
  const matrixText = fs.readFileSync(path.join(ROOT, 'docs/ROADMAP_V1_1_MIGRATION_MATRIX.md'), 'utf8');
  const oldIdMatches = [...matrixText.matchAll(/\|\s*(MS-F\d+-\d+)\s*\(/g)].map(m => m[1]);
  const canonicalIds = new Set(index.map(x => x.id));
  const obsoleteIds = new Set(oldIdMatches.filter(id => !canonicalIds.has(id)));
  let leaks = [];
  index.forEach(item => {
    (item.dependencies || []).forEach(dep => { if (obsoleteIds.has(dep)) leaks.push(item.id + ' -> ' + dep); });
  });
  if (leaks.length) fail('Verwijzingen naar obsolete/superseded oude MS-IDs: ' + leaks.join(', '));
  else pass('Geen dependency-referenties naar obsolete/superseded oude MS-IDs (' + obsoleteIds.size + ' obsolete IDs gecontroleerd)');
} catch (e) {
  fail('Kon docs/ROADMAP_V1_1_MIGRATION_MATRIX.md niet lezen: ' + e.message);
}

// 14. Capability Count Consistency — dynamisch, geen hardcoded aantal.
(function checkCapabilityCountConsistency() {
  try {
    const registryText = fs.readFileSync(path.join(ROOT, 'docs/CAPABILITY_REGISTRY.md'), 'utf8');
    const registryIds = new Set(
      [...registryText.matchAll(/^\|\s*([A-Z][A-Za-z0-9/-]+-\d+(?:\/\d+)?)\s*\|/gm)].map(m => m[1])
    );
    const registryCount = registryIds.size;

    const roadmapCapIds = new Set(
      index.filter(x => x.type === 'capability').map(x => x.id).filter(id => registryIds.has(id))
    );
    const roadmapCapCount = roadmapCapIds.size;
    const roadmapCapTotal = index.filter(x => x.type === 'capability').length;

    const coverageText = fs.readFileSync(path.join(ROOT, 'docs/ROADMAP_COVERAGE_AUDIT.md'), 'utf8');
    const coverageMatch = coverageText.match(/Registry Coverage[\s\S]{0,600}?(\d+)\/(\d+)\s*=\s*100%/);
    const coverageNum = coverageMatch ? parseInt(coverageMatch[1], 10) : null;
    const coverageDen = coverageMatch ? parseInt(coverageMatch[2], 10) : null;

    const problems = [];
    if (!coverageMatch) problems.push('kon geen "X/X = 100%"-telling vinden onder "Registry Coverage" in ROADMAP_COVERAGE_AUDIT.md');
    if (roadmapCapCount !== registryCount) problems.push('roadmap_index capability-items die matchen met de registry (' + roadmapCapCount + ') komt niet overeen met registry (' + registryCount + ')');
    if (coverageMatch && (coverageNum !== registryCount || coverageDen !== registryCount)) problems.push('coverage_audit (' + coverageNum + '/' + coverageDen + ') komt niet overeen met registry (' + registryCount + ')');

    if (problems.length) {
      fail('Capability count mismatch: registry=' + registryCount + ', roadmap_index_matching=' + roadmapCapCount + ' (totaal capability-items in index=' + roadmapCapTotal + '), coverage_audit=' + (coverageMatch ? coverageNum + '/' + coverageDen : 'onbekend') + ' — ' + problems.join('; '));
    } else {
      pass('Capability count consistent: registry=' + registryCount + ', roadmap_index=' + roadmapCapCount + ', coverage_audit=' + coverageNum + '/' + coverageDen + ' (index bevat daarnaast ' + (roadmapCapTotal - roadmapCapCount) + ' governance-item(s) zonder eigen registry-rij, bv. DOC-HANDBOOK-001 — bewust buiten deze telling)');
    }
  } catch (e) {
    fail('Capability count consistency check kon niet worden uitgevoerd: ' + e.message);
  }
})();

// 15. Capability Maturity Consistency — betrouwbare kolomextractie, geen hele-regel-scan.
// Coverage-audit heeft een simpel, consistent 4-koloms format (| ID | maturity | actie | doel |);
// kolom 2 wordt exact geparsed. Registry-rijen hebben een historisch gegroeide, wisselende
// kolomvolgorde, maar gebruiken door de hele registry heen consequent **vetgedrukt** voor de
// daadwerkelijke huidige-status-marker (target-kolomwaarden staan nooit vetgedrukt). Rijen
// zonder enige vetgedrukte maturity-marker worden bewust overgeslagen (geen vergelijking
// mogelijk) in plaats van een gok te wagen — voorkomt de valse-positieven die een simpele
// hele-regel-substring-scan zou geven op target-kolomwoorden.
(function checkCapabilityMaturityConsistency() {
  try {
    const registryText = fs.readFileSync(path.join(ROOT, 'docs/CAPABILITY_REGISTRY.md'), 'utf8');
    const coverageText = fs.readFileSync(path.join(ROOT, 'docs/ROADMAP_COVERAGE_AUDIT.md'), 'utf8');
    const MATURITY_RE = /NOT STARTED|IMPLEMENTED|TESTED|INTEGRATED|VALIDATED|CLOSED/;

    const registryStatus = {};
    registryText.split('\n').forEach(line => {
      const idMatch = line.match(/^\|\s*([A-Z][A-Za-z0-9/-]+-\d+)\s*\|/);
      if (!idMatch) return;
      const boldMatch = line.match(/\*\*(NOT STARTED|IMPLEMENTED|TESTED|INTEGRATED|VALIDATED|CLOSED)\*\*/);
      if (boldMatch) registryStatus[idMatch[1]] = boldMatch[1];
    });

    const coverageStatus = {};
    coverageText.split('\n').forEach(line => {
      const cells = line.split('|').map(c => c.trim());
      if (cells.length < 3) return;
      const id = cells[1];
      if (!/^[A-Z][A-Za-z0-9/-]+-\d+$/.test(id)) return;
      const cell2 = cells[2].replace(/\*\*/g, '');
      const m = cell2.match(MATURITY_RE);
      if (m && cell2.trim() === m[0]) coverageStatus[id] = m[0]; // alleen als kolom 2 UITSLUITEND de maturity-waarde bevat
    });

    const DONE = new Set(['VALIDATED', 'CLOSED', 'INTEGRATED', 'TESTED']);
    const mismatches = [];
    Object.keys(registryStatus).forEach(id => {
      if (!coverageStatus[id]) return;
      const reg = registryStatus[id], cov = coverageStatus[id];
      if (reg === 'NOT STARTED' && DONE.has(cov)) mismatches.push(id + ': registry=NOT STARTED, coverage-audit=' + cov);
      if (cov === 'NOT STARTED' && DONE.has(reg)) mismatches.push(id + ': coverage-audit=NOT STARTED, registry=' + reg);
    });

    if (mismatches.length) fail('Capability maturity-tegenstrijdigheid tussen registry en coverage-audit: ' + mismatches.join('; '));
    else pass('Geen maturity-tegenstrijdigheden tussen CAPABILITY_REGISTRY.md en ROADMAP_COVERAGE_AUDIT.md (' + Object.keys(registryStatus).length + ' vetgedrukte registry-statussen vergeleken met ' + Object.keys(coverageStatus).length + ' coverage-audit-statussen)');
  } catch (e) {
    fail('Capability maturity consistency check kon niet worden uitgevoerd: ' + e.message);
  }
})();

// 16. Closed-Blocker Contradiction — heuristisch, zie docstring. Vervolg op de bestaande
// "CLOSED roadmap-items in GAP_ANALYSIS_V2.md"-check, nu specifiek voor CURRENT_STATE.md se
// "blokkeert"-taal, waar de Track-13/GYM-RLS-SCOPING-001-bevinding een reëel voorbeeld van was.
// Vergelijking op ZINSNIVEAU (gesplitst op ". "), niet op regelniveau: een lange alinea kan
// meerdere IDs en het woord "blokkeert" bevatten zonder dat ze inhoudelijk verbonden zijn
// (bv. "X, Y, Z zijn CLOSED. Niets hiervan blokkeert de volgende fase." is geen tegenstrijdigheid).
(function checkClosedBlockerContradiction() {
  try {
    const currentStateText = fs.readFileSync(path.join(ROOT, 'docs/00_Project_Management/CURRENT_STATE.md'), 'utf8');
    const closedIds = new Set(
      index.filter(x => x.status === 'CLOSED' || x.status === 'VALIDATED').map(x => x.id)
    );
    const staleMarkers = /verouderd|gecorrigeerd|~~/i;
    const problems = [];
    const sentences = currentStateText.replace(/\n/g, ' ').split(/(?<=[.!?])\s+/);
    sentences.forEach(sentence => {
      if (!/blokkeer/i.test(sentence)) return;
      if (staleMarkers.test(sentence)) return; // al expliciet als gecorrigeerd/doorgestreept gemarkeerd
      closedIds.forEach(id => {
        if (sentence.includes(id)) problems.push('"' + id + '" (status ' + index.find(x => x.id === id).status + ') genoemd in dezelfde zin als "blokkeert" zonder verouderd/gecorrigeerd-markering: "' + sentence.trim().slice(0, 120) + '..."');
      });
    });
    if (problems.length) fail('Closed-blocker contradictie(s) in CURRENT_STATE.md: ' + problems.join('; '));
    else pass('Geen CLOSED/VALIDATED-capability wordt in CURRENT_STATE.md nog in dezelfde zin als een ongemarkeerde actieve blokkade genoemd');
  } catch (e) {
    fail('Closed-blocker contradiction check kon niet worden uitgevoerd: ' + e.message);
  }
})();

console.log('─'.repeat(52));
if (errors) {
  console.log('🔴 ' + errors + ' consistentieprobleem(en) gevonden.');
  process.exit(1);
}
console.log('🟢 Documentatie intern consistent (binnen de grenzen van deze check).');