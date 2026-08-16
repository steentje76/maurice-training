/* Phase C — WeatherCore (canoniek weer + indoor/outdoor hard rule) + EvidenceCore
 * (entry-validatie + evidenceRefs). PURE. Realistische Open-Meteo/OpenWeather-payloads.
 * Draai: node core/fWeatherEvidence.test.js
 */
const W = require('./weather.js');
const E = require('./scientificEvidence.js');

let pass = 0, fail = 0;
function eq(a, b, m){ if (a === b) pass++; else { fail++; console.log('  ✗ ' + m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); } }
function ok(c, m){ if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function close(a, b, m, eps){ if (a!=null && Math.abs(a - b) <= (eps || 1e-6)) pass++; else { fail++; console.log('  ✗ ' + m + ' (verwacht ~' + b + ', kreeg ' + a + ')'); } }

// ── WEATHER UNIT CONVERSIES ──
close(W.toCelsius(20, 'c'), 20, '°C passthrough');
close(W.toCelsius(293.15, 'k'), 20, 'K→°C');
close(W.toCelsius(68, 'f'), 20, 'F→°C');
eq(W.toCelsius(20, 'onbekend'), null, 'onbekende temp-unit → null');
close(W.toMs(36, 'kmh'), 10, 'km/h→m/s');
close(W.toMs(10, 'ms'), 10, 'm/s passthrough');
close(W.toMs(10, 'mph'), 4.4704, 'mph→m/s');
eq(W.toMs(10, 'onbekend'), null, 'onbekende wind-unit → null');
close(W.toMmh(25.4, 'inh'), 645.16, 'inch/h→mm/h');

// ── OPEN-METEO NORMALISATIE (wind in km/h → m/s!) ──
const om = { current: { time:'2026-08-16T10:00', temperature_2m:18.4, apparent_temperature:17.1,
  relative_humidity_2m:65, wind_speed_10m:18, wind_gusts_10m:36, precipitation:0.5, uv_index:4, weather_code:3 } };
const wOM = W.normalizeWeather(om, W.OPENMETEO_MAP, {receivedAt:1700000000000, location_resolution:'city', observed_or_forecast:'observed'});
eq(wOM.schema, 'weather_canonical.v1', 'canoniek schema');
close(wOM.temperature_c, 18.4, 'OM temp 18.4°C');
close(wOM.feels_like_c, 17.1, 'OM feels_like 17.1°C');
eq(wOM.humidity_pct, 65, 'OM humidity 65%');
close(wOM.wind_ms, 5, 'OM wind 18 km/h → 5 m/s (canoniek)');
close(wOM.wind_gust_ms, 10, 'OM gust 36 km/h → 10 m/s');
close(wOM.precip_mmh, 0.5, 'OM precip 0.5 mm/h');
eq(wOM.uv_index, 4, 'OM uv 4');
eq(wOM.condition, '3', 'OM weather_code als tekst');
eq(wOM.quality.wind_ms, 'valid', 'OM wind quality valid');
eq(wOM.provenance.provider, 'open-meteo', 'OM provenance provider');
eq(wOM.observed_or_forecast, 'observed', 'OM observed-vlag');

// ── OPENWEATHER NORMALISATIE (wind m/s, rain.1h nested) ──
const ow = { current: { dt:1700000000, temp:18.4, feels_like:17.1, humidity:65,
  wind_speed:5, wind_gust:10, uvi:4, rain:{ '1h':0.5 }, weather:[{ main:'Clouds' }] } };
const wOW = W.normalizeWeather(ow, W.OPENWEATHER_MAP, {});
close(wOW.wind_ms, 5, 'OW wind 5 m/s passthrough');
close(wOW.precip_mmh, 0.5, 'OW rain.1h 0.5 → mm/h (nested path)');
eq(wOW.condition, 'Clouds', 'OW weather[0].main');
eq(wOW.temperature_c, 18.4, 'OW temp 18.4');

// ── MISSING/QUALITY: geen fabricage ──
const owMiss = { current: { dt:1, temp:18, humidity:60, wind_speed:3 } }; // geen uv, geen rain
const wMiss = W.normalizeWeather(owMiss, W.OPENWEATHER_MAP, {});
eq(wMiss.uv_index, null, 'ontbrekende UV → null');
eq(wMiss.quality.uv_index, 'empty', 'ontbrekende UV → quality empty');
eq(wMiss.precip_mmh, null, 'ontbrekende neerslag → null (geen 0 verzonnen)');
// onwaarschijnlijk → implausible, waarde behouden
const wHot = W.normalizeWeather({current:{dt:1,temp:120,humidity:50,wind_speed:1}}, W.OPENWEATHER_MAP, {});
eq(wHot.quality.temperature_c, 'implausible', 'temp 120°C → implausible (boven max)');
close(wHot.temperature_c, 120, 'implausibele temp behoudt waarde');

// ── INDOOR/OUTDOOR HARD RULE ──
eq(W.weatherApplies({outdoor:true, modality:'run'}), true, 'outdoor run → weer telt');
eq(W.weatherApplies({outdoor:true, modality:'cycling'}), true, 'outdoor cycling → weer telt');
eq(W.weatherApplies({outdoor:false, modality:'run'}), false, 'indoor run → weer telt NIET');
eq(W.weatherApplies({modality:'run'}), false, 'outdoor onbekend → weer telt NIET (nooit gokken)');
eq(W.weatherApplies({outdoor:true, modality:'strength'}), false, 'outdoor krachttraining → niet weergevoelig');
eq(W.weatherApplies({outdoor:true, modality:'row'}), false, 'indoor-row-modality → niet weergevoelig');
eq(W.weatherApplies({}), false, 'geen context → geen invloed');

// ── WEATHER ADAPTER CONTRACT ──
eq(W.isWeatherAdapter({}).ok, false, 'leeg object geen adapter');
const wad = {}; W.WEATHER_ADAPTER_METHODS.forEach(m=>wad[m]=function(){});
eq(W.isWeatherAdapter(wad).ok, true, 'volledige weer-adapter geldig');

// ── EVIDENCE: entry-validatie ──
const fullEntry = { id:'ev1', source:'PubMed', title:'RPE en herstel', date:'2024-01-01',
  identifier:'10.1000/xyz', study_type:'meta_analysis', confidence:'high', validated_by:'curator1', version:'1' };
eq(E.validateEntry(fullEntry).status, 'validated', 'volledige entry → validated');
eq(E.validateEntry({id:'x', source:'PubMed', title:'t'}).status, 'unvalidated', 'ontbrekende metadata → unvalidated');
ok(E.validateEntry({id:'x'}).missing.indexOf('identifier') !== -1, 'ontbrekend doi/identifier gerapporteerd');
eq(E.validateEntry(Object.assign({}, fullEntry, {study_type:'blog'})).status, 'unvalidated', 'onbekend study_type → unvalidated');
eq(E.evidenceId({source:'PubMed', identifier:'10.1/x'}), 'pubmed:10.1/x', 'evidenceId uit source:doi');
eq(E.evidenceId({id:'expliciet'}), 'expliciet', 'expliciete id wint');

// ── EVIDENCE: refs + store ──
eq(E.parseRef('ev1@2').id, 'ev1', 'parseRef id');
eq(E.parseRef('ev1@2').version, '2', 'parseRef version');
eq(E.parseRef('ev1').version, null, 'parseRef zonder versie');
const store = E.makeStore([ fullEntry, { id:'ev2', source:'PubMed', title:'incompleet' } ]);
eq(store.get('ev1').status, 'validated', 'store: ev1 validated');
eq(store.get('ev2').status, 'unvalidated', 'store: ev2 unvalidated (mist metadata)');
// resolveRefs
eq(E.resolveRefs(['ev1@1'], store).allValidated, true, 'ref naar validated ev1@1 → allValidated');
eq(E.resolveRefs(['ev1@9'], store).versionMismatch.length, 1, 'verkeerde versie → versionMismatch');
eq(E.resolveRefs(['ev2'], store).unvalidated.length, 1, 'ref naar unvalidated → unvalidated-lijst');
eq(E.resolveRefs(['onbekend'], store).missing.length, 1, 'onbekende ref → missing');

// ── EVIDENCE: ruleBacking (unvalidated mag geen regel voeden) ──
eq(E.ruleBacking({evidenceRefs:['ev1@1']}, store).backed, true, 'regel met validated ref → backed');
eq(E.ruleBacking({evidenceRefs:['ev2']}, store).backed, false, 'regel met unvalidated ref → NIET backed');
eq(E.ruleBacking({evidenceRefs:['ev2']}, store).reason, 'unvalidated-evidence', 'reden: unvalidated-evidence');
eq(E.ruleBacking({}, store).backed, false, 'regel zonder refs → niet backed');
eq(E.ruleBacking({}, store).reason, 'no-refs', 'reden: no-refs (geen stille onderbouwing)');
eq(E.ruleBacking({evidenceRefs:['weg']}, store).reason, 'missing-evidence', 'reden: missing-evidence');

console.log('\nPhase C weather+evidence: RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
