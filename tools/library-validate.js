#!/usr/bin/env node
/* tools/library-validate.js — LIB-VALIDATE-01
 *
 * Alleen-lezen validatie van de centrale bibliotheken in de repository:
 *   - oefeningen: exercise-catalog.json + exercise-intelligence_6.json + videos/ + media-manifest
 *   - supplementen: core/nutritionSupplementCatalog.js + Evidence Registry + Source Registry
 *   - voeding: er is GEEN centrale productbibliotheek in de repository (zie rapport)
 *
 * Optioneel: --movekit-source <map> plant een volgende MoveKit-batch als DRY-RUN. Er wordt niets
 * geschreven of geïmporteerd: de uitkomst is een plan (welke slugs zijn nieuw, welke zijn
 * duplicaat, welke missen een video) dat reproduceerbaar is en dus ook omkeerbaar te beoordelen.
 *
 * Gebruik:
 *   node tools/library-validate.js                 rapport naar stdout (JSON)
 *   node tools/library-validate.js --markdown      rapport als Markdown
 *   node tools/library-validate.js --sha           ook sha256 van de video's tegen het manifest
 *   node tools/library-validate.js --movekit-source <map> [--markdown]
 *
 * Exitcode: 0 = geen fouten (waarschuwingen mogen), 1 = fouten in de bibliotheekdata.
 * Geen netwerk, geen database, geen schrijfacties.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const P = {
  catalog: path.join(ROOT, 'exercise-catalog.json'),
  intel: path.join(ROOT, 'exercise-intelligence_6.json'),
  videos: path.join(ROOT, 'videos'),
  manifest: path.join(ROOT, 'docs', 'generated', 'MOVEKIT_MEDIA_MANIFEST_V1.json'),
  index: path.join(ROOT, 'index.html'),
  gate: path.join(ROOT, 'docs', 'MOVEKIT_MEDIA_SCALE_GATE_2026-10-01.md')
};

function args(argv) {
  const o = { markdown: false, sha: false, source: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--markdown') o.markdown = true;
    else if (argv[i] === '--sha') o.sha = true;
    else if (argv[i] === '--movekit-source') o.source = path.resolve(argv[++i] || '');
    else throw new Error('Onbekend argument: ' + argv[i]);
  }
  return o;
}
function norm(s) { return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, ''); }
function telling(arr) { const t = {}; arr.forEach(function (x) { t[x] = (t[x] || 0) + 1; }); return t; }
function dubbel(arr) { const t = telling(arr); return Object.keys(t).filter(function (k) { return t[k] > 1; }); }

/* Vocabulaires die de app zelf al vastlegt — geen nieuwe lijsten verzinnen. */
function appVocab() {
  const html = fs.readFileSync(P.index, 'utf8');
  const m = /const MUSCLE_OPTIONS = (\[[^\]]*\]);/.exec(html);
  return { muscleOptions: m ? JSON.parse(m[1].replace(/'/g, '"')) : null };
}

function validateExercises(opts) {
  const fouten = [], waarsch = [];
  const raw = JSON.parse(fs.readFileSync(P.catalog, 'utf8'));
  const C = raw.catalog || [];
  const ids = C.map(function (e) { return e.catalog_id; });
  const slugs = C.map(function (e) { return e.source && e.source.provider_id; });
  /* identiteit */
  ids.forEach(function (id) { if (!/^TK-\d{6}$/.test(id || '')) fouten.push('catalog_id ongeldig: ' + id); });
  dubbel(ids).forEach(function (id) { fouten.push('dubbel catalog_id: ' + id); });
  dubbel(slugs).forEach(function (s) { fouten.push('dubbele provider_id: ' + s); });
  if (raw.count !== C.length) fouten.push('count (' + raw.count + ') ≠ aantal records (' + C.length + ')');
  Object.keys(raw.id_map || {}).forEach(function (slug) {
    const e = C.find(function (x) { return x.source.provider_id === slug; });
    if (!e || e.catalog_id !== raw.id_map[slug]) fouten.push('id_map wijst ' + slug + ' → ' + raw.id_map[slug] + ' maar het record zegt ' + (e ? e.catalog_id : 'ontbreekt'));
  });
  if (Object.keys(raw.id_map || {}).length !== C.length) fouten.push('id_map telt ' + Object.keys(raw.id_map || {}).length + ' i.p.v. ' + C.length);
  /* duplicaten op naam (genormaliseerd) */
  const naamDubbel = dubbel(C.map(function (e) { return norm(e.identity.name); }));
  naamDubbel.forEach(function (n) { fouten.push('dubbele naam (genormaliseerd): ' + n); });
  /* metadata */
  const voc = appVocab();
  const spieren = [].concat.apply([], C.map(function (e) { return (e.identity.primary || []).concat(e.identity.secondary || []); }));
  const onbekend = voc.muscleOptions ? Object.keys(telling(spieren)).filter(function (m) { return voc.muscleOptions.indexOf(m) < 0; }) : [];
  if (onbekend.length) waarsch.push('spiergroepen in de catalogus die niet in MUSCLE_OPTIONS (tagging-keuzelijst) staan: ' + onbekend.join(', '));
  C.forEach(function (e) {
    const i = e.identity || {};
    if (!(i.primary || []).length) fouten.push(e.catalog_id + ': geen primaire spiergroep');
    if (!(i.equipment || []).length) fouten.push(e.catalog_id + ': geen materiaal');
    if (!i.type) fouten.push(e.catalog_id + ': geen oefeningstype');
    if (!i.difficulty) waarsch.push(e.catalog_id + ': geen niveau');
  });
  const zonderNl = C.filter(function (e) { return !e.identity.nl; }).length;
  if (zonderNl) waarsch.push(zonderNl + ' van ' + C.length + ' oefeningen hebben geen Nederlandse naam (identity.nl)');
  /* relaties */
  const idSet = new Set(ids); let relFout = 0;
  C.forEach(function (e) {
    const r = e.relations || {};
    ['alternatives', 'progressions', 'regressions'].forEach(function (k) {
      (r[k] || []).forEach(function (x) { if (!idSet.has(x) || x === e.catalog_id) { relFout++; fouten.push(e.catalog_id + ': ' + k + ' verwijst naar ' + x + (x === e.catalog_id ? ' (zichzelf)' : ' (bestaat niet)')); } });
    });
  });
  /* kennislaag */
  let intel = { count: null, gekoppeld: 0, zonderKennis: [], verwezen: 0, aliassen: 0 };
  try {
    const ii = JSON.parse(fs.readFileSync(P.intel, 'utf8'));
    const ix = {}; (ii.exercises || []).forEach(function (x) { ix[x.exercise_id] = x; });
    intel.count = (ii.exercises || []).length;
    intel.status = ii._meta && ii._meta.status;
    C.forEach(function (e) { if (ix[e.source.provider_id]) intel.gekoppeld++; else intel.zonderKennis.push(e.catalog_id); });
    intel.verwezen = Object.keys(ix).filter(function (s) { return slugs.indexOf(s) < 0; }).length;
    intel.aliassen = (ii.exercises || []).filter(function (x) { return x.identity && (x.identity.aliases || []).length; }).length;
    intel.nlNamen = (ii.exercises || []).filter(function (x) { return x.identity && x.identity.name_nl; }).length;
    if (intel.zonderKennis.length) waarsch.push(intel.zonderKennis.length + ' catalogusoefeningen zonder record in exercise-intelligence_6.json');
    if (intel.verwezen) waarsch.push(intel.verwezen + ' kennisrecords zonder catalogusoefening');
  } catch (e) { fouten.push('exercise-intelligence_6.json niet leesbaar: ' + e.message); }
  /* media */
  const media = { videos: 0, ontbrekend: [], zonderCatalogus: [], manifest: null, posters: null };
  const files = fs.existsSync(P.videos) ? fs.readdirSync(P.videos).filter(function (f) { return /\.mp4$/.test(f); }) : [];
  media.videos = files.length;
  slugs.forEach(function (s) { if (files.indexOf(s + '.mp4') < 0) media.ontbrekend.push(s); });
  files.forEach(function (f) { if (slugs.indexOf(f.replace(/\.mp4$/, '')) < 0) media.zonderCatalogus.push(f); });
  if (media.ontbrekend.length) fouten.push(media.ontbrekend.length + ' catalogusoefeningen zonder video in videos/');
  if (media.zonderCatalogus.length) waarsch.push(media.zonderCatalogus.length + ' video\'s zonder catalogusoefening');
  try {
    const m = JSON.parse(fs.readFileSync(P.manifest, 'utf8'));
    let afwijkend = 0, shaAfwijkend = 0;
    (m.items || []).forEach(function (it) {
      const f = path.join(P.videos, it.provider_id + '.mp4');
      if (!fs.existsSync(f)) { afwijkend++; return; }
      if (fs.statSync(f).size !== it.bytes) afwijkend++;
      if (opts.sha && crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex') !== it.sha256) shaAfwijkend++;
    });
    media.manifest = { items: (m.items || []).length, groottenAfwijkend: afwijkend, sha: opts.sha ? shaAfwijkend : 'niet gecontroleerd (--sha)', totaalBytes: m.total_bytes };
    if (afwijkend) fouten.push(afwijkend + ' manifestregels wijken af van videos/ (bestand of grootte)');
    if (opts.sha && shaAfwijkend) fouten.push(shaAfwijkend + ' video\'s wijken af van de sha256 in het manifest');
  } catch (e) { waarsch.push('media-manifest niet leesbaar: ' + e.message); }
  const pp = (raw.asset_providers || []).find(function (p) { return p.type === 'poster'; });
  if (pp) { media.posters = { totaal: pp.total, catalogus: pp.catalog_entries, ontbrekend: pp.missing }; if (pp.missing) waarsch.push(pp.missing + ' posters ontbreken bij de posterleverancier (' + pp.id + ')'); }
  /* poort voor de volgende batch */
  let gate = null;
  try { const g = fs.readFileSync(P.gate, 'utf8'); const st = /\*\*Batch 002:\*\* \*\*([^*]+)\*\*/.exec(g); gate = st ? st[1].trim() : 'onbekend'; } catch (_) { gate = 'document ontbreekt'; }
  return {
    aantal: C.length, bron: raw.sources, fouten: fouten, waarschuwingen: waarsch,
    metadata: { type: telling(C.map(function (e) { return e.identity.type; })), niveau: telling(C.map(function (e) { return e.identity.difficulty; })),
      materiaal: telling([].concat.apply([], C.map(function (e) { return e.identity.equipment || []; }))), spiergroepenBuitenKeuzelijst: onbekend, zonderNederlandseNaam: zonderNl },
    relaties: { fouten: relFout }, kennislaag: intel, media: media, batch002Poort: gate
  };
}

function planMovekitBatch(srcDir, ex) {
  const raw = JSON.parse(fs.readFileSync(P.catalog, 'utf8'));
  const bekend = new Set(raw.catalog.map(function (e) { return e.source.provider_id; }));
  const bekendNaam = new Set(raw.catalog.map(function (e) { return norm(e.identity.name); }));
  if (!fs.existsSync(srcDir)) return { bron: srcDir, fout: 'map bestaat niet' };
  const mp4 = fs.readdirSync(srcDir).filter(function (f) { return /\.mp4$/i.test(f); }).map(function (f) { return f.replace(/\.mp4$/i, ''); });
  const nieuw = mp4.filter(function (s) { return !bekend.has(s); });
  const naamBotsing = nieuw.filter(function (s) { return bekendNaam.has(norm(s.replace(/-/g, ' '))); });
  const hoogste = raw.catalog.reduce(function (m, e) { return Math.max(m, parseInt(e.catalog_id.slice(3), 10)); }, 0);
  const voorstel = nieuw.filter(function (s) { return naamBotsing.indexOf(s) < 0; }).sort().map(function (s, i) { return { provider_id: s, voorgesteld_catalog_id: 'TK-' + String(hoogste + 1 + i).padStart(6, '0') }; });
  return { bron: srcDir, droogloop: true, inBron: mp4.length, alInCatalogus: mp4.length - nieuw.length, nieuw: nieuw.length,
    naamBotsing: naamBotsing, voorstel: voorstel, poort: ex.batch002Poort,
    let_op: 'Plan, geen import. Gebruiksrechten en de beveiligde levering (MOVEKIT_MEDIA_SCALE_GATE) moeten vóór een import zijn afgerond.' };
}

function validateSupplements() {
  const fouten = [], waarsch = [];
  const Cat = require(path.join(ROOT, 'core', 'nutritionSupplementCatalog.js'));
  const Ev = require(path.join(ROOT, 'core', 'nutritionSupplementEvidenceRegistry.js'));
  const Src = require(path.join(ROOT, 'core', 'nutritionSupplementSourceRegistry.js'));
  const items = Cat.allItems(), claims = Ev.allClaims(), bronnen = Src.allSources();
  dubbel(items.map(function (x) { return x.supplement_id; })).forEach(function (d) { fouten.push('dubbel supplement_id: ' + d); });
  const syn = []; items.forEach(function (x) { [x.canonical_name].concat(x.synonyms || []).forEach(function (s) { syn.push(norm(s) + '|' + x.supplement_id); }); });
  const perTerm = {}; syn.forEach(function (k) { const t = k.split('|')[0]; (perTerm[t] = perTerm[t] || new Set()).add(k.split('|')[1]); });
  Object.keys(perTerm).forEach(function (t) { if (perTerm[t].size > 1) waarsch.push('zoekterm "' + t + '" hoort bij meerdere items: ' + Array.from(perTerm[t]).join(', ')); });
  items.forEach(function (x) {
    if (!Cat.isValidEntityType(x.entity_type)) fouten.push(x.supplement_id + ': ongeldig entity_type');
    if (!Cat.isValidPriority(x.priority)) fouten.push(x.supplement_id + ': ongeldige prioriteit');
    if (!Cat.isValidAntiDopingTriage(x.anti_doping_relevance)) fouten.push(x.supplement_id + ': ongeldige anti-doping-triage');
  });
  const bronIds = new Set(bronnen.map(function (s) { return s.source_id; }));
  const itemIds = new Set(items.map(function (x) { return x.supplement_id; }));
  claims.forEach(function (c) {
    if (!itemIds.has(c.supplement_id)) fouten.push(c.evidence_id + ': claim voor onbekend item ' + c.supplement_id);
    (c.sources || []).forEach(function (s) { if (!bronIds.has(s)) fouten.push(c.evidence_id + ': onbekende bron ' + s); });
    /* Niveau E (productbeleid / expertoordeel, bv. "Trainingskompas stelt nooit zelf een tekort vast")
       heeft per ontwerp geen literatuurbron; A-D moeten er wél een hebben. */
    if (!(c.sources || []).length && c.evidence_level !== 'E') fouten.push(c.evidence_id + ': claim (niveau ' + c.evidence_level + ') zonder bron');
  });
  items.forEach(function (x) {
    const n = claims.filter(function (c) { return c.supplement_id === x.supplement_id; }).length;
    if (x.evidence_coverage_status === 'CERTIFIED' && !n) fouten.push(x.supplement_id + ': CERTIFIED zonder claims');
    if (x.evidence_coverage_status === 'PENDING_VERIFICATION' && n) waarsch.push(x.supplement_id + ': PENDING_VERIFICATION maar heeft al ' + n + ' claim(s)');
  });
  /* gezondheidsclaims: genees-/behandeltaal in vrije tekst die als eigenschap van het product gelezen kan worden */
  const CLAIMTAAL = /\b(geneest|genezen|behandelt|voorkomt ziekte|beschermt tegen|ontgift|detox|wondermiddel)\b/i;
  items.forEach(function (x) { if (CLAIMTAAL.test([x.common_use, x.sport_relevance].join(' '))) fouten.push(x.supplement_id + ': mogelijke gezondheidsclaim in catalogustekst'); });
  claims.forEach(function (c) { if (CLAIMTAAL.test(c.claim || '')) fouten.push(c.evidence_id + ': mogelijke gezondheidsclaim in claimtekst'); });
  return { versie: Cat.CATALOG_VERSION, items: items.length, perStatus: telling(items.map(function (x) { return x.evidence_coverage_status; })),
    perPrioriteit: telling(items.map(function (x) { return x.priority; })), claims: claims.length, bronnen: bronnen.length,
    claimsPerStatus: telling(claims.map(function (c) { return c.evidence_status; })),
    beleidsclaimsZonderBron: claims.filter(function (c) { return !(c.sources || []).length && c.evidence_level === 'E'; }).length,
    fouten: fouten, waarschuwingen: waarsch };
}

function nutritionStatus() {
  return {
    centraleProductbibliotheek: false,
    toelichting: 'De repository bevat geen centrale voedingsmiddelendatabase. Producten komen per scan uit Open Food Facts (core/nutritionProviderOpenFoodFacts.js, core/nutritionIngestService.js) of zijn eigen producten van de sporter (core/nutritionCustomProductService.js, gebruikersdata). Een centrale import vraagt eerst een productbesluit over bron, licentie (ODbL bij Open Food Facts) en scheiding van gebruikersdata.'
  };
}

function markdown(r) {
  const L = [];
  const e = r.oefeningen, s = r.supplementen;
  L.push('# Bibliotheekvalidatie (LIB-VALIDATE-01)', '', 'Gegenereerd met `node tools/library-validate.js --markdown' + (r.opts.sha ? ' --sha' : '') + '`. Alleen-lezen; niets geïmporteerd.', '');
  L.push('## Oefeningen', '', '| Controle | Uitkomst |', '|---|---|');
  L.push('| Records | ' + e.aantal + ' (' + (e.bron || []).map(function (b) { return b.name + ' ' + b.count; }).join(', ') + ') |');
  L.push('| Fouten | ' + e.fouten.length + ' |', '| Waarschuwingen | ' + e.waarschuwingen.length + ' |');
  L.push('| Dubbele id\'s / slugs / namen | ' + (e.fouten.filter(function (x) { return /dubbel/.test(x); }).length) + ' |');
  L.push('| Zonder Nederlandse naam | ' + e.metadata.zonderNederlandseNaam + ' |');
  L.push('| Spiergroepen buiten keuzelijst | ' + (e.metadata.spiergroepenBuitenKeuzelijst.join(', ') || '—') + ' |');
  L.push('| Relatiefouten | ' + e.relaties.fouten + ' |');
  L.push('| Kennislaag gekoppeld | ' + e.kennislaag.gekoppeld + ' van ' + e.aantal + ' (records: ' + e.kennislaag.count + ', met aliassen: ' + e.kennislaag.aliassen + ', NL-naam: ' + e.kennislaag.nlNamen + ') |');
  L.push('| Video\'s | ' + e.media.videos + ' (ontbrekend: ' + e.media.ontbrekend.length + ', zonder catalogus: ' + e.media.zonderCatalogus.length + ') |');
  L.push('| Manifest | ' + (e.media.manifest ? e.media.manifest.items + ' regels, grootte afwijkend: ' + e.media.manifest.groottenAfwijkend + ', sha256: ' + e.media.manifest.sha : '—') + ' |');
  L.push('| Posters | ' + (e.media.posters ? e.media.posters.totaal + ' beschikbaar, ' + e.media.posters.ontbrekend + ' ontbrekend' : '—') + ' |');
  L.push('| Batch 002 | ' + e.batch002Poort + ' |', '');
  L.push('Type: ' + JSON.stringify(e.metadata.type) + '  ', 'Niveau: ' + JSON.stringify(e.metadata.niveau) + '  ', 'Materiaal: ' + JSON.stringify(e.metadata.materiaal), '');
  if (e.fouten.length) { L.push('### Fouten', ''); e.fouten.forEach(function (x) { L.push('- ' + x); }); L.push(''); }
  if (e.waarschuwingen.length) { L.push('### Waarschuwingen', ''); e.waarschuwingen.forEach(function (x) { L.push('- ' + x); }); L.push(''); }
  if (r.batchplan) { L.push('### Droogloop volgende MoveKit-batch', '', '```json', JSON.stringify(r.batchplan, null, 2), '```', ''); }
  L.push('## Supplementen', '', '| Controle | Uitkomst |', '|---|---|');
  L.push('| Catalogus | ' + s.versie + ', ' + s.items + ' items ' + JSON.stringify(s.perStatus) + ' |');
  L.push('| Claims / bronnen | ' + s.claims + ' / ' + s.bronnen + ' ' + JSON.stringify(s.claimsPerStatus) + ' |');
  L.push('| Beleidsclaims (niveau E) zonder literatuurbron | ' + s.beleidsclaimsZonderBron + ' (per ontwerp) |');
  L.push('| Fouten | ' + s.fouten.length + ' |', '| Waarschuwingen | ' + s.waarschuwingen.length + ' |', '');
  if (s.fouten.length) { L.push('### Fouten', ''); s.fouten.forEach(function (x) { L.push('- ' + x); }); L.push(''); }
  if (s.waarschuwingen.length) { L.push('### Waarschuwingen', ''); s.waarschuwingen.forEach(function (x) { L.push('- ' + x); }); L.push(''); }
  L.push('## Voeding', '', r.voeding.toelichting, '');
  return L.join('\n');
}

function run(opts) {
  const ex = validateExercises(opts);
  const r = { opts: { sha: opts.sha }, oefeningen: ex, supplementen: validateSupplements(), voeding: nutritionStatus() };
  if (opts.source) r.batchplan = planMovekitBatch(opts.source, ex);
  r.fouten = ex.fouten.length + r.supplementen.fouten.length;
  return r;
}

if (require.main === module) {
  const o = args(process.argv);
  const r = run(o);
  process.stdout.write(o.markdown ? markdown(r) + '\n' : JSON.stringify(r, null, 2) + '\n');
  process.exit(r.fouten ? 1 : 0);
}
module.exports = { run: run, markdown: markdown, planMovekitBatch: planMovekitBatch, norm: norm };
