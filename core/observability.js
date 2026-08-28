/* ==========================================================================
 * TrainingKompas — OBSERVABILITY CORE (MS-F1-02)  observability_event.v1
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTISCH WAAR MOGELIJK · geen DOM/DB/network-afhankelijkheid
 * (behalve console als fallback-sink, bewust toegestaan — dat IS de sink).
 * Werkt zowel in de browser (window.ObservabilityCore) als in Netlify
 * Functions (require('../core/observability.js')), zelfde patroon als
 * core/scientificEvidence.js.
 *
 * DOEL: traceerbaarheid + foutdiagnose + veilige logging + één consistente
 * architectuur. GEEN analytics-warehouse, GEEN user-behavior-tracking.
 *
 * EVENT-CONTRACT (observability_event.v1):
 *   Verplicht : timestamp, level, event, domain, component, app_version, environment
 *   Optioneel : correlation_id, session_id, operation, status, duration_ms,
 *               error_code, error_class, retry_count, provider, metadata
 *
 * LOG LEVELS:
 *   DEBUG    — ontwikkeldiagnose, niet standaard permanent opgeslagen.
 *   INFO     — belangrijke succesvolle lifecycle-event.
 *   WARN     — recoverable afwijking of degraded mode.
 *   ERROR    — operatie mislukt.
 *   SECURITY — security-sensitive event zonder credential/data-exposure.
 *
 * EVENTNAMING: "domain.component.action", bv. "training.workout.start",
 * "wearable.sync.failed", "ai.coach.request_failed".
 *
 * DO-NOT-LOG (zie REDACT_KEYS + expliciete instructie aan callers):
 * password, access_token, refresh_token, authorization, api_key,
 * service_role key, PIN/PIN-hash, raw credential, e-mail (tenzij
 * technisch noodzakelijk), naam, volledige AI-prompt/response met
 * gevoelige athlete-data, cycle symptoms, HRV raw values, sleep-detail,
 * bodyweight/body composition, private coach notes, medische context,
 * willekeurige DB-row-dumps. Callers geven daarom uitsluitend veilige
 * metadata mee (bv. "context_sections=5", "field_present=true"), nooit
 * de brondata zelf — deze module redacteert bekende gevoelige KEY-namen,
 * maar is geen vervanging voor het door de caller weglaten van gevoelige
 * WAARDEN die onder een onverdachte key zouden staan.
 * ==========================================================================*/
(function (global) {
  'use strict';

  var VERSIONS = { event: 'observability_event.v1' };
  var LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'SECURITY'];
  var REQUIRED_FIELDS = ['timestamp', 'level', 'event', 'domain', 'component', 'app_version', 'environment'];

  // Case-insensitive redactie van bekende gevoelige key-namen, nested objects/arrays.
  var REDACT_KEYS = [
    'token', 'password', 'secret', 'authorization', 'cookie', 'api_key', 'apikey',
    'access_token', 'refresh_token', 'pin', 'hash', 'service_role', 'servicerolekey',
    'jwt', 'credential'
  ];
  var REDACTED = '[REDACTED]';
  var MAX_DEPTH = 8; // voorkomt oneindige recursie bij circulaire/zeer diepe input.

  function isPlainObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }

  function keyLooksSensitive(key) {
    var k = String(key).toLowerCase();
    for (var i = 0; i < REDACT_KEYS.length; i++) {
      if (k.indexOf(REDACT_KEYS[i]) !== -1) return true;
    }
    return false;
  }

  // Redacteert een waarde zonder de originele input te muteren. Fail-safe: bij
  // onverwachte input (circulaire referenties, te diepe nesting) valt terug op
  // een veilige placeholder in plaats van te crashen.
  function redact(value, depth, seen) {
    depth = depth || 0;
    seen = seen || (typeof WeakSet !== 'undefined' ? new WeakSet() : null);
    if (depth > MAX_DEPTH) return '[MAX_DEPTH_EXCEEDED]';
    if (value === null || value === undefined) return value;
    if (typeof value !== 'object') return value;

    if (seen) {
      if (seen.has(value)) return '[CIRCULAR]';
      seen.add(value);
    }

    if (Array.isArray(value)) {
      var arr = [];
      for (var i = 0; i < value.length; i++) {
        try { arr.push(redact(value[i], depth + 1, seen)); } catch (e) { arr.push('[UNSERIALIZABLE]'); }
      }
      return arr;
    }

    if (isPlainObject(value)) {
      var out = {};
      for (var key in value) {
        if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
        try {
          out[key] = keyLooksSensitive(key) ? REDACTED : redact(value[key], depth + 1, seen);
        } catch (e) {
          out[key] = '[UNSERIALIZABLE]';
        }
      }
      return out;
    }

    // Overige object-typen (Date, Error, etc.) — veilige, niet-lekkende weergave.
    try { return String(value); } catch (e) { return '[UNSERIALIZABLE]'; }
  }

  // Deterministische, niet-cryptografische correlation-ID. Bevat GEEN user-ID,
  // e-mail of token — puur een willekeurige string voor het koppelen van
  // gebeurtenissen binnen dezelfde operatie/flow (levensduur: per operation,
  // niet permanent per gebruiker).
  function newCorrelationId() {
    var rnd = function () { return Math.random().toString(36).slice(2, 10); };
    return 'cid_' + Date.now().toString(36) + '_' + rnd() + rnd();
  }

  // Normaliseert uiteenlopende foutbronnen (JS-errors, Supabase/PostgREST-
  // errors, fetch/network-errors, timeouts) naar één uniform, veilig model.
  // Retourneert nooit de rauwe .message van een onbekende bron zonder
  // redactie, en lekt nooit headers/URL/tokens.
  function normalizeError(err, opts) {
    opts = opts || {};
    var out = {
      error_code: opts.error_code || 'UNKNOWN',
      error_class: 'UnknownError',
      message_safe: 'Er is een onverwachte fout opgetreden.',
      source: opts.source || 'unknown',
      retryable: !!opts.retryable,
      http_status: null,
      provider_code: opts.provider_code || null
    };
    if (!err) return out;

    try {
      // Supabase/PostgREST-achtige foutobjecten: { message, code, details, hint } of { status }.
      if (typeof err === 'object' && (err.code || err.status || err.statusCode)) {
        out.error_class = 'ProviderError';
        out.http_status = err.status || err.statusCode || null;
        out.provider_code = err.code || out.provider_code;
        out.retryable = out.http_status ? [408, 429, 500, 502, 503, 504].indexOf(out.http_status) !== -1 : out.retryable;
        out.message_safe = 'Providerfout' + (out.http_status ? ' (' + out.http_status + ')' : '') + '.';
        return out;
      }
      if (typeof err === 'object' && err.name === 'AbortError') {
        out.error_class = 'TimeoutError'; out.error_code = 'TIMEOUT'; out.retryable = true;
        out.message_safe = 'Verzoek duurde te lang.'; return out;
      }
      if (typeof err === 'object' && /network|fetch/i.test(String(err.message || ''))) {
        out.error_class = 'NetworkError'; out.error_code = 'NETWORK'; out.retryable = true;
        out.message_safe = 'Netwerkfout.'; return out;
      }
      if (err instanceof Error || (typeof err === 'object' && err.message)) {
        out.error_class = (err.name && typeof err.name === 'string') ? err.name : 'Error';
        // .message wordt bewust NIET 1-op-1 doorgegeven (kan padinfo/PII bevatten);
        // alleen een generieke, veilige samenvatting.
        out.message_safe = 'Interne fout (' + out.error_class + ').';
        return out;
      }
    } catch (e) {
      // normaliseren zelf mag nooit falen/throwen.
    }
    return out;
  }

  // Bouwt één event-object conform observability_event.v1. Vult verplichte
  // velden aan met veilige defaults als de caller ze niet meegeeft.
  function buildEvent(level, event, domain, component, data, ctx) {
    ctx = ctx || {};
    var safeData = {};
    try { safeData = redact(data || {}); } catch (e) { safeData = { _redaction_error: true }; }
    var evt = {
      timestamp: ctx.now ? ctx.now() : new Date().toISOString(),
      level: LEVELS.indexOf(level) !== -1 ? level : 'INFO',
      event: String(event || 'unknown.event'),
      domain: String(domain || 'unknown'),
      component: String(component || 'unknown'),
      app_version: ctx.app_version || 'unknown',
      environment: ctx.environment || 'unknown'
    };
    if (ctx.correlation_id) evt.correlation_id = ctx.correlation_id;
    if (ctx.session_id) evt.session_id = ctx.session_id;
    if (safeData.operation !== undefined) evt.operation = safeData.operation;
    if (safeData.status !== undefined) evt.status = safeData.status;
    if (safeData.duration_ms !== undefined) evt.duration_ms = safeData.duration_ms;
    if (safeData.error_code !== undefined) evt.error_code = safeData.error_code;
    if (safeData.error_class !== undefined) evt.error_class = safeData.error_class;
    if (safeData.retry_count !== undefined) evt.retry_count = safeData.retry_count;
    if (safeData.provider !== undefined) evt.provider = safeData.provider;
    var metaKeys = Object.keys(safeData).filter(function (k) {
      return ['operation', 'status', 'duration_ms', 'error_code', 'error_class', 'retry_count', 'provider'].indexOf(k) === -1;
    });
    if (metaKeys.length) {
      evt.metadata = {};
      metaKeys.forEach(function (k) { evt.metadata[k] = safeData[k]; });
    }
    return evt;
  }

  // Fail-safe log-sink: serialiseert nooit-crashend, valt terug op console.
  // Een loggingfout mag NOOIT de aanroepende productflow laten crashen.
  function tkLog(level, event, domain, component, data, ctx) {
    try {
      var evt = buildEvent(level, event, domain, component, data, ctx);
      var line;
      try { line = JSON.stringify(evt); } catch (e) { line = '{"event":"' + String(event) + '","level":"' + String(level) + '","_serialization_error":true}'; }
      var sink = (typeof console !== 'undefined') ? console : null;
      if (!sink) return evt;
      if (level === 'ERROR' || level === 'SECURITY') { if (sink.error) sink.error(line); }
      else if (level === 'WARN') { if (sink.warn) sink.warn(line); }
      else { if (sink.log) sink.log(line); }
      return evt;
    } catch (e) {
      // Zelfs bij een onverwachte fout in de logger zelf: nooit throwen.
      try { if (typeof console !== 'undefined' && console.error) console.error('{"event":"observability.logger_failure","level":"ERROR"}'); } catch (e2) { /* echt niets meer te doen */ }
      return null;
    }
  }

  var ObservabilityCore = {
    VERSIONS: VERSIONS, LEVELS: LEVELS, REQUIRED_FIELDS: REQUIRED_FIELDS, REDACT_KEYS: REDACT_KEYS,
    redact: redact, newCorrelationId: newCorrelationId, normalizeError: normalizeError,
    buildEvent: buildEvent, tkLog: tkLog
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = ObservabilityCore; }
  else if (global) { global.ObservabilityCore = ObservabilityCore; }
})(typeof self !== 'undefined' ? self : this);
