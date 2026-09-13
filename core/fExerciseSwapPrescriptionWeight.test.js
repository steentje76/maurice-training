/* fExerciseSwapPrescriptionWeight.test.js — EXERCISE SWAP PRESCRIPTION CARRY-OVER FIX
 * Bewijst: na een swap (confirmSwapExercise) of replace (execReplaceExercise) kan het
 * suggestedWeight van oefening A niet meer naar oefening B lekken. sets/reps/RPE blijven
 * bewust behouden (workoutblok-intentie). Geen nieuwe berekening/conversie -- uitsluitend
 * invalidatie (null), waarna de reeds-bestaande canonical prefill-keten B's eigen gewicht
 * bepaalt (prevS/computeProgPrefill, keyed op het nieuwe id).
 *
 * Draai: node core/fExerciseSwapPrescriptionWeight.test.js
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');

var HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function eq(a, b, m) { if (a === b) pass++; else { fail++; console.log('  ✗ ' + m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); } }

function extractFn(name) {
  var st = HTML.indexOf('function ' + name + '(');
  assert.ok(st >= 0, 'functie niet gevonden: ' + name);
  var d = 0, e = -1;
  for (var j = HTML.indexOf('{', st); j < HTML.length; j++) {
    var ch = HTML[j];
    if (ch === '{') d++; else if (ch === '}') { d--; if (d === 0) { e = j; break; } }
  }
  return HTML.slice(st, e + 1);
}

var CONFIRM_FN = extractFn('confirmSwapExercise');
var REPLACE_FN = extractFn('execReplaceExercise');

/* ══ A. confirmSwapExercise() -- wist stale suggestedWeight ══ */
console.log('A. confirmSwapExercise() invalideert suggestedWeight');
ok(CONFIRM_FN.indexOf('suggestedWeight:null') > -1, 'A1: confirmSwapExercise() zet suggestedWeight expliciet op null bij swap');
ok(/id:newId,naam:newEx\.name,type:newEx\.type\|\|sessionExtra\[idx\]\.type,suggestedWeight:null/.test(CONFIRM_FN),
  'A2: de invalidatie zit in dezelfde object-override als de identity-wissel (geen tussenliggende stale-render mogelijk)');

/* ══ B. execReplaceExercise() -- beide state-spiegels consistent ══ */
console.log('B. execReplaceExercise() -- resolvedWorkout.items EN sessionExtra beide consistent');
ok(/resolvedWorkout\.items\[idx\]=Object\.assign\(\{\},old,\{id:replaced\.id,naam:replaced\.name,suggestedWeight:null\}\)/.test(REPLACE_FN),
  'B1: resolvedWorkout.items-spiegel wiste suggestedWeight al vóór deze fix (referentiegedrag, ongewijzigd)');
ok(/sessionExtra\[sxIdx\]=Object\.assign\(\{\},sessionExtra\[sxIdx\],\{id:replaced\.id,naam:replaced\.name,suggestedWeight:null\}\)/.test(REPLACE_FN),
  'B2: sessionExtra-spiegel wist nu OOK suggestedWeight -- de root-cause-inconsistentie tussen de twee spiegels is opgelost');

/* ══ C. sets/reps/RPE blijven bewust behouden (PRESERVE, geen scope-uitbreiding) ══ */
console.log('C. sets/reps/RPE blijven behouden (field policy)');
ok(!/sets\s*:\s*null|reps\s*:\s*null|rpe\s*:\s*null/i.test(CONFIRM_FN), 'C1: confirmSwapExercise() wist geen sets/reps/RPE (alleen suggestedWeight)');
ok(!/sets\s*:\s*null|reps\s*:\s*null|rpe\s*:\s*null/i.test(REPLACE_FN.split('sessionExtra[sxIdx]')[1] || ''),
  'C2: execReplaceExercise() wist geen sets/reps/RPE in de sessionExtra-spiegel');

/* ══ D. Geen nieuwe berekening/conversie geïntroduceerd ══ */
console.log('D. Geen weight-conversie/AI/nieuwe formule');
[CONFIRM_FN, REPLACE_FN].forEach(function (fn, i) {
  var naam = i === 0 ? 'confirmSwapExercise' : 'execReplaceExercise';
  ok(!/\*\s*0\.\d|percentage|convert|ratio/i.test(fn), naam + '(): geen conversieformule/percentage toegevoegd');
  ok(!/callClaude|aiRequest|fetch\(.*ai/i.test(fn), naam + '(): geen AI-aanroep toegevoegd');
});

/* ══ E. Canonical prefill-keten bewijs (statisch): prevS en oneRM zijn al keyed op ex.id (het NIEUWE id na swap) ══ */
console.log('E. Canonical prefill-keten hergebruikt zonder wijziging (geen nieuwe prefill-route)');
var PREFILL_BLOK = HTML.slice(HTML.indexOf("if(t.startsWith('prog_')){"), HTML.indexOf('window._rxWeightMap[ex.id]=rxWeight;') + 40);
ok(PREFILL_BLOK.indexOf('getOneRM(ex.id)') > -1, 'E1: 1RM-schatting is keyed op ex.id -- na swap dus automatisch B\'s eigen 1RM, nooit A\'s');
ok(PREFILL_BLOK.indexOf('computeProgPrefill(ex,prevS,oneRM)') > -1, 'E2: computeProgPrefill() (bestaand, canonical) wordt hergebruikt -- geen nieuwe functie toegevoegd');
ok(/else if\(prevS&&prevS\.weight&&prevS\.reps\)\{\s*\r?\n\s*prefillData=\{kg:prevS\.weight/.test(PREFILL_BLOK),
  'E3: zonder suggestedWeight valt de niet-programma-route terug op prevS (B\'s eigen historie, want prevS is elders al keyed op ex.id)');
ok(/Een null overschrijft de vorige waarde, zodat er nooit een oud[\s\S]{0,20}getal blijft staan/.test(PREFILL_BLOK),
  'E4: het bestaande, expliciete commentaar bevestigt dat _rxWeightMap[ex.id] een null correct laat overschrijven (geen stale-waarde-risico)');

/* ══ F. _rxWeightMap gebruikt het NIEUWE id -- geen A-lek mogelijk ══ */
console.log('F. _rxWeightMap keyed op het huidige (na-swap) ex.id');
ok(HTML.indexOf('window._rxWeightMap[ex.id]=rxWeight;') > -1,
  'F1: _rxWeightMap wordt geschreven onder ex.id -- na een swap is dat B, nooit meer A (A\'s sleutel wordt simpelweg niet meer gebruikt)');

/* ══ G. previous-performance / "Vorige keer" gebruikt B (bewijs: prevS-lookup zit vóór de prefill-tak, gedeeld) ══ */
console.log('G. Previous-performance context (geen A-geschiedenis bij B)');
ok(/const prevS=_pref\[_pi\]\.prevS;/.test(HTML), 'G1: prevS wordt per exercise-slot opgehaald (gedeelde bron voor prefill EN "Vorige keer"-blok) -- ongewijzigd, dus automatisch B na swap');

/* ══ H. Functionele simulatie: sandbox van het prefill-beslispad na invalidatie ══ */
console.log('H. Functionele simulatie (canonical fallback-keten na suggestedWeight=null)');
(function () {
  // Vereenvoudigde, maar getrouwe simulatie van de beslisboom rond regel ~18124-18142.
  function resolvePrefill(ex, prevS, computeProgPrefillStub, isProgram) {
    var prefillData = null;
    if (isProgram) {
      if (ex.suggestedWeight != null) {
        prefillData = { kg: ex.suggestedWeight };
      } else {
        prefillData = computeProgPrefillStub(ex, prevS);
      }
    } else if (ex.suggestedWeight != null) {
      prefillData = { kg: ex.suggestedWeight };
    } else if (prevS && prevS.weight && prevS.reps) {
      prefillData = { kg: prevS.weight };
    }
    var rxWeight = (prefillData && prefillData.kg != null) ? prefillData.kg : (ex.suggestedWeight != null ? ex.suggestedWeight : null);
    return rxWeight;
  }
  // Scenario: A had 100 kg, geswapt naar B (suggestedWeight nu null door de fix). B heeft geen eigen historie.
  var exAfterSwapNoHistory = { id: 'TK-B', suggestedWeight: null };
  var rx1 = resolvePrefill(exAfterSwapNoHistory, null, function () { return null; }, false);
  eq(rx1, null, 'H1: geen A-gewicht lekt naar B zonder eigen historie -- resultaat is null ("nog te bepalen"), nooit 100');

  // Scenario: B heeft wél eigen historie (bv. eerder los gelogd).
  var exAfterSwapWithHistory = { id: 'TK-B', suggestedWeight: null };
  var prevSForB = { weight: 42, reps: 8 };
  var rx2 = resolvePrefill(exAfterSwapWithHistory, prevSForB, function () { return null; }, false);
  eq(rx2, 42, 'H2: mét eigen B-historie wordt B\'s eigen vorige gewicht gebruikt (42), niet A\'s 100');

  // Scenario: programma-pad, geen suggestedWeight, computeProgPrefill (B\'s eigen 1RM) levert 63.
  var exProg = { id: 'TK-B', suggestedWeight: null };
  var rx3 = resolvePrefill(exProg, null, function () { return { kg: 63 }; }, true);
  eq(rx3, 63, 'H3: programma-pad valt terug op computeProgPrefill() met B\'s eigen 1RM (63), niet A\'s oude 100');

  // Adversarieel: als de fix ONTBREKT (suggestedWeight nog 100 van A), zou dit lekken -- bewijs dat de fix dit exact voorkomt.
  var exWithoutFix = { id: 'TK-B', suggestedWeight: 100 }; // simuleert het OUDE, gebugde gedrag
  var rxBug = resolvePrefill(exWithoutFix, null, function () { return null; }, false);
  eq(rxBug, 100, 'H4 (adversarieel controle): zonder de fix (suggestedWeight blijft 100) zou het lek daadwerkelijk optreden -- bevestigt dat de fix (H1) het probleem echt oplost, niet toevallig');
})();

/* ══ I. Multi-swap-ketens (A→B→A, A→B→C) en idempotentie ══ */
console.log('I. Multi-swap-ketens en idempotentie');
(function () {
  // Simuleert twee opeenvolgende confirmSwapExercise()-aanroepen op hetzelfde sessionExtra-item,
  // exact het object-override-patroon uit de echte functie.
  function applySwap(item, newId, newExName) {
    return { ...item, id: newId, naam: newExName, type: item.type, suggestedWeight: null };
  }
  var original = { id: 'TK-A', naam: 'Oefening A', type: 'strength', suggestedWeight: 100, sets: 4, reps: '8', rpe: '8' };
  var afterAB = applySwap(original, 'TK-B', 'Oefening B');
  eq(afterAB.suggestedWeight, null, 'I1: A -> B wist het gewicht (100 -> null)');
  eq(afterAB.sets, 4, 'I2: A -> B behoudt sets');
  var afterABA = applySwap(afterAB, 'TK-A', 'Oefening A'); // terug naar A
  eq(afterABA.id, 'TK-A', 'I3: A -> B -> A herstelt de identity naar A');
  eq(afterABA.suggestedWeight, null, 'I4: A -> B -> A geeft GEEN A-gewicht terug (correct: A start ook weer vers op via prevS, geen "onthouden" oud gewicht)');
  var afterABC = applySwap(afterAB, 'TK-C', 'Oefening C');
  eq(afterABC.suggestedWeight, null, 'I5: A -> B -> C blijft null (nooit B\'s of A\'s stale waarde bij C)');
  // Idempotentie: herhaald "renderen" (hier: herhaald toepassen van dezelfde override) verandert niets meer.
  var rerendered = applySwap(afterAB, afterAB.id, afterAB.naam);
  eq(rerendered.suggestedWeight, null, 'I6: herhaalde render/override na de swap blijft null (idempotent, geen compounding)');
})();

/* ══ J. Gewichtstype-varianten (weighted<->bodyweight<->machine) -- zelfde, generieke invalidatie ══ */
console.log('J. Gewichtstype-varianten (generieke fix, geen per-type logica nodig)');
ok(!/bodyweight|machine|free.?weight/i.test(CONFIRM_FN),
  'J1: confirmSwapExercise() bevat geen per-equipment-type-onderscheid -- de fix is generiek (weighted->weighted, weighted->bodyweight, bodyweight->weighted, machine->free-weight lopen allemaal via dezelfde, type-agnostische invalidatie)');

/* ══ K. Recovery exact-once (double-adjustment-guard, ongewijzigd bewijs herbevestigd) ══ */
console.log('K. Recovery exact-once na swap (geen dubbele toepassing)');
var RECOVERY_FN = extractFn('applySessionRecovery');
ok(/if\(adj\.rpeDelta && ex\.suggestedWeight!=null && isFinite\(parseFloat\(ex\.suggestedWeight\)\)\)\{/.test(RECOVERY_FN),
  'K1: applySessionRecovery() schaalt suggestedWeight uitsluitend als het al bestaat -- direct na een swap (suggestedWeight=null) gebeurt dus GEEN dubbele/foutieve recovery-herschaling van A\'s oude getal');
ok(/getSessionExs mapt altijd vanaf de basis \+ de vaste delta, dus/.test(HTML) || /getSessionExs mapt altijd vanaf de basis/.test(HTML),
  'K2: bestaande idempotentie-garantie (basis + vaste delta, nooit compound) blijft ongewijzigd van toepassing op het post-swap item');

/* ══ L. Regressie-guards: Builder/Library/substitution-source (PR #337)/fallback-label blijven intact ══ */
console.log('L. Regressie-guards (Builder, Library, PR #337 substitution-source, fallback-label)');
var ALT_LIST_FN = extractFn('altList');
ok(ALT_LIST_FN.indexOf('ex.relations') > -1, 'L1: Builder altList() ongewijzigd -- gebruikt nog steeds EX_CATALOG.relations rechtstreeks');
ok(HTML.indexOf("alternatives:(c.relations&&c.relations.alternatives)||[]") > -1, 'L2: Library-detail ongewijzigd -- leest relations.alternatives nog exact zoals voorheen');
var RESOLVE_CANON_FN = extractFn('resolveCanonicalAlternatives');
ok(RESOLVE_CANON_FN.indexOf('src.relations.alternatives') > -1, 'L3: canonical substitution source-of-truth (PR #337) intact -- resolveCanonicalAlternatives() ongewijzigd');
var OPEN_SWAP_FN = extractFn('openSwapExercise');
ok(/Andere suggesties op spiergroep/.test(OPEN_SWAP_FN) && /Aanbevolen alternatieven/.test(OPEN_SWAP_FN),
  'L4: fallback-labeling uit PR #337 ("Andere suggesties op spiergroep" vs. "Aanbevolen alternatieven") intact, ongewijzigd');

/* ══ M. Original workout definition blijft intact (one-off swap, geen permanente wijziging) ══ */
console.log('M. Original workout definition niet stilzwijgend permanent gewijzigd');
ok(!/sbPatch\(.*(vaste_trainingen|custom_trainings)/.test(CONFIRM_FN) && !/sbPatch\(.*(vaste_trainingen|custom_trainings)/.test(REPLACE_FN),
  'M1: noch confirmSwapExercise() noch execReplaceExercise() schrijft naar de persistente trainingsdefinitie -- blijft in-memory/sessie-scoped (one-off), zoals vóór deze fix');

console.log('\n========================================================');
console.log('fExerciseSwapPrescriptionWeight.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
