/* ==========================================================================
 * TrainingKompas — ATHLETE CONSTRAINTS CORE (F23 — equipment & avoid, veilig)
 * --------------------------------------------------------------------------
 * PUUR · DETERMINISTISCH · OFFLINE-CAPABLE. Geen DOM, geen DB/fetch, geen AI, geen Date.
 *
 * Doel: de door de sporter opgegeven BESCHIKBARE apparatuur en TE VERMIJDEN oefeningen
 * veilig laten doorwerken in oefening-selectie — ZONDER fuzzy gok. Alleen uitsluiten wanneer
 * dit VERIFIEERBAAR is:
 *   - equipment: de oefening heeft bekende (catalogus-)equipment én die is niet beschikbaar;
 *   - avoid: de naam matcht EXACT (of via een expliciet geverifieerde alias) — nooit op substring.
 *
 * VEILIGHEIDSREGELS (hard):
 *   1. Onbekende equipment → NIET uitsluiten (blijft beschikbaar).
 *   2. Ambigu avoid ("deadlift" bij meerdere varianten) → NIET uitsluiten.
 *   3. Geen availableSet (sporter gaf niets op / gym) → GEEN equipment-filter.
 *   4. 'bodyweight' is altijd beschikbaar (iedereen heeft een lichaam).
 *   5. Filtering mag nooit een lege set opleveren → veilige fallback naar de oorspronkelijke set.
 * De core LEEST alleen meegegeven, reeds-geresolveerde data (equipment per kandidaat). Het
 * resolven zelf (catalogus) gebeurt in de app-laag; deze core bepaalt de VEILIGE beslissing.
 * ==========================================================================*/
(function (global) {
  'use strict';

  var VERSION = 'athlete_constraints.v1';

  // Canonieke equipment-taxonomie (exact zoals in de MoveKit-catalogus, 7 termen).
  var EQUIPMENT_CANON = ['band', 'barbell', 'bodyweight', 'cable machine', 'dumbbell', 'kettlebell', 'machine'];

  // Sporter-invoer (onboarding-slugs én vrije tekst) → canonieke term(en). ALLEEN expliciete,
  // verifieerbare mappings. Onbekend → [] (draagt niet bij, sluit niets uit).
  var EQUIP_ALIAS = {
    'barbell': ['barbell'], 'halterstang': ['barbell'], 'lange-halter': ['barbell'],
    'dumbbell': ['dumbbell'], 'dumbbells': ['dumbbell'], 'halter': ['dumbbell'], 'halters': ['dumbbell'],
    'kettlebell': ['kettlebell'], 'kettle': ['kettlebell'],
    'band': ['band'], 'bands': ['band'], 'weerstandsband': ['band'], 'weerstandsbanden': ['band'], 'banden': ['band'],
    'machine': ['machine', 'cable machine'], 'machines': ['machine', 'cable machine'], 'apparaten': ['machine', 'cable machine'],
    'cable': ['cable machine'], 'cable-machine': ['cable machine'], 'kabel': ['cable machine'],
    'bodyweight': ['bodyweight'], 'lichaamsgewicht': ['bodyweight'], 'eigen-gewicht': ['bodyweight']
    // Bewust GEEN catalogus-dimensie (geen filter-effect): rack, pullup_bar, bench.
  };

  function normSlug(name) {
    return String(name == null ? '' : name).toLowerCase()
      .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
  function isArr(v) { return Object.prototype.toString.call(v) === '[object Array]'; }

  // Eén losse equipment-term → canonieke term(en) of [] indien onbekend/geen filterdimensie.
  function normalizeEquipItem(term) {
    var s = normSlug(term);
    if (!s) return [];
    if (Object.prototype.hasOwnProperty.call(EQUIP_ALIAS, s)) return EQUIP_ALIAS[s].slice();
    // Al canoniek?
    var direct = String(term).toLowerCase().trim();
    if (EQUIPMENT_CANON.indexOf(direct) !== -1) return [direct];
    return []; // onbekend → geen aanname
  }

  // Sporter-equipmentlijst → Set van beschikbare canonieke termen. 'bodyweight' altijd erbij.
  function normalizeEquipment(userEquip) {
    var out = {};
    out['bodyweight'] = true;
    (isArr(userEquip) ? userEquip : (userEquip ? [userEquip] : [])).forEach(function (t) {
      normalizeEquipItem(t).forEach(function (c) { out[c] = true; });
    });
    return out; // object als set: {term:true}
  }

  // Bepaalt of een oefening met (canonieke) required-equipment is toegestaan bij availableSet.
  // requiredEquip leeg/afwezig → 'unknown' (NIET uitsluiten).
  function allowedByEquipment(requiredEquip, availableSet) {
    if (!requiredEquip || !requiredEquip.length) return { allowed: true, reason: 'unknown' };
    var req = requiredEquip.map(function (e) { return String(e).toLowerCase().trim(); });
    if (req.indexOf('bodyweight') !== -1) return { allowed: true, reason: 'bodyweight' };
    var nonBody = req.filter(function (e) { return e !== 'bodyweight'; });
    if (!nonBody.length) return { allowed: true, reason: 'bodyweight' };
    for (var i = 0; i < nonBody.length; i++) if (availableSet && availableSet[nonBody[i]]) return { allowed: true, reason: 'has-equipment' };
    return { allowed: false, reason: 'equipment', missing: nonBody };
  }

  // Avoid-match tussen een (vrije-tekst) avoid-term en een oefeningnaam.
  //   'exact'     → normSlug gelijk (veilig uitsluiten)
  //   'ambiguous' → substring-relatie maar niet gelijk (NIET uitsluiten)
  //   'unknown'   → geen relatie
  function avoidMatch(avoidTerm, exerciseName) {
    var a = normSlug(avoidTerm), n = normSlug(exerciseName);
    if (!a || !n) return 'unknown';
    if (a === n) return 'exact';
    if (n.indexOf(a) >= 0 || a.indexOf(n) >= 0) return 'ambiguous';
    return 'unknown';
  }

  // Kernfunctie. candidates: [{id?, name, equipment}] waarbij equipment een canonieke lijst is
  // (uit de catalogus) of null/[] = onbekend. opts: { availableSet | userEquipment, avoidTerms }.
  // Geeft { kept, diagnostics }. Sluit NOOIT alles uit → veilige fallback.
  function applyConstraints(candidates, opts) {
    candidates = isArr(candidates) ? candidates : [];
    opts = opts || {};
    var availableSet = opts.availableSet || (opts.userEquipment ? normalizeEquipment(opts.userEquipment) : null);
    var avoidTerms = isArr(opts.avoidTerms) ? opts.avoidTerms.filter(Boolean) : [];
    var diag = { excluded_by_equipment: [], excluded_by_avoid: [], unresolved_equipment: [], unresolved_avoid: [] };

    var kept = candidates.filter(function (c) {
      var name = (c && (c.name || c.naam)) || '';
      // AVOID (alleen EXACT sluit uit; ambigu blijft beschikbaar)
      for (var j = 0; j < avoidTerms.length; j++) {
        var mm = avoidMatch(avoidTerms[j], name);
        if (mm === 'exact') { diag.excluded_by_avoid.push(name); return false; }
        if (mm === 'ambiguous') { diag.unresolved_avoid.push({ avoid: avoidTerms[j], candidate: name }); }
      }
      // EQUIPMENT (alleen bij bekende availableSet én bekende equipment)
      if (availableSet) {
        var eq = (c && (c.equipment || c.equip)) || null;
        if (!eq || !eq.length) { diag.unresolved_equipment.push(name); return true; } // onbekend → beschikbaar
        var r = allowedByEquipment(eq, availableSet);
        if (!r.allowed) { diag.excluded_by_equipment.push(name); return false; }
      }
      return true;
    });

    // Veiligheid: nooit een lege training. Val terug op de oorspronkelijke set.
    if (candidates.length && !kept.length) { diag.fellBack = true; return { kept: candidates.slice(), diagnostics: diag }; }
    return { kept: kept, diagnostics: diag };
  }

  var AthleteConstraints = {
    VERSION: VERSION,
    EQUIPMENT_CANON: EQUIPMENT_CANON,
    normSlug: normSlug,
    normalizeEquipItem: normalizeEquipItem,
    normalizeEquipment: normalizeEquipment,
    allowedByEquipment: allowedByEquipment,
    avoidMatch: avoidMatch,
    applyConstraints: applyConstraints
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = AthleteConstraints; }
  if (global) { global.AthleteConstraints = AthleteConstraints; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
