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
  ['addCondition(', 'Condities toevoegen'],
  ['openTeamPinModal(', 'Team/PIN'],
  ['openPlanOverzicht(', 'Plannen vergelijken'],
  ['openPasswordReset(', 'Wachtwoord reset'],
  ['authSignOut(', 'Uitloggen'],
  ['deleteAccount(', 'Account verwijderen'],
  ["go('s-privacy')", 'Privacy-route'],
  ["openModal('m-export')", 'Gegevens exporteren'],
  ["go('s-settings')", 'App-instellingen-entry']
].forEach(function (p) {
  ok(P.indexOf(p[0]) !== -1, 'A-' + p[1] + ': bereikbaar vanaf Profiel');
});
[
  ['account-email-lbl', 'E-mailadres'],
  ['account-identities-lbl', 'Inlogmethoden'],
  ['plan-huidig-card', 'Huidig plan'],
  ['tenant-brand-card', 'Organisatie'],
  ['pf-research-consent-card', 'Onderzoeksdeelname'],
  ['profiel-atleet-card', 'Atleetprofiel-kaart'],
  ['profiel-conditions-card', 'Condities-kaart'],
  ['profiel-team-card', 'Team-kaart'],
  ['pf-hero', 'Profiel-hero']
].forEach(function (p) {
  ok(P.indexOf(p[0]) !== -1, 'A-' + p[1] + ': aanwezig op Profiel');
});

// Wearables: PO-eis -- primaire ingang op PROFIEL, niet verstopt in instellingen
ok(P.indexOf('profiel-wearable-detail') !== -1 && P.indexOf('profiel-wearable-actions') !== -1,
  'A-Wearables: primaire ingang staat op PROFIEL (PO-eis: niet naar algemene App-instellingen verstoppen)');
ok(S.indexOf('profiel-wearable-detail') === -1,
  'A-Wearables: NIET gedupliceerd in App-instellingen');

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
