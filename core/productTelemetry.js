/* TrainingKompas — Product Telemetry Core (MS-TELEMETRY-01)
 * Pure contract/registry layer. No DOM, DB, network or tracking side effects.
 * Product telemetry is deliberately separate from athlete/training data,
 * operational crash telemetry and explicit user feedback.
 */
(function (global) {
  'use strict';

  var VERSION = 'product_event.v1';
  var ENVS = ['development', 'deploy-preview', 'branch-deploy', 'production', 'test', 'unknown'];
  var PLATFORMS = ['web', 'android', 'ios', 'unknown'];
  var COMMON = ['correlation_id', 'route_id'];

  function def(purpose, trigger, props) {
    return Object.freeze({ version: 1, purpose: purpose, trigger: trigger, owner: 'training',
      privacy: 'PRODUCT_USAGE_LOW', consent: 'PRODUCT_IMPROVEMENT', retention: 'PRODUCT_TELEMETRY',
      identity: 'pseudonymous_optional', properties: Object.freeze(props || {}) });
  }

  // Minimal first funnel only. IDs are stable and language-neutral.
  var REGISTRY = Object.freeze({
    'training.opened': def('Measure entry into Training', 'Canonical Training destination becomes active', {}),
    'training.previewed': def('Measure preview reach', 'Canonical Training Preview is rendered for a selected training', {
      source_type: ['program', 'my_training', 'builder', 'single_exercise']
    }),
    'training.workout.started': def('Measure execution start', 'Canonical execution session starts', {
      source_type: ['program', 'my_training', 'builder', 'single_exercise']
    }),
    'training.workout.completed': def('Measure successful execution completion', 'Canonical execution is completed by the athlete', {
      source_type: ['program', 'my_training', 'builder', 'single_exercise']
    }),
    'training.history.viewed': def('Measure return to training history', 'Canonical Training History becomes active', {})
  });

  var FORBIDDEN_KEY_PARTS = [
    'email','name','token','password','secret','authorization','cookie','key','credential','jwt','pin','hash',
    'hrv','sleep','weight','body','cycle','medical','symptom','note','prompt','response','reps','load','gps',
    'latitude','longitude','exercise','url','query','message','stack'
  ];

  function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function forbiddenKey(k) {
    var s = String(k || '').toLowerCase();
    for (var i = 0; i < FORBIDDEN_KEY_PARTS.length; i++) if (s.indexOf(FORBIDDEN_KEY_PARTS[i]) !== -1) return true;
    return false;
  }
  function scalar(v) { return v === null || ['string','number','boolean'].indexOf(typeof v) !== -1; }
  function validShortString(v, max) { return typeof v === 'string' && v.length > 0 && v.length <= max; }

  function validate(eventId, properties, ctx) {
    properties = properties || {}; ctx = ctx || {};
    var spec = REGISTRY[eventId];
    var errors = [];
    if (!spec) return { ok: false, errors: ['UNREGISTERED_EVENT'] };
    if (!properties || typeof properties !== 'object' || Array.isArray(properties)) return { ok: false, errors: ['INVALID_PROPERTIES'] };

    Object.keys(properties).forEach(function (k) {
      if (forbiddenKey(k)) errors.push('FORBIDDEN_PROPERTY:' + k);
      else if (COMMON.indexOf(k) === -1 && !own(spec.properties, k)) errors.push('UNKNOWN_PROPERTY:' + k);
      else if (!scalar(properties[k])) errors.push('NON_SCALAR_PROPERTY:' + k);
      else if (own(spec.properties, k) && spec.properties[k].indexOf(properties[k]) === -1) errors.push('INVALID_VALUE:' + k);
    });

    if (properties.correlation_id !== undefined && !validShortString(properties.correlation_id, 100)) errors.push('INVALID_CORRELATION_ID');
    if (properties.route_id !== undefined && (!validShortString(properties.route_id, 80) || /[?&#/:]/.test(properties.route_id))) errors.push('INVALID_ROUTE_ID');
    if (ctx.environment !== undefined && ENVS.indexOf(ctx.environment) === -1) errors.push('INVALID_ENVIRONMENT');
    if (ctx.platform !== undefined && PLATFORMS.indexOf(ctx.platform) === -1) errors.push('INVALID_PLATFORM');
    return { ok: errors.length === 0, errors: errors };
  }

  function buildEvent(eventId, properties, ctx) {
    properties = properties || {}; ctx = ctx || {};
    var verdict = validate(eventId, properties, ctx);
    if (!verdict.ok) return { ok: false, errors: verdict.errors, event: null };
    var spec = REGISTRY[eventId];
    var event = {
      timestamp: ctx.now ? ctx.now() : new Date().toISOString(),
      contract: VERSION,
      event: eventId,
      event_version: spec.version,
      app_version: validShortString(ctx.app_version, 32) ? ctx.app_version : 'unknown',
      environment: ENVS.indexOf(ctx.environment) !== -1 ? ctx.environment : 'unknown',
      platform: PLATFORMS.indexOf(ctx.platform) !== -1 ? ctx.platform : 'unknown'
    };
    Object.keys(properties).forEach(function (k) { event[k] = properties[k]; });
    return { ok: true, errors: [], event: event };
  }

  var ProductTelemetryCore = {
    VERSION: VERSION, REGISTRY: REGISTRY, FORBIDDEN_KEY_PARTS: FORBIDDEN_KEY_PARTS,
    validate: validate, buildEvent: buildEvent
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = ProductTelemetryCore;
  else if (global) global.ProductTelemetryCore = ProductTelemetryCore;
})(typeof self !== 'undefined' ? self : this);
