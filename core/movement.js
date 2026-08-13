/* ==========================================================================
 * TrainingKompas — MOVEMENT CORE (F19 — MoveKit asset name-mapping)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE. Geen DOM, geen DB/fetch, geen AI, geen Date.
 *
 * Doel: koppel een bestaande TrainingKompas-oefening (op NAAM) aan de juiste MoveKit
 * provider_id (poster-slug), zodat ExerciseAssetProvider het bewegingsbeeld kan resolven
 * ook wanneer de oefening geen catalog_id heeft.
 *
 * VEILIGHEID (harde regel): dit bepaalt UITSLUITEND het bewegingsBEELD. Geen sportlogica,
 * geen progression, geen 1RM, geen equipment-berekening. De alias-tabel is met de hand
 * geverifieerd en conservatief: bij biomechanische twijfel is er GEEN entry (dan geen beeld
 * i.p.v. een verkeerd beeld). Elke doel-slug is een bestaande MoveKit provider_id.
 *
 * ARCHITECTUUR: dit is de ENIGE mapping-bron. ExerciseAssetProvider roept slugForName() aan;
 * er is geen tweede/verspreide mapping. `resolve()` in de provider controleert daarna of de
 * slug een echte poster is — een onbekende slug levert dus netjes null (geen beeld).
 * ==========================================================================*/
(function (global) {
  'use strict';

  var VERSION = 'movement_map.v1';

  // Normaliseer een oefeningsnaam tot een slug (zelfde vorm als MoveKit provider_id).
  function normSlug(name) {
    return String(name == null ? '' : name)
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Curated, met de hand geverifieerde koppelingen: genormaliseerde naam -> bestaande MoveKit provider_id.
  // Alleen opgenomen wanneer beweging ÉN (impliciete) uitvoering betrouwbaar overeenkomen.
  // Bewust NIET opgenomen (te dubbelzinnig of geen betrouwbaar asset): front squat, sumo deadlift,
  // hexbar deadlift, RDL, hang power clean/snatch, farmer carry, cable row, generieke "press/thruster/shrug/pulldown".
  var ALIASES = {
    // Squat (back squat = barbell)
    'backsquat': 'barbell-squat',
    'back-squat': 'barbell-squat',
    'high-bar-back-squat': 'barbell-squat',
    'low-bar-back-squat': 'barbell-squat',
    'bulgarian-split-squat': 'bulgarian-split-squat',
    // Bench press (barbell default)
    'benchpress': 'barbell-bench-press',
    'bench-press': 'barbell-bench-press',
    'flat-bench-press': 'barbell-bench-press',
    'paused-bench': 'barbell-bench-press',
    'paused-bench-press': 'barbell-bench-press',
    'competition-bench-press': 'barbell-bench-press',
    'incline-bench-press': 'barbell-incline-bench-press',
    'incline-benchpress': 'barbell-incline-bench-press',
    'close-grip-bench-press': 'barbell-close-grip-bench-press',
    'close-grip-bench': 'barbell-close-grip-bench-press',
    // Row (bent-over row = barbell default)
    'bent-over-row': 'barbell-bent-over-row',
    'bentover-row': 'barbell-bent-over-row',
    'bentoverrow': 'barbell-bent-over-row',
    'barbell-row': 'barbell-bent-over-row',
    'pendlay-row': 'barbell-bent-over-row',
    'upright-row': 'barbell-upright-row',
    // Overhead press (OHP = barbell default in krachtcontext)
    'overhead-press': 'barbell-overhead-press',
    'shoulder-press': 'barbell-overhead-press',
    'ohp': 'barbell-overhead-press',
    'military-press': 'barbell-overhead-press',
    'militairy-press': 'barbell-overhead-press',
    'strict-press': 'barbell-overhead-press',
    // Deadlift (conventioneel = barbell)
    'deadlift': 'barbell-deadlift',
    'conventional-deadlift': 'barbell-deadlift',
    'deadlift-conventioneel': 'barbell-deadlift',
    'rack-pull': 'barbell-rack-pull',
    // Overig barbell (expliciet)
    'good-morning': 'good-mornings',
    'good-mornings': 'good-mornings',
    'goodmorning': 'good-mornings',
    'barbell-curl': 'barbell-curl',
    'barbell-shrug': 'barbell-shrug',
    // Bodyweight (ondubbelzinnig)
    'pull-up': 'pull-ups',
    'pullup': 'pull-ups',
    'pull-ups': 'pull-ups',
    'pullups': 'pull-ups',
    'chin-up': 'chin-ups',
    'chinup': 'chin-ups',
    'chin-ups': 'chin-ups',
    'chinups': 'chin-ups',
    // Machine (naam impliceert machine)
    'leg-press': 'machine-leg-press',
    // Uitbreiding (206-inventarisatie): alleen koppelingen waar de EXACTE MoveKit-slug bestaat
    // én de beweging biomechanisch 1-op-1 klopt. Bij twijfel geen entry (F19-regel).
    'leg-extension': 'machine-leg-extension',
    'lat-pulldown': 'machine-pulldown',
    'lateral-raise': 'dumbbell-lateral-raise',       // laterale raise = default dumbbell
    'goblet-squat': 'dumbbell-goblet-squat',         // goblet (db/kb) — zelfde beweging
    'thruster': 'barbell-thruster',                  // thruster = barbell (kracht/CrossFit)
    'snatch': 'barbell-snatch',                      // olympische snatch = barbell
    'windmill': 'kettlebell-windmill',
    'incline-dumbbell-press': 'dumbbell-incline-bench-press',
    'bicep-curl-barbell': 'barbell-curl',
    'bicep-curl-dumbbell': 'dumbbell-curl',
    'tricep-overhead-extension': 'dumbbell-seated-overhead-tricep-extension'
  };

  // Naam -> MoveKit provider_id kandidaat. Alias heeft voorrang; anders de genormaliseerde naam
  // (die als exacte provider_id kan bestaan, bv. "box-jump"/"burpee"). De provider bepaalt of de
  // slug echt een poster oplevert; een onbekende slug -> null (geen beeld), nooit een verkeerd beeld.
  function slugForName(name) {
    var s = normSlug(name);
    if (!s) return null;
    return Object.prototype.hasOwnProperty.call(ALIASES, s) ? ALIASES[s] : s;
  }

  var MovementCore = {
    normSlug: normSlug,
    slugForName: slugForName,
    ALIASES: ALIASES,
    VERSION: VERSION
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = MovementCore; }
  if (global) { global.MovementCore = MovementCore; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
