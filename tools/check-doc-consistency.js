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

console.log('─'.repeat(52));
if (errors) {
  console.log('🔴 ' + errors + ' consistentieprobleem(en) gevonden.');
  process.exit(1);
}
console.log('🟢 Documentatie intern consistent (binnen de grenzen van deze check).');