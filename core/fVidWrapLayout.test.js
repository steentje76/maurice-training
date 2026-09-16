/* fVidWrapLayout.test.js — MEDIA-0D: geen zwart vlak boven video's
 *
 * `.vid-wrap` reserveert een 16:9-mediavlak met `padding-top:56.25%` en een zwarte
 * achtergrond. Die techniek werkt UITSLUITEND wanneer het kind absoluut gepositioneerd
 * is: een in-flow kind wordt per definitie NA de padding geplaatst, waardoor het
 * gereserveerde zwarte vlak boven het kind zichtbaar blijft.
 *
 * Deze test bewaakt semantisch dat elk mediakind van `.vid-wrap` — img, iframe en
 * video — absoluut gepositioneerd is en het gereserveerde vlak volledig vult, en dat
 * het losse bibliotheekpad (.lib-video-ready/.lib-video-el) ongemoeid blijft.
 *
 * Draai: node core/fVidWrapLayout.test.js
 */
var fs = require('fs');
var path = require('path');

var HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  \u2717 ' + m); } }

/* Haal de declaraties van een exacte CSS-selector op uit index.html. */
function rule(selector) {
  var i = HTML.indexOf(selector + '{');
  if (i < 0) return null;
  var e = HTML.indexOf('}', i);
  return e < 0 ? null : HTML.slice(i + selector.length + 1, e);
}
function has(decls, prop, value) {
  if (decls === null) return false;
  var re = new RegExp('(^|;)\\s*' + prop + '\\s*:\\s*' + value + '\\s*(;|$)');
  return re.test(decls);
}
/* Vult het element het volledige gereserveerde vlak? Zowel inset:0 als de
   expliciete top/left/width/height-vorm zijn semantisch equivalent. */
function coversContainer(decls) {
  if (decls === null) return false;
  var insetForm = has(decls, 'inset', '0');
  var explicitForm = has(decls, 'top', '0') && has(decls, 'left', '0') &&
                     has(decls, 'width', '100%') && has(decls, 'height', '100%');
  return insetForm || explicitForm;
}

/* ══ 1. De ratio-container zelf ══ */
console.log('1. .vid-wrap ratio-container');
var wrap = rule('.vid-wrap');
ok(wrap !== null, '1a: .vid-wrap-regel bestaat');
ok(has(wrap, 'position', 'relative'), '1b: .vid-wrap is position:relative (positioneringscontext)');
ok(/padding-top\s*:\s*56\.25%/.test(wrap || ''), '1c: .vid-wrap reserveert het 16:9-vlak via padding-top:56.25%');

/* ══ 2. Elk mediakind moet absoluut gepositioneerd zijn ══ */
console.log('2. Absolute positionering van alle mediakinderen');
['img', 'iframe', 'video'].forEach(function (tag) {
  var d = rule('.vid-wrap ' + tag);
  ok(d !== null, '2a-' + tag + ': er bestaat een .vid-wrap ' + tag + '-regel');
  ok(has(d, 'position', 'absolute'), '2b-' + tag + ': .vid-wrap ' + tag + ' is position:absolute');
  ok(coversContainer(d), '2c-' + tag + ': .vid-wrap ' + tag + ' vult het gereserveerde vlak volledig');
});

/* ══ 3. Het defect zelf: geen enkel mediakind mag in-flow blijven ══ */
console.log('3. Geen in-flow mediakind meer');
var videoDecls = rule('.vid-wrap video');
ok(videoDecls !== null && has(videoDecls, 'position', 'absolute'),
  '3a: het video-kind is niet langer normale in-flow content (oorzaak van het zwarte vlak)');
ok(has(videoDecls, 'object-fit', 'contain'),
  '3b: video schaalt met object-fit:contain \u2014 correcte verhouding, geen uitsnijding');

/* ══ 4. Elk .vid-wrap-renderpad levert een video die door de regel wordt gedekt ══ */
console.log('4. Renderpaden');
var paths = HTML.match(/class="vid-wrap"><video/g) || [];
ok(paths.length >= 2, '4a: de bekende .vid-wrap-renderpaden zijn aanwezig (' + paths.length + ')');
/* Geen enkel pad mag het video-element buiten .vid-wrap plaatsen of een eigen
   position meegeven die de regel overschrijft. */
var inlinePos = (HTML.match(/class="vid-wrap"><video[^>]*style="[^"]*position\s*:/g) || []).length;
ok(inlinePos === 0, '4b: geen enkel renderpad zet een inline position op het video-element');

/* ══ 5. Het bibliotheekpad blijft ongewijzigd ══ */
console.log('5. Bibliotheekpad ongemoeid');
var libEl = rule('.lib-video-el');
ok(libEl !== null && has(libEl, 'position', 'absolute') && coversContainer(libEl),
  '5a: .lib-video-el is en blijft absoluut gepositioneerd en dekkend');
ok(has(libEl, 'object-fit', 'contain'), '5b: .lib-video-el behoudt object-fit:contain');
var libReady = rule('.lib-video-ready');
ok(libReady !== null && /aspect-ratio\s*:\s*16\/9/.test(libReady),
  '5c: .lib-video-ready gebruikt nog steeds aspect-ratio (eigen, correcte techniek)');

console.log('\n========================================================');
console.log('fVidWrapLayout.test.js \u2014 ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail > 0) process.exit(1);
