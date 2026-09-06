'use strict';
const assert = require('assert');
const T = require('./nutritionTargetService.js');
let pass = 0, fail = 0;
function t(l, fn) { try { fn(); pass++; } catch (e) { fail++; console.log('MISLUKT:', l, '-', e.message); } }

// -- validateTarget ----------------------------------------------------------
t('validateTarget: volledig doel geldig', () => { assert.strictEqual(T.validateTarget({energy_kcal:2400,protein_g:160,carbohydrate_g:250,fat_g:70}).valid, true); });
t('validateTarget: PARTIAL target (alleen eiwit) is geldig (Fase 15)', () => { const r=T.validateTarget({protein_g:160}); assert.strictEqual(r.valid, true); });
t('validateTarget: geen enkel veld -> NO_FIELDS_SET', () => { assert.strictEqual(T.validateTarget({}).reason, 'NO_FIELDS_SET'); });
t('validateTarget: 0 en negatief -> INVALID_VALUE (0 is geen doel, adversarial)', () => {
  assert.strictEqual(T.validateTarget({energy_kcal:0}).reason, 'INVALID_VALUE');
  assert.strictEqual(T.validateTarget({protein_g:-5}).reason, 'INVALID_VALUE');
});
t('validateTarget: niet-numeriek -> INVALID_VALUE', () => { assert.strictEqual(T.validateTarget({energy_kcal:'veel'}).reason, 'INVALID_VALUE'); });
t('validateTarget: extreme waarde -> geldig maar CHECK_VALUE (geen stille correctie, geen medische claim)', () => {
  const r=T.validateTarget({energy_kcal:12000}); assert.strictEqual(r.valid, true); assert.deepStrictEqual(r.checkFields, ['energy_kcal']); assert.strictEqual(r.needsConfirmation, true);
});
t('validateTarget: AI mag geen source zijn (INVALID_SOURCE)', () => { assert.strictEqual(T.validateTarget({protein_g:160, source:'AI_GENERATED'}).reason, 'INVALID_SOURCE'); });

// -- toCanonicalRow ------------------------------------------------------------
t('toCanonicalRow: lege velden worden null (UNKNOWN), nooit 0; source altijd USER_DEFINED', () => {
  const r=T.toCanonicalRow({protein_g:'160', energy_kcal:''}, '2026-09-06');
  assert.strictEqual(r.protein_g, 160); assert.strictEqual(r.energy_kcal, null); assert.strictEqual(r.fat_g, null); assert.strictEqual(r.source, 'USER_DEFINED');
});

// -- resolveEffectiveTarget (historie) ----------------------------------------
const rows=[{effective_from:'2026-09-01',energy_kcal:2400,created_at:'a'},{effective_from:'2026-09-05',energy_kcal:2600,created_at:'b'}];
t('resolveEffectiveTarget: maandag (vóór wijziging) blijft tegen 2400 beoordeeld (Fase 9: geen stille herschrijving)', () => { assert.strictEqual(T.resolveEffectiveTarget(rows,'2026-09-02').energy_kcal, 2400); });
t('resolveEffectiveTarget: vanaf de wijzigingsdatum geldt 2600', () => { assert.strictEqual(T.resolveEffectiveTarget(rows,'2026-09-05').energy_kcal, 2600); assert.strictEqual(T.resolveEffectiveTarget(rows,'2026-09-30').energy_kcal, 2600); });
t('resolveEffectiveTarget: dag vóór eerste doel -> null (NO_TARGET), geen doel verzinnen', () => { assert.strictEqual(T.resolveEffectiveTarget(rows,'2026-08-31'), null); });
t('resolveEffectiveTarget: twee rijen zelfde dag -> nieuwste created_at wint', () => {
  const r=T.resolveEffectiveTarget([{effective_from:'2026-09-06',energy_kcal:1,created_at:'x'},{effective_from:'2026-09-06',energy_kcal:2,created_at:'y'}],'2026-09-06'); assert.strictEqual(r.energy_kcal,2);
});

// -- computeDailyProgress ------------------------------------------------------
const target={energy_kcal:2400,protein_g:160,carbohydrate_g:null,fat_g:70};
const agg={status:'valid',item_count:2,energy_kcal:1820,protein_g:112,carbohydrate_g:null,fat_g:80,coverage:{energy_kcal:'COMPLETE',protein_g:'COMPLETE',carbohydrate_g:'UNKNOWN',fat_g:'PARTIAL'}};
t('progress: remaining = target - consumed, centraal berekend (1820/2400 -> nog 580, 24%... 76%)', () => {
  const p=T.computeDailyProgress(target,agg); assert.strictEqual(p.fields.energy_kcal.remaining, 580); assert.strictEqual(p.fields.energy_kcal.progress_pct, 76); assert.strictEqual(p.fields.energy_kcal.status,'ON_TRACK');
});
t('progress: OVER_TARGET is een feit, remaining negatief (80/70 vet -> -10), geen fout', () => {
  const p=T.computeDailyProgress(target,agg); assert.strictEqual(p.fields.fat_g.status,'OVER_TARGET'); assert.strictEqual(p.fields.fat_g.remaining, -10);
});
t('progress: NO_TARGET wanneer doelveld null (koolhydraten) -- geen progress verzonnen', () => {
  const p=T.computeDailyProgress(target,agg); assert.strictEqual(p.fields.carbohydrate_g.status,'NO_TARGET'); assert.strictEqual(p.fields.carbohydrate_g.remaining,null);
});
t('progress: UNKNOWN_CONSUMED wanneer items gelogd zijn maar het veld onbekend is (UNKNOWN != 0, adversarial)', () => {
  const p=T.computeDailyProgress({energy_kcal:2400,protein_g:null,carbohydrate_g:250,fat_g:null},agg);
  assert.strictEqual(p.fields.carbohydrate_g.status,'UNKNOWN_CONSUMED'); assert.strictEqual(p.fields.carbohydrate_g.remaining,null); assert.notStrictEqual(p.fields.carbohydrate_g.consumed,0);
});
t('progress: PARTIAL coverage wordt doorgegeven (vet), niet verzwegen', () => { assert.strictEqual(T.computeDailyProgress(target,agg).fields.fat_g.coverage,'PARTIAL'); });
t('progress: niets gelogd -> consumed 0 (echte nul), remaining = target, NOTHING_LOGGED', () => {
  const p=T.computeDailyProgress(target,{status:'NO_ITEMS',item_count:0}); assert.strictEqual(p.fields.energy_kcal.consumed,0); assert.strictEqual(p.fields.energy_kcal.remaining,2400); assert.strictEqual(p.fields.energy_kcal.status,'NOTHING_LOGGED');
});
t('progress: geen enkel doel -> has_any_target=false (UI toont empty state, geen nep-progress)', () => { assert.strictEqual(T.computeDailyProgress(null,agg).has_any_target,false); });
t('progress: determinisme (zelfde input -> identiek resultaat)', () => { assert.deepStrictEqual(T.computeDailyProgress(target,agg), T.computeDailyProgress(target,agg)); });

// -- formatRemaining (neutrale taal) ------------------------------------------
t('formatRemaining: "Nog 580 kcal" / "10 g boven doel" -- geen straf-/schuldtaal', () => {
  const p=T.computeDailyProgress(target,agg);
  assert.strictEqual(T.formatRemaining(p.fields.energy_kcal,'kcal'),'Nog 580 kcal');
  const over=T.formatRemaining(p.fields.fat_g,'g'); assert.strictEqual(over,'10 g boven doel'); assert.strictEqual(/slecht|te veel|waarschuw/i.test(over),false);
});
t('formatRemaining: NO_TARGET -> null (niets tonen), UNKNOWN_CONSUMED -> eerlijke melding', () => {
  const p=T.computeDailyProgress({energy_kcal:2400,protein_g:null,carbohydrate_g:250,fat_g:null},agg);
  assert.strictEqual(T.formatRemaining(p.fields.protein_g,'g'),null); assert.strictEqual(T.formatRemaining(p.fields.carbohydrate_g,'g'),'Inname onvolledig bekend');
});

console.log(`NutritionTargetService: ${pass} geslaagd, ${fail} mislukt`);
console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`);
if (fail) process.exit(1);
