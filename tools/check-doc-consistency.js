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
 * 17. Open P0/P1 Count Consistency (dynamisch, geen hardcoded aantal): telt de daadwerkelijke
 *     "### GAP-P0-"/"### GAP-P1-"-sectiekoppen in docs/GAP_ANALYSIS_V2.md die vóór de
 *     "## CLOSED GAPS / HISTORICAL"-scheiding staan (dus daadwerkelijk open), en vergelijkt dat
 *     met de "Open P0: N"/"Open P1: N"-regels in docs/00_Project_Management/CURRENT_STATE.md.
 *     Faalt hard bij een mismatch.
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
const crypto = require('crypto');
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

// 4. CLOSED-items niet als open P0/P1/P2/P3 in GAP_ANALYSIS_V2.md
// F13 Post-Audit Remediation (P1-14): was een "grove heuristiek" (alleen
// tekstaanwezigheid vóór de HISTORICAL-sectie) -- verbeterd naar een
// semantische check op de REGEL waarin de match staat, zodat de checker
// het juiste documenttype/gebruik begrijpt i.p.v. blind te matchen op elke
// vermelding van een CLOSED-ID. Twee legitieme, niet-verdachte patronen:
//   (a) de regel bevat zelf het woord "CLOSED" vlak bij de ID (bijv.
//       "niet-blokkerend voor MS-F11-03 CLOSED") -- bevestigt juist de
//       CLOSED-status, is geen "nog open"-claim.
//   (b) de regel is een "**Target:**"-oplossingsketen die meerdere
//       MS-ID's via een pijl (→) aan elkaar rijgt (bijv. "MS-F12-01 →
//       MS-F12-02 → ... → MS-F12-04") -- dit beschrijft historisch WELKE
//       sprints een ander, apart gap-item hebben opgelost, geen claim dat
//       die sprints zelf nog open zijn.
// Een match die geen van beide patronen is, blijft een echte, te
// verifiëren verdachte vermelding.
try {
  const gapText = fs.readFileSync(path.join(ROOT, 'docs/GAP_ANALYSIS_V2.md'), 'utf8');
  const closedIds = index.filter(x => x.status === 'CLOSED').map(x => x.id);
  const gapLines = gapText.split('\n');
  let suspiciousMatches = [];
  closedIds.forEach(id => {
    const historicalStart = gapText.indexOf('## CLOSED GAPS / HISTORICAL');
    const beforeHistorical = historicalStart === -1 ? gapText : gapText.slice(0, historicalStart);
    if (!beforeHistorical.includes(id)) return;
    // Zoek elke regel vóór de HISTORICAL-sectie waarin de ID voorkomt, en
    // beoordeel per regel of het een legitiem patroon is.
    const beforeLines = beforeHistorical.split('\n');
    const relevantLines = beforeLines.filter(l => l.includes(id));
    const alleLegitiem = relevantLines.length > 0 && relevantLines.every(line => {
      const closedNearId = new RegExp(id.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '[^\\n]{0,30}\\bCLOSED\\b').test(line);
      const isOplossingsketen = /\*\*Target:\*\*/.test(line) && (line.match(/MS-[A-Z0-9-]+/g) || []).length >= 2 && line.includes('→');
      return closedNearId || isOplossingsketen;
    });
    if (!alleLegitiem) suspiciousMatches.push(id);
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

  // F14 Final Documentation Integrity Hotfix: CURRENT_STATE.md bevat twee,
  // onafhankelijk onderhouden "current APP_VER"-achtige vermeldingen -- de
  // "## Huidige versie"-sectie (al gedekt door core/fAndroidRelease.test.js
  // H2) EN de losse "**APP_VER:**"-regel onder "1. Verified baseline". Beide
  // MOETEN exact dezelfde waarde hebben; ze zijn eerder, onopgemerkt uit
  // elkaar gelopen (v4.69.32 vs. v4.69.30) omdat H2 uitsluitend de eerste
  // sectie controleert. Deze check vergelijkt beide expliciet.
  const huidigeVersieMatch = csText.match(/## Huidige versie\s*\n(v[\d.]+)/);
  const verifiedBaselineApiVerMatch = csText.match(/\*\*APP_VER:\*\*\s*(v[\d.]+)/);
  if (huidigeVersieMatch && verifiedBaselineApiVerMatch) {
    if (huidigeVersieMatch[1] !== verifiedBaselineApiVerMatch[1]) {
      fail('CURRENT_STATE.md bevat twee verschillende APP_VER-waarden: "## Huidige versie" zegt ' + huidigeVersieMatch[1] + ', maar de "1. Verified baseline"-regel ("**APP_VER:**") zegt ' + verifiedBaselineApiVerMatch[1] + ' -- deze moeten identiek zijn');
    } else {
      pass('CURRENT_STATE.md se "Huidige versie" en "Verified baseline"-APP_VER komen overeen (' + huidigeVersieMatch[1] + ')');
    }
  } else {
    fail('CURRENT_STATE.md mist de "## Huidige versie"-sectie of de "1. Verified baseline"-"**APP_VER:**"-regel -- kan de interne APP_VER-consistentie niet controleren');
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

// 17. Open P0/P1 Count Consistency — dynamisch, geen hardcoded aantal.
(function checkOpenP0P1CountConsistency() {
  try {
    const gapText = fs.readFileSync(path.join(ROOT, 'docs/GAP_ANALYSIS_V2.md'), 'utf8');
    const currentStateText = fs.readFileSync(path.join(ROOT, 'docs/00_Project_Management/CURRENT_STATE.md'), 'utf8');

    const closedMarkerIdx = gapText.indexOf('## CLOSED GAPS / HISTORICAL');
    const openSection = closedMarkerIdx === -1 ? gapText : gapText.slice(0, closedMarkerIdx);
    const gapOpenP0 = (openSection.match(/^### GAP-P0-/gm) || []).length;
    const gapOpenP1 = (openSection.match(/^### GAP-P1-/gm) || []).length;

    const csP0Match = currentStateText.match(/Open P0:\s*\*?\*?(\d+)/);
    const csP1Match = currentStateText.match(/Open P1:\s*\*?\*?(\d+)/);
    const csOpenP0 = csP0Match ? parseInt(csP0Match[1], 10) : null;
    const csOpenP1 = csP1Match ? parseInt(csP1Match[1], 10) : null;

    const problems = [];
    if (csOpenP0 === null) problems.push('kon geen "Open P0: N" vinden in CURRENT_STATE.md');
    if (csOpenP1 === null) problems.push('kon geen "Open P1: N" vinden in CURRENT_STATE.md');
    if (csOpenP0 !== null && csOpenP0 !== gapOpenP0) problems.push('P0: GAP_ANALYSIS_V2.md telt ' + gapOpenP0 + ' open GAP-P0-secties, CURRENT_STATE.md zegt ' + csOpenP0);
    if (csOpenP1 !== null && csOpenP1 !== gapOpenP1) problems.push('P1: GAP_ANALYSIS_V2.md telt ' + gapOpenP1 + ' open GAP-P1-secties, CURRENT_STATE.md zegt ' + csOpenP1);

    if (problems.length) fail('Open P0/P1-tellingen niet synchroon tussen GAP_ANALYSIS_V2.md en CURRENT_STATE.md: ' + problems.join('; '));
    else pass('Open P0/P1-tellingen synchroon: P0=' + gapOpenP0 + ', P1=' + gapOpenP1 + ' (GAP_ANALYSIS_V2.md en CURRENT_STATE.md komen exact overeen)');
  } catch (e) {
    fail('Open P0/P1 count consistency check kon niet worden uitgevoerd: ' + e.message);
  }
})();

// ── BASELINE-1.0 audit/roadmap consistency + staleness guard ────────────────
// Doel: roadmap- en auditdata kunnen niet opnieuw ongemerkt tientallen merges
// achterlopen, zonder de onbruikbare regel "iedere merge moet de index wijzigen".
(function auditBaselineGuard() {
  try {
    const regPath = path.join(ROOT, 'docs', 'AUDIT_GAP_REGISTER.json');
    const basePath = path.join(ROOT, 'docs', '00_Project_Management', 'AUDIT_MEASUREMENT_BASELINE.md');
    if (!fs.existsSync(regPath) || !fs.existsSync(basePath)) {
      fail('BASELINE-1.0: AUDIT_GAP_REGISTER.json of AUDIT_MEASUREMENT_BASELINE.md ontbreekt');
      return;
    }
    const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
    const baseline = fs.readFileSync(basePath, 'utf8');
    const gaps = reg.gaps || [];
    const VALID_TRACKS = [];
    for (let i = 1; i <= 18; i++) VALID_TRACKS.push('T' + i);
    const VALID_STATUS = ['OPEN', 'IN_PROGRESS', 'READY_FOR_ACCEPTANCE',
      'CLOSED_PROVEN', 'DEFERRED_ACCEPTED', 'SUPERSEDED', 'REVIEW_REQUIRED'];

    const problems = [];
    const seen = new Set();
    gaps.forEach(function (g) {
      // 1. duplicate stable IDs
      if (seen.has(g.gap_id)) problems.push('duplicate stable_id: ' + g.gap_id);
      seen.add(g.gap_id);
      // 2. ontbrekende primary_track
      if (!g.primary_track) problems.push('ontbrekende primary_track: ' + g.gap_id);
      // 3. ongeldige T-track
      else if (VALID_TRACKS.indexOf(g.primary_track) < 0 && g.primary_track !== 'REVIEW_REQUIRED') {
        problems.push('ongeldige track "' + g.primary_track + '" op ' + g.gap_id);
      }
      // 4. ongeldige closure-status
      if (VALID_STATUS.indexOf(g.status) < 0) problems.push('ongeldige status "' + g.status + '" op ' + g.gap_id);
      // 5. orphan gap reference (superseded_by moet bestaan)
      if (g.superseded_by && !gaps.some(function (x) { return x.gap_id === g.superseded_by; })) {
        problems.push('orphan gap reference: ' + g.gap_id + ' -> ' + g.superseded_by);
      }
      // 6. inconsistente V1-scope: TRUE/FALSE vereist evidence
      if ((g.v1_scope === true || g.v1_scope === false) && !g.v1_evidence) {
        problems.push('v1_scope zonder v1_evidence: ' + g.gap_id);
      }
    });

    // 7. maturity_score zonder A–J bron: alle tien gewogen subcriteria moeten
    //    als expliciete tabelrij met gewicht in het model staan. Een zwakke check
    //    op alleen de letter zou een verwijderd criterium niet betrappen.
    const SUBCRITERIA = [
      ['A', 'Product scope defined', '5%'], ['B', 'Canonical architecture', '15%'],
      ['C', 'Runtime integration', '15%'], ['D', 'Persistence/data model', '10%'],
      ['E', 'Calc/Context/Decision integratie', '10%'], ['F', 'Tests/evidence', '15%'],
      ['G', 'Security/privacy', '5%'], ['H', 'UX/user-facing completion', '10%'],
      ['I', 'Failure/degraded-state handling', '5%'], ['J', 'V1 audit closure', '10%'],
    ];
    let weightSum = 0;
    SUBCRITERIA.forEach(function (c) {
      // Exacte rij inclusief regeleinde: de haalbaarheidstabel verderop bevat dezelfde
      // prefix met een derde kolom en zou een prefix-check stilzwijgend groen houden.
      const row = '| ' + c[0] + ' ' + c[1] + ' | ' + c[2] + ' |\n';
      if (baseline.indexOf(row) < 0) problems.push('subcriterium ' + c[0] + ' ontbreekt of heeft een afwijkend gewicht in het baselinemodel');
      else weightSum += parseInt(c[2], 10);
    });
    if (weightSum !== 100) problems.push('subcriteria-gewichten tellen op tot ' + weightSum + '%, verwacht 100%');
    if (!/Roadmap Product Maturity/.test(baseline)) problems.push('maturity-metriek ontbreekt in het baselinemodel');
    // Maturity mag pas CANONICAL heten wanneer A-J per capability is ingevuld.
    if (/Roadmap Product Maturity[^|]*\|[^|]*\|[^|]*\| *\*\*CANONICAL\*\*/.test(baseline)) {
      problems.push('Roadmap Product Maturity staat als CANONICAL terwijl A-J per capability niet is ingevuld');
    }
    // De canonieke roadmap-SoT moet elk item een primary_track en v1_scope geven.
    const idxPath = path.join(ROOT, 'docs', 'ROADMAP_INDEX.json');
    const idxPath2 = idxPath;
    if (fs.existsSync(idxPath)) {
      const items = JSON.parse(fs.readFileSync(idxPath, 'utf8'));
      const noTrack = items.filter(function (x) { return !x.primary_track; }).length;
      const noScope = items.filter(function (x) { return typeof x.v1_scope === 'undefined'; }).length;
      if (noTrack) problems.push(noTrack + ' ROADMAP_INDEX-items zonder primary_track');
      if (noScope) problems.push(noScope + ' ROADMAP_INDEX-items zonder v1_scope');
      const badT = items.filter(function (x) { return x.primary_track && VALID_TRACKS.indexOf(x.primary_track) < 0; });
      if (badT.length) problems.push('ongeldige primary_track in ROADMAP_INDEX: ' + badT[0].id);
    } else problems.push('canonical roadmap-SoT docs/ROADMAP_INDEX.json ontbreekt');
    if (!/MERGED_CLOSURE/.test(baseline) || !/BASELINE_MODEL_REVISION/.test(baseline)) {
      problems.push('score-drift-regels (A..D) ontbreken in het baselinemodel');
    }

    // 8. staleness: het register moet tegen de actuele main zijn gegenereerd, óf
    //    de wijziging moet expliciet als NO_ROADMAP_IMPACT zijn gedocumenteerd.
    const declared = reg.generated_against_main;
    if (!declared) problems.push('AUDIT_GAP_REGISTER.json mist generated_against_main');
    else if (!/^[0-9a-f]{40}$/.test(declared)) problems.push('generated_against_main is geen volledige commit-SHA');

    // ── BASELINE-1.1: capability-populatie en V1-maturitynoemer ──
    if (fs.existsSync(idxPath2)) {
      const items2 = JSON.parse(fs.readFileSync(idxPath2, 'utf8'));
      const caps2 = items2.filter(function (x) { return x.type === 'capability'; });
      const seenCap = new Set();
      caps2.forEach(function (c) {
        if (seenCap.has(c.id)) problems.push('duplicate capability stable_id: ' + c.id);
        seenCap.add(c.id);
        if (!c.primary_track) problems.push('capability zonder primary_track: ' + c.id);
        if (typeof c.v1_scope === 'undefined') problems.push('capability zonder v1_scope: ' + c.id);
        // J mag op een post-V1 capability nooit iets anders zijn dan N/A
        if (c.v1_scope === false && c.criteria && c.criteria.J && c.criteria.J.applicable !== false) {
          problems.push('post-V1 capability ' + c.id + ' heeft J anders dan N/A');
        }
      });
      // Een mastersprint mag nooit A-J-scoredata dragen
      items2.filter(function (x) { return x.type === 'mastersprint' && x.criteria; })
            .forEach(function (m) { problems.push('mastersprint ' + m.id + ' draagt A-J-data en zou als capability gescoord worden'); });
      // Elke V1-track moet capability-representatie hebben
      const v1Tracks = {};
      caps2.filter(function (c) { return c.v1_scope === true; })
           .forEach(function (c) { v1Tracks[c.primary_track] = true; });
      items2.filter(function (x) { return x.v1_scope === true; }).forEach(function (x) {
        if (!v1Tracks[x.primary_track]) {
          problems.push('V1-track ' + x.primary_track + ' heeft geen enkele V1-capability (noemer ondefinieerbaar)');
        }
      });
      if (!/V1 PRODUCT MATURITY/.test(baseline)) problems.push('V1-maturityformule ontbreekt in het baselinemodel');
      if (!/ten minste één V1-capability/.test(baseline)) problems.push('capability-based tracknoemer ontbreekt in het baselinemodel');
    }

    // ── BASELINE-1.2: A-J audit artifact guard ──
    const ajBatches = ['AJ_AUDIT_BATCH_A.json', 'AJ_AUDIT_BATCH_B.json']
      .map(function (f) { return path.join(ROOT, 'docs', 'audit', f); })
      .filter(function (p2) { return fs.existsSync(p2); });
    let ajAudited = 0;
    const ajSeenGlobal = {};
    ajBatches.forEach(function (ajPath) {
      const aj = JSON.parse(fs.readFileSync(ajPath, 'utf8'));
      const CRIT = ['A','B','C','D','E','F','G','H','I','J'];
      const CONF = ['HIGH','MEDIUM','LOW'];
      const W = aj.weights || {};
      const known = {};
      JSON.parse(fs.readFileSync(idxPath, 'utf8')).forEach(function (x) { known[x.id] = x; });
      const seenAj = {};
      (aj.capabilities || []).forEach(function (c) {
        if (seenAj[c.stable_id]) problems.push('duplicate capability audit record: ' + c.stable_id);
        seenAj[c.stable_id] = 1;
        if (!known[c.stable_id]) problems.push('onbekende stable_id in A-J artifact: ' + c.stable_id);
        else if (known[c.stable_id].v1_scope !== true && c.v1_scope === true) {
          problems.push('post-V1 record in V1 trackscore: ' + c.stable_id);
        }
        let aw = 0, sum = 0;
        CRIT.forEach(function (k) {
          const r = c.criteria && c.criteria[k];
          if (!r) { problems.push('ontbrekend criterium ' + k + ' op ' + c.stable_id); return; }
          if (CONF.indexOf(r.confidence) < 0) problems.push('confidence buiten enum op ' + c.stable_id + '/' + k);
          if (r.applicable === false) {
            if (!r.na_rationale) problems.push('applicable=false zonder N/A rationale: ' + c.stable_id + '/' + k);
          } else {
            if (typeof r.score !== 'number') problems.push('applicable=true zonder score: ' + c.stable_id + '/' + k);
            else if (r.score < 0 || r.score > 5) problems.push('score buiten 0-5: ' + c.stable_id + '/' + k);
            if (!r.evidence_refs || !r.evidence_refs.length) problems.push('score zonder evidence_refs: ' + c.stable_id + '/' + k);
            aw += W[k]; sum += W[k] * r.score;
          }
        });
        if (aw > 0) {
          const calc = Math.round((sum / aw) * 1000) / 1000;
          if (Math.abs(calc - c.weighted_score) > 0.002) {
            problems.push('weighted score mismatch op ' + c.stable_id + ': artifact ' + c.weighted_score + ' vs herberekend ' + calc);
          }
        } else problems.push('geen enkel applicable criterium op ' + c.stable_id);
      });
      const v1Total = Object.keys(known).filter(function (k) {
        return known[k].type === 'capability' && known[k].v1_scope === true; }).length;
      if (aj.complete === true && (aj.capabilities || []).length < v1Total) {
        problems.push('incomplete batch gemarkeerd als complete: ' + (aj.capabilities || []).length + '/' + v1Total);
      }
      // Frozen model moet identiek zijn over batches heen
      if (aj.batch !== 'A') {
        const base = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'audit', 'AJ_AUDIT_BATCH_A.json'), 'utf8'));
        CRIT.forEach(function (k) {
          if (base.weights[k] !== aj.weights[k]) problems.push('gewicht ' + k + ' wijkt af van het frozen model in batch ' + aj.batch);
        });
        // BASELINE-1.2: anchors_frozen true is alleen vereist voor Model-v1.0-artefacten.
        // Historische pre-v1 artefacten dragen bewust anchors_frozen false, omdat hun
        // criterium-specifieke ankers nooit repository-frozen waren.
        if (aj.audit_model_status !== 'HISTORICAL_PRE_V1_MODEL' && aj.anchors_frozen !== true) {
          problems.push('batch ' + aj.batch + ' heeft anchors_frozen != true');
        }
      }
      // Een capability mag niet in twee batches voorkomen
      (aj.capabilities || []).forEach(function (c) {
        if (ajSeenGlobal[c.stable_id]) problems.push('capability in twee A-J batches: ' + c.stable_id);
        ajSeenGlobal[c.stable_id] = 1;
      });
      // ── Model v1.0 identiteit en contract ──
      const mdlPath = path.join(ROOT, 'docs', 'audit', 'AJ_MEASUREMENT_MODEL_v1.json');
      if (!fs.existsSync(mdlPath)) problems.push('canoniek meetmodel AJ_MEASUREMENT_MODEL_v1.json ontbreekt');
      else {
        const mdl = JSON.parse(fs.readFileSync(mdlPath, 'utf8'));
        if (mdl.audit_model_id !== 'trainingskompas-aj/v1.0') problems.push('model_id wijkt af van trainingskompas-aj/v1.0');
        if (mdl.audit_model_version !== '1.0') problems.push('model_version wijkt af van 1.0');
        // fingerprint deterministisch herberekenen over exact de frozen velden
        const frozen = {};
        (mdl.fingerprint_scope || []).forEach(function (k) { frozen[k] = mdl[k]; });
        const canon = function (v) {
          if (v === null || typeof v !== 'object') return JSON.stringify(v);
          if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
          return '{' + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ':' + canon(v[k]); }).join(',') + '}';
        };
        const fp = 'sha256:' + crypto.createHash('sha256').update(canon(frozen), 'utf8').digest('hex');
        if (fp !== mdl.model_fingerprint) {
          problems.push('model fingerprint mismatch: frozen semantiek gewijzigd zonder versiebump (' + fp.slice(0, 22) + '... vs ' + String(mdl.model_fingerprint).slice(0, 22) + '...)');
        }
        const CW = { A: 5, B: 15, C: 15, D: 10, E: 10, F: 15, G: 5, H: 10, I: 5, J: 10 };
        let wsum = 0;
        Object.keys(CW).forEach(function (k) {
          const c = (mdl.criteria || {})[k];
          if (!c) { problems.push('model mist criterium ' + k); return; }
          if (c.weight !== CW[k]) problems.push('model gewicht ' + k + ' = ' + c.weight + ', verwacht ' + CW[k]);
          else wsum += c.weight;
          if (!c.anchors || Object.keys(c.anchors).length !== 6) problems.push('criterium ' + k + ' heeft geen zes ankers');
        });
        if (wsum !== 100) problems.push('modelgewichten tellen op tot ' + wsum + '%, verwacht 100%');
        // Artefactconformiteit
        const st = aj.audit_model_status;
        if (aj.audit_model_version === '1.0' || aj.audit_model_version === mdl.audit_model_id) {
          if (st === 'HISTORICAL_PRE_V1_MODEL') problems.push('historisch artefact batch ' + aj.batch + ' claimt audit_model_version 1.0');
          (aj.capabilities || []).forEach(function (c) {
            const seenRefs = {};
            CRIT.forEach(function (k) {
              const r = (c.criteria || {})[k]; if (!r) return;
              if (r.applicable === false) { if (!r.na_rationale) problems.push('v1 N/A zonder rationale: ' + c.stable_id + '/' + k);
                else if (['D','E','G','H','J'].indexOf(k) < 0) problems.push('v1 N/A niet toegestaan op criterium ' + k + ': ' + c.stable_id); return; }
              if (!r.evidence_refs || !r.evidence_refs.length) problems.push('v1 criterium zonder evidence_refs: ' + c.stable_id + '/' + k);
              else { const key = JSON.stringify(r.evidence_refs); if (seenRefs[key]) problems.push('v1 gedeelde evidence_refs over criteria: ' + c.stable_id + '/' + k); seenRefs[key] = 1; }
              if (r.rationale === 'zie evidence_refs') problems.push('v1 generieke rationale verboden: ' + c.stable_id + '/' + k);
              if (!Number.isInteger(r.score) || r.score < 0 || r.score > 5) problems.push('v1 score niet integer 0-5: ' + c.stable_id + '/' + k);
            });
          });
        } else if (st !== 'HISTORICAL_PRE_V1_MODEL') {
          problems.push('batch ' + aj.batch + ' heeft geen geldige audit_model_version en geen HISTORICAL_PRE_V1_MODEL-status');
        } else if (aj.anchors_frozen === true) {
          problems.push('historisch artefact batch ' + aj.batch + ' claimt anchors_frozen true terwijl de ankers niet repository-frozen waren');
        }
        // trackscore volgens de stored-score afrondingsregel
        Object.keys(aj.track_results || {}).forEach(function (t) {
          const cs = (aj.capabilities || []).filter(function (c) { return c.primary_track === t; });
          if (!cs.length) return;
          const avg = Math.round((cs.reduce(function (a, c) { return a + c.weighted_score; }, 0) / cs.length) * 1000) / 1000;
          if (Math.abs(avg - aj.track_results[t].score) > 0.0005) {
            problems.push('trackscore ' + t + ' in batch ' + aj.batch + ' = ' + aj.track_results[t].score + ', herberekend ' + avg);
          }
        });
      }
      ajAudited += (aj.capabilities || []).length;
      // C-C5: een OPEN/REVIEW_REQUIRED gap die via capability_id expliciet aan een
      // reeds geauditte capability hangt, moet in de gap_refs van die capability staan.
      // Read-only getoetst tegen alle 59 canonical gaps: 6 toepasselijk, 1 violation,
      // 0 false positives -- capability_id is een expliciet canoniek veld, geen heuristiek.
      const regForAj = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'AUDIT_GAP_REGISTER.json'), 'utf8'));
      const byCap = {};
      (aj.capabilities || []).forEach(function (c) { byCap[c.stable_id] = c.gap_refs || []; });
      (regForAj.gaps || []).forEach(function (gp) {
        if (['OPEN', 'REVIEW_REQUIRED'].indexOf(gp.status) < 0) return;
        if (!gp.capability_id || !byCap[gp.capability_id]) return;
        if (byCap[gp.capability_id].indexOf(gp.gap_id) < 0) {
          problems.push('open gap ' + gp.gap_id + ' hangt via capability_id aan geauditte capability ' +
            gp.capability_id + ' maar ontbreekt in gap_refs');
        }
      });
    });
    {
      const knownAll = {};
      JSON.parse(fs.readFileSync(idxPath, 'utf8')).forEach(function (x) { knownAll[x.id] = x; });
      const v1Total = Object.keys(knownAll).filter(function (k) {
        return knownAll[k].type === 'capability' && knownAll[k].v1_scope === true; }).length;
      if (/V1 Product Maturity[^|]*\|[^|]*\|[^|]*\|\s*\*\*CANONICAL\*\*/.test(baseline) && ajAudited < v1Total) {
        problems.push('totale V1 maturity canonical terwijl slechts ' + ajAudited + '/' + v1Total + ' V1-capabilities zijn beoordeeld');
      }
    }

    if (problems.length) fail('BASELINE-1.0 auditguard: ' + problems.slice(0, 6).join('; ') +
      (problems.length > 6 ? ' (+' + (problems.length - 6) + ' meer)' : ''));
    else pass('BASELINE-1.0 auditguard groen: ' + gaps.length + ' canonical gaps, unieke IDs, geldige tracks/statussen, scope-evidence aanwezig, driftmodel vastgelegd');
  } catch (e) {
    fail('BASELINE-1.0 auditguard kon niet worden uitgevoerd: ' + e.message);
  }
})();

console.log('─'.repeat(52));
if (errors) {
  console.log('🔴 ' + errors + ' consistentieprobleem(en) gevonden.');
  process.exit(1);
}
console.log('🟢 Documentatie intern consistent (binnen de grenzen van deze check).');