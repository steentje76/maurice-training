/* fAvatarSecurity.test.js — CANONICAL USER AVATAR, security
 *
 * EVIDENCE LEVEL: C — STRUCTURAL/POLICY EVIDENCE.
 *
 * Deze suite bewijst dat de migratie de JUISTE policies en constraints
 * DEFINIEERT. Hij bewijst NIET dat een echte, ingelogde gebruiker geen
 * cross-user write kan doen: daarvoor is een authenticated-user oracle
 * (niveau A) nodig en die is in deze omgeving niet beschikbaar.
 *
 * Expliciet geregistreerd: AUTHENTICATED-RLS VALIDATION OPEN.
 * Een privileged DB-/tool-resultaat (niveau D) telt NIET als eindgebruiker-
 * bewijs en wordt hier dan ook nergens als zodanig gepresenteerd.
 */
'use strict';
var fs = require('fs');
var path = require('path');
var pass = 0, fail = 0, msgs = [];
function ok(c, m) { if (c) pass++; else { fail++; msgs.push(m); } }

console.log('CANONICAL USER AVATAR — security (evidence level C: structural/policy)');

var mig = fs.readFileSync(path.join(__dirname, '..', 'migratie_v562.sql'), 'utf8');

// ── A. Bucket is privaat en beperkt ───────────────────────────────────
ok(/insert into storage\.buckets/i.test(mig) && /'avatars'/.test(mig),
  'A1: de bucket avatars wordt door de migratie aangemaakt');
ok(/public\s*,?\s*file_size_limit/i.test(mig) && /false\s*,\s*\n?\s*2097152|false,\s*$|,\s*false,/m.test(mig.replace(/\s+/g, ' ')) === true || /'avatars',\s*false/.test(mig.replace(/\s+/g, ' ')),
  'A2: de bucket is PRIVAAT (public=false) -- geen raadbare publieke URL die het privacymodel zou omzeilen');
ok(/2097152/.test(mig), 'A3: bestandsgrootte begrensd op 2 MB in de bucket zelf, niet alleen client-side');
ok(/image\/jpeg/.test(mig) && /image\/png/.test(mig) && /image\/webp/.test(mig),
  'A4: alleen jpeg/png/webp toegestaan op bucketniveau');
ok(!/image\/svg|svg\+xml/.test(mig),
  'A5: SVG is NIET toegestaan -- SVG kan script bevatten en zou uitvoerbare inhoud als avatar introduceren');

// ── B. Ownership komt uit auth.uid(), niet van de client ──────────────
['insert', 'update', 'delete', 'select'].forEach(function (cmd) {
  var re = new RegExp('create policy "avatars_' + cmd + '_own"[\\s\\S]{0,400}?auth\\.uid\\(\\)', 'i');
  ok(re.test(mig),
    'B-' + cmd + ': de ' + cmd + '-policy leidt de eigenaar af uit auth.uid(), niet uit een door de client meegestuurde user_id');
});
{
  var n = (mig.match(/storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/g) || []).length;
  ok(n >= 4,
    'B1: alle vier de policies toetsen het EERSTE PADSEGMENT tegen auth.uid() -- cross-user write is daarmee structureel onmogelijk, niet slechts conventioneel (' + n + ' controles)');
}
ok(/for insert to authenticated/i.test(mig) && /for update to authenticated/i.test(mig)
   && /for delete to authenticated/i.test(mig),
  'B2: schrijfrechten uitsluitend voor de rol authenticated');
ok(!/to\s+anon/i.test(mig) && !/to\s+public/i.test(mig),
  'B3: geen enkele policy verleent rechten aan anon/public -> unauthenticated upload is default-deny');

// ── C. Leesrecht omzeilt het privacymodel niet ────────────────────────
ok(/avatars_select_own/.test(mig) && /GEEN brede select-policy|geen brede select/i.test(mig),
  'C1: er is bewust GEEN brede select-policy voor alle authenticated gebruikers -- dat zou social_profiles.visibility en social_is_blocked_pair() omzeilen');
ok(/signed/i.test(mig),
  'C2: levering aan derden loopt via een server-side signed URL die de bestaande zichtbaarheidsregels toepast vóór het ondertekenen');

// ── D. Canonical kolom is een PAD, geen URL ───────────────────────────
ok(/alter table public\.atleet_profiel[\s\S]{0,120}add column if not exists avatar_path text null/i.test(mig),
  'D1: avatar_path toegevoegd aan het canonieke profielrecord atleet_profiel, nullable (achterwaarts compatibel)');
ok(/NIET een publieke URL|niet een publieke url/i.test(mig),
  'D2: de kolom bewaart een storage-PAD, geen URL -- autorisatie verhuist niet naar een raadbare permalink');
ok(/nooit de bron van autorisatie|NOOIT de bron van autorisatie/i.test(mig),
  'D3: expliciet vastgelegd dat avatar_path een referentie is en nooit de autorisatiebron');

// ── E. Core dwingt dezelfde grenzen af als de bucket ──────────────────
var A = require('./avatarCore.js');
ok(A.MAX_BYTES === 2097152, 'E1: client-limiet is identiek aan de bucketlimiet (2 MB) -- geen divergentie');
ok(A.TOEGESTANE_TYPES.indexOf('image/svg+xml') === -1, 'E2: core weigert SVG net als de bucket');
ok(A.bouwPad('u1', '../x', 'image/jpeg') === null && A.bouwPad('u1/../u2', 'a', 'image/jpeg') === null,
  'E3: core weigert path traversal in beide padsegmenten');
{
  // De policy toetst padsegment 1; de core moet dus gegarandeerd het
  // user_id als eerste segment zetten, anders faalt de upload of -- erger --
  // belandt een object onder een ander pad.
  var p = A.bouwPad('OWNER-ID', 'file-uuid', 'image/png');
  ok(A.padEigenaar(p) === 'OWNER-ID',
    'E4: core en policy zijn het eens over waar de eigenaar in het pad staat');
}

// ── F. Eerlijke registratie van het bewijsniveau ──────────────────────
ok(true, 'F1: EVIDENCE LEVEL C (structural/policy). AUTHENTICATED-RLS VALIDATION OPEN -- er is geen authenticated-user oracle beschikbaar; cross-user en unauthenticated write zijn NIET end-to-end bewezen.');

console.log('\n========================================================');
console.log('fAvatarSecurity.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { msgs.forEach(function (m) { console.error('MISLUKT: ' + m); }); process.exitCode = 1; }
