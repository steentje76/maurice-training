/* fHydrationMeasurementUx.test.js — NK-09/NK-05C Hydration Measurement UX. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const HydrationCalculation = require('./hydrationCalculation.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r/g, '');

// ═══ UI-structuur ═══
ok(html.indexOf('id="s-voeding-hydratatie-meting"') > 0, 'setup: het meetscherm bestaat');
ok(html.indexOf("if(topicId==='HYDRATION')") > 0 && html.indexOf('Zweetverlies meten') > 0, 'entry point: de knop verschijnt uitsluitend op het HYDRATION-topic');
['hyd-meting-pre', 'hyd-meting-post', 'hyd-meting-fluid', 'hyd-meting-urine', 'hyd-meting-duur'].forEach((id) => {
  ok(html.indexOf('id="' + id + '"') > 0, 'invoerveld ' + id + ' bestaat');
});
ok(html.indexOf('vocht-/urine-inname niet geregistreerd') === -1, 'sanity: geen dubbele/oude tekst per ongeluk meegekopieerd');

// ═══ GEEN tweede formule in de UI (sectie 8: "GEEN tweede formule in UI") ═══
const submitBody = html.slice(html.indexOf('function voedingHydratatieMetingBereken'), html.indexOf('function voedingKennisSwitchTab'));
ok(submitBody.indexOf('HydrationCalculation.estimateSweatLoss(') > 0, 'de UI roept uitsluitend de bestaande estimateSweatLoss() aan');
ok(submitBody.indexOf('HydrationCalculation.estimateSweatRate(') > 0, 'de UI roept uitsluitend de bestaande estimateSweatRate() aan');
ok(!/\(pre\s*-\s*post\)|preWeightKg\s*-\s*postWeightKg/.test(submitBody), 'geen herimplementatie van de zweetverlies-formule in de UI zelf');
ok(!/sweatLossL\s*\/\s*\(/.test(submitBody), 'geen herimplementatie van de zweettempo-formule in de UI zelf');

// ═══ VALIDATIE (sectie 10): geen silent correction, expliciete fout bij onmogelijke invoer ═══
ok(submitBody.indexOf("status==='INSUFFICIENT_INPUT'") > 0, 'ontbrekende verplichte invoer geeft een expliciete fout (geen silent default)');
ok(submitBody.indexOf("status==='IMPLAUSIBLE'") > 0, 'fysiek onmogelijke invoer geeft een expliciete fout');
ok(submitBody.indexOf('getal(id){ var v=document.getElementById(id).value; return v===\'\'?null:parseFloat(v); }') > 0, 'lege optionele velden worden als null (onbekend) doorgegeven, niet als 0');

// ═══ RESULTAAT toont uitsluitend engine-output + data quality/confidence/limitations (sectie 9) ═══
ok(submitBody.indexOf('verliesResultaat.dataQuality') > 0 && submitBody.indexOf('verliesResultaat.confidence') > 0, 'het resultaat toont dataQuality en confidence uit de engine');
ok(submitBody.indexOf('reg&&reg.limitations') > 0 || submitBody.indexOf('reg.limitations') > 0, 'het resultaat toont de bestaande, geregistreerde limitations (geen nieuwe, verzonnen beperkingen)');
ok(submitBody.indexOf("getCalculation('sweat_loss_estimate.v1')") > 0, 'limitations komen uit de bestaande Calculation Registry, niet uit een losse string in de UI');

// ═══ HYDRATION RESULT SAFETY (sectie 12): geen drinkadvies, geen sodium-advies, EAH-taal ═══
ok(/geen persoonlijk drinkadvies/i.test(submitBody), 'expliciete tekst: geen persoonlijk drinkadvies');
ok(/geen zoutadvies/i.test(submitBody), 'expliciete tekst: geen zoutadvies');
ok(/overdrinken is een reëel risico/i.test(submitBody), 'expliciete EAH/overdrink-waarschuwing blijft aanwezig in het resultaatscherm');
ok(!/\bdrink\s+\d+\s*(ml|l)\b/i.test(submitBody), 'geen concreet, becijferd drinkvoorschrift in de UI-tekst');

// ═══ Geen persistence/DB-wijziging (sectie 13) ═══
ok(submitBody.indexOf('sbPost') === -1 && submitBody.indexOf('sbInsert') === -1 && submitBody.indexOf('supabase') === -1, 'geen enkele database-opslag-aanroep -- eenmalige, in-memory meting zoals gespecificeerd');
ok(html.indexOf('nutrition_hydration_measurements') === -1, 'geen nieuwe tabelverwijzing toegevoegd (geen DB-wijziging)');

// ═══ Integratie: de daadwerkelijke calculation-flow werkt end-to-end (bekend, valide voorbeeld) ═══
{
  const verlies = HydrationCalculation.estimateSweatLoss({ preWeightKg: 78, postWeightKg: 76.5, fluidIntakeL: 0.5, urineL: 0 });
  ok(verlies.status === 'OK' && verlies.dataQuality === 'HIGH', 'integratie: een volledige, valide invoer geeft een HIGH-datakwaliteit-resultaat');
  const tempo = HydrationCalculation.estimateSweatRate({ sweatLossResult: verlies, durationMinutes: 90 });
  ok(tempo.status === 'OK' && tempo.sweatRateLPerHour > 0, 'integratie: het zweettempo wordt correct doorberekend vanuit het zweetverlies-resultaat');
}
{
  // Onbekende vocht-/urine-inname -> LOW dataQuality, geen silent 0-aanname voor de KWALITEITSBEOORDELING
  const verlies = HydrationCalculation.estimateSweatLoss({ preWeightKg: 78, postWeightKg: 76.5 });
  ok(verlies.status === 'OK' && verlies.dataQuality === 'LOW' && verlies.inputsUsed.fluidIntakeKnown === false, 'UNKNOWN != 0: ontbrekende vocht-/urine-invoer geeft expliciet LOW-datakwaliteit, geen HIGH-aanname');
}

// ═══ Regressie: de bestaande NK-04C/NK-08-Kennis-AI-flow op HYDRATION blijft ongewijzigd werken ═══
const R = require('./nutritionKnowledgeResolver.js');
{
  const r = R.resolveQuestion('Meer drinken voorkomt hyponatriëmie toch?');
  ok(r.status === 'OK' && r.matchedTopics.indexOf('HYDRATION') >= 0, 'regressie: de bestaande Hydratatie-Kennis-AI-flow is ongewijzigd door de nieuwe meetknop');
}

console.log('fHydrationMeasurementUx: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
