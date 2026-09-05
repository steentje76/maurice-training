'use strict';
const assert = require('assert');
const MessagingCore = require('./messaging.js');

let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); pass++; }
  catch (e) { fail++; console.log('MISLUKT:', label, '-', e.message); }
}

// -- Basis contract --------------------------------------------------------
t('VERSIONS/THREAD_TYPES/SENDER_TYPES gedefinieerd', () => {
  assert.strictEqual(MessagingCore.VERSIONS.schema, 'messaging.v1');
  assert.deepStrictEqual(MessagingCore.THREAD_TYPES, ['DIRECT', 'COACH_ATHLETE', 'GROUP', 'TEAM']);
  assert.deepStrictEqual(MessagingCore.SENDER_TYPES, ['ATHLETE', 'HUMAN_COACH', 'AI_COACH', 'SYSTEM']);
});

// -- isParticipant -----------------------------------------------------------
t('isParticipant: true wanneer user in participants-lijst staat', () => {
  const parts = [{ thread_id: 't1', user_id: 'a' }];
  assert.strictEqual(MessagingCore.isParticipant('a', 't1', parts), true);
});
t('isParticipant: false voor niet-participant (kern-adversarial-check)', () => {
  const parts = [{ thread_id: 't1', user_id: 'a' }];
  assert.strictEqual(MessagingCore.isParticipant('b', 't1', parts), false);
});
t('isParticipant: false bij ontbrekende/lege input', () => {
  assert.strictEqual(MessagingCore.isParticipant(null, 't1', []), false);
  assert.strictEqual(MessagingCore.isParticipant('a', null, []), false);
  assert.strictEqual(MessagingCore.isParticipant('a', 't1', null), false);
});

// -- canCreateDirectThread ---------------------------------------------------
t('canCreateDirectThread: true voor elke ingelogde user', () => {
  assert.strictEqual(MessagingCore.canCreateDirectThread('u1'), true);
});
t('canCreateDirectThread: false zonder userId', () => {
  assert.strictEqual(MessagingCore.canCreateDirectThread(null), false);
});

// -- canCreateCoachAthleteThread (spiegelt mt_insert_coach_athlete) ----------
t('canCreateCoachAthleteThread: true voor coach in actieve relatie', () => {
  const rel = { status: 'active', coach_user_id: 'coach1', athlete_user_id: 'ath1' };
  assert.strictEqual(MessagingCore.canCreateCoachAthleteThread('coach1', rel), true);
});
t('canCreateCoachAthleteThread: true voor athlete in actieve relatie', () => {
  const rel = { status: 'active', coach_user_id: 'coach1', athlete_user_id: 'ath1' };
  assert.strictEqual(MessagingCore.canCreateCoachAthleteThread('ath1', rel), true);
});
t('canCreateCoachAthleteThread: false bij pending relatie (adversarial)', () => {
  const rel = { status: 'pending', coach_user_id: 'coach1', athlete_user_id: 'ath1' };
  assert.strictEqual(MessagingCore.canCreateCoachAthleteThread('coach1', rel), false);
});
t('canCreateCoachAthleteThread: false bij revoked relatie (adversarial)', () => {
  const rel = { status: 'revoked', coach_user_id: 'coach1', athlete_user_id: 'ath1' };
  assert.strictEqual(MessagingCore.canCreateCoachAthleteThread('coach1', rel), false);
});
t('canCreateCoachAthleteThread: false voor derde, niet-betrokken user (adversarial)', () => {
  const rel = { status: 'active', coach_user_id: 'coach1', athlete_user_id: 'ath1' };
  assert.strictEqual(MessagingCore.canCreateCoachAthleteThread('stranger', rel), false);
});
t('canCreateCoachAthleteThread: false zonder relatie', () => {
  assert.strictEqual(MessagingCore.canCreateCoachAthleteThread('coach1', null), false);
});

// -- resolveSenderType (AI/Human-onderscheid, kern van de opdracht) ----------
t('resolveSenderType: AI_COACH context wint altijd', () => {
  const rel = { coach_user_id: 'coach1', athlete_user_id: 'ath1' };
  assert.strictEqual(MessagingCore.resolveSenderType('coach1', rel, true), 'AI_COACH');
});
t('resolveSenderType: HUMAN_COACH voor de coach-partij van een relatie', () => {
  const rel = { coach_user_id: 'coach1', athlete_user_id: 'ath1' };
  assert.strictEqual(MessagingCore.resolveSenderType('coach1', rel, false), 'HUMAN_COACH');
});
t('resolveSenderType: ATHLETE voor de athlete-partij van een relatie', () => {
  const rel = { coach_user_id: 'coach1', athlete_user_id: 'ath1' };
  assert.strictEqual(MessagingCore.resolveSenderType('ath1', rel, false), 'ATHLETE');
});
t('resolveSenderType: ATHLETE als default zonder relatie (DIRECT-thread)', () => {
  assert.strictEqual(MessagingCore.resolveSenderType('u1', null, false), 'ATHLETE');
});

// -- canSendMessage (spiegelt m_insert_own_sender, adversarial-kern) ---------
t('canSendMessage: true voor participant met geldig, niet-SYSTEM sender_type', () => {
  const parts = [{ thread_id: 't1', user_id: 'a', is_blocked: false }];
  assert.strictEqual(MessagingCore.canSendMessage('a', 't1', parts, 'ATHLETE'), true);
});
t('canSendMessage: false voor SYSTEM vanuit de client (SYSTEM alleen server-side)', () => {
  const parts = [{ thread_id: 't1', user_id: 'a', is_blocked: false }];
  assert.strictEqual(MessagingCore.canSendMessage('a', 't1', parts, 'SYSTEM'), false);
});
t('canSendMessage: false voor ongeldig sender_type', () => {
  const parts = [{ thread_id: 't1', user_id: 'a', is_blocked: false }];
  assert.strictEqual(MessagingCore.canSendMessage('a', 't1', parts, 'HACKER'), false);
});
t('canSendMessage: false voor niet-participant (KERN sender-forgery-preventie)', () => {
  const parts = [{ thread_id: 't1', user_id: 'a', is_blocked: false }];
  assert.strictEqual(MessagingCore.canSendMessage('b', 't1', parts, 'ATHLETE'), false);
});
t('canSendMessage: false voor geblokkeerde participant (adversarial)', () => {
  const parts = [{ thread_id: 't1', user_id: 'a', is_blocked: true }];
  assert.strictEqual(MessagingCore.canSendMessage('a', 't1', parts, 'ATHLETE'), false);
});

// -- renderSenderLabel (AI mag NOOIT als Human Coach renderen, en vice versa)
t('renderSenderLabel: HUMAN_COACH -> isHuman=true, isAi=false', () => {
  const r = MessagingCore.renderSenderLabel('HUMAN_COACH');
  assert.strictEqual(r.isHuman, true);
  assert.strictEqual(r.isAi, false);
});
t('renderSenderLabel: AI_COACH -> isAi=true, isHuman=false (KERN AI/Human-scheiding)', () => {
  const r = MessagingCore.renderSenderLabel('AI_COACH');
  assert.strictEqual(r.isAi, true);
  assert.strictEqual(r.isHuman, false);
});
t('renderSenderLabel: AI en Human labels zijn nooit gelijk aan elkaar (adversarial)', () => {
  const ai = MessagingCore.renderSenderLabel('AI_COACH');
  const human = MessagingCore.renderSenderLabel('HUMAN_COACH');
  assert.notStrictEqual(ai.label, human.label);
  assert.notStrictEqual(JSON.stringify(ai), JSON.stringify(human));
});
t('renderSenderLabel: onbekend sender_type wordt nooit stilzwijgend als AI/Human getoond (adversarial)', () => {
  const r = MessagingCore.renderSenderLabel('SOMETHING_FORGED');
  assert.strictEqual(r.isAi, false);
  assert.strictEqual(r.isHuman, false);
  assert.strictEqual(r.unknownType, true);
});

// -- unreadCount --------------------------------------------------------------
t('unreadCount: alle berichten na last_read_at tellen mee', () => {
  const msgs = [
    { created_at: '2026-09-01T10:00:00Z' },
    { created_at: '2026-09-01T12:00:00Z' },
    { created_at: '2026-09-01T14:00:00Z' }
  ];
  assert.strictEqual(MessagingCore.unreadCount('2026-09-01T11:00:00Z', msgs), 2);
});
t('unreadCount: alle berichten tellen mee zonder last_read_at', () => {
  const msgs = [{ created_at: '2026-09-01T10:00:00Z' }, { created_at: '2026-09-01T12:00:00Z' }];
  assert.strictEqual(MessagingCore.unreadCount(null, msgs), 2);
});
t('unreadCount: 0 zonder berichten', () => {
  assert.strictEqual(MessagingCore.unreadCount('2026-09-01T11:00:00Z', []), 0);
});

console.log(`MessagingCore: ${pass} geslaagd, ${fail} mislukt`);
console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`);
if (fail > 0) process.exit(1);
