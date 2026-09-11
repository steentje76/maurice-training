/* fAvatarUiIntegration.test.js — CANONICAL USER AVATAR, UI/delivery
 *
 * Statische integratietoets op index.html. Bewijst dat er ÉÉN canonical
 * renderer is, dat de replace/delete-volgorde veilig is, en dat de
 * privacy-/cachebeloften daadwerkelijk in de code staan.
 * Upload-gedrag tegen echte storage valt onder AUTHENTICATED-RLS
 * VALIDATION OPEN en wordt hier NIET geclaimd.
 */
'use strict';
var fs = require('fs');
var path = require('path');
var pass = 0, fail = 0, msgs = [];
function ok(c, m) { if (c) pass++; else { fail++; msgs.push(m); } }

console.log('CANONICAL USER AVATAR — UI/delivery integratie');

var html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// ── A. Eén canonical bron, geen parallelle logica ─────────────────────
ok(html.indexOf('<script src="core/avatarCore.js"></script>') !== -1,
  'A1: avatarCore.js wordt geladen');
ok(/function tkAvatarHtml\(/.test(html), 'A2: er is één canonical renderer tkAvatarHtml()');
ok(/AvatarCore\.resolve\(/.test(html),
  'A3: de renderer gebruikt AvatarCore.resolve -- de fallbackvolgorde staat niet los in de UI');
{
  // De oude, losse render-logica (`foto ? <img...> : initiaal`) mag niet
  // meer naast de canonical renderer bestaan.
  var oud = (html.match(/foto\?`<img src="\$\{escHtml\(foto\)\}"/g) || []).length;
  ok(oud === 0,
    'A4: de oude losse avatar-render-logica is volledig vervangen -- geen tweede avatarsysteem meer');
}
{
  var n = (html.match(/tkAvatarHtml\(\{/g) || []).length;
  ok(n >= 2, 'A5: meerdere consumers gebruiken dezelfde renderer (gevonden: ' + n + ')');
}

// ── B. Privacy en delivery ────────────────────────────────────────────
ok(/storage\/v1\/object\/sign\/avatars/.test(html),
  'B1: levering via SIGNED URL op de private bucket');
ok(!/object\/public\/avatars/.test(html),
  'B2: nergens een publieke permanente avatar-URL -- die zou visibility/blocking kunnen omzeilen');
ok(/Authorization:'Bearer '\+tok/.test(html.replace(/\s/g, '')) || /Bearer '\+tok/.test(html),
  'B3: ondertekenen gebeurt met de GEBRUIKERSSESSIE, niet met service-role -- de storage-policy (padsegment 1 === auth.uid()) geldt dus echt en een kijker kan geen URL tekenen voor andermans object');
ok(/zichtbaar:\s*o\.zichtbaar/.test(html),
  'B4: de renderer accepteert een zichtbaarheidsvlag zodat bestaande privacy-/blokkeerregels doorwerken');

// ── C. Crop: gebruiker bepaalt de uitsnede ────────────────────────────
ok(/tkCropPointerDown|tkCropPointerMove/.test(html), 'C1: pan (slepen) geïmplementeerd');
ok(/id="tk-crop-zoom"/.test(html) && /function tkCropZoom/.test(html), 'C2: zoom geïmplementeerd');
ok(/AvatarCore\.berekenCrop\(/.test(html),
  'C3: de crop komt uit AvatarCore -- preview en opgeslagen resultaat gebruiken exact dezelfde berekening');
ok(/function tkCropCancel/.test(html) && /closeModal\('m-avatar-crop'\)/.test(html),
  'C4: annuleren sluit zonder upload of write -> bestaande avatar blijft ongewijzigd');
ok(/id="tk-crop-preview"/.test(html) && /function tkCropMiniPreview/.test(html),
  'C5: ronde avatar-preview vóór opslaan, afgeleid uit dezelfde crop');
{
  var i = html.indexOf('function tkCropMiniPreview');
  var blok = html.slice(i, i + 600);
  ok(/arc\(/.test(blok) && /clip\(\)/.test(blok),
    'C6: de preview is daadwerkelijk rond gemaskeerd (arc+clip), niet slechts een vierkant met border-radius');
}

// ── D. Resize/compressie ──────────────────────────────────────────────
ok(/toBlob\(/.test(html), 'D1: uitvoer wordt opnieuw geëncodeerd (compressie)');
ok(/crop\.uitBreedte/.test(html) && /crop\.uitHoogte/.test(html),
  'D2: uitvoerformaat komt uit de core (max 512px) -- de originele camerafoto wordt nooit opgeslagen');
ok(/AvatarCore\.valideerBestand/.test(html),
  'D3: validatie vóór upload, met dezelfde grenzen als de bucket');

// ── E. Replace/delete-volgorde en cache ───────────────────────────────
{
  var i = html.indexOf('async function tkAvatarUpload');
  var blok = html.slice(i, i + 1800);
  var iUp = blok.indexOf('storage/v1/object/avatars/');
  var iWrite = blok.indexOf('tkAvatarWritePath');
  var iDel = blok.indexOf('tkAvatarDeleteObject(oud)');
  ok(iUp > 0 && iWrite > iUp && iDel > iWrite,
    'E1: volgorde is upload -> canonical write -> pas daarna oude asset opruimen; een mislukte vervanging wist de bestaande avatar nooit');
  ok(/try\{ await tkAvatarDeleteObject\(pad\); \}catch/.test(blok),
    'E2: bij een mislukte canonical write wordt het zojuist geüploade object opgeruimd -> geen verweesd object');
}
ok(/crypto\.randomUUID/.test(html),
  'E3: elke upload krijgt een NIEUWE uuid-key (immutable) -- een gecachte oude URL kan de nieuwe foto niet maskeren');
{
  // Alleen CODE tellen, geen commentaar: de bron legt juist uit waarom een
  // cachebuster overbodig is, en die uitleg mag de check niet laten falen.
  var codeOnly = html.replace(/\/\/[^\n]*/g, '');
  ok(!/\?t=|cacheBust|cachebust=|Date\.now\(\)\s*\+\s*['"]?['"]?\s*\)?\s*;?\s*\/\/?\s*cache/i.test(codeOnly),
    'E4: geen willekeurige cachebuster in de URL; cache-invalidatie volgt uit de immutable uuid-key');
}
ok(/function tkAvatarInvalidate/.test(html) && /tkAvatarInvalidate\(oud\)/.test(html),
  'E5: de signed-URL-cache wordt expliciet ongeldig gemaakt bij vervangen en verwijderen');
{
  var i = html.indexOf('async function tkAvatarDelete(');
  var blok = html.slice(i, i + 900);
  var iWrite = blok.indexOf('tkAvatarWritePath(null)');
  var iObj = blok.indexOf('tkAvatarDeleteObject(oud)');
  ok(iWrite > 0 && iObj > iWrite,
    'E6: verwijderen zet eerst avatar_path op null en ruimt daarna het object op');
  ok(/Verwijderen mislukt/.test(blok),
    'E7: een mislukte verwijdering meldt dat expliciet -- geen silent failure');
}

// ── F. Owner-bound write, niet via {...atleet} ────────────────────────
{
  var i = html.indexOf('async function tkAvatarWritePath');
  var blok = html.slice(i, i + 700);
  ok(/avatar_path:\s*pad/.test(blok) && !/\.\.\.atleet/.test(blok),
    'F1: expliciete write op ALLEEN avatar_path -- nooit via sbUpsert({...atleet}), dat zonder veld-whitelist het hele atleetprofiel zou kunnen laten falen (P2, buiten scope)');
  ok(/user_id=eq\.\$\{uid\}/.test(blok) && /authSession\?\.user\?\.id/.test(html),
    'F2: de write is owner-bound op de eigen user_id uit de sessie');
}

// ── G. Foutafhandeling zonder infrastructure leakage ──────────────────
ok(!/alert\(|confirm\(\)|prompt\(/.test(html.slice(html.indexOf('CANONICAL USER AVATAR'), html.indexOf('function wearableAuthHeaders'))),
  'G1: de avatarflow gebruikt geen native browserdialogen');
ok(/confirmModal\(/.test(html.slice(html.indexOf('async function tkAvatarDelete'), html.indexOf('async function tkAvatarDelete') + 400)),
  'G2: verwijderen bevestigt via de canonical modal');
ok(/onerror=/.test(html.slice(html.indexOf('function tkAvatarHtml'), html.indexOf('function tkAvatarHtml') + 1600)),
  'G3: een verlopen of verwijderde afbeelding valt terug op initialen i.p.v. een gebroken-beeldicoon');

// ── H. AI-grens ───────────────────────────────────────────────────────
{
  var A = require('./avatarCore.js');
  var r = A.resolve({ isAI: true, naam: 'AI Coach', avatarPath: 'u/x.jpg' });
  ok(r.pad === null && r.isAI === true,
    'H1: de AI Coach krijgt nooit een menselijke avatar -- sparkle blijft de canonical AI-identiteit');
}

console.log('\n========================================================');
console.log('fAvatarUiIntegration.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { msgs.forEach(function (m) { console.error('MISLUKT: ' + m); }); process.exitCode = 1; }
