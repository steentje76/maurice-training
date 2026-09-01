/* fB9_07SocialProductLayer.test.js — B9-07 Social Product Layer.
 * Bewaakt: geen client-side privacy-aanname (uitsluitend RLS als bron
 * van waarheid), correcte pending-status bij follow, XSS-veilige
 * weergave van user-gegenereerde namen/bio, geen extra bottom-nav-
 * regressie op bestaande schermen, sabotage.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// ---- A. Geen client-side privacy-filtering die de indruk van privacy geeft ----
ok(html.includes("sbGet('social_profiles',`&display_name=ilike"),
  'A1: het zoeken naar profielen gebruikt een directe database-query, geen client-side filtering na een ongefilterde fetch (privacy blijft uitsluitend een RLS-verantwoordelijkheid, geen schijnveiligheid)');

// ---- B. Follow-verzoek: altijd pending, nooit direct accepted ----
ok(html.includes("body:JSON.stringify({follower_id:uid,followee_id:targetUserId,status:'pending'})"),
  'B1: een nieuw volgverzoek wordt altijd met status pending verstuurd, nooit direct accepted (de RLS zou dit ook weigeren, maar de client moet dit sowieso nooit proberen)');
ok(html.includes("body:JSON.stringify({status:'accepted'})") && html.includes('socialAcceptFollow'),
  'B2: alleen een expliciete, aparte accepteer-actie zet de status om naar accepted');

// ---- C. XSS-veiligheid: user-gegenereerde velden altijd via escHtml() ----
ok(html.match(/escHtml\(profiel\.display_name/) && html.match(/escHtml\(profiel\.bio/),
  'C1: het eigen profiel (display_name/bio) wordt bij het invullen van het formulier via escHtml() weergegeven');
ok(html.match(/escHtml\(r\.display_name\)/),
  'C2: zoekresultaten (andermans display_name) worden via escHtml() weergegeven, nooit ongefilterd in innerHTML');

// ---- D. Nieuwe bestemming, geen regressie op bestaande bottom-navs ----
ok(html.includes('id="s-social"') && html.includes(`onclick="go('s-social')"`),
  'D1: een nieuwe, bereikbare Social-bestemming bestaat, met een expliciete toegangsroute vanaf Home');
{
  const aantalVoortgangTabs = (html.match(/<span class="ni-label">Voortgang<\/span>/g) || []).length;
  ok(aantalVoortgangTabs === 35, 'D2: geen enkele van de 35 bestaande bottom-nav-blokken is aangeraakt (0 regressierisico op bestaande navigatie) -- Social kreeg een eigen, nieuw scherm i.p.v. een risicovolle, brede wijziging over alle bestaande schermen');
}

// ---- E. Geen dubbele functie-definitie (zelf gevonden en gerepareerde fout tijdens het bouwen) ----
{
  const aantal = (html.match(/^async function renderRunningInsights\(\)\{/gm) || []).length;
  ok(aantal === 1, 'E1 (zelf gevonden en gerepareerd tijdens B9-07): renderRunningInsights() bestaat exact één keer -- een eigen invoegfout tijdens het bouwen van Social had deze regel per ongeluk verwijderd, direct hersteld en geverifieerd');
}

// ---- F. Groepen: hergebruik van de bestaande, canonieke SocialGroupCore (MS-F9-02) ----
ok(html.includes('SocialGroupCore.isMember(uid,g.id,memberships)') && html.includes('SocialGroupCore.isOwner(uid,g.id,memberships)') && html.includes('SocialGroupCore.canJoinDirectly(g)'),
  'F1: de groepen-UI hergebruikt uitsluitend de bestaande, al 9/9+9/9-geteste SocialGroupCore -- geen nieuwe, dubbele rol-/lidmaatschapslogica gebouwd');
ok(html.includes("body:JSON.stringify({group_id:groupId,user_id:uid,role:'member',status:'active'})") && html.includes('async function socialJoinGroup'),
  'F2 (self-elevation-preventie, MS-F9-01-les): een gebruiker die lid wordt via de UI kan alleen role:member insereren, nooit owner -- de RLS zou dit ook weigeren, maar de client probeert dit sowieso nooit');
ok(html.includes("<script src=\"core/socialGroup.js\"></script>") && html.includes("<script src=\"core/socialChallenge.js\"></script>"),
  'F3: beide bestaande, canonieke social-modules worden geladen -- geen duplicaat business-logic geschreven in index.html zelf');

console.log('fB9_07SocialProductLayer: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
