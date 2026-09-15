/* ==========================================================================
 * TrainingKompas — ERG ANALYTICS PROJECTION  (Erg Analytics Visibility V1)
 * --------------------------------------------------------------------------
 * PUUR · DETERMINISTISCH · OFFLINE. Geen DOM, geen Supabase/fetch, geen
 * localStorage, geen AI, geen globale mutable state. INPUT -> OUTPUT.
 *
 * DIT IS EXPLICIET GEEN CALCULATION.
 * Deze module REKENT NIETS. Hij filtert, hernoemt en normaliseert de VORM van
 * reeds gepersisteerde, reeds geautoriseerde `sessions`-rijen naar exact het
 * contract dat de BESTAANDE analytics-consumenten al verwachten
 * (RunningIntelligenceCore.weeklyVolume: {recorded_at, distance_meters,
 * duration_seconds}). Er wordt daarom bewust GEEN CALC-ID aangevraagd en geen
 * nieuw versiecontract geintroduceerd -- het doelcontract bestond al.
 *
 * WAAROM DIT BESTAAT
 * RowErg/BikeErg/SkiErg worden canoniek in `sessions` gelogd (handmatig
 * cardiopad: cardioDataToRow() -> writeSessionRow()) en hebben GEEN
 * `activities`-tegenhanger. De endurance-analytics projecteren echter uit
 * `activities`. Daardoor waren de drie Erg-sporten volledig onzichtbaar in
 * weekvolume/belasting/trend. Deze projectie sluit dat gat zonder dual-write,
 * zonder migratie en zonder tweede bron van waarheid.
 *
 * HARDE SCOPE (PO-besluit, V1): UITSLUITEND rowing/bikeerg/skierg.
 * Handmatig gelogde running/cycling/swimming-sessies worden bewust GEWEIGERD:
 * die kunnen OOK in `activities` bestaan en er is vandaag geen bewezen
 * gedeelde deduplicatie-identifier tussen beide tabellen (`activities` heeft
 * `dedupe_key`, `sessions` niet). Ze meenemen zou training kunnen
 * dubbeltellen. Apart geregistreerd als:
 *   P3 -- MANUAL CARDIO ANALYTICS VISIBILITY / CROSS-PERSISTENCE DEDUPLICATION
 * (UITGESTELD -- niet in deze module oplossen.)
 *
 * SPORTSEMANTIEK BLIJFT GESCHEIDEN
 * BikeErg is NOOIT rowing. RowErg/SkiErg gebruiken een 500m-splitbasis,
 * BikeErg 1000m (Concept2-conventie). `stroke_rate` betekent voor BikeErg RPM
 * en voor RowErg/SkiErg slagfrequentie -- twee onverenigbare grootheden in
 * dezelfde kolom. Cadans is niet nodig voor de V1-analytics en wordt daarom
 * BEWUST WEGGELATEN (weglaten boven semantische corruptie). Afstand blijft
 * sport-specifiek: RowErg-meters, BikeErg-meters en SkiErg-meters mogen nooit
 * tot een generieke afstandstrend worden opgeteld.
 * ==========================================================================*/
(function (global) {
  'use strict';

  // Canonieke Erg-sporten (spiegelt index.html TK_ERG_SPORTS; hier herhaald
  // omdat deze module pure/offline moet blijven en geen app-globals leest).
  var ERG_SPORTS = ['rowing', 'bikeerg', 'skierg'];

  // Canonieke exercise_id -> sport-mapping, identiek aan CARDIO_TYPE_BY_ID in
  // index.html. Sport wordt UITSLUITEND hieruit afgeleid -- nooit gegokt uit
  // stroke_rate, distance, watt, of een tekstlabel.
  var ERG_SPORT_BY_EXERCISE_ID = {
    roeien: 'rowing', rowerg: 'rowing',
    bikeerg: 'bikeerg', bike_erg: 'bikeerg',
    skierg: 'skierg', ski_erg: 'skierg'
  };

  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  /* ergSportForSession(row)
   * Canonieke sportbepaling voor een sessierij. Retourneert 'rowing' |
   * 'bikeerg' | 'skierg', of null voor ELKE andere sessie (kracht, hardlopen,
   * fietsen, zwemmen, Assault Bike, Stairmaster, onbekend). Fail closed. */
  function ergSportForSession(row) {
    if (!row || typeof row !== 'object') return null;
    var exId = row.exercise_id;
    if (typeof exId !== 'string' || exId === '') return null;
    var sport = ERG_SPORT_BY_EXERCISE_ID[exId];
    return (sport && ERG_SPORTS.indexOf(sport) !== -1) ? sport : null;
  }

  /* normalizeSessionDateToUtcIso(dateValue)
   * sessions.date is een kale kalenderdag ('YYYY-MM-DD'); activities.recorded_at
   * is een volledige ISO-timestamp. De bestaande weekgrens-logica
   * (RunningIntelligenceCore.weekKeyFromDate) rekent in UTC. Daarom wordt hier
   * expliciet UTC-middernacht gebruikt ('...T00:00:00.000Z') -- NOOIT een
   * lokale-tijd-parse, die een sessie bij een negatieve UTC-offset naar de
   * vorige kalenderdag (en daarmee naar de vorige week) zou kunnen schuiven.
   * Een reeds volledige ISO-timestamp wordt ongewijzigd doorgegeven.
   * Onleesbaar/ontbrekend -> null (geen verzonnen datum). */
  function normalizeSessionDateToUtcIso(dateValue) {
    if (dateValue == null) return null;
    var s = String(dateValue).trim();
    if (s === '') return null;
    var mDay = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (mDay) {
      var d = new Date(Date.UTC(Number(mDay[1]), Number(mDay[2]) - 1, Number(mDay[3])));
      return isNaN(d.getTime()) ? null : d.toISOString();
    }
    var full = new Date(s);
    return isNaN(full.getTime()) ? null : full.toISOString();
  }

  /* projectErgSession(row)
   * Eén sessierij -> genormaliseerd analytics-invoerobject, of null wanneer de
   * rij niet in scope is of onbruikbaar. Geen berekening: uitsluitend filteren,
   * hernoemen en vormnormalisatie. Ontbrekende waarden blijven null -- nooit 0.
   *
   * Duur: `duration_s` is de canonieke numerieke duur die de bestaande
   * schrijfweg al wegschrijft. `time_str` wordt hier BEWUST NIET geparsed --
   * dat zou een tweede duur-parser introduceren naast CardioCore.parseTime();
   * een sessie zonder bruikbare `duration_s` levert duration_seconds: null en
   * telt daarmee correct niet mee in duur-aggregaties. */
  function projectErgSession(row) {
    var sport = ergSportForSession(row);
    if (!sport) return null;
    var recordedAt = normalizeSessionDateToUtcIso(row.date);
    if (!recordedAt) return null;

    var durationSeconds = isNum(row.duration_s) && row.duration_s > 0 ? row.duration_s : null;
    var distanceMeters = isNum(row.distance) && row.distance > 0 ? row.distance : null;
    var rpe = (isNum(row.rpe) && row.rpe >= 0 && row.rpe <= 10) ? row.rpe : null;
    var watt = (isNum(row.watt) && row.watt > 0) ? row.watt : null;

    return {
      recorded_at: recordedAt,
      sport: sport,
      distance_meters: distanceMeters,
      duration_seconds: durationSeconds,
      rpe: rpe,
      watt: watt,
      source_provenance: 'session',          // herkomst expliciet, nooit als 'manual activity' voorgesteld
      session_id: (row.id != null) ? row.id : null,   // traceerbaarheid terug naar de bronrij
      exercise_id: (typeof row.exercise_id === 'string') ? row.exercise_id : null
    };
  }

  /* projectErgSessions(rows, opts)
   * Lijst sessierijen -> lijst genormaliseerde objecten. Niet-Erg-rijen en
   * onbruikbare rijen vallen stilzwijgend af (fail closed).
   * opts.sport (optioneel): beperk tot exact één Erg-sport. Dit is de aanbevolen
   * weg voor prestatie-trends -- afstand/split/vermogen zijn tussen machines
   * NIET vergelijkbaar. */
  function projectErgSessions(rows, opts) {
    var o = opts || {};
    var list = Array.isArray(rows) ? rows : [];
    var out = [];
    list.forEach(function (r) {
      var p = projectErgSession(r);
      if (!p) return;
      if (o.sport && p.sport !== o.sport) return;
      out.push(p);
    });
    return out;
  }

  /* ergSessionsBySport(rows)
   * Groepeert per Erg-sport. Bewust GEEN samengevoegde "alle Ergs"-bucket met
   * afstand: dat zou RowErg-, BikeErg- en SkiErg-meters optellen, wat fysiek
   * betekenisloos is. Callers die tijd of sRPE over sporten willen optellen
   * (dat mag wel) doen dat expliciet zelf. */
  function ergSessionsBySport(rows) {
    var out = { rowing: [], bikeerg: [], skierg: [] };
    projectErgSessions(rows).forEach(function (p) { out[p.sport].push(p); });
    return out;
  }

  var ErgAnalyticsProjection = {
    ERG_SPORTS: ERG_SPORTS,
    ERG_SPORT_BY_EXERCISE_ID: ERG_SPORT_BY_EXERCISE_ID,
    ergSportForSession: ergSportForSession,
    normalizeSessionDateToUtcIso: normalizeSessionDateToUtcIso,
    projectErgSession: projectErgSession,
    projectErgSessions: projectErgSessions,
    ergSessionsBySport: ergSessionsBySport
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = ErgAnalyticsProjection; }
  else { global.ErgAnalyticsProjection = ErgAnalyticsProjection; }
})(typeof window !== 'undefined' ? window : this);
