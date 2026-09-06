/* fB9_07BSocialClosure.test.js — B9-07B Social Product Layer Closure.
 * Bewaakt: hergebruik van bestaande, canonieke modules (SocialSharingCore/
 * SocialChallengeCore), whitelist-sharing (geen gevoelige velden), geen
 * client-side notificatie-impersonatie (uitsluitend via de SECURITY
 * DEFINER-functie), XSS-veilige weergave, geen extra bottom-nav.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v535.sql'), 'utf8');
const delAcct = fs.readFileSync(path.join(ROOT, 'netlify/functions/delete-account.js'), 'utf8');

// ---- A. Sharing: uitsluitend via de bestaande, canonieke whitelist ----
ok(html.includes('SocialSharingCore.sanitizeShare('),
  'A1: het delen van een activiteit loopt uitsluitend via de bestaande, canonieke SocialSharingCore.sanitizeShare() -- geen eigen, nieuwe whitelist-logica gebouwd');
ok(!html.match(/social_shared_activities[\s\S]{0,200}hrv|hrv[\s\S]{0,200}social_shared_activities/i),
  'A2: geen enkel codepad rond het delen van activiteiten verwijst naar gevoelige velden (HRV) -- de whitelist blijft de enige bron van welke velden gedeeld worden');
ok(html.includes("confirm('OK = zichtbaar voor iedereen"),
  'A3: delen is expliciet, met een bewuste zichtbaarheidskeuze -- nooit een automatische, stille default');

// ---- B. Challenges: hergebruik van SocialChallengeCore ----
ok(html.includes('SocialChallengeCore.challengeStatus(') && html.includes('SocialChallengeCore.canJoinChallenge('),
  'B1: de challenges-UI hergebruikt uitsluitend de bestaande, canonieke SocialChallengeCore -- geen dubbele status-/eligibiliteitslogica');

// ---- C. Notificaties: geen client-side impersonatie mogelijk ----
ok(migratie.includes('security definer') && migratie.includes("if p_recipient_id = auth.uid() then"),
  'C1: de notificatie-creatiefunctie is SECURITY DEFINER met een expliciete zelf-notificatie-guard');
ok(migratie.includes("insert into public.social_notifications (recipient_id, event_type, actor_id, target_type, target_id)\n  values (p_recipient_id, p_event_type, auth.uid(), p_target_type, p_target_id)"),
  'C2: actor_id komt altijd uit auth.uid() zelf binnen de functie, nooit uit een client-doorgegeven parameter -- impersonatie architecturaal onmogelijk');
ok(!html.match(/actor_id\s*:\s*['"a-z]/i),
  'C3: geen enkele client-side aanroep probeert zelf een actor_id door te geven aan social_notifications (die kolom bestaat uitsluitend via de functie)');

// ---- D. XSS-veiligheid in de nieuwe feed/notificaties ----
ok(html.match(/escHtml\(it\.title/) && html.match(/escHtml\(it\.achievement_label/) && html.match(/escHtml\(it\.athlete_note/) && html.match(/escHtml\(c\.body\)/),
  'D1: alle user-gegenereerde velden in de feed (titel/prestatie-label/notitie/comments) worden via escHtml() weergegeven');

// ---- E. Reactions/comments RLS: whitelist-tabellen bestaan met RLS ----
ok(migratie.includes('create table if not exists public.social_reactions') && migratie.includes('alter table public.social_reactions enable row level security'),
  'E1: social_reactions bestaat met RLS ingeschakeld');
ok(migratie.includes('create table if not exists public.social_comments') && migratie.includes('alter table public.social_comments enable row level security'),
  'E2: social_comments bestaat met RLS ingeschakeld');
ok(migratie.includes('unique(shared_activity_id, user_id)'),
  'E3: een gebruiker kan slechts één reactie per gedeelde activiteit plaatsen (voorkomt spam-likes)');
ok(migratie.includes('check (char_length(body) between 1 and 500)'),
  'E4: comments zijn begrensd in lengte (voorkomt misbruik)');

// ---- F. Geen extra bottom-nav-regressie ----
{
  const aantalVoortgangTabs = (html.match(/<span class="ni-label">Voortgang<\/span>/g) || []).length;
  ok(aantalVoortgangTabs === 38, 'F1: geen enkele van de bestaande bottom-nav-blokken is aangeraakt -- 36 -> 38 door de additieve komst van s-voeding + s-voeding-maaltijden (Nutrition UX v1)');
}

// ---- G. Moderatie: gebruikt de bestaande social_reports-tabel ----
ok(html.includes("fetch(`${SB_URL}/rest/v1/social_reports`") && html.includes('async function socialReport'),
  'G1: rapporteren gebruikt de bestaande, canonieke social_reports-tabel, geen nieuwe moderatie-tabel');

// ---- H. Zelf gevonden en gerepareerde P1-bevindingen tijdens deze closure-verificatie ----
{
  const aantalChallengeCards = (html.match(/id="social-challenges-list"/g) || []).length;
  ok(aantalChallengeCards === 1, 'H1 (zelf gevonden en gerepareerd): de Challenges-kaart in het Social-scherm bestond eerder dubbel (ongeldige HTML, dubbel element-id) -- nu exact één keer aanwezig');
}
ok(!html.match(/async function socialReport\(reporterUserId,/),
  'H2 (zelf gevonden en gerepareerd): socialReport() nam eerder reporterUserId als client-parameter aan (onnodig risicovol patroon) -- haalt dit nu altijd zelf uit authSession, nooit van een aanroeper');
ok(html.includes('async function socialReport(targetUserId,targetType,targetId)') && html.includes('reporter_user_id:uid'),
  'H3: de nieuwe socialReport()-signatuur gebruikt uitsluitend de eigen, authenticatie-afgeleide uid als reporter');
ok(html.includes("rpc/social_create_notification") && html.includes("p_event_type:'connection_request'") && html.includes("p_event_type:'connection_accepted'"),
  'H4 (zelf gevonden en gerepareerd): de bestaande social_create_notification-RPC werd nergens aangeroepen (notificaties werden dus nooit daadwerkelijk gegenereerd) -- nu aangeroepen bij zowel een follow-verzoek als een acceptatie');
ok(delAcct.includes("['social_comments', ['user_id']]") && delAcct.includes("['social_reactions', ['user_id']]"),
  'H5 (zelf gevonden en gerepareerd, account-deletion completeness): social_comments/social_reactions ontbraken in de expliciete deletion-lijst -- deze twee tabellen hebben geen CASCADE-foreign-key op user_id naar auth.users (uitsluitend op shared_activity_id), dus zonder deze fix zouden orphaned rijen kunnen achterblijven');

ok(migratie.includes('revoke all on function public.social_create_notification(uuid, text, text, uuid) from anon'),
  'H6 (P0-fix, zelf gevonden bij live verificatie): anon had via een andere weg dan public alsnog execute-rechten op de SECURITY DEFINER-notificatiefunctie -- nu expliciet, apart ingetrokken');

console.log('fB9_07BSocialClosure: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
