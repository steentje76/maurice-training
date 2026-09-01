/* core/enduranceExecution.js — B9-04 Cycling Core.
 *
 * Canonieke, pure execution state machine + timer-engine voor ALLE
 * endurance-sporten (running, cycling, en toekomstig rowing/swimming).
 * Geen DOM/database/network-toegang (Calculation/Decision Core purity,
 * consistent met core/calculation.js en core/decision.js).
 *
 * ARCHITECTUURBESLISSING (B9-04, sectie 7/8 van de opdracht): een deep
 * audit van core/runningExecution.js (B9-02B) bevestigde dat de kern
 * -- state machine, timer, laps -- volledig sport-neutraal was: geen
 * enkele aanname over afstand-eenheden, pace, of andere running-
 * specifieke semantiek. De enige "Running"-verwijzingen waren de
 * bestandsnaam/module-exportnaam en de statuswaarde 'RUNNING' zelf
 * (een generiek state-machine-label voor "actief bezig", vergelijkbaar
 * met "ACTIVE" -- geen sport-claim). Deze module is het resultaat van
 * die generalisatie: identieke logica, sport-neutrale naam.
 *
 * VEILIGHEIDSKEUZE: core/runningExecution.js blijft ONGEWIJZIGD bestaan
 * als dunne, backward-compatible alias naar deze module (zie dat
 * bestand) -- geen enkele bestaande Running-aanroep (index.html)
 * hoefde aangepast te worden, nul regressierisico. Cycling gebruikt
 * deze module rechtstreeks via een nieuwe, generieke naam.
 *
 * De statuswaarde 'RUNNING' is bewust NIET hernoemd naar bijv. 'ACTIVE'
 * -- dat zou alle bestaande Running-integratiecode moeten aanraken voor
 * een puur cosmetische wijziging zonder functionele waarde, wat het
 * regressierisico onnodig zou vergroten (sectie 9: "Running mag niet
 * breken"). De naam is intern een neutraal label, geen sport-aanname.
 *
 * KRITIEK (sectie 14): setInterval() is NOOIT de bron van waarheid voor
 * verstreken tijd. Alle tijd wordt deterministisch afgeleid uit
 * timestamps + een lijst van segmenten (actief/gepauzeerd). Een UI-laag
 * mag setInterval() gebruiken om de weergave elke seconde te verversen,
 * maar moet daarvoor telkens elapsedActiveMs() opnieuw aanroepen --
 * nooit een lokale teller ophogen.
 *
 * State machine (sectie 13):
 *   READY -> RUNNING -> PAUSED -> RUNNING -> ... -> FINISH_CONFIRM -> COMPLETED
 *   Elke status kan naar INTERRUPTED (bijv. bij een onherstelbare crash).
 *   COMPLETED en INTERRUPTED zijn eindstaten: geen transities meer mogelijk.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.EnduranceExecutionCore = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSIONS = { execution: 'endurance_execution.v1' };

  // Expliciete, gesloten transitietabel (sectie 4) -- elke niet hierin
  // genoemde overgang is per definitie ongeldig.
  var TRANSITIONS = {
    READY: ['RUNNING'],
    RUNNING: ['PAUSED', 'FINISH_CONFIRM', 'INTERRUPTED'],
    PAUSED: ['RUNNING', 'FINISH_CONFIRM', 'INTERRUPTED'],
    FINISH_CONFIRM: ['COMPLETED', 'RUNNING', 'PAUSED', 'INTERRUPTED'],
    COMPLETED: [],
    INTERRUPTED: []
  };

  function canTransition(from, to) {
    return !!(TRANSITIONS[from] && TRANSITIONS[from].indexOf(to) !== -1);
  }

  function createSession(nowMs) {
    return {
      schema: VERSIONS.execution,
      status: 'READY',
      startedAt: null,
      segments: [], // [{type:'active'|'paused', from, to|null}]
      laps: [],
      preFinishStatus: null // onthoudt RUNNING/PAUSED zodat cancelFinish() correct kan terugkeren
    };
  }

  function start(state, nowMs) {
    if (!canTransition(state.status, 'RUNNING')) return { ok: false, reason: 'invalid_transition', from: state.status, to: 'RUNNING', state: state };
    if (state.status !== 'READY') return { ok: false, reason: 'invalid_transition', from: state.status, to: 'RUNNING', state: state };
    var next = clone(state);
    next.status = 'RUNNING';
    next.startedAt = nowMs;
    next.segments.push({ type: 'active', from: nowMs, to: null });
    return { ok: true, state: next };
  }

  function pause(state, nowMs) {
    if (!canTransition(state.status, 'PAUSED')) return { ok: false, reason: 'invalid_transition', from: state.status, to: 'PAUSED', state: state };
    var next = clone(state);
    closeOpenSegment(next, nowMs);
    next.status = 'PAUSED';
    next.segments.push({ type: 'paused', from: nowMs, to: null });
    return { ok: true, state: next };
  }

  function resume(state, nowMs) {
    if (!canTransition(state.status, 'RUNNING')) return { ok: false, reason: 'invalid_transition', from: state.status, to: 'RUNNING', state: state };
    var next = clone(state);
    closeOpenSegment(next, nowMs);
    next.status = 'RUNNING';
    next.segments.push({ type: 'active', from: nowMs, to: null });
    return { ok: true, state: next };
  }

  function requestFinish(state, nowMs) {
    if (!canTransition(state.status, 'FINISH_CONFIRM')) return { ok: false, reason: 'invalid_transition', from: state.status, to: 'FINISH_CONFIRM', state: state };
    var next = clone(state);
    next.preFinishStatus = state.status; // onthoud RUNNING/PAUSED voor een eventuele cancel
    closeOpenSegment(next, nowMs);
    next.status = 'FINISH_CONFIRM';
    return { ok: true, state: next };
  }

  function cancelFinish(state, nowMs) {
    if (state.status !== 'FINISH_CONFIRM') return { ok: false, reason: 'invalid_transition', from: state.status, to: state.preFinishStatus, state: state };
    var terug = state.preFinishStatus === 'PAUSED' ? 'PAUSED' : 'RUNNING';
    var next = clone(state);
    next.status = terug;
    next.preFinishStatus = null;
    next.segments.push({ type: terug === 'RUNNING' ? 'active' : 'paused', from: nowMs, to: null });
    return { ok: true, state: next };
  }

  function confirmFinish(state, nowMs) {
    if (!canTransition(state.status, 'COMPLETED')) return { ok: false, reason: 'invalid_transition', from: state.status, to: 'COMPLETED', state: state };
    var next = clone(state);
    next.status = 'COMPLETED';
    next.finishedAt = nowMs;
    return { ok: true, state: next };
  }

  function interrupt(state, nowMs, reason) {
    if (!canTransition(state.status, 'INTERRUPTED')) return { ok: false, reason: 'invalid_transition', from: state.status, to: 'INTERRUPTED', state: state };
    var next = clone(state);
    closeOpenSegment(next, nowMs);
    next.status = 'INTERRUPTED';
    next.interruptedReason = reason || 'unknown';
    return { ok: true, state: next };
  }

  // Deterministisch: som van alle 'active'-segmenten, inclusief het
  // eventueel nog open segment (to=null) tot en met nowMs. Nooit een
  // losse, opgehoogde teller -- altijd herberekend uit de segmentenlijst.
  function elapsedActiveMs(state, nowMs) {
    var totaal = 0;
    state.segments.forEach(function (s) {
      if (s.type !== 'active') return;
      var eind = s.to != null ? s.to : nowMs;
      totaal += Math.max(0, eind - s.from);
    });
    return totaal;
  }

  function elapsedPausedMs(state, nowMs) {
    var totaal = 0;
    state.segments.forEach(function (s) {
      if (s.type !== 'paused') return;
      var eind = s.to != null ? s.to : nowMs;
      totaal += Math.max(0, eind - s.from);
    });
    return totaal;
  }

  // Handmatige lap (sectie 8): lap_index = laps.length+1, duration =
  // ACTIEVE tijd sinds de vorige lap (of sinds start als het de eerste
  // lap is) -- gepauzeerde tijd telt nooit mee als actieve looptijd
  // (sabotagescenario 1 uit sectie 27).
  function addLap(state, nowMs, lapData) {
    if (state.status !== 'RUNNING') return { ok: false, reason: 'lap_only_while_running', state: state };
    var next = clone(state);
    var vorigeGrens = next.laps.length ? next.laps[next.laps.length - 1]._grensMs : next.startedAt;
    var lapActiveMs = elapsedActiveMs(state, nowMs) - elapsedActiveMs(state, vorigeGrens);
    next.laps.push({
      lap_index: next.laps.length + 1,
      duration_seconds: Math.round(lapActiveMs / 1000),
      distance_meters: lapData && isFinite(lapData.distance_meters) ? lapData.distance_meters : null,
      avg_heart_rate_bpm: lapData && isFinite(lapData.avg_heart_rate_bpm) ? lapData.avg_heart_rate_bpm : null,
      _grensMs: nowMs
    });
    return { ok: true, state: next };
  }

  function closeOpenSegment(state, nowMs) {
    var laatste = state.segments[state.segments.length - 1];
    if (laatste && laatste.to == null) laatste.to = nowMs;
  }

  function clone(state) {
    return JSON.parse(JSON.stringify(state));
  }

  return {
    VERSIONS: VERSIONS,
    canTransition: canTransition,
    createSession: createSession,
    start: start,
    pause: pause,
    resume: resume,
    requestFinish: requestFinish,
    cancelFinish: cancelFinish,
    confirmFinish: confirmFinish,
    interrupt: interrupt,
    elapsedActiveMs: elapsedActiveMs,
    elapsedPausedMs: elapsedPausedMs,
    addLap: addLap
  };
}));
