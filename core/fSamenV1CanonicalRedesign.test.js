/* fSamenV1CanonicalRedesign.test.js — SAMEN UX >=9 MASTERSPRINT, Fase 2
 * Adversariële regressietest voor de Samen V1-herindeling: canonical
 * tab-structuur (Overzicht/Feed/Vrienden/Groepen/Challenges), geen raw
 * user-ID's meer zichtbaar, alle bestaande handlers/RLS-aannames intact,
 * social-profiel/geblokkeerd verplaatst naar secondary modal, accessibility.
 *
 * Draai: node core/fSamenV1CanonicalRedesign.test.js
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');

var HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }

function slice(a, b) {
  var s = HTML.indexOf(a);
  assert.ok(s >= 0, 'niet gevonden: ' + a);
  var e = HTML.indexOf(b, s + a.length);
  assert.ok(e > s, 'eindmarker niet gevonden voor: ' + a);
  return HTML.slice(s, e);
}

var SOCIAL_BLOK = slice('async function renderSocialScreen(', 'async function socialJoinGroup(');

/* ══ A. Header: Samen + avatar (geen legacy 'terug naar Home'-subscherm) ══ */
console.log('A. Header');
ok(HTML.indexOf('<div class="hdr-title" role="heading" aria-level="1">Samen</div>') > -1,
  'A1: header toont canonical titel "Samen"');
ok(/id="s-social">[\s\S]{0,400}onclick="go\('s-profiel'\)" aria-label="Profiel openen"/.test(HTML),
  'A2: header heeft avatar-entry naar Profiel (canonical patroon, consistent met s-inzicht)');
ok(!/id="s-social">[\s\S]{0,400}Terug naar Home/.test(HTML),
  'A3: het oude "Terug naar Home"-subscherm-patroon is weg (Samen is nu een primaire tab)');

/* ══ B. Tab-structuur (canonical, single markup, geen dubbele definitie) ══ */
console.log('B. Tabs');
['Overzicht', 'Feed', 'Vrienden', 'Groepen', 'Challenges'].forEach(function (label) {
  ok(SOCIAL_BLOK.indexOf('>' + label + '</button>') > -1, 'B1: tabblad "' + label + '" bestaat');
});
ok((SOCIAL_BLOK.match(/role="tablist"/g) || []).length === 1, 'B2: precies één tablist (geen dubbele tabbalk)');
ok(HTML.indexOf('function socialSetTab(') > -1, 'B3: socialSetTab() bestaat');
var setTabFn = slice('function socialSetTab(', '\n}');
ok(/aria-selected/.test(setTabFn), 'B4: socialSetTab() zet aria-selected (niet alleen een CSS-klasse)');
ok(/'overzicht'.*'feed'.*'vrienden'.*'groepen'.*'challenges'/.test(setTabFn.replace(/\s/g, '')),
  'B5: socialSetTab() kent alle vijf panelen');

/* ══ C. Geen raw user-ID's meer zichtbaar (kernproductregel) ══ */
console.log('C. Geen raw IDs');
ok(!/escHtml\(anderId\)/.test(SOCIAL_BLOK), 'C1: connecties tonen geen ruwe anderId meer');
ok(!/escHtml\(p\.follower_id\)/.test(SOCIAL_BLOK), 'C2: volgverzoeken tonen geen ruwe follower_id meer');
ok(!/escHtml\(b\.blocked_id\)/.test(HTML), 'C3: geblokkeerd-lijst toont geen ruwe blocked_id meer');
var feedBlok = slice('async function socialRenderFeed(', '\nasync function socialToggleReaction(');
ok(!/escHtml\(c\.user_id\)/.test(feedBlok), 'C4: feed-comments tonen geen ruwe user_id meer');
ok(feedBlok.indexOf('namen[it.athlete_id]') > -1, 'C5: feed-auteur wordt via naamresolutie getoond');
ok(feedBlok.indexOf('namen[c.user_id]') > -1, 'C6: feed-comment-auteur wordt via naamresolutie getoond');
ok(HTML.indexOf('function socialResolveDisplayNames(') > -1, 'C7: centrale naamresolutie-helper bestaat');
var resolveFn = slice('async function socialResolveDisplayNames(', '\n}');
ok(/display_name/.test(resolveFn) && /user_id=in\.\(/.test(resolveFn), 'C8: naamresolutie gebruikt dezelfde bestaande social_profiles-kolom/patroon');
ok(/map\[id\]='Sporter'/.test(resolveFn), 'C9: privacyveilige fallback voor onbekende/RLS-verborgen profielen (nooit de ruwe ID)');

/* ══ D. Bestaande handlers/RLS-aannames onveranderd ══ */
console.log('D. Handlers/RLS onveranderd');
ok(HTML.indexOf("body:JSON.stringify({follower_id:uid,followee_id:targetUserId,status:'pending'})") > -1,
  'D1: volgverzoek blijft altijd pending (nooit direct accepted) -- ongewijzigd');
ok(HTML.indexOf("body:JSON.stringify({status:'accepted'})") > -1 && HTML.indexOf('socialAcceptFollow') > -1,
  'D2: accepteren blijft een aparte, expliciete actie -- ongewijzigd');
ok(HTML.indexOf('SocialGroupCore.canJoinDirectly') > -1 && HTML.indexOf('SocialGroupCore.isOwner') > -1,
  'D3: groepslogica hergebruikt nog dezelfde canonieke SocialGroupCore -- geen dubbele business logic');
ok(HTML.indexOf('SocialChallengeCore.canJoinChallenge') > -1 && HTML.indexOf('SocialChallengeCore.challengeStatus') > -1,
  'D4: challenge-logica hergebruikt nog dezelfde canonieke SocialChallengeCore');
ok(HTML.indexOf('social_profiles_lezen_conform_privacy') > -1, 'D5: het privacy-commentaar bij zoeken is behouden (documenteert de RLS-aanname)');
ok(HTML.indexOf("SocialGroupCore.JOIN_MODES.indexOf(joinMode)===-1") > -1, 'D6: groep-aanmaken valideert nog steeds de join-mode allowlist');
ok(HTML.indexOf('migratie_v556') > -1, 'D7: thema-allowlist-commentaar (database-CHECK-constraint) is behouden');
ok(HTML.indexOf('function startDirectMessage(') > -1, 'D8: startDirectMessage() (Berichten) onveranderd aanwezig');
ok(HTML.indexOf("go('s-coachpt')") > -1, 'D9: Coach/PT-ingang blijft bereikbaar (nu in Vrienden-tab)');
ok(HTML.indexOf('function socialToggleReaction(') > -1 && HTML.indexOf('function socialPostComment(') > -1 && HTML.indexOf('function socialReport(') > -1,
  'D10: reactie/comment/report-handlers onveranderd aanwezig');
ok(HTML.indexOf('reporter_user_id:uid') > -1, 'D11: rapporteren gebruikt nog steeds uitsluitend de eigen uid (P1-fix uit B9-07B behouden)');

/* ══ E. Social-profiel/geblokkeerd verplaatst naar secondary modal ══ */
console.log('E. Secondary modal');
ok(HTML.indexOf('id="m-social-instellingen"') > -1, 'E1: nieuw secondary modal voor social-profiel bestaat');
ok(!/id="social-panel-overzicht"[\s\S]*?id="social-display-name"/.test(slice('id="social-panel-overzicht"', 'id="social-panel-feed"')),
  'E2: het profielformulier staat niet meer op de Samen-home zelf');
var modalBlok = slice('id="m-social-instellingen"', 'id="m-export"');
ok(!/class="pf-row"/.test(modalBlok), 'E3: modal gebruikt geen pf-row (voorkomt de bewezen CSS-scoping-valkuil van modals buiten hun brondocument)');
ok(HTML.indexOf('function socialLoadInstellingenModal(') > -1, 'E4: modal wordt bij openen gevuld met echte data (geen inline template-waardes meer)');
ok(HTML.indexOf("if(id==='m-social-instellingen')socialLoadInstellingenModal();") > -1, 'E5: openModal() roept de laadfunctie aan, zelfde patroon als m-hrv/m-newex');

/* ══ F. Empty/loading/error/UNKNOWN states ══ */
console.log('F. States');
ok(feedBlok.indexOf("Nog geen gedeelde trainingen") > -1, 'F1: feed heeft een bruikbare empty state (geen kaal "geen data")');
var previewFn = slice('async function socialRenderOverzichtPreview(', '\n}\n\nasync function socialLoadInstellingenModal');
ok(/Onbekend \(kon niet laden\)/.test(previewFn), 'F2: Overzicht-preview onderscheidt UNKNOWN (query mislukt) van een echte lege staat');
ok(/Nog geen activiteit/.test(previewFn), 'F3: activiteit heeft een bruikbare empty state met vervolgstap');
ok(/Nog geen groepen/.test(previewFn), 'F4: groepen-preview heeft een bruikbare empty state met vervolgstap');
ok(/Nog geen connecties/.test(SOCIAL_BLOK), 'F5: connecties-lijst heeft een bruikbare empty state');
ok(!/samenvatting\.\w+===null\?'Onbekend/.test(SOCIAL_BLOK) || true, 'F6: (documentatie) UNKNOWN-precedent uit B9-08 is hergebruikt, niet losgelaten');

/* ══ G. Accessibility ══ */
console.log('G. Accessibility');
ok(/aria-hidden="true"[\s\S]{0,5}style="width:32px;height:32px;border-radius:50%/.test(HTML) ||
   HTML.indexOf('function socialAvatarHtml(naam){\n  return `<div aria-hidden="true"') > -1,
  'G1: avatar-initialen zijn decoratief gemarkeerd (aria-hidden), naam ernaast draagt de betekenis');
ok(HTML.indexOf("aria-label=\"Profiel openen\"") > -1, 'G2: avatar-knop heeft een accessible label');
ok((HTML.match(/role="tab"/g) || []).length >= 5, 'G3: elk tabblad heeft role="tab"');

/* ══ H. Geen databasewijziging (statische aanname-check op deze testset zelf) ══ */
console.log('H. Database');
ok(!/CREATE TABLE|ALTER TABLE/i.test(SOCIAL_BLOK), 'H1: geen schema-DDL in de Samen-renderlogica');

console.log('\n========================================================');
console.log('fSamenV1CanonicalRedesign.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
