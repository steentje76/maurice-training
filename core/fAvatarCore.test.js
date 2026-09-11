/* fAvatarCore.test.js — CANONICAL USER AVATAR
 * Dekt de acceptatiecriteria die zuiver deterministisch te bewijzen zijn:
 * resolutie/fallback, validatie, padvorming/ownership, crop 1:1, orientatie.
 * Upload/RLS-gedrag zit in fAvatarSecurity.test.js.
 */
'use strict';
var A = require('./avatarCore.js');
var pass = 0, fail = 0, msgs = [];
function ok(c, m) { if (c) pass++; else { fail++; msgs.push(m); } }

console.log('CANONICAL USER AVATAR — core');

// ── A. Drietraps resolutie ────────────────────────────────────────────
ok(A.resolve({ avatarPath: 'u1/abc.jpg', naam: 'Maurice van Steensel' }).bron === A.BRON.FOTO,
  'A1: geldige foto wint -> bron=photo');
ok(A.resolve({ avatarPath: null, naam: 'Maurice van Steensel' }).bron === A.BRON.INITIALEN,
  'A2: geen foto -> initialen-fallback');
ok(A.resolve({ avatarPath: null, naam: '' }).bron === A.BRON.NEUTRAAL,
  'A3: geen foto en geen naam -> neutrale fallback');
{
  var r = A.resolve({ avatarPath: 'u1/abc.jpg', naam: 'Sanne Bakker', zichtbaar: false });
  ok(r.bron === A.BRON.INITIALEN && r.pad === null,
    'A4: foto bestaat maar is niet zichtbaar voor deze kijker -> initialen, pad NIET meegegeven (privacy blijft leidend, avatar_path is geen autorisatie)');
}
{
  var ai = A.resolve({ isAI: true, naam: 'AI Coach', avatarPath: 'u1/abc.jpg' });
  ok(ai.isAI === true && ai.bron === A.BRON.NEUTRAAL && ai.pad === null,
    'A5: AI-actor krijgt NOOIT een menselijke avatar -- sparkle blijft de canonical AI-identiteit');
}

// ── B. Initialen ──────────────────────────────────────────────────────
ok(A.initialen('Maurice van Steensel') === 'MS', 'B1: tussenvoegsel "van" telt niet mee -> MS');
ok(A.initialen('Mark de Vries') === 'MV', 'B2: "de" telt niet mee -> MV');
ok(A.initialen('Sanne') === 'S', 'B3: enkele naam -> eerste letter');
ok(A.initialen('  ') === null, 'B4: lege naam -> null (geen spatie-initiaal)');
ok(A.initialen('sanne bakker') === 'SB', 'B5: kleine letters worden genormaliseerd');

// ── C. Bestandsvalidatie ──────────────────────────────────────────────
ok(A.valideerBestand({ type: 'image/jpeg', size: 500000 }).ok === true, 'C1: jpeg binnen limiet toegestaan');
ok(A.valideerBestand({ type: 'image/png', size: 10 }).ok === true, 'C2: png toegestaan');
ok(A.valideerBestand({ type: 'image/webp', size: 10 }).ok === true, 'C3: webp toegestaan');
ok(A.valideerBestand({ type: 'image/svg+xml', size: 10 }).code === 'ONGELDIG_TYPE',
  'C4: SVG geweigerd -- kan script bevatten, dus nooit als avatar (identiek aan bucketconfiguratie)');
ok(A.valideerBestand({ type: 'application/pdf', size: 10 }).code === 'ONGELDIG_TYPE', 'C5: niet-afbeelding geweigerd');
ok(A.valideerBestand({ type: 'image/jpeg', size: 3 * 1024 * 1024 }).code === 'TE_GROOT', 'C6: >2MB geweigerd');
ok(A.valideerBestand({}).code === 'GEEN_BESTAND', 'C7: leeg bestand geweigerd');
{
  var v = A.valideerBestand({ type: 'image/svg+xml', size: 10 });
  ok(typeof v.bericht === 'string' && v.bericht.length > 0 && !/error|exception|mime/i.test(v.bericht),
    'C8: foutmelding is menselijk geformuleerd, geen technische code (geen infrastructure leakage)');
}

// ── D. Padvorming en ownership ────────────────────────────────────────
{
  var p = A.bouwPad('11111111-2222-3333-4444-555555555555', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'image/jpeg');
  ok(p === '11111111-2222-3333-4444-555555555555/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.jpg',
    'D1: pad is {user_id}/{uuid}.{ext}');
  ok(A.padEigenaar(p) === '11111111-2222-3333-4444-555555555555',
    'D2: eerste padsegment is de eigenaar -- exact wat de storage-policy tegen auth.uid() toetst');
}
ok(A.bouwPad('u1', '../../etc/passwd', 'image/jpeg') === null,
  'D3: path traversal in bestandsnaam geweigerd');
ok(A.bouwPad('u1/../u2', 'aaaa', 'image/jpeg') === null,
  'D4: path traversal in user-segment geweigerd');
ok(A.bouwPad('', 'aaaa', 'image/jpeg') === null, 'D5: lege user_id -> geen pad');
ok(A.extensieVoor('image/png') === 'png' && A.extensieVoor('image/webp') === 'webp'
   && A.extensieVoor('image/jpeg') === 'jpg', 'D6: extensie volgt het mime-type');
{
  var p1 = A.bouwPad('u1', 'aaaaaaaa-1111', 'image/jpeg');
  var p2 = A.bouwPad('u1', 'bbbbbbbb-2222', 'image/jpeg');
  ok(p1 !== p2,
    'D7: vervangen levert een NIEUWE immutable key -- een gecachte oude URL kan de nieuwe foto nooit maskeren (geen Date.now()-cachebuster nodig)');
}

// ── E. Crop: altijd 1:1, nooit opschalen, nooit buiten de bron ────────
{
  var c = A.berekenCrop({ breedte: 3000, hoogte: 4000, zoom: 1, offsetX: 0, offsetY: 0 });
  ok(c.sBreedte === c.sHoogte, 'E1: bronvenster is exact vierkant (1:1)');
  ok(c.uitBreedte === c.uitHoogte, 'E2: uitvoer is exact vierkant (1:1)');
  ok(c.sBreedte === 3000, 'E3: bij zoom 1 past de kortste zijde precies');
  ok(c.uitBreedte === A.OUTPUT_PX, 'E4: uitvoer begrensd op 512px -- een 12MP camerafoto wordt niet permanent opgeslagen');
}
{
  // Extreme verschuiving mag het venster niet buiten de afbeelding duwen.
  var c = A.berekenCrop({ breedte: 1000, hoogte: 600, zoom: 1, offsetX: 99999, offsetY: -99999 });
  ok(c.sx >= 0 && c.sy >= 0, 'E5: venster blijft binnen de bron (geen negatieve oorsprong)');
  ok(c.sx + c.sBreedte <= 1000 && c.sy + c.sHoogte <= 600,
    'E6: venster valt nooit buiten de bron -> geen lege randen of vervorming');
}
{
  var klein = A.berekenCrop({ breedte: 300, hoogte: 300, zoom: 1 });
  ok(klein.uitBreedte === 300,
    'E7: een bron kleiner dan 512px wordt NIET opgeschaald (geen kwaliteitsverlies)');
}
{
  var z1 = A.berekenCrop({ breedte: 1000, hoogte: 1000, zoom: 1 });
  var z2 = A.berekenCrop({ breedte: 1000, hoogte: 1000, zoom: 2 });
  ok(z2.sBreedte < z1.sBreedte, 'E8: hoger zoomniveau snijdt verder in');
}
ok(A.clampZoom(0.1) === A.minZoom() && A.clampZoom(99) === A.maxZoom() && A.clampZoom('x') === 1,
  'E9: zoom wordt begrensd en ongeldige invoer valt terug op 1');
ok(A.berekenCrop({ breedte: 0, hoogte: 100 }) === null && A.berekenCrop(null) === null,
  'E10: ongeldige/corrupte afmetingen -> null, geen crash');
{
  // Verschillende offsets moeten een ANDER venster opleveren, anders zou
  // "verschuiven" in de UI geen effect hebben (center-crop-val).
  var a = A.berekenCrop({ breedte: 2000, hoogte: 1000, zoom: 1, offsetX: -300 });
  var b = A.berekenCrop({ breedte: 2000, hoogte: 1000, zoom: 1, offsetX: 300 });
  ok(a.sx !== b.sx,
    'E11: de gebruiker bepaalt de uitsnede -- verschuiven verandert het venster echt (centreren is slechts de startwaarde, geen verplichte center-crop)');
}

// ── F. EXIF-orientatie ────────────────────────────────────────────────
ok(A.orientatieTransform(1).rotatie === 0 && A.orientatieTransform(1).spiegelX === false, 'F1: orientatie 1 = ongewijzigd');
ok(A.orientatieTransform(6).rotatie === 90, 'F2: orientatie 6 -> 90 graden (veelvoorkomend bij native camera)');
ok(A.orientatieTransform(3).rotatie === 180, 'F3: orientatie 3 -> 180 graden');
ok(A.orientatieTransform(8).rotatie === 270, 'F4: orientatie 8 -> 270 graden');
ok(A.orientatieTransform(2).spiegelX === true, 'F5: orientatie 2 -> horizontaal gespiegeld');
ok(A.wisseltAssen(6) === true && A.wisseltAssen(1) === false,
  'F6: orientaties 5..8 wisselen breedte/hoogte om -- anders zou de crop scheef uitvallen');
ok(A.orientatieTransform(undefined).rotatie === 0, 'F7: ontbrekende orientatie -> geen rotatie (veilige default)');

console.log('\n========================================================');
console.log('fAvatarCore.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { msgs.forEach(function (m) { console.error('MISLUKT: ' + m); }); process.exitCode = 1; }
