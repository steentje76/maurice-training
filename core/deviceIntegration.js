/* ==========================================================================
 * TrainingKompas — DEVICE INTEGRATION CORE (Device-0 foundation)  device_canonical.v1
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE. Geen DOM, geen Supabase/fetch,
 * geen localStorage, geen AI, geen Date.now/Math.random, geen globale mutable state.
 * INPUT -> OUTPUT. Volgt het niet-onderhandelbare architectuurprincipe:
 *
 *   PROVIDER/DEVICE -> ADAPTER -> RAW DATA -> VALIDATION -> PROVENANCE
 *     -> CANONICAL MODEL -> CALCULATION ENGINE -> DECISION ENGINE -> COACHING
 *   NOOIT: DEVICE -> UI, en NOOIT: RAW -> AI -> DECISION.
 *
 * Dit is de GENERIEKE keten (Device-0). Provider-specifiek (Concept2 e.d.) leeft
 * uitsluitend als DATA-DRIVEN mapping-spec (zie CONCEPT2_MAP), niet als code-tak.
 *
 * Dit module is (nog) NIET in de runtime-UI of SW-precache gekoppeld: het raakt
 * CORE_SIG/CACHE niet. Bij toekomstige runtime-koppeling: opnemen in CORE_FILES
 * (sw-guard) + SW-precache + CORE_SIG/CACHE_STATIC bump.
 *
 * EENHEDEN zijn expliciet en worden ALTIJD eerst genormaliseerd naar canoniek:
 *   massa -> kg | afstand -> m | duur -> s | pace -> s/500m | rate -> spm/rpm/bpm | power -> W
 * Onbekende unit -> value blijft null + quality 'invalid' (NOOIT fabriceren).
 * ==========================================================================*/
(function (global) {
  'use strict';

  var VERSIONS = {
    canonical: 'device_canonical.v1',
    identity:  'device_identity.v1',
    normalize: 'device_normalize.v1',
    quality:   'device_quality.v1'
  };

  // ── UNIT NORMALIZATION ────────────────────────────────────────────────
  // fromUnit -> { to: canonicalUnit, f: factor }. Alleen deterministische,
  // dimensioneel-correcte conversies. Onbekende unit => geen entry => null.
  var UNIT_CONV = {
    // massa -> kg
    kg:{to:'kg',f:1}, g:{to:'kg',f:0.001}, dg:{to:'kg',f:0.0001},
    lb:{to:'kg',f:0.45359237}, lbs:{to:'kg',f:0.45359237}, pound:{to:'kg',f:0.45359237},
    // afstand -> m
    m:{to:'m',f:1}, dm:{to:'m',f:0.1}, cm:{to:'m',f:0.01}, km:{to:'m',f:1000},
    mi:{to:'m',f:1609.344}, mile:{to:'m',f:1609.344},
    // duur -> s   (ds = tienden/deciseconden; cs = honderdsten/centiseconden)
    s:{to:'s',f:1}, ds:{to:'s',f:0.1}, cs:{to:'s',f:0.01}, ms:{to:'s',f:0.001}, min:{to:'s',f:60},
    // pace -> s per basis (alleen tijd-resolutie-schaal; basis blijft in de key)
    sec_per_500m:{to:'sec_per_500m',f:1}, ds_per_500m:{to:'sec_per_500m',f:0.1},
    sec_per_1000m:{to:'sec_per_1000m',f:1}, ds_per_1000m:{to:'sec_per_1000m',f:0.1},
    // passthrough (rates / vermogen / energie / tellingen)
    spm:{to:'spm',f:1}, rpm:{to:'rpm',f:1}, bpm:{to:'bpm',f:1},
    w:{to:'w',f:1}, watt:{to:'w',f:1},
    kcal:{to:'kcal',f:1}, cal:{to:'kcal',f:0.001},
    count:{to:'count',f:1}, unitless:{to:'unitless',f:1}
  };

  function toNum(raw){
    if (raw === undefined || raw === null) return NaN;
    if (typeof raw === 'number') return raw;
    // NL-komma tolerant; verder geen magie
    return parseFloat(String(raw).trim().replace(',', '.'));
  }

  // mm:ss / h:mm:ss / los getal -> seconden (identiek aan CardioCore.parseTime-semantiek)
  function parseTimeToSec(raw){
    if (raw === undefined || raw === null || String(raw).trim() === '') return null;
    var p = String(raw).trim().split(':'), sec;
    if (p.length === 2) sec = parseFloat(p[0]) * 60 + parseFloat(p[1]);
    else if (p.length === 3) sec = parseFloat(p[0]) * 3600 + parseFloat(p[1]) * 60 + parseFloat(p[2]);
    else sec = parseFloat(String(raw).replace(',', '.'));
    return (sec === undefined || isNaN(sec)) ? null : sec;
  }

  // value + fromUnit -> { value, unit } canoniek, of null bij ontbrekende/onbekende unit.
  function convertUnit(value, fromUnit){
    if (value === undefined || value === null || fromUnit == null) return null;
    var c = UNIT_CONV[fromUnit];
    if (!c) return null;                 // onbekende unit -> null (geen aanname)
    var v = toNum(value);
    if (!isFinite(v)) return null;
    return { value: v * c.f, unit: c.to };
  }

  // ── QUALITY / MISSING DATA ────────────────────────────────────────────
  // NOOIT een waarde verzinnen. Ontbrekend -> 'empty'/value null.
  // opts: { type:'number'|'time', allowNegative, min, max }
  function classifyValue(raw, opts){
    opts = opts || {};
    if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '')) {
      return { status: 'empty', value: null, reason: null };
    }
    var v;
    if (opts.type === 'time') {
      v = parseTimeToSec(raw);
      if (v === null || !isFinite(v)) return { status: 'invalid', value: null, reason: 'onleesbare tijd' };
    } else {
      v = toNum(raw);
      if (!isFinite(v)) return { status: 'invalid', value: null, reason: 'niet-eindig' };
    }
    if (v < 0 && !opts.allowNegative) return { status: 'invalid', value: null, reason: 'negatief' };
    if (opts.min != null && v < opts.min) return { status: 'implausible', value: v, reason: 'onder ' + opts.min };
    if (opts.max != null && v > opts.max) return { status: 'implausible', value: v, reason: 'boven ' + opts.max };
    return { status: 'valid', value: v, reason: null };
  }

  // ── PROVENANCE ────────────────────────────────────────────────────────
  // Beantwoordt altijd: WAAR KOMT DEZE DATA VANDAAN? Ontbrekend veld -> null,
  // niet gefabriceerd. receivedAt wordt INGESPOTEN (pure functie, geen Date.now).
  function buildProvenance(p){
    p = p || {};
    function g(k){ return p[k] != null ? p[k] : null; }
    return {
      provider:   g('provider'),
      device:     g('device'),
      externalId: g('externalId'),
      metric:     g('metric'),
      unit:       g('unit'),
      method:     g('method'),      // 'api' | 'ble' | 'ant' | 'file' | 'manual'
      quality:    g('quality'),
      timestamp:  g('timestamp'),   // bron-eventtijd
      receivedAt: g('receivedAt'),  // ingestietijd (ingespoten)
      rawRef:     g('rawRef'),
      schema:     VERSIONS.canonical
    };
  }

  // ── IDENTITY / IDEMPOTENCY ────────────────────────────────────────────
  // Deterministische identiteit: zelfde payload twee keer -> één logisch record.
  function workoutIdentity(provider, externalWorkoutId){
    if (provider == null || provider === '' || externalWorkoutId == null || externalWorkoutId === '') return null;
    return String(provider).toLowerCase() + ':' + String(externalWorkoutId);
  }
  function metricIdentity(provider, externalWorkoutId, metricKey, idx){
    var w = workoutIdentity(provider, externalWorkoutId);
    if (!w || metricKey == null || metricKey === '') return null;
    return w + '#' + metricKey + (idx != null ? (':' + idx) : '');
  }
  // Dedup: eerste wint (deterministisch); records zonder key blijven behouden.
  function dedupe(records, keyFn){
    var seen = {}, out = [];
    for (var i = 0; i < records.length; i++){
      var k = keyFn(records[i], i);
      if (k == null) { out.push(records[i]); continue; }
      if (Object.prototype.hasOwnProperty.call(seen, k)) continue;
      seen[k] = true; out.push(records[i]);
    }
    return out;
  }

  // ── CANONICAL MODEL ───────────────────────────────────────────────────
  function createMetric(m){
    m = m || {};
    return {
      key:        m.key != null ? m.key : null,
      value:      m.value != null ? m.value : null,
      unit:       m.unit != null ? m.unit : null,
      quality:    m.quality != null ? m.quality : (m.value != null ? 'valid' : 'unavailable'),
      provenance: m.provenance != null ? m.provenance : null
    };
  }
  function createCanonicalWorkout(w){
    w = w || {};
    return {
      schema:     VERSIONS.canonical,
      source:     w.source != null ? w.source : null,
      provider:   w.provider != null ? w.provider : null,
      device:     w.device != null ? w.device : null,
      athlete:    w.athlete != null ? w.athlete : null,
      externalId: w.externalId != null ? w.externalId : null,
      identity:   workoutIdentity(w.provider, w.externalId),
      modality:   w.modality != null ? w.modality : null,
      startTime:  w.startTime != null ? w.startTime : null,
      endTime:    w.endTime != null ? w.endTime : null,
      syncStatus: w.syncStatus != null ? w.syncStatus : 'imported',
      metrics:    Array.isArray(w.metrics) ? w.metrics : [],
      splits:     Array.isArray(w.splits) ? w.splits : [],
      raw:        w.raw != null ? w.raw : null,
      provenance: w.provenance != null ? w.provenance : null
    };
  }

  // ── ADAPTER CONTRACT (concept, geen netwerk) ──────────────────────────
  // Valideert dat een adapter het Device-0 contract implementeert.
  var ADAPTER_METHODS = ['connect','disconnect','authenticate','capabilities',
                         'fetchWorkouts','fetchWorkout','normalize','getProvenance'];
  function isAdapter(obj){
    if (!obj || typeof obj !== 'object') return { ok: false, missing: ADAPTER_METHODS.slice() };
    var missing = ADAPTER_METHODS.filter(function (m){ return typeof obj[m] !== 'function'; });
    return { ok: missing.length === 0, missing: missing };
  }

  // ── NORMALIZE PIPELINE (data-driven, provider-onafhankelijk) ───────────
  function getPath(obj, path){
    if (obj == null || !path) return undefined;
    var parts = String(path).split('.'), cur = obj;
    for (var i = 0; i < parts.length; i++){
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  // fieldSpec: { key, path, unit?, type?('number'|'time'), min?, max?, allowNegative?, canonicalUnit? }
  function normalizeMetric(rawPayload, f, ctx){
    ctx = ctx || {};
    var raw = getPath(rawPayload, f.path);
    var cls = classifyValue(raw, { type: f.type, allowNegative: f.allowNegative });
    var value = null, unit = f.canonicalUnit || null, quality = cls.status, reason = cls.reason;

    if (cls.status === 'valid') {
      if (f.type === 'time') {
        value = cls.value; unit = unit || 's';
      } else if (f.unit) {
        var conv = convertUnit(cls.value, f.unit);
        if (conv) { value = conv.value; unit = conv.unit; }
        else { quality = 'invalid'; reason = 'onbekende unit ' + f.unit; }
      } else {
        value = cls.value;
      }
      // plausibiliteit op CANONIEKE waarde (min/max in canonieke units)
      if (quality === 'valid' && value != null) {
        if (f.min != null && value < f.min) { quality = 'implausible'; reason = 'onder ' + f.min; }
        else if (f.max != null && value > f.max) { quality = 'implausible'; reason = 'boven ' + f.max; }
      }
    }

    var prov = buildProvenance({
      provider: ctx.provider, device: ctx.device, externalId: ctx.externalId,
      metric: f.key, unit: unit, method: ctx.method, quality: quality,
      timestamp: ctx.timestamp, receivedAt: ctx.receivedAt, rawRef: ctx.rawRef
    });
    var metric = createMetric({ key: f.key, value: value, unit: unit, quality: quality, provenance: prov });
    if (reason) metric.reason = reason;
    return metric;
  }

  // spec: { provider, source?, method?, modality?, idPath?, timePath?, modalityPath?, modalityMap?, fields:[fieldSpec] }
  // ctx:  { externalId?, provider?, device?, athlete?, method?, receivedAt?, rawRef?, source?, endTime?, keepRaw? }
  function normalizeWorkout(rawPayload, spec, ctx){
    spec = spec || {}; ctx = ctx || {};
    var provider = ctx.provider || spec.provider || null;
    var extId = (ctx.externalId != null ? ctx.externalId
               : (spec.idPath ? getPath(rawPayload, spec.idPath) : null));
    var ts = (spec.timePath ? getPath(rawPayload, spec.timePath) : null);
    if (ts == null) ts = (ctx.timestamp != null ? ctx.timestamp : null);

    var modality = spec.modality || ctx.modality || null;
    if (spec.modalityPath) {
      var mraw = getPath(rawPayload, spec.modalityPath);
      if (mraw != null) modality = (spec.modalityMap && spec.modalityMap[mraw] != null) ? spec.modalityMap[mraw] : mraw;
    }

    var fullCtx = {
      provider: provider, device: ctx.device || spec.device || null, externalId: extId,
      method: ctx.method || spec.method || null, timestamp: ts,
      receivedAt: ctx.receivedAt != null ? ctx.receivedAt : null, rawRef: ctx.rawRef != null ? ctx.rawRef : null
    };

    var metrics = (spec.fields || []).map(function (f){ return normalizeMetric(rawPayload, f, fullCtx); });
    // idempotent: dubbele metric-identiteit (provider+extId+key) => één record
    metrics = dedupe(metrics, function (m){ return metricIdentity(provider, extId, m.key); });

    return createCanonicalWorkout({
      source: ctx.source || spec.source || 'device',
      provider: provider, device: fullCtx.device, athlete: ctx.athlete || null,
      externalId: extId, modality: modality,
      startTime: ts, endTime: ctx.endTime || null,
      syncStatus: 'imported', metrics: metrics,
      raw: ctx.keepRaw ? rawPayload : null,
      provenance: buildProvenance({
        provider: provider, device: fullCtx.device, externalId: extId,
        method: fullCtx.method, timestamp: ts, receivedAt: fullCtx.receivedAt, rawRef: fullCtx.rawRef
      })
    });
  }

  // Concept2 pace-afgeleide (geen bron-veld): s per 500m uit afstand(m)+duur(s).
  function derivePace500(distanceM, durationS){
    var d = toNum(distanceM), t = toNum(durationS);
    if (!isFinite(d) || !isFinite(t) || d <= 0 || t <= 0) return null;
    return (t / d) * 500;
  }
  // Concept2 vermogen-afgeleide (geen bron-veld in het result-object): de OFFICIËLE Concept2-formule
  // watts = 2.80 / pace³, met pace = seconden per meter (duur/afstand). Bevestigd via de Concept2-docs.
  // Ongeldige/niet-positieve invoer → null (nooit fabriceren).
  function deriveWatts(distanceM, durationS){
    var d = toNum(distanceM), t = toNum(durationS);
    if (!isFinite(d) || !isFinite(t) || d <= 0 || t <= 0) return null;
    var pacePerMeter = t / d;                 // s/m
    return 2.80 / (pacePerMeter * pacePerMeter * pacePerMeter);
  }

  // ── CONCEPT2 LOGBOOK API — DATA-DRIVEN MAPPING ────────────────────────
  // Bron: officiële Logbook API-docs (results-object). Alleen BEVESTIGDE velden.
  // API-units: distance=m(int) · time=TIENDEN seconde(int) · stroke_rate=spm ·
  // calories_total=kcal · drag_factor=int(unitless) · heart_rate.average=bpm ·
  // type ∈ {rower,skierg,bikeerg,dynamic}. Pace is NIET-bestaand veld -> afgeleid.
  var CONCEPT2_MAP = {
    provider: 'concept2', source: 'concept2_logbook', method: 'api',
    idPath: 'id', timePath: 'date_utc', modalityPath: 'type',
    modalityMap: { rower: 'row', skierg: 'ski', bikeerg: 'bike', dynamic: 'row' },
    fields: [
      { key: 'distance_m',      path: 'distance',           unit: 'm',        type: 'number', min: 0, max: 200000 },
      { key: 'duration_s',      path: 'time',               unit: 'ds',       type: 'number', min: 0, max: 86400 },
      { key: 'stroke_rate_spm', path: 'stroke_rate',        unit: 'spm',      type: 'number', min: 0, max: 80 },
      { key: 'stroke_count',    path: 'stroke_count',       unit: 'count',    type: 'number', min: 0 },
      { key: 'calories_kcal',   path: 'calories_total',     unit: 'kcal',     type: 'number', min: 0, max: 20000 },
      { key: 'drag_factor',     path: 'drag_factor',        unit: 'unitless', type: 'number', min: 0, max: 250 },
      { key: 'heart_rate_bpm',  path: 'heart_rate.average', unit: 'bpm',      type: 'number', min: 20, max: 240 }
    ]
  };

  // Concept2 STROKE-serie (GET /results/{id}/strokes): t=tienden s(cumulatief),
  // d=decimeter(cumulatief), p=pace tienden s/500m (row/ski), spm, hr=bpm.
  var CONCEPT2_STROKE_MAP = {
    provider: 'concept2', method: 'api',
    fields: [
      { key: 'time_s',          path: 't',   unit: 'ds',           type: 'number', min: 0 },
      { key: 'distance_m',      path: 'd',   unit: 'dm',           type: 'number', min: 0 },
      { key: 'pace_s_500m',     path: 'p',   unit: 'ds_per_500m',  type: 'number', min: 0, max: 600 },
      { key: 'stroke_rate_spm', path: 'spm', unit: 'spm',          type: 'number', min: 0, max: 80 },
      { key: 'heart_rate_bpm',  path: 'hr',  unit: 'bpm',          type: 'number', min: 20, max: 240 }
    ]
  };

  // Normaliseer een SERIE samples (strokes/splits) → array canonieke samples.
  // Elk sample: { index, metrics:{ key: {value,unit,quality} } }. Idempotent per (extId,key,index).
  function normalizeSeries(rawArray, spec, ctx){
    spec = spec || {}; ctx = ctx || {};
    if (!Array.isArray(rawArray)) return [];
    var provider = ctx.provider || spec.provider || null;
    var extId = ctx.externalId != null ? ctx.externalId : null;
    return rawArray.map(function (raw, i){
      var mObj = {};
      (spec.fields || []).forEach(function (f){
        var m = normalizeMetric(raw, f, {
          provider: provider, device: ctx.device || null, externalId: extId,
          method: ctx.method || spec.method || null, receivedAt: ctx.receivedAt != null ? ctx.receivedAt : null
        });
        // idempotency-sleutel per sample-index (informatief; sample-object dedupt op index-positie)
        m.identity = metricIdentity(provider, extId, f.key, i);
        mObj[f.key] = m;
      });
      return { index: i, metrics: mObj };
    });
  }

  // ── CONCEPT2 ADAPTER-SKELET (Device-1) ────────────────────────────────
  // Implementeert het Device-0 contract. PUUR: netwerk wordt via `transport`
  // INGESPOTEN (dependency injection) — GEEN calls, GEEN secrets in deze module.
  // transport (optioneel, door de app te leveren) mag bieden:
  //   listResults(params) · getResult(id) · getStrokes(id) · getAccessToken(code)
  // Zonder transport gooien netwerkmethoden een DUIDELIJKE fout (geen fake data).
  var CONCEPT2_CAPABILITIES = {
    provider: 'concept2',
    historyApi: 'CONFIRMED', oauth2: 'CONFIRMED',
    scopes: ['user:read', 'user:write', 'results:read', 'results:write'],
    splits: 'CONFIRMED', strokes: 'CONFIRMED', webhooks: 'CONFIRMED',
    liveViaApi: 'NOT_AVAILABLE', liveViaBLE: 'CONFIRMED', bleUuids: 'UNKNOWN',
    antPlus: 'CONFIRMED', deviceTypes: ['row', 'ski', 'bike'],
    unitsNote: 'API: distance=m, time=tienden s; canoniek → m / s'
  };
  function makeConcept2Adapter(transport){
    transport = transport || null;
    function need(name){
      if (!transport || typeof transport[name] !== 'function') {
        throw new Error('Concept2 transport vereist: ' + name + ' (injecteer een transport; geen netwerk in de core).');
      }
      return transport[name];
    }
    return {
      provider: 'concept2',
      connect: function () { return { ok: !!transport, requires: transport ? null : 'transport' }; },
      disconnect: function () { transport = null; return { ok: true }; },
      authenticate: function (code, ctx) { return need('getAccessToken')(code, ctx); },
      capabilities: function () { return CONCEPT2_CAPABILITIES; },
      fetchWorkouts: function (params) { return need('listResults')(params); },
      fetchWorkout: function (id) { return need('getResult')(id); },
      fetchStrokes: function (id) { return need('getStrokes')(id); },
      // PURE transform (geen netwerk): raw → canoniek
      normalize: function (raw, ctx) { return normalizeWorkout(raw, CONCEPT2_MAP, ctx || {}); },
      normalizeStrokes: function (strokes, ctx) { return normalizeSeries(strokes, CONCEPT2_STROKE_MAP, ctx || {}); },
      getProvenance: function (metricKey, ctx) {
        ctx = ctx || {};
        return buildProvenance({
          provider: 'concept2', method: 'api', metric: metricKey || null,
          externalId: ctx.externalId != null ? ctx.externalId : null,
          receivedAt: ctx.receivedAt != null ? ctx.receivedAt : null
        });
      }
    };
  }

  // ── CONCEPT2 IMPORT → BESTAANDE ROWING "ACTUAL" (sessions) ────────────────────────────
  // Mapt een genormaliseerde Concept2-workout naar EXACT het bestaande rowing-sessions-record
  // (finishSession-literal): { date, exercise_id, training_type, note, distance, time_str, watt,
  // stroke_rate, rpe }. GEEN nieuwe kolommen, GEEN schemawijziging. ACTUAL only — nooit prescription
  // (die leeft in training_exercises). Idempotent via een [c2:<resultId>]-tag in `note` (sessions
  // heeft geen provider/externalId-kolom). Watts: gemeten indien aanwezig, anders afgeleid — met
  // expliciete provenance (concept2_measured | concept2_derived); afgeleid nooit als gemeten tonen.
  var CONCEPT2_MODALITY_EXERCISE = { row: 'roeien', ski: 'skierg', bike: 'bikeerg' };
  function metricVal(workout, key){
    if (!workout || !Array.isArray(workout.metrics)) return null;
    for (var i = 0; i < workout.metrics.length; i++){ if (workout.metrics[i] && workout.metrics[i].key === key) return workout.metrics[i].value; }
    return null;
  }
  // seconden → "m:ss" of "m:ss.t" (tienden), NL-parsebaar door de app (parseTimeToSec).
  function formatDurationStr(sec){
    var s = toNum(sec); if (!isFinite(s) || s < 0) return null;
    var whole = Math.floor(s), tenths = Math.round((s - whole) * 10);
    if (tenths === 10){ whole += 1; tenths = 0; }
    var m = Math.floor(whole / 60), ss = whole % 60;
    var base = m + ':' + ('0' + ss).slice(-2);
    return tenths > 0 ? (base + '.' + tenths) : base;
  }
  // split = seconden per basis (500m row/ski · 1000m bike) → geformatteerd. Ongeldig → null.
  function splitFromDistTime(distanceM, durationS, basis){
    var d = toNum(distanceM), t = toNum(durationS), b = toNum(basis);
    if (!isFinite(d) || !isFinite(t) || !isFinite(b) || d <= 0 || t <= 0 || b <= 0) return null;
    return formatDurationStr((t / d) * b);
  }
  function _ymd(t){
    if (t == null) return null;
    var s = String(t); var m = s.match(/^(\d{4}-\d{2}-\d{2})/); if (m) return m[1];
    var n = Date.parse(s); if (!isFinite(n)) return null;
    var d = new Date(n); return d.getUTCFullYear() + '-' + ('0'+(d.getUTCMonth()+1)).slice(-2) + '-' + ('0'+d.getUTCDate()).slice(-2);
  }
  // Watts: kies GEMETEN (metric watts_w) indien aanwezig, anders afgeleid via de officiële formule.
  function resolveConcept2Watts(workout){
    var measured = metricVal(workout, 'watts_w');
    if (measured != null && isFinite(toNum(measured))) return { value: toNum(measured), source: 'concept2_measured' };
    var d = metricVal(workout, 'distance_m'), t = metricVal(workout, 'duration_s');
    var w = deriveWatts(d, t);
    return { value: w, source: w != null ? 'concept2_derived' : null };
  }
  function concept2ExternalTag(resultId){ return (resultId != null && resultId !== '') ? ('[c2:' + resultId + ']') : ''; }
  function _idsFromSessions(sessions){
    var set = {};
    (sessions || []).forEach(function (s){
      var note = s && s.note != null ? String(s.note) : '';
      var re = /\[c2:([^\]]+)\]/g, m;
      while ((m = re.exec(note))) { set[m[1]] = true; }
    });
    return set;
  }
  function concept2AlreadyImported(resultId, sessions){
    if (resultId == null || resultId === '') return false;
    return _idsFromSessions(sessions)[String(resultId)] === true;
  }
  // Eén Concept2-workout → { row (sessions-actual), provenance }. Nooit prescription-velden.
  function concept2ToRowingActual(workout, opts){
    opts = opts || {}; workout = workout || {};
    var modality = workout.modality || 'row';
    var exId = CONCEPT2_MODALITY_EXERCISE[modality] || 'roeien';
    var dist = metricVal(workout, 'distance_m');
    var dur  = metricVal(workout, 'duration_s');
    var spm  = metricVal(workout, 'stroke_rate_spm');
    var drag = metricVal(workout, 'drag_factor');
    var basis = (modality === 'bike') ? 1000 : 500;
    var split = (dist != null && dur != null) ? splitFromDistTime(dist, dur, basis) : null;
    var w = resolveConcept2Watts(workout);
    var tag = concept2ExternalTag(workout.externalId);
    var noteParts = [];
    if (split) noteParts.push('split:' + split + (basis === 1000 ? '/1000m' : '/500m'));
    if (drag != null) noteParts.push('drag ' + Math.round(drag));
    if (tag) noteParts.push(tag);
    var row = {
      date: _ymd(workout.startTime) || opts.date || null,
      exercise_id: exId,
      training_type: opts.training_type != null ? opts.training_type : null,
      note: noteParts.join(' · '),
      distance: dist != null ? Math.round(dist) : null,
      time_str: dur != null ? formatDurationStr(dur) : null,
      watt: w.value != null ? Math.round(w.value * 10) / 10 : null,
      stroke_rate: spm != null ? Math.round(spm) : null,
      rpe: null // ACTUAL-only; nooit een prescription/target overschrijven
    };
    if (opts.training_instance_id != null) row.training_instance_id = opts.training_instance_id;
    return {
      row: row,
      provenance: {
        provider: 'concept2', source: 'concept2_logbook',
        externalId: workout.externalId != null ? workout.externalId : null,
        identity: workout.identity != null ? workout.identity : null,
        modality: modality, watts_source: w.source
      }
    };
  }
  // Batch-import (idempotent): filtert dubbels tegen bestaande sessions ÉN binnen de batch.
  // → { toInsert:[sessions-row], skipped:[externalId], derivedWatts:[externalId] }
  function importConcept2Workouts(workouts, existingSessions, opts){
    var seen = _idsFromSessions(existingSessions);
    var toInsert = [], skipped = [], derivedWatts = [];
    (workouts || []).forEach(function (w){
      var id = (w && w.externalId != null) ? String(w.externalId) : null;
      if (id != null && seen[id] === true) { skipped.push(id); return; } // al geïmporteerd → overslaan
      if (id != null) seen[id] = true;                                    // binnen batch ook idempotent
      var mapped = concept2ToRowingActual(w, opts);
      if (mapped.provenance.watts_source === 'concept2_derived') derivedWatts.push(id);
      toInsert.push(mapped.row);
    });
    return { toInsert: toInsert, skipped: skipped, derivedWatts: derivedWatts };
  }

  // ── HEALTH / WEARABLE DAGMETRIEKEN → CANONIEK (Google Health API / Fitbit) ────
  // Fitbit-data komt via de Google Health API binnen (health.googleapis.com). Deze mapping
  // brengt de dag-rollups naar device_canonical.v1. HRV = RMSSD (Google Health-bron) en wordt
  // EXPLICIET zo getagd (sourceMetric), zodat het NOOIT met Apple SDNN samengevoegd wordt.
  // Units zijn al canoniek (ms/bpm/min) → geen conversie (HRV blijft ms, geen ms→s-val).
  var GOOGLE_HEALTH_MAP = {
    provider: 'google-health', source: 'fitbit_via_google_health', method: 'api',
    metrics: [
      { key: 'hrv_ms',          path: 'dailyHeartRateVariability.rmssdMillis', unit: 'ms',  sourceMetric: 'rmssd', min: 0, max: 400 },
      { key: 'resting_hr_bpm',  path: 'dailyRestingHeartRate.bpm',             unit: 'bpm', min: 20, max: 120 },
      { key: 'sleep_minutes',   path: 'sleep.totalMinutes',                    unit: 'min', min: 0, max: 1440 }
    ]
  };

  // Normaliseer één dag-payload → { schema, provider, date, metrics:[canonical metric], provenance }.
  // PUUR. Canonieke unit = bron-unit (geen conversie). Ontbrekend/ongeldig → value null (geen fabricatie).
  function normalizeHealthDaily(rawDay, spec, ctx){
    spec = spec || {}; ctx = ctx || {};
    var provider = ctx.provider || spec.provider || null;
    var metrics = (spec.metrics || []).map(function (m){
      var raw = getPath(rawDay, m.path);
      var cls = classifyValue(raw, {});
      var value = null, quality = cls.status;
      if (cls.status === 'valid') {
        value = cls.value;
        if (m.min != null && value < m.min) quality = 'implausible';
        else if (m.max != null && value > m.max) quality = 'implausible';
      }
      var prov = buildProvenance({
        provider: provider, device: ctx.device || null, externalId: (ctx.date != null ? ctx.date : null),
        metric: m.key, unit: m.unit, method: ctx.method || spec.method || 'api', quality: quality,
        timestamp: ctx.date != null ? ctx.date : null, receivedAt: ctx.receivedAt != null ? ctx.receivedAt : null
      });
      var met = createMetric({ key: m.key, value: value, unit: m.unit, quality: quality, provenance: prov });
      if (m.sourceMetric) met.sourceMetric = m.sourceMetric; // bv. 'rmssd' — HRV-bron behouden
      return met;
    });
    return {
      schema: VERSIONS.canonical, provider: provider, source: ctx.source || spec.source || null,
      date: ctx.date != null ? ctx.date : null, metrics: metrics,
      provenance: buildProvenance({ provider: provider, method: ctx.method || spec.method || 'api', timestamp: ctx.date != null ? ctx.date : null, receivedAt: ctx.receivedAt != null ? ctx.receivedAt : null })
    };
  }

  // ── GENERIEKE CONNECTIE-/SYNC-STATUS (Fitbit én Concept2) ─────────────────────────────
  // Eén canonieke afleiding van device-connectiestatus voor de UI. PUUR: `now` wordt ingespoten
  // (geen Date.now). Nooit een fake "synced": de status volgt strikt uit de ingespoten feiten.
  // input: { connected, connectedAt, lastSyncAt, lastSyncStatus('ok'|'error'|'running'|null),
  //          tokenExpired, syncing }
  // opts:  { now (ms|ISO), staleAfterMs (default 26u) }
  // → { status, connected, connectedAt, lastSyncAt, lastSyncStatus, isStale, staleAfterMs, ageMs }
  //   status ∈ not_connected | token_expired | syncing | sync_failed | stale | connected
  var DEVICE_STATUSES = ['not_connected','token_expired','syncing','sync_failed','stale','connected'];
  function _toMs(t){
    if (t == null) return null;
    if (typeof t === 'number') return isFinite(t) ? t : null;
    var n = Date.parse(String(t));
    return isFinite(n) ? n : null;
  }
  function deviceConnectionState(input, opts){
    input = input || {}; opts = opts || {};
    var nowMs = _toMs(opts.now);
    var staleAfterMs = (typeof opts.staleAfterMs === 'number' && opts.staleAfterMs > 0) ? opts.staleAfterMs : (26 * 3600 * 1000);
    var lastSyncMs = _toMs(input.lastSyncAt);
    var ageMs = (nowMs != null && lastSyncMs != null) ? Math.max(0, nowMs - lastSyncMs) : null;
    var isStale = (ageMs != null) ? (ageMs > staleAfterMs) : false;
    var status;
    if (input.connected !== true)            status = 'not_connected';
    else if (input.tokenExpired === true)    status = 'token_expired';
    else if (input.syncing === true || input.lastSyncStatus === 'running') status = 'syncing';
    else if (input.lastSyncStatus === 'error') status = 'sync_failed';
    else if (isStale)                        status = 'stale';
    else                                     status = 'connected';
    return {
      status: status,
      connected: input.connected === true,
      connectedAt: input.connectedAt != null ? input.connectedAt : null,
      lastSyncAt: input.lastSyncAt != null ? input.lastSyncAt : null,
      lastSyncStatus: input.lastSyncStatus != null ? input.lastSyncStatus : null,
      isStale: isStale, staleAfterMs: staleAfterMs, ageMs: ageMs
    };
  }

  // ── FITBIT (via Google Health API) — METRIC-STATUS MANIFEST (documentatie-als-data) ───
  // Eerlijke status per metric, zodat de UI nooit een niet-ondersteunde meting fabriceert.
  //   SUPPORTED    = nu gemapt in GOOGLE_HEALTH_MAP en getest.
  //   OPTIONAL     = door de bron leverbaar maar (nog) niet gemapt/gevalideerd → NIET tonen tot gemapt.
  //   EXTERNAL     = vereist extra scope/toestemming of aparte bron (bv. weegschaal, SpO2-band).
  //   NOT_AVAILABLE= niet via de huidige dag-rollup-route beschikbaar (bv. intraday HR-stream).
  var FITBIT_METRIC_STATUS = {
    hrv_ms:          { status: 'SUPPORTED',     unit: 'ms',    note: 'RMSSD (Google Health) — expliciet als rmssd getagd' },
    resting_hr_bpm:  { status: 'SUPPORTED',     unit: 'bpm',   note: 'dailyRestingHeartRate.bpm' },
    sleep_minutes:   { status: 'SUPPORTED',     unit: 'min',   note: 'sleep.totalMinutes' },
    steps:           { status: 'OPTIONAL',      unit: 'count', note: 'dagstappen — bron levert dit; nog niet gemapt/gevalideerd' },
    calories:        { status: 'OPTIONAL',      unit: 'kcal',  note: 'dagcalorieën — nog niet gemapt/gevalideerd' },
    spo2:            { status: 'OPTIONAL',      unit: 'pct',   note: 'SpO2 — apparaat-afhankelijk; nog niet gemapt' },
    weight_kg:       { status: 'EXTERNAL',      unit: 'kg',    note: 'vereist body/weegschaal-scope of aparte bron' },
    heart_rate_bpm:  { status: 'NOT_AVAILABLE', unit: 'bpm',   note: 'intraday HR-stream niet via dag-rollup' }
  };

  var DeviceCore = {
    VERSIONS: VERSIONS,
    UNIT_CONV: UNIT_CONV,
    GOOGLE_HEALTH_MAP: GOOGLE_HEALTH_MAP,
    FITBIT_METRIC_STATUS: FITBIT_METRIC_STATUS,
    DEVICE_STATUSES: DEVICE_STATUSES,
    deviceConnectionState: deviceConnectionState,
    deriveWatts: deriveWatts,
    // Concept2 import → rowing actual
    CONCEPT2_MODALITY_EXERCISE: CONCEPT2_MODALITY_EXERCISE,
    metricVal: metricVal, formatDurationStr: formatDurationStr, splitFromDistTime: splitFromDistTime,
    resolveConcept2Watts: resolveConcept2Watts, concept2ExternalTag: concept2ExternalTag,
    concept2AlreadyImported: concept2AlreadyImported, concept2ToRowingActual: concept2ToRowingActual,
    importConcept2Workouts: importConcept2Workouts,
    normalizeHealthDaily: normalizeHealthDaily,
    ADAPTER_METHODS: ADAPTER_METHODS,
    CONCEPT2_MAP: CONCEPT2_MAP,
    CONCEPT2_STROKE_MAP: CONCEPT2_STROKE_MAP,
    CONCEPT2_CAPABILITIES: CONCEPT2_CAPABILITIES,
    normalizeSeries: normalizeSeries,
    makeConcept2Adapter: makeConcept2Adapter,
    // units / quality
    convertUnit: convertUnit, parseTimeToSec: parseTimeToSec, classifyValue: classifyValue,
    // provenance / identity / idempotency
    buildProvenance: buildProvenance, workoutIdentity: workoutIdentity,
    metricIdentity: metricIdentity, dedupe: dedupe,
    // canonical
    createMetric: createMetric, createCanonicalWorkout: createCanonicalWorkout,
    // adapter contract
    isAdapter: isAdapter,
    // normalize pipeline
    getPath: getPath, normalizeMetric: normalizeMetric, normalizeWorkout: normalizeWorkout,
    derivePace500: derivePace500
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = DeviceCore; }
  else { global.DeviceCore = DeviceCore; }
})(typeof self !== 'undefined' ? self : this);
