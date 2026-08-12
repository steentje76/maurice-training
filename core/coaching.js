/* ==========================================================================
 * TrainingKompas — COACHING CORE  (F6.1/F6.2 — Adaptive Coaching Foundation)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE. Geen DOM, geen Supabase/fetch,
 * geen localStorage, geen AI, geen Date, geen globale mutable state. INPUT -> OUTPUT.
 *
 * CoachingCore is de DETERMINISTISCHE SIGNAALLAAG tussen de rekenkernen en de AI.
 * Het BEREKENT NIETS zelf: het ontvangt reeds-berekende prestatiefeiten (uit
 * ProgressionCore/CalcCore/CardioCore) en zet die om in benoemde, versioned
 * coaching-signalen + status + prioriteit.
 *
 * AI-BOUNDARY (F6.3): de AI mag deze signalen later VERWOORDEN ("je was iets sterker"),
 * maar NOOIT zelf getallen/PR's/trends berekenen. Alle numerieke waarheid komt van buiten.
 * ==========================================================================*/
(function (global) {
  'use strict';

  var VERSIONS = { signals: 'coaching_signals.v1', context: 'coaching_context.v1' };

  // Prioriteit bepaalt welk signaal het "belangrijkste" is (voor ordening/uitlichting).
  // Hoger = belangrijker. Bewust expliciet zodat de UI/AI nooit hoeft te raden.
  var PRIORITY = {
    new_best: 100,
    trend_up: 80,
    improved: 70,
    declined: 60,
    trend_down: 55,
    trend_stable: 50,
    stable: 40,
    repeated_performance: 40,
    first_session: 35,
    insufficient_history: 30,
    unknown: 0
  };

  function priorityFor(signals) {
