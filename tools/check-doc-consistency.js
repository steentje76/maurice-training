/* tools/check-doc-consistency.js — Trainingskompas documentatie-consistentiecheck.
 * Read-only, geen productwijziging. Draai: node tools/check-doc-consistency.js
 *
 * Controleert:
 *  1. docs/ROADMAP_INDEX.json is geldig JSON.
 *  2. Geen dubbele capability-IDs binnen de roadmap-index.
 *  3. Elke "dependencies"-referentie verwijst naar een bestaand ID binnen dezelfde index.
 *  4. Geen roadmap-index-item met status "CLOSED" dat in GAP_ANALYSIS_V2.md nog als
 *     open P0/P1/P2/P3 in een sectiekop voorkomt (tekstuele heuristiek).
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

console.log('─'.repeat(52));
if (errors) {
  console.log('🔴 ' + errors + ' consistentieprobleem(en) gevonden.');
  process.exit(1);
}
console.log('🟢 Documentatie intern consistent (binnen de grenzen van deze check).');
