/* MS-BETA-01 Slice A — deterministic feedback contract tests (positive, negative, sabotage). */
'use strict';
const fs = require('fs'); const path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, 'betaFeedback.js'), 'utf8');
let pass = 0, fail = 0, mute = false;
const ok = (c, m) => { if (c) pass++; else { fail++; if (!mute) console.log('MISLUKT: ' + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')');
function load(src) { const m = { exports: {} }; new Function('module', 'exports', 'self', src)(m, m.exports, undefined); return m.exports; }
const NOW = { now: () => '2026-09-29T08:00:00.000Z' };
const has = (r, code) => !!r && Array.isArray(r.errors) && r.errors.some(e => e.indexOf(code) === 0);

function suite(F) {
  // C: categories
  eq(Object.keys(F.CATEGORIES), ['problem', 'idea', 'unclear', 'works_well'], 'C1: exact vier categorieën');
  eq(Object.keys(F.CATEGORIES).map(k => F.CATEGORIES[k].label_nl), ['Probleem', 'Idee', 'Onduidelijk', 'Werkt goed'], 'C2: NL-labels');
  ok(has(F.buildSubmission({ category: 'bug' }, NOW), 'INVALID_CATEGORY'), 'C3: onbekende categorie afgewezen');
  ok(has(F.buildSubmission({}, NOW), 'INVALID_CATEGORY'), 'C4: categorie verplicht');
  // L: lifecycle exactly as roadmap
  eq(F.STATUSES, ['SUBMITTED', 'TRIAGED', 'ACCEPTED', 'REJECTED', 'DUPLICATE', 'PRIORITIZED', 'PLANNED', 'FIXED', 'RELEASED', 'VERIFIED'], 'L1: statustaxonomie volgens roadmap §7');
  eq(F.INITIAL_STATUS, 'SUBMITTED', 'L2: initiële status');
  const path_ = ['SUBMITTED', 'TRIAGED', 'ACCEPTED', 'PRIORITIZED', 'PLANNED', 'FIXED', 'RELEASED', 'VERIFIED'];
  for (let i = 0; i < path_.length - 1; i++) ok(F.canTransition(path_[i], path_[i + 1]).ok, 'L3: ' + path_[i] + ' -> ' + path_[i + 1]);
  ok(F.canTransition('TRIAGED', 'REJECTED').ok, 'L4: triage -> rejected');
  eq(F.canTransition('TRIAGED', 'DUPLICATE').error, 'DUPLICATE_REQUIRES_REFERENCE', 'L5: duplicate vereist verwijzing');
  ok(F.canTransition('TRIAGED', 'DUPLICATE', { duplicate_of: 'fb_1' }).ok, 'L6: duplicate met verwijzing');
  eq(F.canTransition('SUBMITTED', 'FIXED').error, 'INVALID_TRANSITION', 'L7: geen overgeslagen stappen');
  eq(F.canTransition('SUBMITTED', 'ACCEPTED').error, 'INVALID_TRANSITION', 'L8: accepteren alleen na triage');
  eq(F.canTransition('VERIFIED', 'SUBMITTED').error, 'INVALID_TRANSITION', 'L9: terminal blijft terminal');
  ['REJECTED', 'DUPLICATE', 'VERIFIED'].forEach(s => eq(F.nextStatuses(s), [], 'L10: ' + s + ' is terminal'));
  eq(F.canTransition('SUBMITTED', 'DONE').error, 'UNKNOWN_STATUS', 'L11: onbekende status');
  ok(F.STATUSES.every(s => Object.prototype.hasOwnProperty.call(F.TRANSITIONS, s)), 'L12: elke status heeft een transitiedefinitie');
  // S: valid submission
  const r = F.buildSubmission({ category: 'problem', description: '  App crasht bij opslaan  ' }, NOW);
  ok(r.ok, 'S1: geldige minimale inzending');
  eq(Object.keys(r.record).sort(), ['category', 'contract', 'description', 'free_text_classification', 'redactions', 'reproduction_steps', 'status', 'stream', 'submitted_at', 'technical_context', 'technical_context_consent'], 'S2: exacte recordvorm');
  eq([r.record.contract, r.record.stream, r.record.status], ['user_feedback.v1', 'user_feedback', 'SUBMITTED'], 'S3: contract/stream/status');
  eq(r.record.description, 'App crasht bij opslaan', 'S4: tekst getrimd');
  eq(r.record.free_text_classification, 'USER_CONTENT_POTENTIALLY_SENSITIVE', 'S5: vrije tekst als gevoelig geclassificeerd');
  eq([r.record.technical_context_consent, r.record.technical_context], [false, {}], 'S6: zonder consent geen technische context');
  eq(r.record.submitted_at, '2026-09-29T08:00:00.000Z', 'S7: deterministische tijd via env');
  ok(F.buildSubmission({ category: 'works_well' }, NOW).ok, 'S8: alleen categorie is toegestaan (niets verzonnen)');
  // T: technical context
  const full = { app_version: 'v4.70.5', build: '47005', environment: 'production', platform: 'android', os_family: 'android', browser_family: 'webview', route_id: 's-hist', client_timestamp: '2026-09-29T07:59:00.000Z', correlation_id: 'cid_abc', telemetry_event_id: 'evt_1' };
  const t1 = F.buildSubmission({ category: 'idea', technical_context_consent: true, technical_context: full }, NOW);
  ok(t1.ok, 'T1: volledige allowlist met consent'); eq(t1.record.technical_context, full, 'T2: context 1-op-1 behouden');
  ok(has(F.buildSubmission({ category: 'idea', technical_context: { app_version: 'x' } }, NOW), 'TECHNICAL_CONTEXT_WITHOUT_CONSENT'), 'T3: context zonder consent -> afgewezen (nooit stil meegestuurd)');
  ok(has(F.buildSubmission({ category: 'idea', technical_context_consent: false, technical_context: { app_version: 'x' } }, NOW), 'TECHNICAL_CONTEXT_WITHOUT_CONSENT'), 'T4: consent false + context -> afgewezen');
  ok(has(F.buildSubmission({ category: 'idea', technical_context_consent: 'yes' }, NOW), 'INVALID_TECHNICAL_CONTEXT_CONSENT'), 'T5: consent moet boolean zijn');
  [['user_agent', 'Mozilla/5.0'], ['url', 'https://x'], ['ip', '1.2.3.4'], ['device_id', 'abc'], ['metadata', {}], ['screen', 'x']].forEach(([k, v]) =>
    ok(!F.buildSubmission({ category: 'idea', technical_context_consent: true, technical_context: { [k]: v } }, NOW).ok, 'T6: context-key ' + k + ' afgewezen'));
  [['route_id', 'training?user=1'], ['route_id', '/s-hist'], ['environment', 'prod'], ['platform', 'watch'], ['client_timestamp', 'gisteren'], ['app_version', 'x'.repeat(33)], ['correlation_id', { a: 1 }]].forEach(([k, v]) =>
    ok(has(F.buildSubmission({ category: 'idea', technical_context_consent: true, technical_context: { [k]: v } }, NOW), 'INVALID_VALUE:' + k), 'T7: ongeldige waarde ' + k));
  // A: no automatic athlete/health/nutrition/AI/GPS/training values; no screenshots
  ['hrv', 'sleep_hours', 'bodyweight', 'heart_rate', 'nutrition', 'calories', 'ai_prompt', 'coach_response', 'gps', 'latitude', 'reps', 'load_kg', 'rpe', 'workout_id', 'exercise_id', 'session', 'training_data', 'watts', 'pace', 'screenshot', 'image', 'attachment', 'photo', 'email', 'name'].forEach(k => {
    ok(has(F.buildSubmission({ category: 'problem', [k]: 1 }, NOW), 'FORBIDDEN_FIELD:' + k), 'A1: top-level ' + k + ' verboden');
    ok(has(F.buildSubmission({ category: 'problem', technical_context_consent: true, technical_context: { [k]: 1 } }, NOW), 'FORBIDDEN_TECHNICAL_CONTEXT:' + k), 'A2: context ' + k + ' verboden');
  });
  ok(has(F.buildSubmission({ category: 'problem', foo: 1 }, NOW), 'UNKNOWN_FIELD:foo'), 'A3: onbekend veld fail-closed');
  ok(F.SUBMISSION_FIELDS.every(f => !/screenshot|image|attachment/.test(f)), 'A4: geen screenshotveld in het basiscontract');
  // X: free-text sanitization boundary
  const x = F.sanitizeFreeText('a\u0000b\u202Ec  \t d\n\n\n\ne');
  eq(x.text, 'abc d\n\ne', 'X1: control/bidi-tekens weg, witruimte genormaliseerd');
  eq(F.sanitizeFreeText('mail a.b@c.nl').text, 'mail [REDACTED_EMAIL]', 'X2: e-mail geredigeerd');
  eq(F.sanitizeFreeText('bel 0612345678').text, 'bel [REDACTED_PHONE]', 'X3: telefoon geredigeerd');
  eq(F.sanitizeFreeText('bel +31 6 1234 5678').text, 'bel [REDACTED_PHONE]', 'X4: internationaal nummer geredigeerd');
  eq(F.sanitizeFreeText('zie https://x.nl/p?token=abc').text, 'zie [REDACTED_URL]', 'X5: URL (met query) geredigeerd');
  eq(F.sanitizeFreeText('Bearer abcdefghijkl123').text, 'Bearer [REDACTED_TOKEN]', 'X6: bearer-token geredigeerd');
  eq(F.sanitizeFreeText('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.abcdefghijklmnop').text, '[REDACTED_TOKEN]', 'X7: JWT geredigeerd');
  eq(F.sanitizeFreeText('op 2026-09-29 10:00, 3x10 reps 100 kg, 0:25.6, versie 4.70.5').text, 'op 2026-09-29 10:00, 3x10 reps 100 kg, 0:25.6, versie 4.70.5', 'X8: data/tijden/getallen blijven intact (geen overredactie)');
  eq(F.sanitizeFreeText('   ').text, null, 'X9: lege tekst -> null');
  ok(has(F.buildSubmission({ category: 'problem', description: 'x'.repeat(2001) }, NOW), 'INVALID_DESCRIPTION:TEXT_TOO_LONG'), 'X10: lengtecap 2000');
  ok(has(F.buildSubmission({ category: 'problem', description: 42 }, NOW), 'INVALID_DESCRIPTION:NON_STRING_TEXT'), 'X11: niet-string tekst afgewezen');
  const rx = F.buildSubmission({ category: 'problem', description: 'mail a@b.nl', reproduction_steps: 'mail c@d.nl en bel 0612345678' }, NOW);
  eq(rx.record.redactions, ['email', 'phone'], 'X12: redacties gededupliceerd en vastgelegd');
  eq(F.sanitizeFreeText('mijn knie doet pijn na squats').text, 'mijn knie doet pijn na squats', 'X13: inhoud wordt niet geïnterpreteerd (classificatie i.p.v. filteren)');
  // P: policy + separation + purity
  eq([F.POLICY.feedback_retention_days, F.POLICY.feedback_readers], [365, ['product_triage', 'product_admin']], 'P1: voorlopige retentie 12 maanden, alleen triage-rollen');
  eq(F.POLICY.legal_basis, 'NOT_DETERMINED_PROVISIONAL_PRODUCT_POLICY_ONLY', 'P2: geen juridische claim');
  ok(F.POLICY.screenshots.indexOf('SEPARATE_EXPLICIT_USER_ACTION') !== -1, 'P3: screenshots alleen via aparte expliciete actie (later)');
  eq(F.POLICY.must_not_use_sinks.slice().sort(), ['client_telemetry_events', 'coach_workout_feedback', 'product_telemetry_events', 'sessions'], 'P4: scheiding van andere streams/sinks');
  ok(!/\b(fetch|XMLHttpRequest|localStorage|sessionStorage|document|window\.|indexedDB|navigator)\b/.test(SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')), 'P5: puur contract, geen DOM/netwerk/storage');
  ok(!/require\(/.test(SRC), 'P6: geen afhankelijkheden');
  const input = { category: 'idea', description: 'x', technical_context_consent: true, technical_context: { platform: 'web' } };
  const b1 = F.buildSubmission(input, NOW); input.technical_context.platform = 'ios'; input.description = 'y';
  eq([b1.record.technical_context.platform, b1.record.description], ['web', 'x'], 'P7: record losgekoppeld van latere input-mutatie');
  eq(JSON.stringify(F.buildSubmission({ category: 'idea', description: 'x' }, NOW)), JSON.stringify(F.buildSubmission({ category: 'idea', description: 'x' }, NOW)), 'P8: deterministisch');
  ok(Object.isFrozen(F.CATEGORIES) && Object.isFrozen(F.TRANSITIONS) && Object.isFrozen(F.POLICY), 'P9: contract-constanten bevroren');
}

const F = load(SRC);
suite(F);

// Sabotage: each guard removed must make at least one assertion fail.
const sab = [
  ['consent-eis technische context weg', s => s.replace("if (consent !== true) errors.push('TECHNICAL_CONTEXT_WITHOUT_CONSENT');\n      else tech", "tech")],
  ['onbekende velden toegestaan', s => s.replace("errors.push(forbiddenKey(k) ? 'FORBIDDEN_FIELD:' + k : 'UNKNOWN_FIELD:' + k);", '')],
  ['context-allowlist weg', s => s.replace("if (!own(TECH_CONTEXT, k)) { errors.push('UNKNOWN_TECHNICAL_CONTEXT:' + k); return; }", "if (!own(TECH_CONTEXT, k)) { out[k] = v; return; }")],
  ['e-mailredactie weg', s => s.replace("{ kind: 'email',", "{ kind: 'email_off', off: 1,").replace("re: /\\b[A-Za-z0-9._%+-]+@", "re: /\\bNEVERMATCH[A-Za-z0-9._%+-]+@")],
  ['lengtecap weg', s => s.replace("if (s.length > MAX_TEXT) return { ok: false, error: 'TEXT_TOO_LONG' };", '')],
  ['stappen overslaan toegestaan', s => s.replace("SUBMITTED:   Object.freeze(['TRIAGED']),", "SUBMITTED:   Object.freeze(['TRIAGED', 'FIXED']),")],
  ['duplicate zonder verwijzing', s => s.replace("if (to === 'DUPLICATE' && !(typeof meta.duplicate_of === 'string' && meta.duplicate_of.length > 0)) return { ok: false, error: 'DUPLICATE_REQUIRES_REFERENCE' };", '')],
  ['screenshot-verbod weg', s => s.replace("'screenshot', 'image', 'attachment', 'file', 'photo', 'video', 'blob',", '')],
  ['health-verbod weg', s => s.replace("'hrv', 'sleep', 'weight', 'body', 'cycle', 'medical', 'symptom', 'health', 'heart', 'pulse', 'hr_',", '')],
  ['telefoon-overredactie (datumbescherming weg)', s => s.replace("if (offset > 0 && /[\\d-]/.test(str.charAt(offset - 1))) return m;", '')]
];
for (const [name, mut] of sab) {
  const s2 = mut(SRC);
  if (s2 === SRC) { ok(false, 'SABOTAGE niet toepasbaar: ' + name); continue; }
  const pp = pass, ff = fail; mute = true;
  try { suite(load(s2)); } catch (e) { fail++; }
  mute = false; const caught = fail > ff; pass = pp; fail = ff;
  if (process.env.SAB_DEBUG) console.log('SAB ' + name + ' detect=' + caught);
  ok(caught, 'SABOTAGE gedetecteerd: ' + name);
}
console.log('\n[BetaFeedbackContract] RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
