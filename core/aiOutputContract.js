/* aiOutputContract.js — AI-OUTPUT-CONTRACT-001 (MS-F4-01).
 *
 * Deterministische, pure semantische validator tussen een AI-tekstrespons en de UI.
 * Vult het gat dat de AI_CALL_PATH_INVENTORY-audit vond: coach.js geeft de ruwe
 * Anthropic-respons ongefilterd door, en geen van de 6 client-side call sites
 * controleerde de VRIJE TEKST op verboden medische/diagnostische taal.
 *
 * Dit bestand controleert GEEN JSON-programmastructuur (dat doet parseProgrammaJSON,
 * al bestaand en al canonieke-exercise-ID-gevalideerd) en GEEN numerieke gewicht-
 * toepassing (dat doet CalcCore.validateProposedWeight/ai_guard.v1, al bestaand).
 * Dit bestand behandelt uitsluitend de PROZA-tekst die de coach aan de sporter toont.
 *
 * Architectuurgrens (F3_MASTER_REPORT.md, F4-opdracht sectie 5-6): AI mag nooit
 * diagnosticeren, HRV/ACWR als medisch instrument gebruiken, of blessurerisico
 * kwantificeren. Deze validator dwingt dat AF, technisch, niet alleen via prompt-
 * instructie (die al bestond, maar nooit werd afgedwongen).
 */
'use strict';

var VERSIE = 'ai_output_contract.v1';

// Elke categorie: een label (voor logging/tests) + een lijst regexes. Patronen zijn
// bewust NEDERLANDSTALIG (de coach-taal is NL) en case-insensitive. Nieuwe categorieën
// toevoegen: alleen via expliciete product-/veiligheidsbeslissing (Change Governance,
// docs/CALCULATION_EVIDENCE_SPEC.md sectie 13).
var VERBODEN_CATEGORIEEN = [
  {
    categorie: 'diagnose',
    reden: 'AI mag geen medische diagnose stellen (F4-opdracht sectie 5/41).',
    patronen: [
      /\bje\s+(bent|hebt)\s+overtraind\b/i,
      /\bje\s+hebt\s+(een\s+)?blessure\b/i,
      /\bdit\s+(wijst|duidt)\s+op\s+(een\s+)?(overtraining|blessure)\b/i,
      /\bmedische\s+diagnose\b/i
    ]
  },
  {
    categorie: 'hrv_als_diagnose',
    reden: 'HRV is een context-/herstelsignaal, geen diagnose-instrument (F4-opdracht sectie 26, F3 DECISION_RULE_REGISTRY.md).',
    patronen: [
      /\bwegens\s+(je\s+)?lage\s+hrv\s+moet\s+je\b/i,
      /\bhrv\s+(bewijst|toont\s+aan)\s+dat\s+je\b/i,
      /\bje\s+hrv\s+betekent\s+dat\s+je\s+ziek\b/i
    ]
  },
  {
    categorie: 'acwr_als_blessurevoorspeller',
    reden: 'ACWR mag nooit als blessurevoorspeller of risicopercentage gepresenteerd worden (F4-opdracht sectie 25, DEC-ACWR-ADV-001).',
    patronen: [
      /\bacwr\b.{0,40}\b\d{1,3}\s*%\s*(blessure|injury)/i,
      /\bblessurerisico\s+van\s+\d{1,3}\s*%/i,
      /\bje\s+blessurerisico\s+is\s+\d/i
    ]
  },
  {
    categorie: 'verplichte_rustdag_medisch',
    reden: 'Geen mandatory-rest-claim los van een canonieke Decision-uitkomst (F4-opdracht sectie 26).',
    patronen: [
      /\bmoet\s+(vandaag\s+)?absoluut\s+rust\s+nemen\s+wegens\b/i
    ]
  }
];

/* Onderschept prompt-injectie-achtige instructies die het model probeert te laten
 * "vergeten" of het contract probeert te laten negeren — behandelt dit als een
 * signaal, niet als een reden om de tekst te vertrouwen (F4-opdracht sectie 23/27). */
var INJECTIE_PATRONEN = [
  /\bnegeer\s+(eerdere|vorige|alle)\s+instructies\b/i,
  /\bignore\s+(previous|all)\s+instructions\b/i
];

/**
 * validateAiOutputText(text) — controleert AI-gegenereerde proza-tekst.
 * Retourneert altijd een object, nooit een exception (fail-closed bij een onverwachte
 * input-vorm: een niet-string wordt als ongeldig behandeld, nooit als "toevallig ok").
 */
function validateAiOutputText(text) {
  if (typeof text !== 'string') {
    return { valid: false, versie: VERSIE, violations: [{ categorie: 'geen_tekst', reden: 'invoer is geen string' }] };
  }
  var violations = [];
  VERBODEN_CATEGORIEEN.forEach(function (groep) {
    groep.patronen.forEach(function (re) {
      if (re.test(text)) {
        violations.push({ categorie: groep.categorie, reden: groep.reden });
      }
    });
  });
  INJECTIE_PATRONEN.forEach(function (re) {
    if (re.test(text)) {
      violations.push({ categorie: 'prompt_injectie_signaal', reden: 'Tekst bevat een instructie-achtig patroon dat als data behandeld moet worden, niet uitgevoerd (F4-opdracht sectie 23-24).' });
    }
  });
  return { valid: violations.length === 0, versie: VERSIE, violations: violations };
}

/**
 * safeCoachFallback() — canonieke, deterministische fallbacktekst wanneer validatie
 * faalt. Nooit de ruwe, afgekeurde tekst tonen (F4-opdracht sectie 19-20).
 */
function safeCoachFallback() {
  return 'Ik kan hier nu geen betrouwbaar coachadvies van maken. Probeer het opnieuw of bekijk je gegevens rechtstreeks in de app.';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { validateAiOutputText: validateAiOutputText, safeCoachFallback: safeCoachFallback, VERSIE: VERSIE };
}
if (typeof window !== 'undefined') {
  window.AIOutputContract = { validateAiOutputText: validateAiOutputText, safeCoachFallback: safeCoachFallback, VERSIE: VERSIE };
}
