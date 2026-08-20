/* ==========================================================================
 * TrainingKompas — SPORT DEFINITION CORE  (Unified Sport & Data Architecture, fundering)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE. Geen DOM, geen Supabase/fetch,
 * geen browser-opslag, geen AI, geen globale mutable state. INPUT -> OUTPUT.
 *
 * DOEL: de STRUCTURELE (queryable) tegenhanger van de bestaande SPORT_LABELS/
 * SPORT_BLOCKS in index.html. SPORT_BLOCKS blijft de vrije-tekst AI-coaching-
 * identiteit per sport (ongewijzigd, blijft in index.html) — dit bestand voegt
 * daar GEEN duplicaat prose aan toe, maar levert de gestructureerde velden
 * (disciplines/metrics/equipment) die Calculation/Decision Engine en een
 * toekomstige Sport Club-laag nodig hebben en die vrije tekst niet kan bieden.
 *
 * HARDE REGEL: geen enkele metric/equipment-vermelding hier is verzonnen — elke
 * waarde is 1-op-1 afgeleid uit de reeds bestaande SPORT_BLOCKS-tekst in
 * index.html, of (voor Volleyball/Football, nog niet in de app) letterlijk uit
 * TRAININGSKOMPAS_MASTER_ROADMAP.md §7. Onbekende/onzekere velden zijn leeg
 * gelaten in plaats van geraden.
 *
 * De sport-ID's zijn EXACT gelijk aan de bestaande SPORT_LABELS-sleutels in
 * index.html, zodat dit bestand vanaf dag 1 backward-compatible is met
 * atleet_profiel.sport / activeSport zonder dat index.html hoeft te wijzigen.
 * ==========================================================================*/
(function (global) {
  'use strict';

  var VERSIONS = { registry: 'sport_definition.v1' };

  // Sporten die al in index.html (SPORT_LABELS) bestaan — metrics/equipment hieronder
  // zijn afgeleid uit de bestaande SPORT_BLOCKS-tekst voor diezelfde sport-ID.
  var SPORT_DEFINITIONS = {
    kracht: {
      id: 'kracht', label: 'Krachttraining', existingInApp: true,
      disciplines: ['kracht'], trainingTypes: ['strength'],
      metrics: ['load_kg', 'reps', 'sets', 'rpe'], equipment: [],
      scoringModel: null, competitionModel: null
    },
    powerlifting: {
      id: 'powerlifting', label: 'Powerlifting', existingInApp: true,
      disciplines: ['squat', 'bench_press', 'deadlift'], trainingTypes: ['strength'],
      metrics: ['load_kg', 'reps', 'sets', 'rpe', 'one_rm'], equipment: ['barbell', 'hexbar'],
      scoringModel: 'total_kg', competitionModel: 'three_lift_meet'
    },
    crossfit: {
      id: 'crossfit', label: 'CrossFit/Functioneel', existingInApp: true,
      disciplines: ['strength', 'gymnastics', 'conditioning', 'weightlifting'],
      trainingTypes: ['amrap', 'emom', 'for_time', 'chipper'],
      metrics: ['time', 'rounds', 'reps', 'load_kg', 'rpe'], equipment: [],
      scoringModel: 'rx_or_scaled', competitionModel: 'wod_benchmark'
    },
    hyrox: {
      id: 'hyrox', label: 'HYROX', existingInApp: true,
      disciplines: ['running', 'functional_stations'], trainingTypes: ['race_simulation', 'interval'],
      metrics: ['running_distance', 'running_pace', 'station_duration', 'load_kg', 'heart_rate', 'rpe', 'transitions'],
      equipment: ['skierg', 'sled', 'rower', 'sandbag', 'wall_ball'],
      scoringModel: 'total_time', competitionModel: 'fixed_8x1km_plus_8_stations'
    },
    bodybuilding: {
      id: 'bodybuilding', label: 'Bodybuilding', existingInApp: true,
      disciplines: ['hypertrophy'], trainingTypes: ['volume_training'],
      metrics: ['load_kg', 'reps', 'sets', 'volume_per_muscle_group'], equipment: [],
      scoringModel: null, competitionModel: 'physique_judging'
    },
    kettlebell: { id: 'kettlebell', label: 'Kettlebell', existingInApp: true, disciplines: [], trainingTypes: [], metrics: [], equipment: ['kettlebell'], scoringModel: null, competitionModel: null },
    swimming: {
      id: 'swimming', label: 'Zwemmen', existingInApp: true,
      disciplines: ['pool', 'open_water'], trainingTypes: ['technique', 'interval'],
      metrics: ['css', 'swolf', 'distance', 'pace'], equipment: [],
      scoringModel: 'time', competitionModel: null
    },
    atletiek: { id: 'atletiek', label: 'Atletiek', existingInApp: true, disciplines: [], trainingTypes: [], metrics: [], equipment: [], scoringModel: null, competitionModel: null },
    triathlon: {
      id: 'triathlon', label: 'Triathlon', existingInApp: true,
      disciplines: ['swimming', 'cycling', 'running'], trainingTypes: ['brick', 'taper'],
      metrics: ['distance', 'pace', 'power', 'heart_rate'], equipment: [],
      scoringModel: 'total_time', competitionModel: 't1_t2_transitions'
    },
    hardlopen: {
      id: 'hardlopen', label: 'Hardlopen', existingInApp: true,
      disciplines: ['running'], trainingTypes: ['interval', 'tempo', 'long_run', 'taper'],
      metrics: ['distance', 'pace', 'heart_rate', 'cadence', 'elevation', 'running_power'], equipment: [],
      scoringModel: 'time', competitionModel: null
    },
    stairmaster: { id: 'stairmaster', label: 'Stairmaster', existingInApp: true, disciplines: [], trainingTypes: [], metrics: ['duration', 'heart_rate'], equipment: ['stairmaster'], scoringModel: null, competitionModel: null },
    wielrennen: {
      id: 'wielrennen', label: 'Wielrennen', existingInApp: true,
      disciplines: ['road', 'gravel', 'mountainbike', 'indoor'], trainingTypes: ['interval', 'endurance'],
      metrics: ['power', 'ftp', 'heart_rate', 'cadence', 'distance'], equipment: [],
      scoringModel: null, competitionModel: null
    },
    roeien: {
      id: 'roeien', label: 'Roeien', existingInApp: true,
      disciplines: ['water', 'ergometer'], trainingTypes: ['interval', 'endurance'],
      metrics: ['split', 'power', 'distance', 'strokes'], equipment: ['concept2'],
      scoringModel: 'time_2k_5k', competitionModel: null
    },
    calisthenics: {
      id: 'calisthenics', label: 'Calisthenics', existingInApp: true,
      disciplines: ['skills'], trainingTypes: ['progression_regression'],
      metrics: ['reps', 'sets', 'hold_duration'], equipment: [],
      scoringModel: null, competitionModel: null
    },
    strongman: {
      id: 'strongman', label: 'Strongman', existingInApp: true,
      disciplines: ['max_strength', 'events'], trainingTypes: ['event_training', 'competition_simulation'],
      metrics: ['load_kg', 'time', 'distance'], equipment: ['yoke', 'atlas_stones', 'log'],
      scoringModel: 'event_points', competitionModel: null
    },
    weightlifting: {
      id: 'weightlifting', label: 'Olympic Weightlifting', existingInApp: true,
      disciplines: ['snatch', 'clean_and_jerk'], trainingTypes: ['technique', 'strength'],
      metrics: ['load_kg', 'percentage_of_1rm', 'reps'], equipment: ['barbell'],
      scoringModel: 'total_kg', competitionModel: 'two_lift_meet'
    },
    algemeen: { id: 'algemeen', label: 'Algemene Fitness', existingInApp: true, disciplines: [], trainingTypes: [], metrics: ['load_kg', 'reps', 'sets'], equipment: [], scoringModel: null, competitionModel: null },
    functioneel: {
      id: 'functioneel', label: 'Functionele Fitness', existingInApp: true,
      disciplines: ['squat', 'hinge', 'push', 'pull', 'carry', 'lunge', 'rotation'], trainingTypes: [],
      metrics: ['load_kg', 'reps', 'sets'], equipment: [],
      scoringModel: null, competitionModel: null
    },

    // Sporten uit de master roadmap (§7), NOG NIET in index.html/SPORT_LABELS.
    // Metrics hieronder zijn LETTERLIJK overgenomen uit TRAININGSKOMPAS_MASTER_ROADMAP.md
    // §7 — niets toegevoegd of verzonnen. Wiring in index.html is een aparte integratiestap.
    volleyball: {
      id: 'volleyball', label: 'Volleyball', existingInApp: false,
      disciplines: [], trainingTypes: [],
      metrics: ['training_duration', 'jumps', 'jump_load', 'accelerations', 'decelerations', 'heart_rate', 'rpe', 'match_minutes'],
      equipment: [], scoringModel: null, competitionModel: null
    },
    football: {
      id: 'football', label: 'Football', existingInApp: false,
      disciplines: [], trainingTypes: [], metrics: [], equipment: [], scoringModel: null, competitionModel: null
    },
    cycling: {
      // Alias-ID zoals genoemd in de master roadmap (Engelstalig) — verwijst naar
      // dezelfde sport als het bestaande 'wielrennen'. Los vermeld i.p.v. stiekem
      // samengevoegd, zodat een toekomstige sessie zelf bepaalt of dit dezelfde
      // entiteit moet worden of een aparte (bv. indoor vs. buiten-onderscheid).
      id: 'cycling', label: 'Cycling (roadmap-alias van wielrennen)', existingInApp: false,
      aliasOf: 'wielrennen', disciplines: [], trainingTypes: [], metrics: [], equipment: [],
      scoringModel: null, competitionModel: null
    },
    running: {
      id: 'running', label: 'Running (roadmap-alias van hardlopen)', existingInApp: false,
      aliasOf: 'hardlopen', disciplines: [], trainingTypes: [], metrics: [], equipment: [],
      scoringModel: null, competitionModel: null
    }
  };

  function getSportDefinition(id) {
    if (!id) return null;
    return Object.prototype.hasOwnProperty.call(SPORT_DEFINITIONS, id) ? SPORT_DEFINITIONS[id] : null;
  }

  function listSportIds() {
    return Object.keys(SPORT_DEFINITIONS);
  }

  function listMetricsForSport(id) {
    var def = getSportDefinition(id);
    return def ? def.metrics.slice() : [];
  }

  function isMetricValidForSport(id, metric) {
    return listMetricsForSport(id).indexOf(metric) !== -1;
  }

  function isKnownSport(id) {
    return getSportDefinition(id) !== null;
  }

  // resolveCanonicalSportId: volgt aliasOf-ketens (bv. 'cycling' -> 'wielrennen')
  // tot een sport zonder alias. Voorkomt dubbele/losse data bij toekomstig gebruik.
  function resolveCanonicalSportId(id) {
    var def = getSportDefinition(id);
    var seen = {};
    while (def && def.aliasOf && !seen[def.id]) {
      seen[def.id] = true;
      def = getSportDefinition(def.aliasOf);
    }
    return def ? def.id : null;
  }

  var SportDefinitionCore = {
    SPORT_DEFINITIONS: SPORT_DEFINITIONS,
    getSportDefinition: getSportDefinition,
    listSportIds: listSportIds,
    listMetricsForSport: listMetricsForSport,
    isMetricValidForSport: isMetricValidForSport,
    isKnownSport: isKnownSport,
    resolveCanonicalSportId: resolveCanonicalSportId,
    VERSIONS: VERSIONS
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = SportDefinitionCore; }
  if (global) { global.SportDefinitionCore = SportDefinitionCore; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
