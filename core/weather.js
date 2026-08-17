/* ==========================================================================
 * TrainingKompas — WEATHER CONTEXT CORE (Phase C)  weather_canonical.v1
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE. Geen DOM, geen fetch, geen key,
 * geen provider-call, geen AI, geen Date.now/Math.random. INPUT -> OUTPUT.
 *
 * Keten: LOCATION → PROVIDER-ADAPTER → RAW → NORMALIZED → TRAINING CONTEXT
 *        → CALCULATION → DECISION → COACHING.  NOOIT WEATHER→UI of RAW→AI→DECISION.
 *
 * Dit module levert ALLEEN de pure normalisatie + canoniek model + indoor/outdoor
 * hard rule + adaptercontract. De echte provider-fetch is BEWUST niet hier (geen
 * key/secret in de core). Nog NIET in runtime/SW-precache gekoppeld → raakt CORE_SIG niet.
 *
 * Canonieke units: temperatuur °C · wind m/s · neerslag mm/h · vocht % · UV unitless.
 * Onbekende unit → value null + quality 'invalid' (NOOIT fabriceren).
 * ==========================================================================*/
(function (global) {
  'use strict';

  var DC = (typeof require !== 'undefined')
    ? require('./deviceIntegration.js')
    : (global && global.DeviceCore);

  var VERSIONS = { canonical: 'weather_canonical.v1', normalize: 'weather_normalize.v1' };

  // Weersensitieve modaliteiten (alleen buiten relevant).
  var WEATHER_SENSITIVE = { run: true, running: true, cycle: true, cycling: true, bike_outdoor: true, walk: true, walking: true, hike: true, hiking: true };

  // ── UNIT NORMALIZATION (weer-specifiek) ───────────────────────────────
  function toNum(raw){
    if (raw === undefined || raw === null) return NaN;
    if (typeof raw === 'number') return raw;
    return parseFloat(String(raw).trim().replace(',', '.'));
  }
  // temperatuur → °C (offset-conversies; DeviceCore.convertUnit is factor-only).
  function toCelsius(value, unit){
    var v = toNum(value); if (!isFinite(v)) return null;
    switch (String(unit || 'c').toLowerCase()){
      case 'c': case 'celsius': case '°c': return v;
      case 'k': case 'kelvin': return v - 273.15;
      case 'f': case 'fahrenheit': case '°f': return (v - 32) * 5 / 9;
      default: return null; // onbekende unit → null (geen aanname)
    }
  }
  // wind → m/s.
  function toMs(value, unit){
    var v = toNum(value); if (!isFinite(v)) return null;
    switch (String(unit || 'ms').toLowerCase()){
      case 'ms': case 'm/s': case 'mps': return v;
      case 'kmh': case 'km/h': case 'kph': return v / 3.6;
      case 'mph': return v * 0.44704;
      case 'kn': case 'knot': case 'knots': return v * 0.514444;
      default: return null;
    }
  }
  // neerslag → mm/h.
  function toMmh(value, unit){
    var v = toNum(value); if (!isFinite(v)) return null;
    switch (String(unit || 'mmh').toLowerCase()){
      case 'mmh': case 'mm/h': case 'mm': return v; // mm over 1u ≈ mm/h (bronresolutie)
      case 'inh': case 'in/h': case 'inch': return v * 25.4;
      default: return null;
    }
  }

  // ── QUALITY (hergebruik DeviceCore.classifyValue + plausibiliteitsgrenzen) ──
  function classify(raw, opts){
    return DC.classifyValue(raw, opts || {});
  }

  // ── CANONICAL MODEL ───────────────────────────────────────────────────
  function createWeather(w){
    w = w || {};
    function g(k){ return w[k] != null ? w[k] : null; }
    return {
      schema: VERSIONS.canonical,
      temperature_c: g('temperature_c'),
      feels_like_c: g('feels_like_c'),
      humidity_pct: g('humidity_pct'),
      pressure_hpa: g('pressure_hpa'),
      wind_ms: g('wind_ms'),
      wind_gust_ms: g('wind_gust_ms'),
      precip_mmh: g('precip_mmh'),
      condition: g('condition'),
      uv_index: g('uv_index'),
      timestamp: g('timestamp'),
      location_resolution: g('location_resolution'),
      observed_or_forecast: g('observed_or_forecast'),
      quality: w.quality || {},
      provenance: w.provenance != null ? w.provenance : null
    };
  }

  // ── NORMALIZE (data-driven, provider-onafhankelijk) ───────────────────
  // spec.fields: [{ key, path, kind:'temp'|'wind'|'precip'|'passthrough'|'text', unit?, min?, max? }]
  function normalizeField(rawPayload, f){
    var raw = DC.getPath(rawPayload, f.path);
    if (f.kind === 'text'){
      if (raw === undefined || raw === null || raw === '') return { value: null, quality: 'empty' };
      return { value: String(raw), quality: 'valid' };
    }
    var cls = classify(raw, {});
    if (cls.status !== 'valid') return { value: null, quality: cls.status };
    var val = null;
    if (f.kind === 'temp') val = toCelsius(cls.value, f.unit);
    else if (f.kind === 'wind') val = toMs(cls.value, f.unit);
    else if (f.kind === 'precip') val = toMmh(cls.value, f.unit);
    else val = cls.value; // passthrough (humidity %, uv)
    if (val === null) return { value: null, quality: 'invalid' }; // onbekende unit
    // plausibiliteit op canonieke waarde
    if (f.min != null && val < f.min) return { value: val, quality: 'implausible' };
    if (f.max != null && val > f.max) return { value: val, quality: 'implausible' };
    return { value: val, quality: 'valid' };
  }

  function normalizeWeather(rawPayload, spec, ctx){
    spec = spec || {}; ctx = ctx || {};
    var out = {}, quality = {};
    (spec.fields || []).forEach(function (f){
      var r = normalizeField(rawPayload, f);
      out[f.key] = r.value;
      quality[f.key] = r.quality;
    });
    var ts = (spec.timePath ? DC.getPath(rawPayload, spec.timePath) : null);
    if (ts == null) ts = (ctx.timestamp != null ? ctx.timestamp : null);
    var prov = DC.buildProvenance({
      provider: ctx.provider || spec.provider || null, method: ctx.method || 'api',
      metric: 'weather', unit: 'canonical', timestamp: ts,
      receivedAt: ctx.receivedAt != null ? ctx.receivedAt : null, rawRef: ctx.rawRef != null ? ctx.rawRef : null
    });
    return createWeather({
      temperature_c: out.temperature_c, feels_like_c: out.feels_like_c, humidity_pct: out.humidity_pct,
      pressure_hpa: out.pressure_hpa,
      wind_ms: out.wind_ms, wind_gust_ms: out.wind_gust_ms, precip_mmh: out.precip_mmh,
      condition: out.condition, uv_index: out.uv_index,
      timestamp: ts, location_resolution: ctx.location_resolution || null,
      observed_or_forecast: ctx.observed_or_forecast || spec.observed_or_forecast || null,
      quality: quality, provenance: prov
    });
  }

  // ── INDOOR/OUTDOOR HARD RULE ──────────────────────────────────────────
  // Weer mag ALLEEN automatisch invloed hebben als outdoor===true EN de modaliteit
  // weergevoelig is. Nooit gokken of een training buiten is: ontbrekend/false → geen invloed.
  function weatherApplies(ctx){
    ctx = ctx || {};
    if (ctx.outdoor !== true) return false;                 // expliciet buiten vereist
    var mod = ctx.modality != null ? String(ctx.modality).toLowerCase() : null;
    if (!mod) return false;
    return WEATHER_SENSITIVE[mod] === true;
  }

  // ── ADAPTER CONTRACT ──────────────────────────────────────────────────
  // WeatherProviderAdapter: fetch()/normalize()/provenance()/quality(). Netwerk (fetch)
  // wordt door de app INGESPOTEN; deze core levert normalize/provenance/quality puur.
  var WEATHER_ADAPTER_METHODS = ['fetch', 'normalize', 'provenance', 'quality'];
  function isWeatherAdapter(obj){
    if (!obj || typeof obj !== 'object') return { ok: false, missing: WEATHER_ADAPTER_METHODS.slice() };
    var missing = WEATHER_ADAPTER_METHODS.filter(function (m){ return typeof obj[m] !== 'function'; });
    return { ok: missing.length === 0, missing: missing };
  }

  // ── PROVIDER-MAPPINGS (data-driven; veldnamen uit officiële docs) ──────
  // Open-Meteo current: temperature_2m(°C), apparent_temperature(°C), relative_humidity_2m(%),
  //   wind_speed_10m(DEFAULT km/h), wind_gusts_10m, precipitation(mm), uv_index, weather_code.
  var OPENMETEO_MAP = {
    provider: 'open-meteo', method: 'api', timePath: 'current.time',
    fields: [
      { key: 'temperature_c', path: 'current.temperature_2m',      kind: 'temp',  unit: 'c', min: -60, max: 60 },
      { key: 'feels_like_c',  path: 'current.apparent_temperature', kind: 'temp',  unit: 'c', min: -70, max: 70 },
      { key: 'humidity_pct',  path: 'current.relative_humidity_2m', kind: 'passthrough', min: 0, max: 100 },
      { key: 'pressure_hpa',  path: 'current.surface_pressure',     kind: 'passthrough', min: 850, max: 1100 },
      { key: 'wind_ms',       path: 'current.wind_speed_10m',       kind: 'wind',  unit: 'kmh', min: 0, max: 120 },
      { key: 'wind_gust_ms',  path: 'current.wind_gusts_10m',       kind: 'wind',  unit: 'kmh', min: 0, max: 150 },
      { key: 'precip_mmh',    path: 'current.precipitation',        kind: 'precip', unit: 'mmh', min: 0, max: 200 },
      { key: 'uv_index',      path: 'current.uv_index',             kind: 'passthrough', min: 0, max: 15 },
      { key: 'condition',     path: 'current.weather_code',         kind: 'text' }
    ]
  };
  // OpenWeather One Call 3.0 current (units=metric): temp(°C), feels_like(°C), humidity(%),
  //   wind_speed(m/s), wind_gust(m/s), uvi, rain.1h(mm/h), weather[0].main.
  var OPENWEATHER_MAP = {
    provider: 'openweather', method: 'api', timePath: 'current.dt',
    fields: [
      { key: 'temperature_c', path: 'current.temp',       kind: 'temp',  unit: 'c', min: -60, max: 60 },
      { key: 'feels_like_c',  path: 'current.feels_like',  kind: 'temp',  unit: 'c', min: -70, max: 70 },
      { key: 'humidity_pct',  path: 'current.humidity',    kind: 'passthrough', min: 0, max: 100 },
      { key: 'pressure_hpa',  path: 'current.pressure',    kind: 'passthrough', min: 850, max: 1100 },
      { key: 'wind_ms',       path: 'current.wind_speed',  kind: 'wind',  unit: 'ms', min: 0, max: 120 },
      { key: 'wind_gust_ms',  path: 'current.wind_gust',   kind: 'wind',  unit: 'ms', min: 0, max: 150 },
      { key: 'precip_mmh',    path: 'current.rain.1h',     kind: 'precip', unit: 'mmh', min: 0, max: 200 },
      { key: 'uv_index',      path: 'current.uvi',         kind: 'passthrough', min: 0, max: 15 },
      { key: 'condition',     path: 'current.weather.0.main', kind: 'text' }
    ]
  };

  // ── OPEN-METEO REQUEST-LAAG (puur; geen fetch, geen key hardcoded) ────────
  // Bouwt de forecast-request-URL die de app (na locatie-consent + eventueel betaald
  // commercieel plan) kan fetchen. Velden komen 1-op-1 uit OPENMETEO_MAP zodat request en
  // normalisatie consistent zijn. Privacy: lat/lng worden standaard afgerond naar ~2 decimalen
  // (grofste bruikbare resolutie). Ongeldige coördinaten → null (geen fabricatie).
  // Bron: officiële docs (open-meteo.com/en/docs): api.open-meteo.com/v1/forecast; wind default km/h
  // (OPENMETEO_MAP converteert km/h→m/s); commercieel = customer-host + apikey (nooit hardcoden).
  function buildOpenMeteoRequest(lat, lng, opts){
    opts = opts || {};
    var la = Number(lat), lo = Number(lng);
    if (!isFinite(la) || !isFinite(lo) || la < -90 || la > 90 || lo < -180 || lo > 180) return null;
    var prec = (opts.precisionDecimals != null) ? opts.precisionDecimals : 2; // dataminimalisatie
    var f = Math.pow(10, prec);
    la = Math.round(la * f) / f; lo = Math.round(lo * f) / f;
    // 'current'-velden gekoppeld aan de OPENMETEO_MAP-paden (current.<veld>), zodat het antwoord
    // exact door normalizeWeather(…, OPENMETEO_MAP) genormaliseerd kan worden.
    var current = opts.current || OPENMETEO_MAP.fields
      .map(function (fd){ return String(fd.path).replace(/^current\./, ''); })
      .filter(function (n){ return n.indexOf('.') === -1; });
    var params = {
      latitude: la, longitude: lo,
      current: current.join(','),
      timezone: opts.timezone || 'auto',
      wind_speed_unit: opts.windSpeedUnit || 'kmh',   // OPENMETEO_MAP verwacht km/h → m/s-conversie
      precipitation_unit: opts.precipitationUnit || 'mm'
    };
    var commercial = !!(opts.commercial && opts.apiKey);
    var host = commercial ? 'https://customer-api.open-meteo.com/v1/forecast'
                          : 'https://api.open-meteo.com/v1/forecast';
    if (commercial) params.apikey = opts.apiKey; // door de app geleverd; nooit in deze core opgeslagen
    var qs = Object.keys(params).map(function (k){
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }).join('&');
    return {
      provider: 'open-meteo', host: host, url: host + '?' + qs, params: params,
      commercial: commercial, requiresKeyForCommercial: true,
      map: 'OPENMETEO_MAP', roundedTo: prec
    };
  }

  var WeatherCore = {
    VERSIONS: VERSIONS,
    WEATHER_SENSITIVE: WEATHER_SENSITIVE,
    WEATHER_ADAPTER_METHODS: WEATHER_ADAPTER_METHODS,
    OPENMETEO_MAP: OPENMETEO_MAP, OPENWEATHER_MAP: OPENWEATHER_MAP,
    toCelsius: toCelsius, toMs: toMs, toMmh: toMmh,
    createWeather: createWeather, normalizeField: normalizeField, normalizeWeather: normalizeWeather,
    weatherApplies: weatherApplies, isWeatherAdapter: isWeatherAdapter,
    buildOpenMeteoRequest: buildOpenMeteoRequest
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = WeatherCore; }
  else if (global) { global.WeatherCore = WeatherCore; }
})(typeof self !== 'undefined' ? self : this);
