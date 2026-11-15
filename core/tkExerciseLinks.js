/* TkExerciseLinks — fase 1 "eigen oefening ↔ MoveKit" (DEC-EXLINK-001).
 *
 * Eén pure, per-eigenaar leeslaag over de tabel public.exercise_catalog_links:
 *   - een KOPPELING (merged_into = null): de eigen oefening wordt in de app getoond als het
 *     MoveKit-catalogusitem catalog_id (naam, video, uitleg). De dubbele catalogustegel
 *     verdwijnt voor deze eigenaar. De data (sessies, PR, programma's) blijft op het
 *     eigen record staan; offline loggen werkt dus ongewijzigd.
 *   - een SAMENVOEGING (merged_into = <exercise_id>): de oefening is opgegaan in een andere
 *     eigen oefening. Ze wordt verborgen en elke nieuwe verwijzing gaat naar het doel.
 *   - een VERBORGEN koppeling (hidden = true, merged_into = null): voor vaste race-onderdelen
 *     (HYROX-stations, triathlon-disciplines) waarvan de app de id zelf schrijft. Die worden
 *     nooit samengevoegd of omgeleid (race-integriteit); ze krijgen wel MoveKit-beeld en -uitleg
 *     en verdwijnen uit de kieslijst omdat een andere eigen oefening dezelfde beweging toont.
 *
 * Veiligheidsregels:
 *   - alleen rijen van de opgegeven eigenaar tellen; vreemde rijen worden genegeerd;
 *   - een samenvoeging telt alleen als het doel zelf een geldige koppeling is (geen ketens,
 *     geen lussen, geen onbekend doel) — anders wordt er NIETS verborgen;
 *   - een catalogusitem hoort bij hooguit één eigen oefening; bij een conflict wint de
 *     laagste exercise_id (deterministisch) en wordt de catalogustegel alleen daarvoor verborgen.
 *   - deze module autoriseert geen media: de bestaande broker en grants blijven beslissen.
 */
(function (root) {
  'use strict';
  var CATALOG_RE = /^TK-[0-9]{6}$/;
  var ID_RE = /^[A-Za-z0-9_.:-]{1,80}$/;

  function create() {
    var owner = null;
    var byExercise = new Map();
    var survivorByCatalog = new Map();
    var migratedCatalog = new Set();
    var version = 0;

    function clear() {
      owner = null;
      byExercise = new Map();
      survivorByCatalog = new Map();
      migratedCatalog = new Set();
      version++;
    }

    function load(rows, ownerUid) {
      clear();
      if (typeof ownerUid !== 'string' || !ownerUid) return 0;
      owner = ownerUid;
      var raw = new Map();
      (Array.isArray(rows) ? rows : []).forEach(function (r) {
        if (!r || typeof r !== 'object' || r.user_id !== ownerUid) return;
        if (typeof r.exercise_id !== 'string' || !ID_RE.test(r.exercise_id)) return;
        if (typeof r.catalog_id !== 'string' || !CATALOG_RE.test(r.catalog_id)) return;
        var merged = (r.merged_into == null) ? null : r.merged_into;
        if (merged !== null && (typeof merged !== 'string' || !ID_RE.test(merged) || merged === r.exercise_id)) return;
        var hidden = r.hidden === true;
        if (hidden && merged !== null) return; // tegenstrijdig: negeren
        if (raw.has(r.exercise_id)) return; // primary key (user_id, exercise_id): duplicaat = negeren
        // DEC-EXLINK-005: gemigreerd = de historie staat op het MoveKit-id; geen omleiding meer.
        var migrated = (typeof r.migrated_at === 'string' && r.migrated_at !== '') ? r.migrated_at : null;
        if (migrated !== null && merged !== null) migrated = null; // samenvoeging wordt nooit "gemigreerd"
        raw.set(r.exercise_id, { exercise_id: r.exercise_id, catalog_id: r.catalog_id, merged_into: merged, hidden: hidden, migrated_at: migrated });
      });
      // Koppelingen eerst: alleen die kunnen doel van een samenvoeging zijn.
      var ids = Array.from(raw.keys()).sort();
      ids.forEach(function (id) {
        var r = raw.get(id);
        if (r.merged_into !== null) return;
        byExercise.set(id, Object.freeze(r));
        if (r.migrated_at !== null) { migratedCatalog.add(r.catalog_id); return; }
        if (!r.hidden && !survivorByCatalog.has(r.catalog_id)) survivorByCatalog.set(r.catalog_id, id);
      });
      ids.forEach(function (id) {
        var r = raw.get(id);
        if (r.merged_into === null) return;
        var target = byExercise.get(r.merged_into);
        if (!target || target.merged_into !== null || target.hidden) return; // onbekend/verborgen doel, keten → niets verbergen
        byExercise.set(id, Object.freeze(r));
      });
      version++;
      return byExercise.size;
    }

    function aliasOf(id) {
      var r = (typeof id === 'string') ? byExercise.get(id) : null;
      return (r && r.merged_into !== null) ? r.merged_into : id;
    }
    function isMerged(id) {
      var r = (typeof id === 'string') ? byExercise.get(id) : null;
      return !!(r && r.merged_into !== null);
    }
    // Niet tonen in kieslijsten: samengevoegd, of een verborgen race-koppeling.
    function isHidden(id) {
      var r = (typeof id === 'string') ? byExercise.get(id) : null;
      return !!(r && (r.merged_into !== null || r.hidden || r.migrated_at !== null));
    }
    // DEC-EXLINK-005: is dit MoveKit-item voor deze eigenaar gemigreerd (historie op het MoveKit-id)?
    function migratedForCatalog(catalogId) {
      return typeof catalogId === 'string' && migratedCatalog.has(catalogId);
    }
    function isMigrated(id) {
      var r = (typeof id === 'string') ? byExercise.get(id) : null;
      return !!(r && r.migrated_at !== null);
    }
    function catalogFor(id) {
      var s = aliasOf(id);
      var r = (typeof s === 'string') ? byExercise.get(s) : null;
      return (r && r.merged_into === null) ? r.catalog_id : null;
    }
    function survivorForCatalog(catalogId) {
      return (typeof catalogId === 'string' && survivorByCatalog.get(catalogId)) || null;
    }
    function rows() {
      return Array.from(byExercise.values()).map(function (r) {
        return { user_id: owner, exercise_id: r.exercise_id, catalog_id: r.catalog_id, merged_into: r.merged_into, hidden: r.hidden, migrated_at: r.migrated_at };
      });
    }
    return {
      load: load,
      clear: clear,
      aliasOf: aliasOf,
      isMerged: isMerged,
      isHidden: isHidden,
      catalogFor: catalogFor,
      survivorForCatalog: survivorForCatalog,
      migratedForCatalog: migratedForCatalog,
      isMigrated: isMigrated,
      ownerUid: function () { return owner; },
      size: function () { return byExercise.size; },
      version: function () { return version; },
      rows: rows
    };
  }

  var api = { create: create };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TkExerciseLinks = api;
})(typeof window !== 'undefined' ? window : this);
