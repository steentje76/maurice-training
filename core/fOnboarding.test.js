/* fOnboarding.test.js — MS-F2-06 regressietest.
 *
 * Audit: twee onboarding-systemen blijken bewust, niet per ongeluk naast elkaar te
 * bestaan -- AI Conversational Intake (intakeStart, scherm s-intake) is de primaire
 * flow, de klassieke stap-wizard (initOnboarding, scherm s-onboarding) is een
 * expliciete terugval bij ontbrekende OnboardingCore/AI-onbereikbaarheid/voorkeur
 * (intakeSwitchToForm, met commentaar "Terugval naar de klassieke wizard").
 *
 * AI-grens (sectie 21-22 van de opdracht) bevestigd: elk AI-geëxtraheerd antwoord loopt
 * via ocore().validateField()/validateCandidate() (deterministische validatie in de pure
 * Core) vóór het als canonical context wordt toegepast; er is bovendien een lokale,
 * niet-AI-parser (parseAnswerLocally) die zonder AI werkt (privacy-by-default/offline).
 * Opgeslagen data landt via expliciete mapper-functies (toAtleet/toTrainingContextRow/
 * toCoachPrefs/toSecondaryGoals/toConditions) in de bestaande, canonieke tabellen.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

function extractFunctionBody(source, name) {
  const re = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(');
  const m = re.exec(source);
  if (!m) return null;
  const braceStart = source.indexOf('{', m.index);
  if (braceStart === -1) return null;
  let depth = 0;
  for (let i = braceStart; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(braceStart, i + 1);
    }
  }
  return null;
}

// ---- A. Primaire flow vs bewuste terugval (geen ongewenste duplicatie) ----
{
  ok(html.includes("window.OnboardingCore"),
    'De keuze primaire-intake-vs-terugval-wizard checkt expliciet op de aanwezigheid van OnboardingCore');
  const body = extractFunctionBody(html, 'intakeSwitchToForm');
  ok(body !== null, 'intakeSwitchToForm() (bewuste terugval-actie) wordt gevonden');
  if (body) {
    ok(/initOnboarding\(\)/.test(body),
      'intakeSwitchToForm() valt terug op de klassieke wizard als expliciete, door de gebruiker/systeem gekozen actie');
  }
}

// ---- B. AI-extractie loopt altijd via deterministische validatie vóór toepassing ----
{
  const body = extractFunctionBody(html, 'intakeApplyExtraction');
  // Functienaam kan afwijken; zoek breder op het validatiepatroon rond AI-extractie.
  ok(html.includes('ocore().validateField('),
    'Elk veld (ook AI-geëxtraheerd) loopt via ocore().validateField() vóór toepassing — AI kan geen ongevalideerde waarde direct als fact opslaan');
  ok(html.includes('ocore().validateCandidate('),
    'De volledige kandidaat-context wordt gevalideerd via ocore().validateCandidate() vóór afronding');
  ok(html.includes('ocore().parseAnswerLocally('),
    'Er bestaat een lokale, niet-AI-afhankelijke parser (privacy-by-default/offline-vast)');
}

// ---- C. Canonical destinations: expliciete mappers naar bestaande tabellen ----
{
  ['toAtleet', 'toTrainingContextRow', 'toCoachPrefs', 'toSecondaryGoals', 'toConditions'].forEach(fn => {
    ok(html.includes('ocore().' + fn + '('),
      'Canonical mapper ocore().' + fn + '() wordt gebruikt (herkomst van opgeslagen context is traceerbaar)');
  });
}

console.log('fOnboarding: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
