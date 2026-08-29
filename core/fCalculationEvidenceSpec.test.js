/* fCalculationEvidenceSpec.test.js — MS-F3-11 regressietest.
 *
 * Structurele consistentietests voor docs/CALCULATION_EVIDENCE_SPEC.md: bevestigt dat
 * verplichte secties bestaan, dat alle 9 Decision Rule ID's genoemd worden, dat het
 * document geen ongeldige maturity-status gebruikt, en dat de F4-grens (AI-output-
 * enforcement) correct als NIET-geïmplementeerd wordt vastgelegd, niet als bestaande
 * F3-capability.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const spec = fs.readFileSync(path.join(ROOT, 'docs/CALCULATION_EVIDENCE_SPEC.md'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- Verplichte secties (sectie 42 van de opdracht) ----
const VERPLICHTE_SECTIES = [
  'Autoriteit', 'Canonieke architectuur', 'Raw Data Layer', 'Calculation Engine',
  'Context Engine', 'Decision Engine', 'Data Quality vs. Confidence vs. Evidence',
  'Evidence-niveaus', 'Verboden interpretaties', 'Explainability, Immutability, Reproducibility',
  'AI Coach-contract', 'Change Governance'
];
VERPLICHTE_SECTIES.forEach(sec => {
  ok(spec.includes(sec), 'CALCULATION_EVIDENCE_SPEC.md bevat de verplichte sectie "' + sec + '"');
});

// ---- Alle 9 Decision Rule ID's worden genoemd ----
['DEC-PROG-001', 'DEC-RECADJ-001', 'DEC-READY-001', 'DEC-DETRAIN-001', 'DEC-REST-001',
 'DEC-SETOUT-001', 'DEC-READYDAY-001', 'DEC-ACWR-ADV-001', 'DEC-LOADCORR-001'].forEach(id => {
  ok(spec.includes(id), 'CALCULATION_EVIDENCE_SPEC.md noemt ' + id);
});

// ---- Geen ongeldige "PARTIAL"-schema-status in dit document ----
ok(!/status[:\s]*\*\*PARTIAL\*\*/i.test(spec), 'CALCULATION_EVIDENCE_SPEC.md gebruikt nergens "PARTIAL" als schema-statuswaarde (alleen de geldige maturity-enum)');

// ---- Endurance NOT_IMPLEMENTED-items expliciet aanwezig ----
['Critical Speed', 'Critical Power', 'TRIMP', 'HR-zones', 'aerobic decoupling'].forEach(item => {
  ok(spec.includes(item), 'CALCULATION_EVIDENCE_SPEC.md vermeldt "' + item + '" expliciet als NOT_IMPLEMENTED, niet als bestaande functionaliteit');
});

// ---- ACWR/HRV verboden-interpretatie-clausules aanwezig ----
ok(/ACWR[\s\S]{0,200}blessurevoorspeller/.test(spec), 'ACWR-verboden-interpretatie (nooit blessurevoorspeller) staat expliciet in de spec');
ok(/HRV[\s\S]{0,200}(diagnose|overtrainings)/.test(spec), 'HRV-verboden-interpretatie (nooit diagnose/overtrainingsdetector) staat expliciet in de spec');

// ---- F4-grens correct vastgelegd: GEEN overclaim dat AI-output-enforcement al bestaat ----
ok(spec.includes('AI-OUTPUT-CONTRACT-001') && /F4/.test(spec.slice(spec.indexOf('AI-OUTPUT-CONTRACT-001') - 50, spec.indexOf('AI-OUTPUT-CONTRACT-001') + 100)),
  'CALCULATION_EVIDENCE_SPEC.md legt expliciet vast dat AI-OUTPUT-CONTRACT-001 bij F4 hoort, geen F3-capability');
ok(!/AI[\s\S]{0,100}kan technisch onmogelijk/.test(spec),
  'CALCULATION_EVIDENCE_SPEC.md claimt nergens dat AI "technisch onmogelijk" kan fabriceren (de eerder gecorrigeerde overclaim keert niet terug)');

// ---- Provenance-onderscheid (per-veld, niet rij-niveau) expliciet vastgelegd ----
ok(/per-veld/i.test(spec) && /hrv_source/.test(spec), 'CALCULATION_EVIDENCE_SPEC.md legt de per-veld-provenance-keuze (hrv_source/rhr_source/sleep_source) expliciet vast');

// ---- Explainable/Immutable/Reproducible expliciet onderscheiden, niet samengevoegd ----
ok(spec.includes('**Explainable:**') && spec.includes('**Immutable:**') && spec.includes('**Reproducible:**'),
  'CALCULATION_EVIDENCE_SPEC.md definieert Explainable/Immutable/Reproducible als drie aparte begrippen, conform sectie 31 van de opdracht');

console.log('fCalculationEvidenceSpec: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
