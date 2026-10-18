/* core/fLibraryValidation.test.js — LIB-VALIDATE-01
 *
 * Bewaakt de bibliotheekvalidatie (tools/library-validate.js):
 *  A. de echte bibliotheken in de repository zijn foutvrij (ids, slugs, namen, relaties, media,
 *     manifest, supplementclaims met bron, geen genees-/behandeltaal);
 *  B. de validator vangt fouten echt (sabotage met een nagebouwde, kapotte catalogus);
 *  C. de MoveKit-droogloop is reproduceerbaar, schrijft niets en stelt geen bestaande id's voor;
 *  D. het gegenereerde rapport in docs/ komt overeen met de huidige data.
 * Alleen-lezen: geen netwerk, geen database.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const V = require(path.join(ROOT, 'tools', 'library-validate.js'));

let pass = 0, fail = 0;
const msgs = [];
function ok(c, l) { if (c) pass++; else { fail++; msgs.push('MISLUKT: ' + l); } }
function eq(a, b, l) { ok(JSON.stringify(a) === JSON.stringify(b), l + ' (kreeg ' + JSON.stringify(a) + ', verwacht ' + JSON.stringify(b) + ')'); }

/* A. echte data */
const r = V.run({ sha: false });
eq(r.oefeningen.fouten, [], 'A1 oefeningencatalogus: geen fouten');
eq(r.supplementen.fouten, [], 'A2 supplementen: geen fouten (claims A-D met bron, geen claimtaal)');
ok(r.oefeningen.aantal === 226 && r.oefeningen.media.videos === 226 && r.oefeningen.media.ontbrekend.length === 0, 'A3 226 oefeningen, elk met video');
ok(r.oefeningen.media.manifest && r.oefeningen.media.manifest.groottenAfwijkend === 0, 'A4 media-manifest klopt met videos/ (bestand + grootte)');
eq(r.oefeningen.relaties.fouten, 0, 'A5 geen relatie naar een onbekende of dezelfde oefening');
ok(/BLOCKED/.test(r.oefeningen.batch002Poort), 'A6 de poort voor de volgende MoveKit-batch staat nog dicht (MOVEKIT_MEDIA_SCALE_GATE)');
eq(r.voeding.centraleProductbibliotheek, false, 'A7 voeding: geen centrale productbibliotheek in de repository (eerlijk gerapporteerd)');

/* B. sabotage: een kapotte kopie van de catalogus */
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-libval-'));
  fs.mkdirSync(path.join(tmp, 'tools')); fs.mkdirSync(path.join(tmp, 'core')); fs.mkdirSync(path.join(tmp, 'docs', 'generated'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'tools', 'library-validate.js'), path.join(tmp, 'tools', 'library-validate.js'));
  ['nutritionSupplementCatalog.js', 'nutritionSupplementEvidenceRegistry.js', 'nutritionSupplementSourceRegistry.js'].forEach(function (f) { fs.copyFileSync(path.join(ROOT, 'core', f), path.join(tmp, 'core', f)); });
  fs.copyFileSync(path.join(ROOT, 'index.html'), path.join(tmp, 'index.html'));
  fs.copyFileSync(path.join(ROOT, 'exercise-intelligence_6.json'), path.join(tmp, 'exercise-intelligence_6.json'));
  fs.copyFileSync(path.join(ROOT, 'docs', 'generated', 'MOVEKIT_MEDIA_MANIFEST_V1.json'), path.join(tmp, 'docs', 'generated', 'MOVEKIT_MEDIA_MANIFEST_V1.json'));
  const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'exercise-catalog.json'), 'utf8'));
  cat.catalog = cat.catalog.slice(0, 3);
  cat.catalog.push(JSON.parse(JSON.stringify(cat.catalog[0])));                 // dubbel id, slug, naam
  cat.catalog[1].relations = { alternatives: ['TK-999999'], progressions: [], regressions: [] };
  cat.catalog[2].identity.primary = [];
  cat.count = 99;
  fs.writeFileSync(path.join(tmp, 'exercise-catalog.json'), JSON.stringify(cat));
  fs.mkdirSync(path.join(tmp, 'videos'));
  fs.writeFileSync(path.join(tmp, 'videos', cat.catalog[0].source.provider_id + '.mp4'), 'x');
  const K = require(path.join(tmp, 'tools', 'library-validate.js'));
  const f = K.run({ sha: false }).oefeningen.fouten.join('\n');
  ok(/dubbel catalog_id/.test(f) && /dubbele provider_id/.test(f) && /dubbele naam/.test(f), 'B1 dubbele id/slug/naam worden gevonden');
  ok(/verwijst naar TK-999999 \(bestaat niet\)/.test(f), 'B2 relatie naar onbekende oefening wordt gevonden');
  ok(/geen primaire spiergroep/.test(f) && /count \(99\)/.test(f), 'B3 ontbrekende spiergroep en foute telling worden gevonden');
  ok(/catalogusoefeningen zonder video/.test(f) && /manifestregels wijken af/.test(f), 'B4 ontbrekende video en manifestafwijking worden gevonden');
  /* C. droogloop */
  const bron = path.join(tmp, 'movekit-pakket');
  fs.mkdirSync(bron);
  ['nieuwe-oefening-a.mp4', 'nieuwe-oefening-b.mp4', cat.catalog[0].source.provider_id + '.mp4', 'readme.txt'].forEach(function (x) { fs.writeFileSync(path.join(bron, x), 'x'); });
  const voor = fs.readdirSync(tmp).sort().join(',');
  const plan = K.planMovekitBatch(bron, { batch002Poort: 'BLOCKED' });
  const plan2 = K.planMovekitBatch(bron, { batch002Poort: 'BLOCKED' });
  eq([plan.inBron, plan.alInCatalogus, plan.nieuw, plan.droogloop], [3, 1, 2, true], 'C1 droogloop telt nieuw en bestaand correct (alleen .mp4)');
  eq(plan.voorstel.map(function (x) { return x.voorgesteld_catalog_id; }), ['TK-000004', 'TK-000005'], 'C2 voorgestelde id\'s volgen op het hoogste bestaande id, nooit een bestaand id');
  eq(JSON.stringify(plan), JSON.stringify(plan2), 'C3 reproduceerbaar: dezelfde invoer geeft hetzelfde plan');
  eq(fs.readdirSync(tmp).sort().join(','), voor, 'C4 de droogloop schrijft niets');
  ok(/Plan, geen import/.test(plan.let_op), 'C5 het plan zegt expliciet dat het geen import is');
  fs.rmSync(tmp, { recursive: true, force: true });
}

/* D. rapport in docs */
{
  const p = path.join(ROOT, 'docs', 'LIBRARY_VALIDATION_REPORT.md');
  ok(fs.existsSync(p), 'D1 het validatierapport staat in docs/');
  if (fs.existsSync(p)) {
    const md = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n').trim();
    eq(md, V.markdown(V.run({ sha: true })).trim(), 'D2 het rapport is actueel (opnieuw genereren: node tools/library-validate.js --markdown --sha > docs/LIBRARY_VALIDATION_REPORT.md)');
  }
}

console.log('fLibraryValidation: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
