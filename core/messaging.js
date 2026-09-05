/* ==========================================================================
 * TrainingKompas — MESSAGING CORE (MS-F-MESSAGING-01)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC. UI is NOOIT de security boundary -- deze module
 * dient voor consistente client-logica; de database-RLS (message_threads/
 * message_participants/messages policies) blijft de daadwerkelijke bron
 * van waarheid en moet hiermee 1:1 overeenkomen.
 *
 * AI COACH != HUMAN COACH: iedere message heeft een expliciete sender_type
 * (ATHLETE/HUMAN_COACH/AI_COACH/SYSTEM). Deze module garandeert dat de UI
 * nooit AI Coach als Human Coach kan renderen of omgekeerd, en dat een
 * client nooit een sender_user_id/sender_type kan claimen die niet bij de
 * ingelogde gebruiker hoort (afgedwongen server-side door m_insert_own_sender).
 *
 * MESSAGING GEEFT NOOIT TOEGANG TOT HEALTH/RECOVERY/WOMENS_PERFORMANCE/
 * NUTRITION-DATA: de messages/threads-tabellen bevatten uitsluitend
 * conversatie-metadata en tekst, geen verwijzing naar of kopie van
 * gezondheidsdata. Toegang tot die data blijft uitsluitend via
 * CoachAccessCore.hasScope() lopen (ongewijzigd, apart governance-pad).
 * ========================================================================== */
(function (global) {
  'use strict';

  var VERSIONS = { schema: 'messaging.v1' };
  var THREAD_TYPES = ['DIRECT', 'COACH_ATHLETE', 'GROUP', 'TEAM'];
  var SENDER_TYPES = ['ATHLETE', 'HUMAN_COACH', 'AI_COACH', 'SYSTEM'];
  var PARTICIPANT_ROLES = ['ATHLETE', 'HUMAN_COACH', 'MEMBER'];

  /* isParticipant: puur, client-side spiegel van is_thread_participant().
   * Wordt gebruikt om UI te tonen/verbergen -- NOOIT als enige controle
   * (de server-side RLS-policy is de echte grens). */
  function isParticipant(userId, threadId, participants) {
    if (!userId || !threadId || !Array.isArray(participants)) return false;
    return participants.some(function (p) { return p.thread_id === threadId && p.user_id === userId; });
  }

  /* canCreateDirectThread: DIRECT-threads mogen door elke ingelogde
   * gebruiker aangemaakt worden (spiegelt mt_insert_direct: geen extra
   * voorwaarde behalve thread_type='DIRECT'). */
  function canCreateDirectThread(userId) {
    return !!userId;
  }

  /* canCreateCoachAthleteThread: spiegelt mt_insert_coach_athlete -- vereist
   * een ACTIEVE relationship waarin de aanroepende gebruiker coach of
   * athlete is. Geen nieuwe autorisatie -- hergebruikt exact dezelfde
   * relationship-shape als CoachAccessCore. */
  function canCreateCoachAthleteThread(userId, relationship) {
    if (!userId || !relationship) return false;
    if (relationship.status !== 'active') return false;
    return relationship.coach_user_id === userId || relationship.athlete_user_id === userId;
  }

  /* resolveSenderType: bepaalt het correcte, tonbare sender_type voor een
   * gegeven, geverifieerde context -- NOOIT client-supplied vertrouwen voor
   * de daadwerkelijke database-insert (die valideert sender_user_id server-
   * side), maar wel gebruikt om consistent te renderen. */
  function resolveSenderType(userId, relationship, isAiCoachContext) {
    if (isAiCoachContext) return 'AI_COACH';
    if (!relationship) return 'ATHLETE';
    if (relationship.coach_user_id === userId) return 'HUMAN_COACH';
    if (relationship.athlete_user_id === userId) return 'ATHLETE';
    return 'ATHLETE';
  }

  /* canSendMessage: puur, client-side spiegel van m_insert_own_sender --
   * sender_type mag nooit SYSTEM zijn vanuit de client, sender moet
   * participant zijn, mag niet geblokkeerd zijn, thread moet actief zijn,
   * en een bestaande social-block (in welke richting dan ook, naar een
   * andere participant) blokkeert eveneens (fail-closed, spiegelt "block
   * wint altijd" uit MS-F9-01/03). */
  function canSendMessage(userId, threadId, participants, senderType, thread, blocks) {
    if (senderType === 'SYSTEM') return false;
    if (SENDER_TYPES.indexOf(senderType) === -1) return false;
    if (!isParticipant(userId, threadId, participants)) return false;
    if (thread !== undefined && !isValidThreadState(thread)) return false;
    var self = (participants || []).find(function (p) { return p.thread_id === threadId && p.user_id === userId; });
    if (self && self.is_blocked) return false;
    if (Array.isArray(blocks)) {
      var otherParticipants = (participants || []).filter(function (p) { return p.thread_id === threadId && p.user_id !== userId; });
      var blocked = otherParticipants.some(function (p) { return blockPreventsFurtherMessages(userId, p.user_id, blocks); });
      if (blocked) return false;
    }
    return true;
  }

  /* renderSenderLabel: garandeert dat AI Coach en Human Coach nooit
   * onderling verwisseld worden in de UI, en dat een onbekend/ongeldig
   * sender_type nooit stilzwijgend als een van beide wordt getoond. */
  function renderSenderLabel(senderType) {
    switch (senderType) {
      case 'HUMAN_COACH': return { label: 'Coach', isAi: false, isHuman: true };
      case 'AI_COACH': return { label: 'AI Coach', isAi: true, isHuman: false };
      case 'ATHLETE': return { label: 'Jij', isAi: false, isHuman: false };
      case 'SYSTEM': return { label: 'Systeem', isAi: false, isHuman: false };
      default: return { label: 'Onbekend', isAi: false, isHuman: false, unknownType: true };
    }
  }

  /* canSendCoachAthleteMessage: spiegelt de aangescherpte m_insert_own_sender
   * (PO-besluit: revoked/ended relationship -> thread wordt READ-ONLY).
   * Elke status anders dan 'active' blokkeert een NIEUW bericht -- history
   * blijft via de (ongewijzigde) SELECT-policy leesbaar zolang je
   * participant bent en niet geblokkeerd. Dit is dus uitsluitend een
   * schrijf-blokkade, geen leesblokkade. */
  function canSendCoachAthleteMessage(userId, relationship) {
    if (!userId || !relationship) return false;
    if (relationship.status !== 'active') return false;
    return relationship.coach_user_id === userId || relationship.athlete_user_id === userId;
  }
  function unreadCount(lastReadAt, messages) {
    if (!Array.isArray(messages)) return 0;
    if (!lastReadAt) return messages.length;
    var cutoff = new Date(lastReadAt).getTime();
    return messages.filter(function (m) { return new Date(m.created_at).getTime() > cutoff; }).length;
  }

  /* canReadHistoricalMessagesAfterRevocation: PO-BESLUIT (definitief,
   * niet langer open): bestaande message history blijft behouden en
   * leesbaar na revocation/end -- de thread wordt READ-ONLY (geen nieuwe
   * berichten), niet ontoegankelijk. Revocation verwijdert geen
   * participant-rij. EXPLICIETE UITZONDERING: een actieve social-block
   * blijft sterker en kan leestoegang alsnog verder beperken (block
   * wint altijd, MS-F9-01/03) -- deze functie regelt uitsluitend het
   * revocation-aspect, niet block. */
  function canReadHistoricalMessagesAfterRevocation(userId, threadId, participants, blocks) {
    if (!isParticipant(userId, threadId, participants)) return false;
    var self = (participants || []).find(function (p) { return p.thread_id === threadId && p.user_id === userId; });
    if (self && self.is_blocked) return false;
    return true;
  }

  /* blockPreventsFurtherMessages: messaging mag NOOIT een bypass zijn van
   * een bestaande, canonical social-block (MS-F9-01/03: "block wint
   * altijd"). Puur, deterministisch: als de afzender OF ontvanger een
   * actieve block-relatie heeft (in welke richting dan ook), mag geen
   * nieuw bericht worden verstuurd -- ongeacht thread-participantschap. */
  function blockPreventsFurtherMessages(senderId, recipientId, blocks) {
    if (!Array.isArray(blocks)) return false;
    return blocks.some(function (b) {
      return (b.blocker_id === senderId && b.blocked_id === recipientId) ||
             (b.blocker_id === recipientId && b.blocked_id === senderId);
    });
  }

  /* isValidThreadState: fail-closed helper voor error/retry-scenario's --
   * een gesloten of niet-bestaande thread mag nooit een nieuw bericht
   * accepteren, ongeacht participantschap. */
  function isValidThreadState(thread) {
    return !!thread && thread.status === 'active';
  }

  var MessagingCore = {
    VERSIONS: VERSIONS,
    THREAD_TYPES: THREAD_TYPES,
    SENDER_TYPES: SENDER_TYPES,
    PARTICIPANT_ROLES: PARTICIPANT_ROLES,
    isParticipant: isParticipant,
    canCreateDirectThread: canCreateDirectThread,
    canCreateCoachAthleteThread: canCreateCoachAthleteThread,
    resolveSenderType: resolveSenderType,
    canSendMessage: canSendMessage,
    canSendCoachAthleteMessage: canSendCoachAthleteMessage,
    renderSenderLabel: renderSenderLabel,
    unreadCount: unreadCount,
    canReadHistoricalMessagesAfterRevocation: canReadHistoricalMessagesAfterRevocation,
    blockPreventsFurtherMessages: blockPreventsFurtherMessages,
    isValidThreadState: isValidThreadState
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = MessagingCore; }
  else { global.MessagingCore = MessagingCore; }
})(typeof window !== 'undefined' ? window : this);
