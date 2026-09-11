/* fProfielIaPreservation.test.js — PROFIEL / APP-INSTELLINGEN IA
 *
 * Regressiecontract op basis van docs/ux/PROFIEL_IA_MATRIX.md (38 functies).
 * Bewaakt dat de IA-herplaatsing geen enkele legitieme functie liet vallen
 * en dat elke functie in het JUISTE scherm terechtkomt.
 *
 * Achtergrond: bij de eerste inventarisatie werden zes complete secties
 * gemist doordat er bij het zichtbare markupblok werd gestopt. Deze test
 * telt daarom per scherm, niet globaal.
 */
'use strict';
var fs = require('fs');
var path = require('path');
var pass = 0, fail = 0, msgs = [];
function ok(c, m) { if (c) pass++; else { fail++; msgs.push(m); } }

console.log('PROFIEL / APP-INSTELLINGEN — functiebehoud (38-functiematrix)');

var html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function blok(id) {
  var s = html.indexOf('id="' + id + '"');
  if (s < 0) return '';
  var e = html.indexOf('class="scr" id="s-', s + 10);
  return e > s ? html.slice(s, e) : html.slice(s);
}
var P = blok('s-profiel');
var S = blok('s-settings');

// ── A. Klasse A/B op PROFIEL ──────────────────────────────────────────
[
  ['openAtleetModal(', 'Atleetprofiel bewerken'],

  ['openTeamPinModal(', 'Team/PIN'],
  ['openPlanOverzicht(', 'Plannen vergelijken'],

  ['authSignOut(', 'Uitloggen'],
  ['deleteAccount(', 'Account verwijderen'],
  ["go('s-privacy')", 'Privacy-route'],

  ["go('s-settings')", 'App-instellingen-entry']
].forEach(function (p) {
  ok(P.indexOf(p[0]) !== -1, 'A-' + p[1] + ': bereikbaar vanaf Profiel');
});
[


  ['plan-huidig-card', 'Huidig plan'],
  ['tenant-brand-card', 'Organisatie'],

  ['profiel-atleet-card', 'Atleetprofiel-kaart'],


  ['pf-hero', 'Profiel-hero']
].forEach(function (p) {
  ok(P.indexOf(p[0]) !== -1, 'A-' + p[1] + ': aanwezig op Profiel');
});

/* CANONICAL IA v2 (PO-approved relocatie). Strenger contract: het overzicht
 * toont een compacte ingang, de VOLLEDIGE functionaliteit zit achter die
 * ingang. Beide helften worden geeist. Verplaatsen mag, verwijderen niet. */
function modalBlok(mid) {
  var s = html.indexOf('id="' + mid + '"');
  if (s < 0) return '';
  var e = html.indexOf('<div class="modal-bg"', s + 10);
  return e > s ? html.slice(s, e) : html.slice(s, s + 5000);
}
[
  ['m-condities', 'conditions-list', 'addCondition(', 'Condities'],
  ['m-research', 'pf-research-consent-card', null, 'Onderzoeksdeelname'],
  ['m-wearable', 'profiel-wearable-detail', null, 'Wearables'],
  ['m-account', 'account-email-lbl', 'openPasswordReset(', 'Account & data']
].forEach(function (t) {
  var M = modalBlok(t[0]);
  ok(P.indexOf("openModal('" + t[0] + "')") !== -1, 'A-' + t[3] + ': compacte ingang op Profiel');
  ok(M.indexOf(t[1]) !== -1, 'A-' + t[3] + ': volledige functionaliteit (' + t[1] + ') behouden achter die ingang');
  if (t[2]) ok(M.indexOf(t[2]) !== -1, 'A-' + t[3] + ': bewerkactie ' + t[2] + ' bereikbaar');
  ok(S.indexOf(t[1]) === -1, 'A-' + t[3] + ': niet verstopt in App-instellingen');
});
ok(modalBlok('m-account').indexOf("openModal('m-export')") !== -1,
  'A-Export: gegevens exporteren bereikbaar via Account & data');
ok(P.indexOf('account-identities-lbl') === -1 && modalBlok('m-account').indexOf('account-identities-lbl') !== -1,
  'A-Inlogmethoden: verplaatst naar de accountdetail, niet verdwenen');
ok(P.indexOf('profiel-atleet-card') !== -1 && P.indexOf('openAtleetModal()') !== -1,
  'A-Sportprofiel: ingang naar bestaande modal + render-target behouden');
ok(P.indexOf("go('s-lichaam')") !== -1, 'A-Lichaamsgegevens: canonical rij aanwezig');
ok(P.indexOf('plan-huidig-naam') !== -1 && P.indexOf('openPlanOverzicht()') !== -1,
  'A-Abonnement: planstatus-target en plannen vergelijken behouden');
ok(P.indexOf('tenant-brand-card') !== -1 && P.indexOf('openTeamPinModal()') !== -1,
  'A-Organisatie & team: contextueel behouden, niet verwijderd');

/* SEMANTISCHE GATES (PO-besluiten) */
ok(P.indexOf('afgelopen 30 dagen') !== -1 || html.indexOf('afgelopen 30 dagen') !== -1,
  'S1: consistency-callout gebruikt "afgelopen 30 dagen" -- activeDays telt een rolling 30-dagenvenster, GEEN kalendermaand');
{
  var hero = html.slice(html.indexOf('const avHtml=tkAvatarHtml('), html.indexOf('const avHtml=tkAvatarHtml(') + 3500);
  ok(hero.indexOf('deze maand') === -1, 'S2: de nieuwe hero claimt NERGENS "deze maand"');
  ok(/typeof wk.activeDays==='number'/.test(hero) && /dagen>0/.test(hero),
    'S3: de callout verschijnt alleen wanneer de canonical bron daadwerkelijk gevuld is -- geen fake waarde');
  ok(/Niet beschikbaar/.test(hero) && !/goals\.einddatum/.test(hero),
    'S4: EVENT blijft UNKNOWN -- geen canonical eventbron, en een doeldeadline wordt NIET als event geherinterpreteerd');
}
{
  var pr = P;
  ok(!/Niet verbonden/.test(pr),
    'S5: GEEN statuschip "Niet verbonden" -- connected:false kan ook UNKNOWN/ERROR zijn (geen UNKNOWN->DISCONNECTED)');
  ok(!/>Geen</.test(pr.slice(pr.indexOf('Condities'), pr.indexOf('Condities') + 400)),
    'S6: GEEN statuschip "Geen" bij Condities -- KNOWN_EMPTY is niet te onderscheiden van UNKNOWN/ERROR/TIMEOUT');
}
ok(S.indexOf('tk-back') !== -1 && S.indexOf('&#10005;') === -1,
  'S7: App-instellingen gebruikt canonical terugnavigatie "< Profiel", geen grote X');

// ── B. Verplaatste functies staan in APP-INSTELLINGEN ─────────────────
[
  ['sw-sound', 'Geluid'],
  ['sw-haptics', 'Trillingen'],
  ['sw-wakelock', 'Scherm aan tijdens training'],
  ['sw-dynrest', 'Dynamische rusttijd'],
  ['theme-opt-light', 'Thema Light'],
  ['theme-opt-dark', 'Thema Dark'],
  ['theme-opt-auto', 'Thema Auto'],
  ["go('s-meldingen')", 'Meldingen-route'],
  ['openOfflineQueueModal(', 'Offline-wachtrij'],
  ['clearAppCache(', 'Opslag opschonen'],
  ['settings-app-ver', 'App-versie'],
  ['settings-online-status', 'Online-status'],
  ['settings-debug-info', 'Technische informatie'],
  ['debugRestartOnboarding(', 'Onboarding opnieuw bekijken'],
  ["go('s-help')", 'Help & ondersteuning']
].forEach(function (p) {
  ok(S.indexOf(p[0]) !== -1, 'B-' + p[1] + ': bereikbaar in App-instellingen');
});

// Niet dubbel: verplaatst betekent weg uit Profiel
['sw-sound', 'theme-opt-light', 'clearAppCache(', 'settings-debug-info'].forEach(function (k) {
  ok(P.indexOf(k) === -1, 'B-geen duplicatie: ' + k + ' staat niet óók nog op Profiel');
});

// ── C. Deprecated stub is vervangen ───────────────────────────────────
ok(html.indexOf('Instellingen staan nu overzichtelijk in je Profiel') === -1,
  'C1: de deprecated s-settings-stubtekst is verwijderd -- de app spreekt zichzelf niet meer tegen');
ok(S.indexOf('App-instellingen') !== -1,
  'C2: s-settings is nu een echt App-instellingen-scherm');
ok(S.indexOf("go('s-profiel')") !== -1,
  'C3: terugnavigatie naar Profiel aanwezig');

// ── D. Classificatiecorrectie: geen ontwikkelaarstaal in de UI ────────
ok(S.indexOf('ONTWIKKELAAR') === -1 && S.indexOf('Diagnostiek') === -1,
  'D1: geen ONTWIKKELAAR-sectie en geen ontwikkelaarstaal in de gebruikers-UI (classificatiecorrectie C -> A/B)');
ok(!/isDev|DEV_MODE|debugMode|__DEV|tk_debug/.test(html),
  'D2: er is GEEN nieuwe debug-/dev-conditie gebouwd -- de feitelijke productwerking bleef leidend');

// ── E. Klasse D: legacy niet opnieuw als productfunctie ───────────────
ok(html.indexOf('tenantBrandingAdminEdit()') === -1 || /id="tenant-brand-admin-btn"[^>]*display:none/.test(html),
  'E1: de dode uitstraling-knop blijft verborgen (P3), niet opnieuw geintroduceerd');

// ── F. Canonical avatar hergebruikt, niet herbouwd ────────────────────
ok(html.indexOf('tkAvatarHtml(') !== -1 && html.indexOf('AvatarCore.resolve(') !== -1,
  'F1: de canonical avatar uit PR #321 wordt hergebruikt');
{
  var n = (html.match(/function tkAvatarHtml\(/g) || []).length;
  ok(n === 1, 'F2: er is precies EEN avatar-renderer -- geen tweede avatarsysteem');
}

console.log('\n========================================================');
console.log('fProfielIaPreservation.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { msgs.forEach(function (m) { console.error('MISLUKT: ' + m); }); process.exitCode = 1; }
