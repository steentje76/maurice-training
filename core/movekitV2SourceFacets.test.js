/* TK-504 MoveKit V2 source facets — synthetic regression suite (node, standalone).
 * Draai: node core/movekitV2SourceFacets.test.js
 * Alleen synthetische fixtures; leest uitsluitend het voorgestelde mapping-bestand
 * (read-only) en index.html (read-only, voor de niet-activatie-controle). */
const fs = require('fs');
const path = require('path');
const F = require('./movekitV2SourceFacets.js');

let pass = 0, fail = 0;
const T = (name, fn) => { try { fn(); console.log('  ✓ ' + name); pass++; } catch (e) { console.log('  ✗ ' + name + ' :: ' + e.message); fail++; } };
const eq = (a, b, m) => { if (!Object.is(a, b)) throw new Error((m || '') + ' verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a)); };
const ok = (c, m) => { if (!c) throw new Error(m || 'assert'); };
const deq = (a, b, m) => eq(JSON.stringify(a), JSON.stringify(b), m);

const MAP_PATH = path.join(__dirname, '..', 'tools', 'movekit-v2-taxonomy-map.json');
const REGISTRY = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
const fresh = () => JSON.parse(JSON.stringify(REGISTRY));

const EXPECTED_CODES = [
  'movekit:muscle:forearms', 'movekit:muscle:lower_back', 'movekit:muscle:neck',
  'movekit:muscle:tibialis', 'movekit:muscle:adductors',
  'movekit:equipment:backpack', 'movekit:equipment:battle_ropes', 'movekit:equipment:bench',
  'movekit:equipment:dowel', 'movekit:equipment:foam_roller', 'movekit:equipment:medicine_ball',
  'movekit:equipment:sled', 'movekit:equipment:slider', 'movekit:equipment:stability_ball',
  'movekit:equipment:trx', 'movekit:equipment:towel', 'movekit:equipment:weight_plate',
  'movekit:equipment:wrist_roller'
];
const P = (m, e, extra) => F.projectSourceFacets(Object.assign({ provider: 'movekit', muscles: m, equipment: e }, extra || {}), REGISTRY);

console.log('\n🧩 MoveKit V2 source facets');

console.log('\n[A] registry-validatie');
T('voorgestelde mapping is geldig, 18 identifiers, approved=false', () => {
  const v = F.validateTermRegistry(REGISTRY);
  ok(v.valid, JSON.stringify(v.errors));
  eq(v.termCount, 18);
  eq(v.approved, false);
  deq(v.codes.slice().sort(), EXPECTED_CODES.slice().sort());
  deq(F.listTermIdentifiers(REGISTRY).slice().sort(), EXPECTED_CODES.slice().sort());
});
T('alle codes dragen namespace movekit: en zijn uniek', () => {
  const c = F.listTermIdentifiers(REGISTRY);
  ok(c.every((x) => x.indexOf('movekit:') === 0));
  eq(new Set(c).size, 18);
});
T('geapprovede/geactiveerde registry wordt geweigerd (fail-closed)', () => {
  let r = fresh(); r.status = 'APPROVED'; ok(!F.validateTermRegistry(r).valid);
  r = fresh(); r.runtime_activation = true; ok(!F.validateTermRegistry(r).valid);
  r = fresh(); r.review_required = false; ok(!F.validateTermRegistry(r).valid);
  r = fresh(); r.schema = 'x'; ok(!F.validateTermRegistry(r).valid);
});
T('code zonder movekit-namespace of in verkeerde groep wordt geweigerd', () => {
  let r = fresh(); r.muscles.Forearms.code = 'm:grip'; ok(!F.validateTermRegistry(r).valid);
  r = fresh(); r.muscles.Neck.code = 'movekit:equipment:neck'; ok(!F.validateTermRegistry(r).valid);
  r = fresh(); r.equipment.Sled.code = 'movekit:muscle:sled'; ok(!F.validateTermRegistry(r).valid);
});
T('dubbele code en ontbrekende groep worden geweigerd', () => {
  let r = fresh(); r.muscles.Neck.code = r.muscles.Forearms.code; ok(!F.validateTermRegistry(r).valid);
  r = fresh(); delete r.equipment; ok(!F.validateTermRegistry(r).valid);
});
T('malformed registry-waarden: null/array/string/getal', () => {
  [null, undefined, [], 'x', 5, true].forEach((v) => { ok(!F.validateTermRegistry(v).valid); eq(F.validateTermRegistry(v).approved, false); });
});
T('ongeldige registry => geen enkele label wordt gekoppeld', () => {
  const r = fresh(); r.status = 'APPROVED';
  const out = F.projectSourceFacets({ provider: 'movekit', muscles: ['Forearms'] }, r);
  eq(out.registryValid, false);
  eq(out.muscles[0].status, F.STATUS.UNAPPROVED);
  eq(out.muscles[0].code, null);
});

console.log('\n[B] exacte projectie — Forearms/Grip, Lower Back/Rug');
T('Forearms => movekit:muscle:forearms (niet m:grip)', () => {
  const o = P(['Forearms'], []);
  const f = o.muscles[0];
  eq(f.sourceTerm, 'Forearms'); eq(f.code, 'movekit:muscle:forearms'); eq(f.labelNl, 'Onderarmen');
  eq(f.status, F.STATUS.PROPOSED); eq(f.approved, false);
  ok(!JSON.stringify(o).includes('m:grip'), 'geen m:grip in output');
  ok(!/grip/i.test(f.labelNl));
});
T('Grip is GEEN registry-term: blijft unapproved, geen conversie in beide richtingen', () => {
  const o = P(['Grip', 'grip'], []);
  o.muscles.forEach((f) => { eq(f.status, F.STATUS.UNAPPROVED); eq(f.code, null); eq(f.labelNl, null); });
  deq(o.sourceTerms.muscles, ['Grip', 'grip']);
});
T('Forearm / forearms / "Forearms " / "FOREARMS" / onderarm: geen synoniemen', () => {
  ['Forearm', 'forearms', 'Forearms ', ' Forearms', 'FOREARMS', 'onderarm', 'Onderarmen'].forEach((t) => {
    const f = P([t], []).muscles[0];
    eq(f.status, F.STATUS.UNAPPROVED, t); eq(f.code, null, t); eq(f.sourceTerm, t, t);
  });
});
T('Lower Back => movekit:muscle:lower_back; nooit Rug', () => {
  const o = P(['Lower Back'], []);
  const f = o.muscles[0];
  eq(f.code, 'movekit:muscle:lower_back'); eq(f.labelNl, 'Onderrug');
  ok(!JSON.stringify(o).includes('m:rug')); ok(f.labelNl !== 'Rug');
});
T('Back / Rug / Lowerback / lower back blijven unapproved', () => {
  ['Back', 'Rug', 'Lowerback', 'lower back', 'Lumbar', 'Onderrug'].forEach((t) => {
    const f = P([t], []).muscles[0];
    eq(f.status, F.STATUS.UNAPPROVED, t); eq(f.code, null, t);
  });
});
T('Adductors exact; Abductors/Adductor/Inner Thigh niet', () => {
  const f = P(['Adductors'], []).muscles[0];
  eq(f.code, 'movekit:muscle:adductors'); eq(f.labelNl, 'Adductoren');
  ['Abductors', 'Adductor', 'Inner Thigh'].forEach((t) => eq(P([t], []).muscles[0].code, null, t));
});

console.log('\n[C] alle 18 term-identifiers');
T('elk van de 18 bronlabels geeft zijn exacte code, approved=false, in juiste groep', () => {
  const got = [];
  Object.keys(REGISTRY.muscles).forEach((term) => {
    const f = P([term], []).muscles[0];
    eq(f.code, REGISTRY.muscles[term].code, term); eq(f.labelNl, REGISTRY.muscles[term].label_nl, term);
    eq(f.kind, 'muscle'); eq(f.approved, false); got.push(f.code);
  });
  Object.keys(REGISTRY.equipment).forEach((term) => {
    const f = P([], [term]).equipment[0];
    eq(f.code, REGISTRY.equipment[term].code, term); eq(f.labelNl, REGISTRY.equipment[term].label_nl, term);
    eq(f.kind, 'equipment'); eq(f.approved, false); got.push(f.code);
  });
  eq(got.length, 18);
  deq(got.slice().sort(), EXPECTED_CODES.slice().sort());
});
T('accessoire-vocabulaire (Backpack, Towel, Dowel, Wrist Roller, Slider, Sled, TRX ...)', () => {
  const terms = ['Backpack', 'Battle Ropes', 'Bench', 'Dowel', 'Foam Roller', 'Medicine Ball', 'Sled', 'Slider',
    'Stability Ball', 'TRX', 'Towel', 'Weight Plate', 'Wrist Roller'];
  const o = P([], terms);
  eq(o.equipment.length, 13);
  ok(o.equipment.every((f) => f.status === F.STATUS.PROPOSED && f.code.indexOf('movekit:equipment:') === 0));
});
T('equipment-term in muscle-lijst (en omgekeerd) krijgt geen code', () => {
  eq(P(['Bench'], []).muscles[0].code, null);
  eq(P([], ['Forearms']).equipment[0].code, null);
});
T('accessoire-synoniemen niet gematcht (Trx, Rope, Swiss Ball, Plate, Kettlebell)', () => {
  ['Trx', 'Rope', 'Swiss Ball', 'Plate', 'Kettlebell', 'Foam roller'].forEach((t) => eq(P([], [t]).equipment[0].code, null, t));
});

console.log('\n[D] onbekende waarden & provenance');
T('onbekende waarde blijft ongewijzigd en unapproved', () => {
  const o = P(['Glutes', 'Quadriceps', 'Zonderling'], ['Barbell']);
  deq(o.sourceTerms.muscles, ['Glutes', 'Quadriceps', 'Zonderling']);
  deq(o.sourceTerms.equipment, ['Barbell']);
  o.muscles.concat(o.equipment).forEach((f) => { eq(f.status, F.STATUS.UNAPPROVED); eq(f.approved, false); eq(f.reason, 'not_in_proposed_registry'); });
});
T('volgorde, duplicaten en index blijven behouden', () => {
  const o = P(['Neck', 'Glutes', 'Neck'], []);
  deq(o.muscles.map((f) => f.index), [0, 1, 2]);
  deq(o.muscles.map((f) => f.sourceTerm), ['Neck', 'Glutes', 'Neck']);
});
T('provider-provenance blijft; niet-movekit provider matcht niet', () => {
  const o = F.projectSourceFacets({ provider: 'otherco', muscles: ['Forearms'] }, REGISTRY);
  eq(o.provider, 'otherco');
  eq(o.muscles[0].status, F.STATUS.UNAPPROVED); eq(o.muscles[0].code, null);
  eq(o.muscles[0].reason, 'provider_not_matchable');
  eq(P(['Neck'], []).provider, 'movekit');
});
T('ongeldige provider wordt "unknown", niet gematcht', () => {
  ['Bad Provider!', '', 'x'.repeat(200), '<script>'].forEach((p) => {
    const o = F.projectSourceFacets({ provider: p, muscles: ['Neck'] }, REGISTRY);
    eq(o.provider, 'unknown'); eq(o.muscles[0].code, null);
  });
});
T('geen provider => fail-closed en geen Movekit code', () => {
  const result = F.projectSourceFacets({ muscles: ['Neck'] }, REGISTRY);
  eq(result.provider, 'unknown');
  eq(result.muscles[0].code, null);
  eq(result.muscles[0].approved, false);
});

console.log('\n[E] malformed / hostile input');
T('niet-string waarden worden als invalid gemarkeerd, niet geëchood', () => {
  const o = P([null, undefined, 5, {}, [], true, '', '   ', 'Neck'], []);
  eq(o.muscles.filter((f) => f.status === F.STATUS.INVALID).length, 8);
  eq(o.muscles[8].code, 'movekit:muscle:neck');
  deq(o.sourceTerms.muscles, ['Neck']);
  o.muscles.slice(0, 8).forEach((f) => { eq(f.sourceTerm, null); eq(f.code, null); eq(f.approved, false); });
});
T('control-chars en te lange strings => invalid', () => {
  const o = P(['Neck\u0000', 'Ne\nck', 'x'.repeat(F.limits.MAX_TERM_LENGTH + 1)], []);
  o.muscles.forEach((f) => eq(f.status, F.STATUS.INVALID));
  eq(o.sourceTerms.muscles.length, 0);
});
T('prototype-keys als term matchen nooit', () => {
  const o = P(['__proto__', 'constructor', 'toString', 'hasOwnProperty'], ['__proto__', 'valueOf']);
  o.muscles.concat(o.equipment).forEach((f) => { eq(f.status, F.STATUS.UNAPPROVED); eq(f.code, null); });
  eq(({}).polluted, undefined);
});
T('container geen array / input geen object: veilig, geen throw', () => {
  [undefined, null, 'x', 5, [], () => 1].forEach((i) => {
    const o = F.projectSourceFacets(i, REGISTRY);
    eq(o.approved, false); eq(o.muscles.length, 0); eq(o.equipment.length, 0);
  });
  const o = F.projectSourceFacets({ muscles: 'Neck', equipment: { 0: 'Sled' } }, REGISTRY);
  eq(o.muscles.length, 0);
  ok(o.issues.some((i) => i.code === 'term_list_not_array' && i.group === 'muscles'));
  ok(o.issues.some((i) => i.code === 'term_list_not_array' && i.group === 'equipment'));
});
T('registry null => veilig, niets gekoppeld', () => {
  const o = F.projectSourceFacets({ muscles: ['Neck'] }, null);
  eq(o.registryValid, false); eq(o.muscles[0].code, null);
});
T('getter die throwt en gigantische lijst: geen crash, begrensd', () => {
  const bad = {}; Object.defineProperty(bad, 'muscles', { get() { throw new Error('boom'); }, enumerable: true });
  eq(F.projectSourceFacets(bad, REGISTRY).muscles.length, 0);
  const big = new Array(10000).fill('Neck');
  const o = P(big, []);
  eq(o.muscles.length, F.limits.MAX_TERMS);
  ok(o.issues.some((i) => i.code === 'term_list_truncated'));
});
T('sparse array levert invalid-slots, geen crash', () => {
  const o = P(['Neck', , 'Sled'], []);
  eq(o.muscles.length, 3); eq(o.muscles[1].status, F.STATUS.INVALID);
});
T('mutatie van registry NA projectie wijzigt eerder resultaat niet', () => {
  const r = fresh();
  const o = F.projectSourceFacets({ provider: 'movekit', muscles: ['Neck'] }, r);
  r.muscles.Neck.code = 'm:grip';
  eq(o.muscles[0].code, 'movekit:muscle:neck');
});

console.log('\n[F] immutability, serialiseerbaarheid, geen side effects');
T('resultaat is diep bevroren en JSON-roundtrip-gelijk', () => {
  const o = P(['Forearms', 'Glutes'], ['Sled']);
  ok(Object.isFrozen(o) && Object.isFrozen(o.muscles) && Object.isFrozen(o.muscles[0]) && Object.isFrozen(o.sourceTerms.muscles));
  deq(JSON.parse(JSON.stringify(o)), o);
  let threw = false;
  try { 'use strict'; (function () { 'use strict'; o.muscles[0].code = 'm:grip'; })(); } catch (e) { threw = true; }
  ok(threw, 'schrijven moet falen');
  eq(o.muscles[0].code, 'movekit:muscle:forearms');
});
T('invoer en registry worden niet gemuteerd (ook niet bevroren)', () => {
  const input = { provider: 'movekit', muscles: ['Forearms', 'x', null], equipment: ['Sled'] };
  const reg = fresh();
  const i0 = JSON.stringify(input), r0 = JSON.stringify(reg);
  F.projectSourceFacets(input, reg); F.validateTermRegistry(reg);
  eq(JSON.stringify(input), i0); eq(JSON.stringify(reg), r0);
  ok(!Object.isFrozen(input) && !Object.isFrozen(input.muscles) && !Object.isFrozen(reg));
});
T('uitvoer deelt geen referentie met invoerarrays', () => {
  const input = { muscles: ['Neck'] };
  const o = F.projectSourceFacets(input, REGISTRY);
  input.muscles.push('Sled'); input.muscles[0] = 'Hacked';
  deq(o.sourceTerms.muscles, ['Neck']);
});
T('deterministisch en herhaalbaar', () => {
  deq(P(['Neck', 'X'], ['Sled']), P(['Neck', 'X'], ['Sled']));
});
T('geen globals gewijzigd door aanroepen', () => {
  const before = Object.keys(globalThis).sort().join(',');
  P(['Neck'], ['Sled']); F.validateTermRegistry(REGISTRY);
  eq(Object.keys(globalThis).sort().join(','), before);
});
T('elk resultaat: approved=false, displayOnly, runtimeActivation=false', () => {
  const o = P(['Forearms'], ['Sled']);
  eq(o.approved, false); eq(o.displayOnly, true); eq(o.runtimeActivation, false); eq(o.registryStatus, 'PROPOSED_NOT_APPROVED');
  o.muscles.concat(o.equipment).forEach((f) => eq(f.approved, false));
});

console.log('\n[G] geen media/DB/netwerk, geen activatie');
const SRC = fs.readFileSync(path.join(__dirname, 'movekitV2SourceFacets.js'), 'utf8');
T('module bevat geen fs/net/db/child_process/fetch/XHR/storage gebruik', () => {
  const codeOnly = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  ['require(', 'import ', 'fetch(', 'XMLHttpRequest', 'WebSocket', 'localStorage', 'sessionStorage', 'indexedDB',
    'child_process', 'process.', 'supabase', 'http://', 'https://', 'writeFile', '.mp4', '.jpg', '.png', 'document.', 'window.']
    .forEach((needle) => ok(codeOnly.indexOf(needle) === -1, 'verboden: ' + needle));
});
T('export-oppervlak is bevroren, RUNTIME_ACTIVATION=false, APPROVED=false', () => {
  ok(Object.isFrozen(F)); eq(F.RUNTIME_ACTIVATION, false); eq(F.APPROVED, false);
  deq(Object.keys(F).sort(), ['APPROVED', 'NAMESPACE', 'REGISTRY_SCHEMA', 'REGISTRY_STATUS', 'RUNTIME_ACTIVATION', 'SCHEMA',
    'STATUS', 'limits', 'listTermIdentifiers', 'projectSourceFacets', 'validateTermRegistry'].sort());
});
T('index.html en package-config verwijzen NIET naar de module (niet geactiveerd)', () => {
  const idx = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  ok(idx.indexOf('movekitV2SourceFacets') === -1, 'index.html mag module niet laden');
  ok(idx.indexOf('movekit:muscle:') === -1 && idx.indexOf('movekit:equipment:') === -1, 'index.html mag geen movekit: codes bevatten');
});
T('canonieke app-alias m:grip blijft intact in index.html (Forearms->grip is bestaand zoekgedrag, niet ons)', () => {
  const idx = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  ok(/'m:grip':\[[^\]]*'forearms'/.test(idx), 'verwacht bestaande alias-groep');
  // Onze output mag deze alias-ruimte nooit raken:
  const out = JSON.stringify(P(['Forearms', 'Lower Back'], ['Sled']));
  ok(out.indexOf('m:') === -1 || out.indexOf('"m:') === -1);
  ok(!/"code":"m:/.test(out));
});
T('mapping-bestand blijft PROPOSED_NOT_APPROVED / runtime_activation=false', () => {
  eq(REGISTRY.status, 'PROPOSED_NOT_APPROVED'); eq(REGISTRY.runtime_activation, false); eq(REGISTRY.review_required, true);
});

console.log('\n' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
