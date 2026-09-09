/* fMessagingUI.test.js — SOCIAL / SAMEN MASTER SPRINT, S5 Messaging UI.
 * Bewaakt: hergebruik van de bestaande, volledig geteste MessagingCore
 * (geen tweede DM-model/chat-engine), idempotente DIRECT-thread-creatie via
 * get_or_create_direct_thread (migratie_v555), offline-safe verzenden via
 * de bestaande sbPostQ/IDEMPOTENT_TABELLEN_MET_CLIENT_ID-primitive (geen
 * nieuwe offline-queue), Human Coach vs AI Coach-onderscheid in de weergave,
 * en dat messaging nooit gevoelige gezondheidscontext lekt.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v555.sql'), 'utf8');

console.log('SOCIAL / SAMEN MASTER SPRINT — S5 Messaging UI');

// ---- A. Hergebruik van de bestaande MessagingCore, geen tweede DM-model ----
ok(html.includes('<script src="core/messaging.js"></script>'), 'A1: core/messaging.js wordt nu daadwerkelijk geladen in de browser (voorheen 0 verwijzingen)');
ok(html.includes('MessagingCore.isParticipant') && html.includes('MessagingCore.unreadCount') && html.includes('MessagingCore.renderSenderLabel'),
  'A2: de UI gebruikt de bestaande, geteste MessagingCore-functies (isParticipant/unreadCount/renderSenderLabel), geen eigen, losstaande logica');
ok(!html.match(/SocialMessagingCore|ChatCore|DirectMessageCore/), 'A3: geen tweede, parallelle messaging-engine geintroduceerd');
ok(html.includes('id="s-messages"') && html.includes('id="s-message-thread"'), 'A4: eigen, bereikbare schermen bestaan (thread-lijst + gesprek-detail)');

// ---- B. Idempotente thread-creatie (migratie_v555) ----
ok(migratie.includes('CREATE OR REPLACE FUNCTION public.get_or_create_direct_thread'), 'B1: get_or_create_direct_thread-RPC bestaat in de migratie');
ok(migratie.includes("thread_type = 'DIRECT'") && migratie.match(/count\(\*\).*=\s*2/),
  'B2: idempotency-check zoekt exact een bestaande 2-deelnemers-DIRECT-thread vóór een nieuwe wordt aangemaakt (geen duplicaat-gesprek bij herhaald starten)');
ok(migratie.includes('social_connections') && migratie.includes("status = 'accepted'"),
  'B3: een geaccepteerde social-connectie is vereist -- geen messaging naar vreemden (hergebruikt het bestaande social-graph-concept)');
{
  const startFn = html.split('async function startDirectMessage(otherUserId)')[1].split('function openMessageThread')[0];
  ok(startFn.includes("sbRpc('get_or_create_direct_thread'"), 'B4: startDirectMessage roept de nieuwe, idempotente RPC aan');
}

// ---- C. Offline/retry voor het versturen van berichten (geen nieuwe queue) ----
ok(html.includes('messages: true }'), 'C1: messages is toegevoegd aan de bestaande IDEMPOTENT_TABELLEN_MET_CLIENT_ID -- hergebruikt het bewezen mechanisme, geen nieuwe offline-primitive');
{
  const sendFn = html.split('async function sendDirectMessage()')[1].split('async function socialRenderFeed')[0];
  ok(sendFn.includes('id:newTrainingInstanceId()'), 'C2: elk verzonden bericht krijgt een client-gegenereerd, stabiel id (zelfde patroon als training_instances) -- een retry kan nooit een duplicaat opleveren');
  ok(sendFn.includes("await sbPostQ('messages'"), 'C3: verzenden gaat via de bestaande, offline-veilige sbPostQ (geen rechtstreekse fetch zonder retry-laag)');
}

// ---- D. Human Coach vs AI Coach blijft absoluut onderscheiden (sectie 22) ----
{
  const threadFn = html.split('async function renderMessageThreadScreen(threadId)')[1].split('async function sendDirectMessage')[0];
  ok(threadFn.includes('MessagingCore.renderSenderLabel(m.sender_type)'), 'D1: elk bericht toont zijn sender_type via de canonieke MessagingCore.renderSenderLabel(), geen eigen label-logica');
  ok(threadFn.includes('senderInfo.isAi') && threadFn.includes('senderInfo.isHuman'), 'D2: AI Coach en Human Coach worden expliciet visueel onderscheiden (nooit hetzelfde label/icoon)');
}

// ---- E. Block-semantiek: messaging mag nooit een bypass zijn van een block ----
// (RLS/m_insert_own_sender is de daadwerkelijke afdwinging; dit bevestigt dat de
// migratie geen block-onafhankelijk schrijfpad introduceert.)
ok(!migratie.match(/INSERT INTO public\.messages/), 'E1: de nieuwe migratie voegt zelf geen enkel schrijfpad naar messages toe -- verzenden blijft uitsluitend via de bestaande, block-bewuste m_insert_own_sender-RLS-policy lopen');

// ---- F. Geen gezondheidscontext-lek via messaging (sectie 54 van de opdracht) ----
{
  const threadFn = html.split('async function renderMessageThreadScreen(threadId)')[1].split('async function sendDirectMessage')[0];
  ok(!threadFn.match(/hrv|sleep|nutrition|cyclus_fase|recovery/i), 'F1: renderMessageThreadScreen bevat geen enkele verwijzing naar HRV/slaap/nutrition/cyclus/herstel-data');
}

// ---- G. Cross-user/negative security: alleen participant kan een thread zien ----
{
  const threadFn = html.split('async function renderMessageThreadScreen(threadId)')[1].split('async function sendDirectMessage')[0];
  ok(threadFn.includes('MessagingCore.isParticipant(uid,threadId,participants)') && threadFn.includes('niet toegankelijk'),
    'G1: renderMessageThreadScreen weigert expliciet toegang als de ingelogde gebruiker geen participant is (client-side spiegel van de RLS, niet de enige controle)');
}

// ---- H. S9 Integrated Certification: block moet ook messaging raken (sectie 42) ----
{
  const migratieV557 = fs.readFileSync(path.join(ROOT, 'migratie_v557.sql'), 'utf8');
  ok(migratieV557.includes('social_is_blocked_pair(v_user_id, p_other_user_id)'),
    'H1: get_or_create_direct_thread weigert een nieuw gesprek als er een social-block bestaat tussen de twee gebruikers (niet alleen het ontbreken van een connectie)');
  ok(migratieV557.includes('social_is_blocked_pair(auth.uid(), mp2.user_id)'),
    'H2: de messages-INSERT-policy weigert een nieuw bericht als de afzender een social-block heeft met een andere deelnemer in de thread -- dezelfde functie als feed/reacties/comments, geen los, tweede blokkeer-concept');
  ok(!migratieV557.match(/DELETE FROM public\.messages|DROP TABLE/i),
    'H3: bestaande berichtgeschiedenis tussen inmiddels geblokkeerde gebruikers wordt niet verwijderd -- alleen nieuwe berichten worden geblokkeerd (consistent met het coach-athlete-revocation-precedent)');
}

console.log('\n========================================================');
console.log('fMessagingUI.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { msgs.forEach(m => console.error(m)); process.exitCode = 1; }