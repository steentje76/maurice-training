/* fHydrationIntelligence.test.js — NK-05. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const H = require('./hydrationCalculation.js');
const Topics = require('./nutritionKnowledgeTopics.js');
const Groups = require('./nutritionKnowledgeUiGroups.js');
const Service = require('./nutritionKnowledgeService.js');
const KEvidence = require('./nutritionKnowledgeEvidenceRegistry.js');
const SupEvidence = require('./nutritionSupplementEvidenceRegistry.js');
const SupSources = require('./nutritionSupplementSourceRegistry.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ═══ SECTIE 31 — HYDRATION TESTS A-V ═══

// A: known sweat-loss example (klassiek leerboek-voorbeeld: 1 kg verlies + 0,5 L gedronken = 1,5 L zweet)
let r = H.estimateSweatLoss({ preWeightKg: 75, postWeightKg: 74, fluidIntakeL: 0.5, urineL: 0 });
ok(r.status === 'OK' && r.sweatLossL === 1.5, 'A: bekend voorbeeld (75->74kg, 0,5L gedronken) geeft exact 1,5 L zweetverlies');

// B: known sweat-rate example
r = H.estimateSweatRate({ sweatLossL: 1.5, durationMinutes: 90 });
ok(r.status === 'OK' && r.sweatRateLPerHour === 1, 'B: 1,5 L verlies over 90 min geeft exact 1,0 L/u zweettempo');

// C: unit normalization (minuten -> uur correct toegepast)
r = H.estimateSweatRate({ sweatLossL: 2, durationMinutes: 30 });
ok(r.status === 'OK' && r.sweatRateLPerHour === 4, 'C: eenheidsnormalisatie klopt (2L/30min = 4L/u)');

// D/E: missing pre/post weight
ok(H.estimateSweatLoss({ postWeightKg: 70 }).status === 'INSUFFICIENT_INPUT', 'D: ontbrekend preWeightKg -> INSUFFICIENT_INPUT');
ok(H.estimateSweatLoss({ preWeightKg: 70 }).status === 'INSUFFICIENT_INPUT', 'E: ontbrekend postWeightKg -> INSUFFICIENT_INPUT');

// F/G: missing/zero duration
ok(H.estimateSweatRate({ sweatLossL: 1, durationMinutes: undefined }).status === 'INSUFFICIENT_INPUT', 'F: ontbrekende duration -> INSUFFICIENT_INPUT');
ok(H.estimateSweatRate({ sweatLossL: 1, durationMinutes: 0 }).status === 'IMPLAUSIBLE', 'G: duration=0 -> IMPLAUSIBLE (geen deling door nul)');

// H: negative input
ok(H.estimateSweatLoss({ preWeightKg: 70, postWeightKg: 69, fluidIntakeL: -1 }).status === 'IMPLAUSIBLE', 'H: negatieve fluidIntakeL -> IMPLAUSIBLE');
ok(H.estimateSweatRate({ sweatLossL: 1, durationMinutes: -30 }).status === 'IMPLAUSIBLE', 'H-b: negatieve duration -> IMPLAUSIBLE');

// I: urine optional semantics (mag ontbreken, telt dan niet mee als hard-fout, wel LOW quality)
r = H.estimateSweatLoss({ preWeightKg: 70, postWeightKg: 69, fluidIntakeL: 0.3 });
ok(r.status === 'OK' && r.dataQuality === 'MEDIUM', 'I: urine optioneel weggelaten -> nog steeds OK, met MEDIUM datakwaliteit (niet hard geweigerd)');

// J: fluid intake UNKNOWN != 0 (sectie 24: geen stille coercion, wel expliciet gemarkeerd)
r = H.estimateSweatLoss({ preWeightKg: 70, postWeightKg: 69 });
ok(r.status === 'OK' && r.dataQuality === 'LOW' && r.inputsUsed.fluidIntakeKnown === false, 'J: ontbrekende vocht-/urine-inname wordt behandeld als UNKNOWN (LOW quality), niet stilzwijgend als bewezen 0');

// K/L: deterministic + repeatable
const k1 = H.estimateSweatLoss({ preWeightKg: 82.3, postWeightKg: 80.9, fluidIntakeL: 0.4, urineL: 0.1 });
const k2 = H.estimateSweatLoss({ preWeightKg: 82.3, postWeightKg: 80.9, fluidIntakeL: 0.4, urineL: 0.1 });
ok(JSON.stringify(k1) === JSON.stringify(k2), 'K/L: identieke input geeft een identieke, herhaalbare uitkomst');

// M/N: data-quality/confidence downgrade bij ontbrekende invoer
const hoog = H.estimateSweatLoss({ preWeightKg: 70, postWeightKg: 69, fluidIntakeL: 0.3, urineL: 0 });
const laag = H.estimateSweatLoss({ preWeightKg: 70, postWeightKg: 69 });
ok(hoog.dataQuality === 'HIGH' && laag.dataQuality === 'LOW' && hoog.confidence !== laag.confidence, 'M/N: dataQuality/confidence degraderen zichtbaar bij minder complete invoer (confidence != evidence)');

// O: implausible input
ok(H.estimateSweatLoss({ preWeightKg: 70, postWeightKg: 60 }).status === 'IMPLAUSIBLE', 'O: 10kg "zweetverlies" in één sessie is fysiek implausibel -> geweigerd');
ok(H.estimateSweatLoss({ preWeightKg: 5, postWeightKg: 4 }).status === 'IMPLAUSIBLE', 'O-b: fysiek implausibel lichaamsgewicht (5kg) wordt geweigerd');
ok(H.estimateSweatRate({ sweatLossL: 1, durationMinutes: 100000 }).status === 'IMPLAUSIBLE', 'O-c: fysiek implausibele duur wordt geweigerd');

// P: no sodium invention (de calculation berekent geen persoonlijk natriumverlies)
const calcSrc = fs.readFileSync(path.join(ROOT, 'core/hydrationCalculation.js'), 'utf8');
ok(calcSrc.indexOf('sodium') === -1 && calcSrc.indexOf('natrium') === -1, 'P: de Calculation-module berekent of noemt geen (persoonlijk) natriumverlies -- uitsluitend volume');

// Q: EAH safety (hergebruikte, bestaande, gecertificeerde claim)
const eahClaim = SupEvidence.getById('ELEC-HYPONATREMIA-CAUSE-001');
ok(!!eahClaim && eahClaim.evidence_status === 'VERIFIED', 'Q: de EAH-oorzaak-claim (overdrinken, niet natriumtekort) is aanwezig en gecertificeerd');
const removedClaim = SupEvidence.getById('ELEC-SODIUM-PREVENTS-HYPONATREMIA-001');
ok(!!removedClaim && removedClaim.evidence_status === 'REMOVE' && removedClaim.output_mode === 'HIDDEN', 'Q-b: de weerlegde "natrium voorkomt hyponatriemie"-claim blijft correct REMOVE/HIDDEN');

// R: no overdrinking recommendation
ok(!Service.resolveClaim('ELEC-OVERDRINK-001').user_friendly_summary.match(/drink zoveel mogelijk|meer is beter/i), 'R: de overdrink-claim zelf bevat geen "meer is beter"-taal');
const hydTopic = Topics.getTopic('HYDRATION');
ok(!hydTopic.sections.some((s) => /drink (zoveel|zo veel) mogelijk/i.test(s.body)), 'R-b: geen enkele Hydratatie-sectie beveelt aan zoveel mogelijk te drinken');
ok(H.getCalculation('sweat_loss_estimate.v1').allowed_decision_use === false, 'R-c: de Calculation Registry-entry staat expliciet GEEN automatische Decision Rule/drinkadvies toe');

// S: AI no calculation
const resolverSrc = fs.readFileSync(path.join(ROOT, 'core/nutritionKnowledgeResolver.js'), 'utf8');
ok(resolverSrc.indexOf('hydrationCalculation') === -1 && resolverSrc.indexOf('HydrationCalculation') === -1, 'S: de Knowledge Resolver/AI-laag roept de Calculation-module niet zelf aan (AI berekent niet, legt hooguit een reeds berekende waarde uit)');
ok(H.getCalculation('sweat_loss_estimate.v1').allowed_ai_use === true, 'S-b: AI mag de calculation-uitkomst wel uitleggen (allowed_ai_use), maar nooit produceren');

// T: source traceability
['ELEC-HYDRA-001', 'ELEC-OVERDRINK-001', 'ELEC-HYPONATREMIA-CAUSE-001', 'ELEC-EMERGENCY-001', 'ELEC-SODIUM-DOSE-001', 'ELEC-VARIABILITY-001', 'ELEC-PROLONGED-001'].forEach((id) => {
  const c = SupEvidence.getById(id);
  ok(!!c && c.sources.every((sid) => !!SupSources.getById(sid)), 'T: hergebruikte claim ' + id + ' heeft een traceerbare, bestaande bron');
});
KEvidence.CLAIMS.filter((c) => c.topic_id === 'HYDRATION').forEach((c) => {
  c.source_ids.forEach((sid) => ok(!!Service.resolveSource(sid), 'T-b: nieuwe Hydratatie-claim ' + c.claim_id + ' heeft een geldige bron (' + sid + ')'));
});

// U: mobile knowledge UX (hergebruik NK-02-template, geen redesign)
ok(Service.getTopicOverview('HYDRATION').status === 'OK', 'U: Hydratatie-topic is opvraagbaar via dezelfde NutritionKnowledgeService');
const groups = Groups.getGroupsForTopic('HYDRATION');
ok(groups.length === 3 && JSON.stringify(groups.map((g) => g.group_id)) === JSON.stringify(['basis', 'praktisch', 'verdieping']), 'U-b: Hydratatie gebruikt dezelfde 3-groepen-NK-template als alle andere topics');

// V: 360/390/412/430 (fluid layout, gedeeld component -- geen topic-specifieke CSS nodig/toegevoegd)
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r/g, '');
ok(html.indexOf('HYDRATION') === -1 || !/#hydration[^{]*\{[^}]*width:\s*\d{3,}px/.test(html), 'V: geen nieuwe, vaste-breedte CSS specifiek voor het Hydratatie-scherm (blijft het gedeelde, fluid NK-component)');

// ── Aanvullend: FAQ/secties correct 1-op-1 gedekt + geen orphan claims ──
const specialSections = ['veelgestelde-vragen', 'wetenschap', 'bronnen'];
const expectedGrouped = hydTopic.sections.map((s) => s.section_id).filter((id) => specialSections.indexOf(id) === -1);
const actualGrouped = Groups.allGroupedSectionIds('HYDRATION');
ok(JSON.stringify(expectedGrouped.slice().sort()) === JSON.stringify(actualGrouped.slice().sort()) && expectedGrouped.length === actualGrouped.length, 'extra: alle Hydratatie-secties zijn precies 1x gegroepeerd (geen gat, geen dubbele)');
const hydClaimIds = KEvidence.CLAIMS.filter((c) => c.topic_id === 'HYDRATION').map((c) => c.claim_id);
hydClaimIds.filter((id) => id.indexOf('NOCALC') === -1).forEach((id) => {
  const usedInSection = hydTopic.sections.some((s) => s.evidence_refs.indexOf(id) >= 0);
  const usedInFaq = hydTopic.faq.some((f) => f.evidence_refs.indexOf(id) >= 0);
  ok(usedInSection || usedInFaq, 'extra: nieuwe claim ' + id + ' wordt door minstens één sectie/FAQ-item gebruikt (geen orphan)');
});
ok(!Service.isClaimReleasable(Service.resolveClaim('NK-HYD-NOCALC-001')), 'extra: de architectuurclaim NK-HYD-NOCALC-001 (HIDDEN) is terecht nooit releasable');

console.log('fHydrationIntelligence: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
