/* core/socialIntelligence.js — B9-08 Social Intelligence.
 *
 * Pure, deterministische aggregatie-laag boven reeds bestaande,
 * geautoriseerde Social-data (B9-07). Geen DOM/database/network-
 * toegang. Geen tweede social graph, geen tweede challenge-engine,
 * geen tweede adherence-engine -- hergebruikt uitsluitend
 * SocialChallengeCore.aggregateProgress()/challengeStatus() en
 * (elders, op UI-niveau) AdherenceIntelligenceCore voor consistency.
 *
 * HARDE PRINCIPES (zie docs/B9_08_SOCIAL_INTELLIGENCE_REPORT.md):
 * - Relevance over engagement: geen vanity metrics, geen popularity
 *   percentile, geen engagementscore.
 * - Privacy before intelligence: de caller MOET al-gefilterde,
 *   geautoriseerde data aanleveren (na RLS/blocking) -- deze module
 *   filtert zelf niets op privacy, ze aggregeert alleen wat al
 *   toegestaan binnenkomt. AUTHORIZED DATA -> aggregate -> UX.
 * - Missing != zero, error != empty: elke functie retourneert een
 *   expliciete data_quality-status i.p.v. een fabricage.
 *
 * BEWUST NIET GEBOUWD in B9-08 (expliciete, toegestane uitkomsten,
 * zie het rapport): ranking/leaderboard, athlete-to-athlete
 * comparison, recommendations (buiten wat B9-07 al toont), AI-
 * integratie (geen bewezen toegevoegde waarde binnen deze sprint).
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.SocialIntelligenceCore = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSIONS = { schema: 'social_intelligence.v1' };

  function isArr(v) { return Array.isArray(v); }

  // Sectie 6 (Social activity summary): pure telling van reeds-
  // geautoriseerde, binnengekomen data. Geen vanity metrics, geen
  // percentiel, geen score -- uitsluitend concrete, bruikbare aantallen.
  // 'null' input voor een categorie betekent "nog niet geladen/fout"
  // (data_quality wordt dan NOT_AVAILABLE voor die categorie), een lege
  // array betekent "0, daadwerkelijk leeg" (COMPLETE).
  function activitySummary(input) {
    var out = { schema: VERSIONS.schema, generated_at: null, data_quality: {} };
    var velden = ['activeChallenges', 'pendingFollowRequests', 'unreadNotifications', 'recentReactionsOnOwnShares'];
    velden.forEach(function (veld) {
      var lijst = input ? input[veld] : undefined;
      if (lijst === undefined || lijst === null) {
        out[veld] = null;
        out.data_quality[veld] = 'NOT_AVAILABLE';
      } else if (isArr(lijst)) {
        out[veld] = lijst.length;
        out.data_quality[veld] = 'COMPLETE';
      } else {
        out[veld] = null;
        out.data_quality[veld] = 'NOT_AVAILABLE';
      }
    });
    return out;
  }

  // Sectie 7 (Challenge intelligence): hergebruikt uitsluitend
  // SocialChallengeCore -- geen eigen progressie-/statusberekening.
  // Retourneert per challenge de reeds-canonieke progressie, resterend
  // doel (indien een target_value op de challenge staat -- optioneel,
  // afwezig is geen fout), status en deelnamestatus. GEEN ranking:
  // expliciet, bewust niet geimplementeerd (zie sectie 7 van de opdracht,
  // "Als ranking onvoldoende verantwoord is: niet implementeren").
  function challengeIntelligence(challenge, ownSessions, todayStr, SocialChallengeCore) {
    if (!SocialChallengeCore || typeof SocialChallengeCore.aggregateProgress !== 'function') {
      return { schema: VERSIONS.schema, status: 'invalid', reason: 'social_challenge_core_missing' };
    }
    if (!challenge || !challenge.id || !challenge.starts_at || !challenge.ends_at) {
      return { schema: VERSIONS.schema, status: 'NOT_AVAILABLE', reason: 'no_challenge' };
    }
    if (!isArr(ownSessions)) {
      return { schema: VERSIONS.schema, status: 'NOT_AVAILABLE', reason: 'sessions_not_loaded', challenge_id: challenge.id };
    }
    var progress = SocialChallengeCore.aggregateProgress(ownSessions, challenge.starts_at, challenge.ends_at);
    var status = SocialChallengeCore.challengeStatus(challenge.starts_at, challenge.ends_at, todayStr);
    return {
      schema: VERSIONS.schema, status: 'valid',
      challenge_id: challenge.id, challenge_status: status,
      own_progress_count: progress,
      period: { starts_at: challenge.starts_at, ends_at: challenge.ends_at },
      provenance: { source: 'training_instances', calculation: 'SocialChallengeCore.aggregateProgress' }
    };
  }

  // Sectie 12 (Notification intelligence): deterministische groepering
  // van gelijksoortige, ongelezen events op hetzelfde target-object.
  // "3 nieuwe reacties op je activiteit" i.p.v. drie losse kaarten.
  // Puur groeperen -- geen nieuwe informatie, geen AI, geen inferentie.
  function groupNotifications(notifications) {
    if (!isArr(notifications)) return { schema: VERSIONS.schema, status: 'NOT_AVAILABLE', groups: [] };
    var buckets = {};
    var volgorde = [];
    notifications.forEach(function (n) {
      if (!n || !n.event_type || !n.target_type || !n.target_id) return;
      var sleutel = n.event_type + '|' + n.target_type + '|' + n.target_id;
      if (!buckets[sleutel]) { buckets[sleutel] = { event_type: n.event_type, target_type: n.target_type, target_id: n.target_id, ids: [], any_unread: false }; volgorde.push(sleutel); }
      buckets[sleutel].ids.push(n.id);
      if (!n.read_at) buckets[sleutel].any_unread = true;
    });
    var groups = volgorde.map(function (sleutel) {
      var b = buckets[sleutel];
      return { event_type: b.event_type, target_type: b.target_type, target_id: b.target_id, count: b.ids.length, notification_ids: b.ids, any_unread: b.any_unread };
    });
    return { schema: VERSIONS.schema, status: 'valid', groups: groups };
  }

  return {
    VERSIONS: VERSIONS,
    activitySummary: activitySummary,
    challengeIntelligence: challengeIntelligence,
    groupNotifications: groupNotifications
  };
}));
