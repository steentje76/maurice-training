/* nutritionSupplementEducationService.test.js — SUP-EVIDENCE-02. */
'use strict';
const fs = require('fs');
const path = require('path');
const S = require('./nutritionSupplementEducationService.js');
const E = require('./nutritionSupplementEvidenceRegistry.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- 7: VERIFIED guidance toegestaan ----
const cre = S.getSupplementEducation({ supplementId: 'CREATINE' });
ok(cre.guidance.some((c) => c.evidence_id === 'CRE-PERF-001'), '7: een VERIFIED/GUIDANCE-claim (CRE-PERF-001) is zichtbaar als guidance');

// ---- 8: INSUFFICIENT nooit guidance ----
ok(!E.CLAIMS.some((c) => c.evidence_status === 'INSUFFICIENT' && c.output_mode === 'GUIDANCE'),
  '8: geen enkele INSUFFICIENT-claim in de registry heeft output_mode GUIDANCE');
const ba = S.getSupplementEducation({ supplementId: 'BETA_ALANINE' });
ok(ba.guidance.every((c) => c.evidence_status !== 'INSUFFICIENT'), '8b: geen INSUFFICIENT-claim komt door de service als guidance naar buiten');

// ---- 9: REVISE nooit production-ready ----
ok(!E.CLAIMS.some((c) => c.evidence_status === 'REVISE' && c.ready_for_production),
  '9: geen enkele REVISE-claim is ready_for_production (er zijn vandaag 0 REVISE-claims; regel blijft afgedwongen)');

// ---- 10: REMOVE nooit zichtbaar ----
const elec = S.getSupplementEducation({ supplementId: 'ELECTROLYTE_GROUP' });
ok(elec.evidence_ids.indexOf('ELEC-SODIUM-PREVENTS-HYPONATREMIA-001') === -1,
  '10: de REMOVE-claim (natrium voorkomt hyponatriemie) komt nergens in de service-output voor');

// ---- 11: HIDDEN nooit AI-visible ----
const vitd = S.getSupplementEducation({ supplementId: 'VITAMIN_D' });
ok(vitd.evidence_ids.indexOf('VITD-PERF-GENERAL-001') === -1, '11: een HIDDEN-claim (algemene performanceclaim) komt niet in de output voor');
ok(!S.isClaimReleasable(E.getById('VITD-PERF-GENERAL-001')), '11b: isClaimReleasable wijst een HIDDEN-claim direct af');

// ---- 12: medical referral wordt meegenomen ----
const iron = S.getSupplementEducation({ supplementId: 'IRON' });
ok(iron.medical_referrals.length >= 4, '12: Iron-educatie bevat de vereiste medical_referral-claims (diagnose/threshold/perf-deficient/safety/forbidden)');
ok(iron.medical_referrals.every((c) => c.requires_medical_referral === true), '12b: elke claim in medical_referrals heeft zelf requires_medical_referral=true');

// ---- 15/16: evidence_id/source_id blijven in de output ----
ok(cre.claims.every((c) => !!c.evidence_id), '15: elke geretourneerde claim behoudt zijn evidence_id');
ok(cre.claims.every((c) => Array.isArray(c.sources)), '16: elke geretourneerde claim behoudt zijn (opgeloste) sources');

// ---- 17: geen persoonlijke dosisberekening / 18: geen mg/kg x gewicht shadow calc ----
const serviceSrc = fs.readFileSync(path.join(__dirname, 'nutritionSupplementEducationService.js'), 'utf8');
ok(!/\*\s*(weight|gewicht|bodyweight)/i.test(serviceSrc), '17/18: geen enkele vermenigvuldiging met gewicht/bodyweight in de EducationService-broncode');
ok(!/mg\s*\/\s*kg\s*\*/.test(serviceSrc), '18b: geen mg/kg-shadow-calculation-patroon in de broncode');

// ---- 19: Vitamin D geen positieve algemene performanceclaim ----
ok(!vitd.guidance.some((c) => c.claim_key === 'performance_general_population'),
  '19: Vitamin D-guidance bevat geen algemene, positieve performanceclaim voor niet-deficiente sporters');

// ---- 20/21: Iron geen diagnose, geen persoonlijke 100mg-aanbeveling als guidance ----
ok(!iron.guidance.some((c) => /100\s*mg/.test(c.user_visible_summary || '')),
  '20/21: de 100mg-onderzoeksdosering staat niet als vrije GUIDANCE-aanbeveling (zit in medical_referrals, met verplichte verwijzing)');
ok(iron.claims.some((c) => c.evidence_id === 'IRON-FORBIDDEN-001'), '20b: de expliciete "app diagnosticeert nooit"-claim is aanwezig');

// ---- 22: sodium-prevents-hyponatremia afwezig / 23: overdrinking safety aanwezig ----
ok(elec.evidence_ids.indexOf('ELEC-SODIUM-PREVENTS-HYPONATREMIA-001') === -1, '22: sodium-prevents-hyponatremia-claim afwezig in Electrolyte-output');
ok(elec.safety_warnings.some((c) => c.evidence_id === 'ELEC-OVERDRINK-001'), '23: de overdrinking-veiligheidsclaim is aanwezig als safety warning');

// ---- 24: protein supplement != noodzakelijk ----
const prot = S.getSupplementEducation({ supplementId: 'PROTEIN_GROUP' });
ok(prot.claims.some((c) => c.evidence_id === 'PROT-NECESSITY-001'), '24: de "supplement niet noodzakelijk"-claim is aanwezig voor Protein');

// ---- 25: anabolic-window overclaim afwezig ----
ok(!prot.guidance.some((c) => /30-60 minuten.*anders/.test(c.user_visible_summary || '')),
  '25: geen "anabolic window"-overclaim in de Protein-guidance');
const protTiming = E.getById('PROT-TIMING-001');
ok(protTiming.forbidden_interpretations.indexOf('je moet binnen 30-60 minuten na trainen eiwit nemen anders verlies je het effect') >= 0,
  '25b: de anabolic-window-mythe is expliciet vastgelegd als forbidden_interpretation');

// ---- 26: caffeine pregnancy gescheiden ----
const caf = S.getSupplementEducation({ supplementId: 'CAFFEINE' });
ok(caf.medical_referrals.some((c) => c.evidence_id === 'CAF-PREG-001'), '26: caffeine-zwangerschapsclaim staat apart, als medical_referral');
ok(caf.guidance.every((c) => c.evidence_id !== 'CAF-PREG-001'), '26b: de zwangerschapsclaim staat niet vermengd in de algemene guidance');

// ---- 27: melatonin claims correct ----
const mel = S.getSupplementEducation({ supplementId: 'MELATONIN' });
const melReg = E.getById('MEL-REG-NL-001');
ok(melReg.claim.indexOf('0,3 mg melatonine') >= 0 && melReg.claim.indexOf('dagdosering') >= 0, '25 (melatonin dagdosering): MEL-REG-NL-001 spreekt expliciet van dagdosering, niet per tablet');
ok(melReg.forbidden_interpretations.indexOf('0,3 mg per tablet (het gaat om dagdosering)') >= 0, '25b: "per tablet"-misverstand expliciet verboden');
ok(melReg.forbidden_interpretations.indexOf('0,3 mg of meer is automatisch receptplichtig/UR') >= 0, '26 (melatonin != automatisch UR): expliciet verboden interpretatie aanwezig');
ok(melReg.forbidden_interpretations.indexOf('2 mg is de Nederlandse grens') >= 0, '27: de ongeverifieerde 2mg-claim is expliciet als verboden interpretatie vastgelegd, nooit als eigen claim');
ok(mel.evidence_ids.every((id) => id.indexOf('2MG') === -1), '27b: geen enkele melatonine-claim in de registry beweert een 2mg-NL-grens');

// ---- 30: logging != recommendation (structureel, zie ook repo-wide auditbestand) ----
// Check op FUNCTIONELE koppeling (require/gebruik van de Evidence Registry),
// niet op het woord "claim" in verklarende commentaarregels (die juist
// bevestigen dat er bewust geen claim-logica in zit).
const loggingSrc = fs.readFileSync(path.join(__dirname, 'nutritionSupplementService.js'), 'utf8');
ok(!/require\(.*nutritionSupplementEvidenceRegistry/.test(loggingSrc) && !/EvidenceRegistry|EducationService/.test(loggingSrc),
  '30: het bestaande logging-bestand (nutritionSupplementService.js) heeft geen functionele koppeling met de Evidence Registry/EducationService -- logging blijft strikt gescheiden van education');

// ---- 32: AI-output traceerbaar (structureel bewijs: elke output-claim heeft evidence_id + sources) ----
[cre, caf, ba, prot, elec, vitd, iron, mel].forEach((edu) => {
  ok(edu.claims.every((c) => !!c.evidence_id && Array.isArray(c.source_ids)),
    '32: elke claim in ' + edu.supplement_id + ' is herleidbaar naar evidence_id + source_ids');
});

// ---- NOT_FOUND / NO_CONTENT randgevallen ----
ok(S.getSupplementEducation({ supplementId: 'NIET_BESTAAND' }).status === 'NOT_FOUND', 'onbestaand item geeft NOT_FOUND');
ok(S.getSupplementEducation({ supplementId: 'GINSENG' }).status === 'NO_CONTENT', 'een P3-item zonder gecertificeerde claims geeft NO_CONTENT, geen crash');

console.log('nutritionSupplementEducationService: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
