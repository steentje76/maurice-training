/* TrainingKompas — Beta Feedback Contract (MS-BETA-01 Slice A)
 * Pure, deterministic contract layer. No DOM, DB, network, storage, provider or tracking side effects.
 *
 * Stream separation (docs/PRODUCT_TELEMETRY_FEEDBACK_ROADMAP_2_0.md §3):
 *   A athlete/training data   — never copied into feedback automatically;
 *   B product telemetry       — core/productTelemetry.js, separate sink (product_telemetry_events);
 *   C crash diagnostics       — core/observability.js + netlify/functions/telemetry.js (client_telemetry_events);
 *   D user feedback           — THIS contract, its own future sink.
 *
 * Free text is user-generated content and may contain anything, including health information the athlete
 * chooses to type. It is therefore classified as potentially sensitive, only sanitized (never interpreted),
 * and is intended to be readable by explicit triage roles only.
 *
 * Screenshots/attachments are deliberately NOT part of this base contract; any attempt to include one is
 * rejected. A later slice may add them only behind a separate, explicit user action.
 *
 * Policy values below are PROVISIONAL product policy (PO, 29-09-2026), not a legal basis or AVG/GDPR proof.
 */
(function (global) {
  'use strict';

  var VERSION = 'user_feedback.v1';
  var STREAM = 'user_feedback';

  // Language-neutral IDs; Dutch labels for the UI of a later slice.
  var CATEGORIES = Object.freeze({
    problem:    Object.freeze({ label_nl: 'Probleem' }),
    idea:       Object.freeze({ label_nl: 'Idee' }),
    unclear:    Object.freeze({ label_nl: 'Onduidelijk' }),
    works_well: Object.freeze({ label_nl: 'Werkt goed' })
  });

  // Lifecycle fixed by the roadmap (§7): SUBMITTED → TRIAGED → ACCEPTED/REJECTED/DUPLICATE →
  // PRIORITIZED → PLANNED → FIXED → RELEASED → VERIFIED. No shorter or invented paths.
  var STATUSES = Object.freeze(['SUBMITTED', 'TRIAGED', 'ACCEPTED', 'REJECTED', 'DUPLICATE',
    'PRIORITIZED', 'PLANNED', 'FIXED', 'RELEASED', 'VERIFIED']);
  var TRANSITIONS = Object.freeze({
    SUBMITTED:   Object.freeze(['TRIAGED']),
    TRIAGED:     Object.freeze(['ACCEPTED', 'REJECTED', 'DUPLICATE']),
    ACCEPTED:    Object.freeze(['PRIORITIZED']),
    PRIORITIZED: Object.freeze(['PLANNED']),
    PLANNED:     Object.freeze(['FIXED']),
    FIXED:       Object.freeze(['RELEASED']),
    RELEASED:    Object.freeze(['VERIFIED']),
    REJECTED:    Object.freeze([]),
    DUPLICATE:   Object.freeze([]),
    VERIFIED:    Object.freeze([])
  });
  var TERMINAL = Object.freeze(['REJECTED', 'DUPLICATE', 'VERIFIED']);
  var INITIAL_STATUS = 'SUBMITTED';

  var ENVS = ['development', 'deploy-preview', 'branch-deploy', 'production', 'test', 'unknown'];
  var PLATFORMS = ['web', 'android', 'ios', 'unknown'];
  var OS_FAMILIES = ['android', 'ios', 'windows', 'macos', 'linux', 'other', 'unknown'];
  var BROWSER_FAMILIES = ['chrome', 'firefox', 'safari', 'edge', 'samsung', 'webview', 'other', 'unknown'];

  // Technical context: strictly allowlisted, only with explicit consent, never silently attached.
  // No raw user agent, URL, IP, device ID or free-form metadata bag.
  var TECH_CONTEXT = Object.freeze({
    app_version:     { type: 'short', max: 32, pattern: /^[0-9A-Za-z._-]+$/ },
    build:           { type: 'short', max: 32, pattern: /^[0-9A-Za-z._-]+$/ },
    environment:     { type: 'enum', values: ENVS },
    platform:        { type: 'enum', values: PLATFORMS },
    os_family:       { type: 'enum', values: OS_FAMILIES },
    browser_family:  { type: 'enum', values: BROWSER_FAMILIES },
    route_id:        { type: 'short', max: 80, pattern: /^[a-z0-9][a-z0-9_-]*$/ },
    client_timestamp:{ type: 'iso' },
    correlation_id:  { type: 'short', max: 100, pattern: /^[0-9A-Za-z_:.-]+$/ },
    telemetry_event_id: { type: 'short', max: 100, pattern: /^[0-9A-Za-z_:.-]+$/ }
  });

  // Top-level submission fields. Anything else fails closed.
  var SUBMISSION_FIELDS = ['category', 'description', 'reproduction_steps', 'technical_context_consent', 'technical_context'];
  var MAX_TEXT = 2000;

  // Never allowed anywhere in a submission (defence in depth on top of the allowlists).
  var FORBIDDEN_KEY_PARTS = Object.freeze([
    'screenshot', 'image', 'attachment', 'file', 'photo', 'video', 'blob',
    'hrv', 'sleep', 'weight', 'body', 'cycle', 'medical', 'symptom', 'health', 'heart', 'pulse', 'hr_',
    'nutrition', 'calorie', 'kcal', 'meal', 'macro', 'supplement',
    'prompt', 'response', 'ai_', 'coach',
    'gps', 'latitude', 'longitude', 'location', 'route_points',
    'reps', 'load', 'rpe', 'rir', 'set', 'workout', 'exercise', 'session', 'training', 'pace', 'power', 'watt',
    'email', 'name', 'phone', 'address', 'token', 'password', 'secret', 'authorization', 'cookie', 'key', 'jwt',
    'user_agent', 'useragent', 'url', 'query', 'ip', 'device_id', 'stack', 'message'
  ]);

  // Policy (provisional; declarative only — this module stores nothing).
  var POLICY = Object.freeze({
    feedback_retention_days: 365,
    feedback_readers: Object.freeze(['product_triage', 'product_admin']),
    free_text_classification: 'USER_CONTENT_POTENTIALLY_SENSITIVE',
    screenshots: 'NOT_IN_BASE_CONTRACT_REQUIRES_SEPARATE_EXPLICIT_USER_ACTION',
    technical_context: 'OPT_IN_PER_SUBMISSION',
    legal_basis: 'NOT_DETERMINED_PROVISIONAL_PRODUCT_POLICY_ONLY',
    must_not_use_sinks: Object.freeze(['client_telemetry_events', 'product_telemetry_events', 'sessions', 'coach_workout_feedback'])
  });

  function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function isPlain(o) { return o !== null && typeof o === 'object' && !Array.isArray(o); }
  function forbiddenKey(k) {
    var s = String(k || '').toLowerCase();
    for (var i = 0; i < FORBIDDEN_KEY_PARTS.length; i++) if (s.indexOf(FORBIDDEN_KEY_PARTS[i]) !== -1) return true;
    return false;
  }

  // ── Sanitization boundary for free text ──
  // Deterministic, content-agnostic: removes control characters, normalizes whitespace, caps length and
  // redacts well-known credential/contact patterns. It does NOT (and cannot) remove health information a
  // user chooses to type; that is handled by classification + restricted access, not by interpretation.
  var REDACTIONS = [
    { kind: 'jwt',   re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, repl: '[REDACTED_TOKEN]' },
    { kind: 'bearer', re: /\bBearer\s+[A-Za-z0-9._~+\/=-]{8,}/gi, repl: 'Bearer [REDACTED_TOKEN]' },
    { kind: 'email', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, repl: '[REDACTED_EMAIL]' },
    { kind: 'url',   re: /\bhttps?:\/\/[^\s]+/gi, repl: '[REDACTED_URL]' },
    // Phone: NL/international numbers only. Requires >= 9 digits and no digit/hyphen directly before the
    // match, so dates, times, weights and rep schemes stay intact.
    { kind: 'phone', re: /(\+\d{1,3}(?:[\s-]?\d{1,4}){2,5}|\(?0\d{1,3}\)?(?:[\s-]?\d{2,4}){2,4})\b/g,
      repl: function (m, _g, offset, str) {
        if (offset > 0 && /[\d-]/.test(str.charAt(offset - 1))) return m;
        return (m.replace(/\D/g, '').length >= 9) ? '[REDACTED_PHONE]' : m;
      } }
  ];
  function sanitizeFreeText(input) {
    if (input === undefined || input === null) return { ok: true, text: null, redactions: [] };
    if (typeof input !== 'string') return { ok: false, error: 'NON_STRING_TEXT' };
    var s = input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '');
    s = s.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    var redactions = [];
    for (var i = 0; i < REDACTIONS.length; i++) {
      var r = REDACTIONS[i];
      var before = s;
      s = s.replace(r.re, r.repl);
      if (s !== before) redactions.push(r.kind);
    }
    if (s.length > MAX_TEXT) return { ok: false, error: 'TEXT_TOO_LONG' };
    return { ok: true, text: s.length ? s : null, redactions: redactions };
  }

  function validateTechnicalContext(ctx, errors) {
    if (!isPlain(ctx)) { errors.push('INVALID_TECHNICAL_CONTEXT'); return {}; }
    var out = {};
    Object.keys(ctx).forEach(function (k) {
      var v = ctx[k];
      if (forbiddenKey(k) && !own(TECH_CONTEXT, k)) { errors.push('FORBIDDEN_TECHNICAL_CONTEXT:' + k); return; }
      if (!own(TECH_CONTEXT, k)) { errors.push('UNKNOWN_TECHNICAL_CONTEXT:' + k); return; }
      var spec = TECH_CONTEXT[k];
      if (spec.type === 'enum') { if (spec.values.indexOf(v) === -1) errors.push('INVALID_VALUE:' + k); else out[k] = v; return; }
      if (spec.type === 'iso') {
        if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(v) || isNaN(Date.parse(v))) errors.push('INVALID_VALUE:' + k);
        else out[k] = v;
        return;
      }
      if (typeof v !== 'string' || v.length === 0 || v.length > spec.max || !spec.pattern.test(v)) errors.push('INVALID_VALUE:' + k);
      else out[k] = v;
    });
    return out;
  }

  // Validates and normalizes a submission. Fail closed: any error → no record.
  function buildSubmission(input, env) {
    env = env || {};
    var errors = [];
    if (!isPlain(input)) return { ok: false, errors: ['INVALID_SUBMISSION'], record: null };
    Object.keys(input).forEach(function (k) {
      if (SUBMISSION_FIELDS.indexOf(k) !== -1) return;
      errors.push(forbiddenKey(k) ? 'FORBIDDEN_FIELD:' + k : 'UNKNOWN_FIELD:' + k);
    });
    if (!own(CATEGORIES, input.category)) errors.push('INVALID_CATEGORY');

    var desc = sanitizeFreeText(input.description);
    var steps = sanitizeFreeText(input.reproduction_steps);
    if (!desc.ok) errors.push('INVALID_DESCRIPTION:' + desc.error);
    if (!steps.ok) errors.push('INVALID_REPRODUCTION_STEPS:' + steps.error);

    var consent = input.technical_context_consent;
    if (consent !== undefined && typeof consent !== 'boolean') errors.push('INVALID_TECHNICAL_CONTEXT_CONSENT');
    var tech = {};
    if (input.technical_context !== undefined) {
      if (consent !== true) errors.push('TECHNICAL_CONTEXT_WITHOUT_CONSENT');
      else tech = validateTechnicalContext(input.technical_context, errors);
    }
    // A problem report without any description is allowed (category alone is a signal),
    // but a completely empty 'problem'/'unclear' still carries meaning; nothing is invented.

    if (errors.length) return { ok: false, errors: errors, record: null };
    var record = {
      contract: VERSION,
      stream: STREAM,
      category: input.category,
      status: INITIAL_STATUS,
      description: desc.text,
      reproduction_steps: steps.text,
      free_text_classification: POLICY.free_text_classification,
      redactions: desc.redactions.concat(steps.redactions).filter(function (x, i, a) { return a.indexOf(x) === i; }),
      technical_context_consent: consent === true,
      technical_context: consent === true ? tech : {},
      submitted_at: env.now ? env.now() : new Date().toISOString()
    };
    return { ok: true, errors: [], record: record };
  }

  function nextStatuses(from) { return own(TRANSITIONS, from) ? TRANSITIONS[from].slice() : []; }
  // Triage transitions are validated here; who may perform them is a storage/RLS concern of a later slice.
  function canTransition(from, to, meta) {
    meta = meta || {};
    if (!own(TRANSITIONS, from) || STATUSES.indexOf(to) === -1) return { ok: false, error: 'UNKNOWN_STATUS' };
    if (TRANSITIONS[from].indexOf(to) === -1) return { ok: false, error: 'INVALID_TRANSITION' };
    if (to === 'DUPLICATE' && !(typeof meta.duplicate_of === 'string' && meta.duplicate_of.length > 0)) return { ok: false, error: 'DUPLICATE_REQUIRES_REFERENCE' };
    return { ok: true };
  }

  var BetaFeedbackCore = {
    VERSION: VERSION, STREAM: STREAM, CATEGORIES: CATEGORIES, STATUSES: STATUSES, TRANSITIONS: TRANSITIONS,
    TERMINAL: TERMINAL, INITIAL_STATUS: INITIAL_STATUS, TECH_CONTEXT: TECH_CONTEXT, SUBMISSION_FIELDS: SUBMISSION_FIELDS,
    MAX_TEXT: MAX_TEXT, FORBIDDEN_KEY_PARTS: FORBIDDEN_KEY_PARTS, POLICY: POLICY,
    sanitizeFreeText: sanitizeFreeText, buildSubmission: buildSubmission, nextStatuses: nextStatuses, canTransition: canTransition
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = BetaFeedbackCore;
  else if (global) global.BetaFeedbackCore = BetaFeedbackCore;
})(typeof self !== 'undefined' ? self : this);
