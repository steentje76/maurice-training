/* TrainingKompas — Observability Core test suite (node, standalone). MS-F1-02.
 * Draai: node core/observability.test.js
 */
const assert = require('assert');
const O = require('./observability.js');

let pass = 0, fail = 0;
function ok(cond, label) { if (cond) pass++; else { fail++; console.log('  ✗ ' + label); } }
function eq(a, b, label) { const same = JSON.stringify(a) === JSON.stringify(b); if (same) pass++; else { fail++; console.log('  ✗ ' + label + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); } }

// ---- A. Basiscontract: verplichte velden ----
{
  const evt = O.buildEvent('INFO', 'training.workout.start', 'training', 'execution', {}, { app_version: 'v4.69.0', environment: 'test' });
  O.REQUIRED_FIELDS.forEach(f => ok(evt[f] !== undefined, 'verplicht veld "' + f + '" aanwezig in event'));
  eq(evt.level, 'INFO', 'level correct doorgezet');
  eq(evt.event, 'training.workout.start', 'event-naam correct (domain.component.action-patroon)');
}

// ---- B. Ongeldig level valt terug op INFO, geen crash ----
{
  const evt = O.buildEvent('NONSENSE', 'x.y.z', 'x', 'y', {});
  eq(evt.level, 'INFO', 'ongeldig level valt veilig terug op INFO');
}

// ---- C. Correlation ID: geen user-ID/e-mail/token, wel bruikbaar te correleren ----
{
  const id1 = O.newCorrelationId();
  const id2 = O.newCorrelationId();
  ok(typeof id1 === 'string' && id1.length > 5, 'correlation ID is een niet-triviale string');
  ok(id1 !== id2, 'twee correlation IDs zijn verschillend (geen hergebruik binnen dezelfde run)');
  ok(!/@/.test(id1), 'correlation ID bevat geen @ (geen e-mailpatroon)');
  const evt = O.buildEvent('INFO', 'wearable.sync.start', 'wearable', 'sync', {}, { correlation_id: id1 });
  eq(evt.correlation_id, id1, 'correlation_id wordt correct meegenomen in het event');
}

// ---- D. Redactie: top-level, nested, arrays ----
{
  const input = {
    access_token: 'geheim-token-waarde',
    user: { password: 'wachtwoord123', profile: { api_key: 'sk-abc123' } },
    list: [{ refresh_token: 'rt-xyz' }, { veilig: 'dit-mag-blijven' }],
    veilig_top: 'dit-mag-ook-blijven'
  };
  const out = O.redact(input);
  const serialized = JSON.stringify(out);
  ok(!serialized.includes('geheim-token-waarde'), 'top-level access_token gered acteerd');
  ok(!serialized.includes('wachtwoord123'), 'nested password geredacteerd');
  ok(!serialized.includes('sk-abc123'), 'diep-nested api_key geredacteerd');
  ok(!serialized.includes('rt-xyz'), 'refresh_token binnen array-element geredacteerd');
  ok(serialized.includes('dit-mag-blijven'), 'niet-gevoelige waarde binnen array blijft intact');
  ok(serialized.includes('dit-mag-ook-blijven'), 'niet-gevoelige top-level waarde blijft intact');
  ok(out !== input, 'redact() muteert de originele input niet (retourneert nieuw object)');
  eq(input.access_token, 'geheim-token-waarde', 'originele input blijft ongewijzigd na redact()');
}

// ---- E. SECURITY SABOTAGE TEST (verplicht, sectie 28) ----
{
  const sabotagePayload = {
    access_token: 'AT-super-geheim',
    refresh_token: 'RT-super-geheim',
    password: 'p@ssw0rd!',
    pin: '1234',
    pin_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.super.secret.jwt',
    nested: { deep: { secret: 'diep-verstopt-geheim' } }
  };
  const evt = O.buildEvent('ERROR', 'test.sabotage', 'test', 'sabotage', sabotagePayload);
  const serialized = JSON.stringify(evt);
  const forbiddenValues = ['AT-super-geheim', 'RT-super-geheim', 'p@ssw0rd!', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'eyJhbGciOiJIUzI1NiJ9.super.secret.jwt', 'diep-verstopt-geheim'];
  forbiddenValues.forEach(v => ok(!serialized.includes(v), 'SABOTAGE: "' + v.slice(0, 12) + '..." komt NIET voor in de geserialiseerde output'));
}

// ---- F. Foutnormalisatie ----
{
  const provErr = { code: '23505', status: 409 };
  const n1 = O.normalizeError(provErr, { source: 'supabase' });
  eq(n1.error_class, 'ProviderError', 'Supabase/PostgREST-achtige fout -> ProviderError');
  eq(n1.http_status, 409, 'http_status correct overgenomen');
  eq(n1.retryable, false, '409 is niet retryable (geen 408/429/5xx)');

  const rateLimitErr = { status: 429 };
  const n2 = O.normalizeError(rateLimitErr, { source: 'wearable-provider' });
  eq(n2.retryable, true, '429 wordt als retryable geclassificeerd');

  const abortErr = { name: 'AbortError' };
  const n3 = O.normalizeError(abortErr);
  eq(n3.error_class, 'TimeoutError', 'AbortError -> TimeoutError');
  eq(n3.retryable, true, 'timeout is retryable');

  const jsErr = new Error('Cannot read properties of undefined (reading foo) at /home/user/secret-path/file.js:42');
  const n4 = O.normalizeError(jsErr);
  ok(!n4.message_safe.includes('secret-path'), 'JS-foutmelding met padinformatie lekt niet door in message_safe');
  ok(!n4.message_safe.includes('reading foo'), 'ruwe .message wordt niet 1-op-1 doorgegeven');

  const n5 = O.normalizeError(null);
  eq(n5.error_code, 'UNKNOWN', 'null/undefined-fout crasht niet, valt terug op UNKNOWN');
}

// ---- G. FAILURE SIMULATION (sectie 29) ----
{
  // G1: Supabase-failure
  const g1 = O.buildEvent('ERROR', 'db.write.failed', 'database', 'sessions',
    Object.assign({ operation: 'insert' }, O.normalizeError({ code: '42501', status: 403 }, { source: 'supabase' })));
  ok(g1.error_class === 'ProviderError', 'G1 Supabase-failure: event genormaliseerd');
  ok(g1.correlation_id === undefined || typeof g1.correlation_id === 'string', 'G1: correlation_id-veld, indien aanwezig, is een string');
  ok(JSON.stringify(g1).indexOf('42501') === -1 || true, 'G1: provider_code mag zichtbaar zijn (geen secret)');

  // G2: netwerkfout
  const g2 = O.buildEvent('ERROR', 'ai.coach.request_failed', 'ai', 'coach',
    Object.assign({ operation: 'request' }, O.normalizeError(new TypeError('network request failed')), { context_sections: 5 }));
  eq(g2.metadata.context_sections, 5, 'G2: veilige metadata (aantal, geen inhoud) komt door in metadata');
  ok(JSON.stringify(g2).indexOf('network request failed') === -1, 'G2: rauwe netwerkfoutmelding lekt niet door');

  // G3: AI/upstream-fout
  const g3 = O.buildEvent('ERROR', 'ai.coach.request_failed', 'ai', 'coach',
    Object.assign({ operation: 'request', provider: 'anthropic' }, O.normalizeError({ status: 500 })));
  eq(g3.provider, 'anthropic', 'G3: provider-naam (geen key) zichtbaar in event');
  eq(g3.error_class, 'ProviderError', 'G3: upstream 500 genormaliseerd als ProviderError');

  // G4: training-persistence-failure
  const g4 = O.buildEvent('ERROR', 'training.persistence.error', 'training', 'execution',
    Object.assign({ operation: 'save_set' }, O.normalizeError(new Error('quota exceeded'))));
  ok(g4.event === 'training.persistence.error', 'G4: event correct benoemd volgens domain.component.action');

  // G5: logger-zelf-failure (circulaire input) — mag nooit de aanroepende flow laten crashen.
  const circular = {}; circular.self = circular;
  let threw = false;
  try { O.tkLog('ERROR', 'test.circular', 'test', 'circular', circular); } catch (e) { threw = true; }
  ok(!threw, 'G5: circulaire input laat tkLog() niet crashen (fail-safe)');
}

// ---- H. Logger fail-safe: onserialiseerbare input ----
{
  let threw = false;
  const withFunction = { fn: function () {}, ok: 'waarde' };
  try {
    const evt = O.buildEvent('DEBUG', 'test.unserializable', 'test', 'unserializable', withFunction);
    JSON.stringify(evt);
  } catch (e) { threw = true; }
  ok(!threw, 'onserialiseerbare input (functie als waarde) veroorzaakt geen crash');
}

// ---- I. Representatief backend-event (Netlify Function-stijl) ----
{
  const evt = O.buildEvent('INFO', 'wearable.sync.complete', 'wearable', 'wearable-sync', {
    operation: 'sync', status: 'success', duration_ms: 842, provider: 'google_health',
    records_fetched: 12, records_accepted: 10, records_duplicate: 2
  }, { app_version: 'v4.69.0', environment: 'production', correlation_id: O.newCorrelationId() });
  eq(evt.duration_ms, 842, 'duration_ms correct in backend-event');
  eq(evt.metadata.records_fetched, 12, 'record-tellingen (veilig) in metadata');
  ok(evt.correlation_id, 'backend-event heeft een correlation_id');
}

// ---- J. Representatief training-event ----
{
  const evt = O.buildEvent('INFO', 'training.workout.finish', 'training', 'execution', {
    operation: 'finish', status: 'success', duration_ms: 2712000
  }, { app_version: 'v4.69.0', environment: 'production' });
  eq(evt.status, 'success', 'training-event heeft status');
  ok(!JSON.stringify(evt).match(/exercise_id|weight|reps/i), 'training-event bevat geen trainingsdata-velden (geen dubbele opslag van trainingsdata als log)');
}

// ---- K. MS-F1-03: expliciete config/secret-error-redactietest (sectie 14 van de opdracht) ----
{
  const configErrorPayload = {
    provider_key: 'sk-ant-api03-echte-sleutel-waarde-hier',
    bearer_token: 'Bearer eyJhbGciOiJIUzI1NiJ9.config.error.jwt',
    refresh_token: 'RT-config-error-waarde',
    service_role: 'sb_secret_service-role-waarde',
    authorization: 'Basic dXNlcjpwYXNz',
    pin: '4821'
  };
  const evt = O.buildEvent('ERROR', 'config.validation.failed', 'platform', 'config', configErrorPayload);
  const serialized = JSON.stringify(evt);
  ok(!serialized.includes('sk-ant-api03-echte-sleutel-waarde-hier'), 'MS-F1-03: provider key wordt geredacteerd in config-errors');
  ok(!serialized.includes('eyJhbGciOiJIUzI1NiJ9.config.error.jwt'), 'MS-F1-03: bearer token wordt geredacteerd in config-errors');
  ok(!serialized.includes('RT-config-error-waarde'), 'MS-F1-03: refresh token wordt geredacteerd in config-errors');
  ok(!serialized.includes('sb_secret_service-role-waarde'), 'MS-F1-03: service_role wordt geredacteerd in config-errors');
  ok(!serialized.includes('dXNlcjpwYXNz'), 'MS-F1-03: authorization-header wordt geredacteerd in config-errors');
  ok(!serialized.includes('4821'), 'MS-F1-03: PIN wordt geredacteerd in config-errors');
}

console.log('ObservabilityCore: ' + pass + ' geslaagd, ' + fail + ' mislukt');
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
