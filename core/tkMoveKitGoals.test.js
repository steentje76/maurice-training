'use strict';
// DEC-EXLINK-003 (fase 2b-2): PR, 1RM en peakdoel op ongekoppelde MoveKit-oefeningen.
// Doelen staan op het vaste MoveKit-id (TKC-, zelfde id als de sessies). Een gekoppelde eigen oefening
// blijft leidend; een bestaande doelrij op het oude catalogus-id (TK-) blijft de bron tot fase 3.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extract(name) {
  const m = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(').exec(html); assert(m, name);
  let d = 0; for (let i = html.indexOf('{', m.index); i < html.length; i++) { if (html[i] === '{') d++; if (html[i] === '}' && --d === 0) return html.slice(m.index, i + 1); }
  throw new Error('unterminated ' + name);
}
let n = 0; function ok(v, label) { assert(v, label); n++; console.log('  ok  ' + label); }

function make(opts = {}) {
  const st = { patches: [], posts: [], postResult: opts.postResult === undefined ? true : opts.postResult, release: opts.release !== false, peakModal: null };
  const ctx = {
    get TK504_TYPED_FK_SESSION_RELEASE() { return st.release; },
    exerciseGoals: new Map(opts.goals || []),
    tkEigenaarUid: () => 'A', authSession: { user: { id: 'A' } },
    tkExLinkAlias: id => (opts.alias && opts.alias[id]) || null,
    tkExLinkOwnExerciseForCatalog: id => (opts.links && opts.links[id]) || null,
    sbPatchQ: async (t, q, body) => { st.patches.push({ t, q, body }); return true; },
    sbPostQ: async (t, row) => { st.posts.push({ t, row }); return st.postResult; },
    progCatalogData: opts.catalog || [],
    openEditPeak: (id, name, val) => { st.peakModal = { id, name, val }; return true; },
    Object, Map, Number, String, Date, Math
  };
  const s = vm.createContext(ctx);
  vm.runInContext(['tkGoalKey', 'peakGoalFor', 'prFor', 'oneRMFor', 'upsertExerciseGoalField', 'tk603EditCatalogPeak'].map(extract).join('\n'), s);
  return { s, st };
}

(async () => {
  console.log('\nA. Sleutelkeuze');
  let a = make();
  ok(a.s.tkGoalKey('TK-000038') === 'TKC-000038', 'A1: ongekoppelde MoveKit-oefening zonder bestaande rij → TKC-id');
  ok(a.s.tkGoalKey('bench_press') === 'bench_press', 'A2: eigen oefening ongewijzigd');
  ok(a.s.tkGoalKey('TK-000999') === 'TK-000999' && a.s.tkGoalKey('TK-000000') === 'TK-000000', 'A3: id buiten de 582 ongewijzigd');
  ok(a.s.tkGoalKey('TKC-000038') === 'TKC-000038', 'A4: TKC-id blijft TKC-id');
  a = make({ goals: [['TK-000038', { peak_goal: 120, pr: 100, one_rm: null }]] });
  ok(a.s.tkGoalKey('TK-000038') === 'TK-000038', 'A5: bestaande doelrij op TK- blijft de bron (niets dubbel tot fase 3)');
  a = make({ goals: [['TK-000038', { peak_goal: null, pr: 100, one_rm: null, _alleenGeheugen: true }]] });
  ok(a.s.tkGoalKey('TK-000038') === 'TKC-000038', 'A6: alleen-in-geheugen TK-entry telt niet als bestaande rij');
  a = make({ links: { 'TK-000038': 'bench_press' } });
  ok(a.s.tkGoalKey('TK-000038') === 'bench_press', 'A7: gekoppelde eigen oefening blijft leidend (DEC-EXLINK-002)');
  a = make({ release: false });
  ok(a.s.tkGoalKey('TK-000038') === 'TK-000038', 'A8: zonder vrijgave ongewijzigd gedrag');

  console.log('\nB. Lezen');
  a = make({ goals: [['TKC-000038', { peak_goal: 140, pr: 110, one_rm: 125 }]] });
  ok(a.s.prFor('TK-000038') === 110 && a.s.peakGoalFor('TK-000038') === 140 && a.s.oneRMFor('TK-000038') === 125, 'B1: catalogus-id leest de doelen van het MoveKit-id');
  ok(a.s.prFor('TK-000039') === null && a.s.peakGoalFor('TK-000039') === null, 'B2: andere oefening leest niets mee');
  a = make({ goals: [['bench_press', { peak_goal: 150, pr: 120, one_rm: null }]], links: { 'TK-000038': 'bench_press' } });
  ok(a.s.prFor('TK-000038') === 120 && a.s.peakGoalFor('TK-000038') === 150, 'B3: gekoppeld item leest de doelen van de eigen oefening');

  console.log('\nC. Schrijven (online en offline wachtrij)');
  a = make();
  await a.s.upsertExerciseGoalField('TK-000038', 'pr', 105);
  ok(a.st.posts.length === 1 && a.st.posts[0].row.exercise_id === 'TKC-000038' && a.st.posts[0].row.pr === 105 && a.st.posts[0].row.user_id === 'A', 'C1: nieuw record → INSERT op TKC-id voor deze eigenaar');
  ok(a.s.exerciseGoals.get('TKC-000038').pr === 105 && !a.s.exerciseGoals.get('TKC-000038')._alleenGeheugen && a.s.prFor('TK-000038') === 105, 'C2: daarna direct leesbaar via het catalogus-id');
  await a.s.upsertExerciseGoalField('TK-000038', 'one_rm', 130);
  ok(a.st.patches.length === 1 && a.st.patches[0].q === 'exercise_id=eq.TKC-000038' && a.st.patches[0].body.one_rm === 130 && typeof a.st.patches[0].body.updated_at === 'string', 'C3: tweede veld → PATCH op dezelfde TKC-rij (1RM met provenance-datum)');
  a = make({ goals: [['TK-000038', { peak_goal: 120, pr: 100, one_rm: null }]] });
  await a.s.upsertExerciseGoalField('TK-000038', 'pr', 110);
  ok(a.st.patches.length === 1 && a.st.patches[0].q === 'exercise_id=eq.TK-000038' && a.st.posts.length === 0, 'C4: bestaande TK-rij wordt bijgewerkt, geen tweede rij');
  a = make({ postResult: false });
  await a.s.upsertExerciseGoalField('TK-000038', 'pr', 105);
  ok(a.s.exerciseGoals.get('TKC-000038')._alleenGeheugen === true, 'C5: geweigerde INSERT blijft alleen-in-geheugen (volgende keer opnieuw INSERT)');
  a = make({ links: { 'TK-000038': 'bench_press' } });
  await a.s.upsertExerciseGoalField('TK-000038', 'pr', 125);
  ok(a.st.posts[0].row.exercise_id === 'bench_press', 'C6: gekoppeld item schrijft op de eigen oefening');

  console.log('\nD. Peakdoel instellen vanaf de statistiekrij');
  a = make({ catalog: [{ id: 'TK-000038', label: 'Bankdrukken (Movekit-catalogus)', tgt: 140, owner_uid: 'A' }, { id: 'TK-000040', label: 'X', tgt: null, owner_uid: 'B' }] });
  a.s.tk603EditCatalogPeak(0);
  ok(a.st.peakModal && a.st.peakModal.id === 'TK-000038' && a.st.peakModal.val === 140, 'D1: knop opent de peakdoel-editor voor deze MoveKit-oefening');
  a.st.peakModal = null; a.s.tk603EditCatalogPeak(1);
  ok(a.st.peakModal === null, 'D2: rij van een andere eigenaar opent niets');
  ok(/curEditPeakId=\(typeof tkGoalKey==='function'\)\?tkGoalKey\(exId\):exId;/.test(extract('openEditPeak')), 'D3: de editor bewaart op de doelsleutel (TKC of eigen oefening)');

  console.log('\nE. Bron');
  const rows = extract('tk603ProgCatalogRowsHtml');
  ok(!/catalogushistorie · geen peakdoel/.test(rows) && /tk603EditCatalogPeak\(\$\{i\}\)/.test(rows) && /% van peakdoel/.test(rows), 'E1: MoveKit-rij toont peakdoel-voortgang en een instelknop');
  ok(/const tgt=\(typeof peakGoalFor==='function'\)\?peakGoalFor\(src\.id\):null;/.test(extract('tk603CatalogProgressEntries')), 'E2: voortgang leest het peakdoel van de MoveKit-oefening');
  const gate = extract('tk603CanUpdatePersonalRecord');
  ok(/tk504ValidateCatalogSourceRef\(sourceRef\.catalog_id,sourceRef\)/.test(gate), 'E3: record alleen bij een geverifieerde MoveKit-bron');
  ok(extract('finishSession').includes('if(_ownRec||tk603CanUpdatePersonalRecord(ex.tk504_catalog_ref))'), 'E4: afronden gebruikt dezelfde poort (record na geslaagde of gequeuede write)');

  console.log('\nRESULTAAT: ' + n + ' geslaagd, 0 mislukt');
})().catch(e => { console.error(e); process.exit(1); });
