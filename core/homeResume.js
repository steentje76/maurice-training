/* ==========================================================================
 * TrainingKompas — HOME RESUME  (homeResume.v1)
 * --------------------------------------------------------------------------
 * GAP-P2-008. Beslist of een niet-afgeronde trainingsdraft op Home als
 * hervatbaar getoond mag worden, en naar welke BESTAANDE start-/resume-route
 * die actie leidt.
 *
 * ARCHITECTUUR: RAW DATA (de draft in localStorage, geschreven door
 * persistTrainingDraft) -> CALCULATION (dit bestand: telt gelogde sets, leest
 * de draft-identiteit) -> DECISION (dit bestand: hervatbaar ja/nee + reden +
 * route) -> UI (index.html: kaart tonen en naar de bestaande route navigeren).
 *
 * Dit bestand is puur en deterministisch: geen DOM, geen Supabase, geen
 * Date.now() binnenin (de aanroeper geeft 'now' expliciet mee), geen AI. Het
 * maakt GEEN sessie, GEEN training_instance en GEEN tweede executieketen; het
 * bepaalt uitsluitend of de bestaande keten aangeboden mag worden.
 *
 * BINDENDE REGELS (overgenomen uit de bestaande start-routes startT(),
 * startCustomTraining() en launchProgramTrainScreen(), niet nieuw bedacht):
 * - Alleen een draft van VANDAAG is hervatbaar (isSameLocalDay).
 * - Alleen een draft met daadwerkelijk gelogde data is hervatbaar
 *   (draftHasData): een leeg concept mag geen kaart opleveren.
 * - De draft-sleutel bepaalt het type: 'custom_<id>', 'prog_<blockId>' of
 *   anders een vaste training.
 * - Deze module wist nooit een draft en beslist nooit over verwijderen.
 * ========================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.HomeResumeCore = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSIE = 'homeResume.v1';

  /* Dezelfde dag in LOKALE tijd. De start-routes gebruiken exact deze regel om te bepalen of een
   * concept nog bij de trainingsdag van vandaag hoort. */
  function sameLocalDay(ts, now) {
    if (ts == null || ts === '') return false;
    var a = new Date(ts), b = new Date(now == null ? Date.now() : now);
    if (!isFinite(a.getTime()) || !isFinite(b.getTime())) return false;
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function setHasValue(s) {
    return !!(s && (s.kg || s.reps));
  }
  function cardioHasValue(c) {
    return !!(c && (c.time || c.dist || c.dist_km || c.cals || c.distance));
  }

  /* Bevat de draft daadwerkelijk gelogde (nog niet gesynchroniseerde) trainingsdata? Dit is de
   * bestaande draftHasData()-regel, hier als enige bron ondergebracht zodat Home en de start-routes
   * niet uit elkaar kunnen lopen. */
  function draftHasLoggedData(draft) {
    try {
      var sl = draft && draft.sessionLog;
      if (!sl) return false;
      return Object.keys(sl).some(function (k) {
        var l = sl[k];
        if (!l) return false;
        return (l.sets && l.sets.some(setHasValue)) ||
               (l.wu && l.wu.some(setHasValue)) ||
               cardioHasValue(l.cardio);
      });
    } catch (_) { return false; }
  }

  /* Telt wat er al gelogd is. Uitsluitend om de gebruiker te laten herkennen welke sessie hij
   * hervat — nooit een score of oordeel. */
  function summarizeDraft(draft) {
    var sets = 0, warmups = 0, cardio = 0, exercises = 0;
    try {
      var sl = (draft && draft.sessionLog) || {};
      Object.keys(sl).forEach(function (k) {
        var l = sl[k];
        if (!l) return;
        var s = (l.sets || []).filter(setHasValue).length;
        var w = (l.wu || []).filter(setHasValue).length;
        var c = cardioHasValue(l.cardio) ? 1 : 0;
        if (s || w || c) exercises++;
        sets += s; warmups += w; cardio += c;
      });
    } catch (_) { /* corrupte draft: telling blijft 0, de beslissing valt elders */ }
    return { sets: sets, warmups: warmups, cardio: cardio, exercises: exercises };
  }

  /* De draft-sleutel (curT) draagt het type. Deze prefixen zijn de bestaande conventie van
   * startCustomTraining() ('custom_' + id) en launchProgramTrainScreen() ('prog_' + blockId). */
  function resolveDraftRoute(t) {
    if (typeof t !== 'string' || !t.trim()) return { type: null, refId: null, route: null };
    if (t.indexOf('custom_') === 0) {
      var cid = t.slice(7);
      return cid ? { type: 'custom', refId: cid, route: 'startCustomTraining' } : { type: null, refId: null, route: null };
    }
    if (t.indexOf('prog_') === 0) {
      var bid = t.slice(5);
      return bid ? { type: 'program', refId: bid, route: 'startProgramBlockTraining' } : { type: null, refId: null, route: null };
    }
    return { type: 'vast', refId: t, route: 'startT' };
  }

  /* Eén beslissing, met expliciete reden. resumable=false is nooit een fout: het betekent alleen
   * dat Home geen kaart toont. Er wordt niets gewist en niets gestart. */
  function resolveResumeState(draft, now, opts) {
    var activeT = opts && opts.activeT ? opts.activeT : null;
    var base = { versie: VERSIE, resumable: false, reason: null, type: null, refId: null, ctxT: null,
      ts: null, instanceId: null, counts: { sets: 0, warmups: 0, cardio: 0, exercises: 0 } };
    if (!draft || typeof draft !== 'object') return Object.assign({}, base, { reason: 'NO_DRAFT' });
    var route = resolveDraftRoute(draft.t);
    if (!route.type) return Object.assign({}, base, { reason: 'INVALID_DRAFT' });
    var counts = summarizeDraft(draft);
    var partial = Object.assign({}, base, { type: route.type, refId: route.refId, ctxT: draft.t,
      route: route.route, ts: draft.ts == null ? null : draft.ts,
      instanceId: draft.instanceId == null ? null : draft.instanceId, counts: counts });
    if (!draftHasLoggedData(draft)) return Object.assign({}, partial, { reason: 'NO_LOGGED_DATA' });
    if (!sameLocalDay(draft.ts, now)) return Object.assign({}, partial, { reason: 'STALE_DIFFERENT_DAY' });
    /* De sessie draait al in dit app-exemplaar: het trainingsscherm toont hem zelf. Twee plekken die
     * dezelfde actieve training aanbieden zou dubbel zijn. */
    if (activeT && activeT === draft.t) return Object.assign({}, partial, { reason: 'ALREADY_ACTIVE' });
    return Object.assign({}, partial, { resumable: true, reason: 'RESUMABLE' });
  }

  return {
    versie: VERSIE,
    sameLocalDay: sameLocalDay,
    draftHasLoggedData: draftHasLoggedData,
    summarizeDraft: summarizeDraft,
    resolveDraftRoute: resolveDraftRoute,
    resolveResumeState: resolveResumeState
  };
});
