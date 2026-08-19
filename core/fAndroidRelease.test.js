/* fAndroidRelease.test.js — RC0: de Android-releaseconfiguratie
 *
 * De Android-kant van dit project is jarenlang een bijzaak geweest: de configuratie stond
 * nog grotendeels op de waarden die `cap add android` ooit had gegenereerd. Deze suite legt
 * de eisen vast waarop een upload naar Google Play anders stukloopt, zodat ze niet
 * stilzwijgend kunnen terugvallen. Er wordt hier niets gebouwd — dat kan in deze omgeving
 * niet (geen Android SDK, geen toegang tot dl.google.com) — maar alles wat uit de bestanden
 * zelf te bewijzen valt, wordt bewezen.
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..');
var n = 0;
function t(naam, fn) { fn(); n++; }
function bestaat(p) { return fs.existsSync(path.join(ROOT, p)); }
/* Een test die een bestand inleest en met ENOENT omvalt, meldt een stacktrace in plaats
   van een bevinding. Dat gebeurde in de Quality Gate van PR #26: het ontbreken van
   .gitignore leverde
       ENOENT: no such file or directory, open '.../.gitignore'
   op, terwijl de eigenlijke conclusie is: 'er is geen .gitignore, dus een keystore kan
   ongemerkt gecommit worden'. lees() maakt van elk ontbrekend bestand een leesbare
   assertie mét de reden waarom het bestand er hoort te zijn. */
function lees(p, waarom) {
  var vol = path.join(ROOT, p);
  assert.ok(fs.existsSync(vol),
    'ontbreekt in de repository: ' + p + (waarom ? ' — ' + waarom : ''));
  return fs.readFileSync(vol, 'utf8');
}

/* ══ 0. VOLLEDIGHEID VAN DE RELEASE ═══════════════════════════════════════
 *
 * AANLEIDING. De Quality Gate van PR #26 viel om op een ontbrekende .gitignore. Dat
 * bestand bestond wél in de bronbranch maar was onderweg naar de pull request
 * weggevallen — het is een dotfile, en zowel de Finder als een upload in de
 * GitHub-webinterface laat die standaard buiten beschouwing. Eén ontbrekend bestand
 * leverde een ENOENT-stacktrace op in plaats van de bevinding.

 * Deze test draait dat om: elk bestand waar de app, de build of een Play-vereiste van
 * afhangt wordt in één keer gecontroleerd, met per bestand de reden waarom het er hoort
 * te zijn. Een onvolledige overdracht is daarmee één leesbare melding in plaats van een
 * willekeurige crash in een willekeurige suite.

 * Deze controle staat bewust HELEMAAL VOORAAN, nog vóór de bestanden worden ingelezen:
 * anders zou een ontbrekend manifest al bij het laden van deze suite omvallen en zou de
 * volledigheidsmelding nooit worden bereikt.
 * ══════════════════════════════════════════════════════════════════════════ */
console.log('\n0. Volledigheid van de release');

var RELEASEBESTANDEN = [
  ['.gitignore',                                          'zonder dit bestand kan de upload-keystore ongemerkt worden gecommit'],
  ['index.html',                                          'de app zelf'],
  ['sw.js',                                               'service worker: offline werken en de media-oorsprong'],
  ['manifest.json',                                       'PWA-manifest'],
  ['privacy.html',                                        'Google Play eist een publiek bereikbare privacyverklaring'],
  ['package.json',                                        'build- en testcommandos'],
  ['capacitor.config.json',                               'applicationId en app-naam'],
  ['scripts/build-www.mjs',                               'bepaalt wat er in het releaseartefact belandt'],
  ['scripts/android-icons.py',                            'maakt de Android-resources reproduceerbaar'],
  ['netlify/functions/delete-account.js',                 'Google Play eist volledige accountverwijdering'],
  ['android/variables.gradle',                            'het API-niveau dat Google Play eist'],
  ['android/build.gradle',                                'de Android Gradle Plugin-versie'],
  ['android/app/build.gradle',                            'versienummers en ondertekening'],
  ['android/gradle/wrapper/gradle-wrapper.properties',    'de Gradle-versie'],
  ['android/keystore.properties.voorbeeld',               'het sjabloon waarmee de eigenaar zijn sleutel instelt'],
  ['android/app/src/main/AndroidManifest.xml',            'zonder manifest is er geen Android-app'],
  ['android/app/src/main/res/xml/backup_rules.xml',       'houdt het sessietoken uit de back-up (API 30 en ouder)'],
  ['android/app/src/main/res/xml/data_extraction_rules.xml', 'idem voor API 31 en nieuwer'],
  ['android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml', 'het adaptieve app-icoon'],
  ['icon-512.png',                                        'merkbestand waaruit de Android-iconen worden afgeleid'],
  ['logo-wordmark.png',                                   'merkbestand waaruit het opstartscherm wordt afgeleid'],
  ['docs/PLAY_STORE_READINESS.md',                        'de vermeldingsgegevens en de verificatieprocedure'],
  ['docs/RELEASE_READINESS.md',                           'de status van elke release-blokkade']
];

t('0.1: elk bestand waar de release van afhangt is aanwezig', function () {
  var ontbreekt = RELEASEBESTANDEN.filter(function (r) { return !bestaat(r[0]); });
  assert.deepStrictEqual(ontbreekt.map(function (r) { return r[0]; }), [],
    'onvolledige overdracht — ontbreekt:\n  ' +
    ontbreekt.map(function (r) { return r[0] + '  (' + r[1] + ')'; }).join('\n  '));
});

t('0.2: dotfiles overleven de overdracht', function () {
  /* Precies de klasse bestanden die bij een ZIP- of webupload wegvalt. Losstaand van H1
     zodat de melding meteen de oorzaak noemt in plaats van alleen het gevolg. */
  var dotfiles = RELEASEBESTANDEN.map(function (r) { return r[0]; })
    .filter(function (f) { return path.basename(f).charAt(0) === '.'; });
  assert.ok(dotfiles.length > 0, 'de lijst bevat geen enkele dotfile meer om te bewaken');
  dotfiles.forEach(function (f) {
    assert.ok(bestaat(f), f + ' ontbreekt — dotfiles vallen weg bij een upload via een ZIP ' +
      'of de GitHub-webinterface; commit en push in plaats daarvan, of voeg het bestand ' +
      'los toe');
  });
});

/* De twee controles hieronder hebben een Git-checkout nodig. In CI is die er altijd
   (actions/checkout). Draait iemand de suite vanuit een uitgepakte ZIP, dan is er geen
   index om te controleren; die ene extra garantie vervalt dan expliciet en zichtbaar,
   terwijl de .gitignore-controle in D3 onvoorwaardelijk blijft gelden. */
function gitBestanden() {
  try {
    var uit = cp.execSync('git ls-files -z', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    var lijst = uit.split('\0').filter(Boolean);
    return lijst.length ? lijst : null;
  } catch (_) { return null; }
}
function gitUitgesloten(bestanden) {
  try {
    var uit = cp.execSync('git check-ignore --stdin', {
      cwd: ROOT, encoding: 'utf8', input: bestanden.join('\n'), stdio: ['pipe', 'pipe', 'ignore']
    });
    return uit.split(/\r?\n/).filter(Boolean);
  } catch (e) {
    /* check-ignore geeft afsluitcode 1 wanneer er NIETS wordt uitgesloten — dat is de
       gewenste uitkomst, geen fout. Alleen een echte fout (code > 1) is onbekend. */
    if (e && e.status === 1) return [];
    return null;
  }
}

var MANIFEST = lees('android/app/src/main/AndroidManifest.xml', 'zonder manifest is er geen Android-app');
var APP_GRADLE = lees('android/app/build.gradle', 'bevat versienummers en de ondertekening');
var VARS = lees('android/variables.gradle', 'bevat het API-niveau dat Google Play eist');
var ROOT_GRADLE = lees('android/build.gradle', 'bevat de Android Gradle Plugin-versie');
var HTML = lees('index.html', 'de app zelf');
var BUILDWWW = lees('scripts/build-www.mjs', 'bepaalt wat er in het releaseartefact belandt');

/* ══ A. VERSIONERING ═══════════════════════════════════════════════════════ */
console.log('\nA. Versionering');

function appVer() {
  var m = HTML.match(/const APP_VER = '(v[\d.]+)';/);
  assert.ok(m, 'APP_VER niet gevonden in index.html');
  return m[1].slice(1);
}
function gradleVersionName() {
  var m = APP_GRADLE.match(/versionName\s+"([\d.]+)"/);
  assert.ok(m, 'versionName niet gevonden');
  return m[1];
}
function gradleVersionCode() {
  var m = APP_GRADLE.match(/versionCode\s+(\d+)/);
  assert.ok(m, 'versionCode niet gevonden');
  return Number(m[1]);
}

t('A1: de app en de Android-build melden hetzelfde versienummer', function () {
  /* Liep uit de pas: de app meldde v4.47.0 in het scherm "Over", de build 1.0. Bij een
     supportvraag is dan niet vast te stellen welke build iemand draait. */
  assert.strictEqual(gradleVersionName(), appVer(),
    'versionName ' + gradleVersionName() + ' wijkt af van APP_VER ' + appVer());
});

t('A2: de versionCode volgt het afgesproken schema en is dus altijd oplopend', function () {
  var d = appVer().split('.').map(Number);
  var verwacht = d[0] * 10000 + d[1] * 100 + d[2];
  assert.strictEqual(gradleVersionCode(), verwacht,
    'versionCode ' + gradleVersionCode() + ' hoort ' + verwacht + ' te zijn (major*10000 + minor*100 + patch)');
});

t('A3: de versionCode is hoger dan de eerste, nog nooit gepubliceerde build', function () {
  assert.ok(gradleVersionCode() > 1, 'versionCode 1 is de gegenereerde standaardwaarde');
});

/* ══ B. PLAY-EISEN AAN HET API-NIVEAU ══════════════════════════════════════ */
console.log('\nB. API-niveau');

/* Google Play: sinds 31-08-2025 minimaal API 35 voor nieuwe apps en updates, vanaf
   31-08-2026 minimaal API 36. Deze ondergrens hoort mee te bewegen met die datums. */
var PLAY_MIN_TARGET_SDK = 36;

t('B1: targetSdk voldoet aan de Play-eis', function () {
  var m = VARS.match(/targetSdkVersion\s*=\s*(\d+)/);
  assert.ok(m, 'targetSdkVersion niet gevonden');
  assert.ok(Number(m[1]) >= PLAY_MIN_TARGET_SDK,
    'targetSdk ' + m[1] + ' — Google Play weigert alles onder ' + PLAY_MIN_TARGET_SDK);
});

t('B2: compileSdk is minstens gelijk aan targetSdk', function () {
  var c = Number(VARS.match(/compileSdkVersion\s*=\s*(\d+)/)[1]);
  var tg = Number(VARS.match(/targetSdkVersion\s*=\s*(\d+)/)[1]);
  assert.ok(c >= tg, 'compileSdk ' + c + ' < targetSdk ' + tg + ' — dat compileert niet');
});

t('B3: de Android Gradle Plugin ondersteunt dat API-niveau', function () {
  var m = ROOT_GRADLE.match(/com\.android\.tools\.build:gradle:(\d+)\.(\d+)\.(\d+)/);
  assert.ok(m, 'AGP-versie niet gevonden');
  var major = Number(m[1]), minor = Number(m[2]);
  /* AGP 8.9 is de eerste versie die API 36 officieel ondersteunt. */
  assert.ok(major > 8 || (major === 8 && minor >= 9),
    'AGP ' + m[0] + ' kent compileSdk ' + PLAY_MIN_TARGET_SDK + ' niet');
});

t('B4: de Gradle-wrapper past bij die AGP-versie', function () {
  var w = lees('android/gradle/wrapper/gradle-wrapper.properties', 'bepaalt de Gradle-versie');
  var m = w.match(/gradle-(\d+)\.(\d+)(?:\.(\d+))?-all\.zip/);
  assert.ok(m, 'Gradle-distributie niet gevonden');
  var major = Number(m[1]), minor = Number(m[2]);
  assert.ok(major > 8 || (major === 8 && minor >= 11),
    'Gradle ' + m[1] + '.' + m[2] + ' is te oud voor AGP 8.9+');
});

/* ══ C. MANIFEST ═══════════════════════════════════════════════════════════ */
console.log('\nC. Manifest');

t('C1: app-data gaat niet mee in de cloudback-up', function () {
  /* De WebView-opslag bevat de ingelogde sessie (access- én refresh-token). Met
     allowBackup="true" kopieerde Android die naar de Google Drive van de gebruiker en
     nam hem mee bij toestel-naar-toestel-overdracht. */
  assert.ok(/android:allowBackup="false"/.test(MANIFEST), 'allowBackup staat nog aan');
  assert.ok(/android:dataExtractionRules="@xml\/data_extraction_rules"/.test(MANIFEST),
    'geen dataExtractionRules — op API 31+ geldt allowBackup niet voor toesteloverdracht');
  assert.ok(/android:fullBackupContent="@xml\/backup_rules"/.test(MANIFEST),
    'geen fullBackupContent voor API 30 en ouder');
});

t('C2: de back-upregels sluiten daadwerkelijk alles uit', function () {
  ['android/app/src/main/res/xml/data_extraction_rules.xml',
   'android/app/src/main/res/xml/backup_rules.xml'].forEach(function (p) {
    assert.ok(bestaat(p), 'ontbreekt: ' + p);
    var x = lees(p, 'sluit app-data uit van de Android-back-up');
    ['root', 'database', 'sharedpref', 'file', 'external'].forEach(function (domein) {
      assert.ok(new RegExp('exclude[^>]*domain="' + domein + '"').test(x),
        p + ': domein ' + domein + ' wordt niet uitgesloten');
    });
  });
  var d = lees('android/app/src/main/res/xml/data_extraction_rules.xml');
  assert.ok(/<cloud-backup>/.test(d) && /<device-transfer>/.test(d),
    'zowel cloud-backup als device-transfer moeten geregeld zijn');
});

t('C3: Bluetooth is optioneel, geen installatie-eis', function () {
  assert.ok(/bluetooth_le"\s+android:required="false"/.test(MANIFEST),
    'required="true" filtert het toestelbereik op hardware die de kern van de app niet nodig heeft');
});

t('C4: alleen de rechten die de app echt gebruikt', function () {
  assert.ok(/android.permission.INTERNET/.test(MANIFEST), 'INTERNET ontbreekt');
  var rechten = (MANIFEST.match(/android:name="android\.permission\.[A-Z_]+"/g) || [])
    .map(function (r) { return r.replace(/.*permission\./, '').replace('"', ''); });
  var toegestaan = ['INTERNET', 'BLUETOOTH_SCAN', 'BLUETOOTH_CONNECT', 'BLUETOOTH',
                    'BLUETOOTH_ADMIN', 'ACCESS_FINE_LOCATION'];
  var onverwacht = rechten.filter(function (r) { return toegestaan.indexOf(r) < 0; });
  assert.deepStrictEqual(onverwacht, [],
    'onverwachte rechten (elk recht kost uitleg in de Play-datavragenlijst): ' + onverwacht.join(', '));
});

t('C5: locatie wordt alleen op oude Android gevraagd, en niet voor locatie zelf', function () {
  /* ACCESS_FINE_LOCATION is op API <= 30 verplicht om überhaupt te mogen BLE-scannen.
     Zonder maxSdkVersion zou de app op moderne toestellen locatietoegang vragen die ze
     niet nodig heeft — en dat is precies waar een Play-review over struikelt. */
  assert.ok(/ACCESS_FINE_LOCATION"\s+android:maxSdkVersion="30"/.test(MANIFEST),
    'ACCESS_FINE_LOCATION is niet begrensd tot API 30');
  assert.ok(/BLUETOOTH_SCAN"[\s\S]{0,120}usesPermissionFlags="neverForLocation"/.test(MANIFEST),
    'BLUETOOTH_SCAN mist neverForLocation');
});

/* ══ D. ONDERTEKENING ══════════════════════════════════════════════════════ */
console.log('\nD. Ondertekening');

t('D1: de release-build heeft een ondertekeningsconfiguratie', function () {
  assert.ok(/signingConfigs\s*\{[\s\S]*release\s*\{/.test(APP_GRADLE), 'geen signingConfigs.release');
  assert.ok(/signingConfig signingConfigs\.release/.test(APP_GRADLE),
    'de release-buildtype gebruikt de configuratie niet — het artefact blijft ongetekend');
});

t('D2: er wordt nooit teruggevallen op de debug-sleutel', function () {
  assert.ok(!/signingConfigs\.debug/.test(APP_GRADLE),
    'een debug-getekend artefact kan zo per ongeluk als release de deur uit');
});

t('D3: sleutel en wachtwoorden staan niet in de repository', function () {
  assert.ok(!bestaat('android/keystore.properties'),
    'keystore.properties staat in de werkkopie — nooit committen');
  var gi = lees('.gitignore',
    'zonder dit bestand kan de upload-keystore ongemerkt worden gecommit');
  ['android/keystore.properties', '*.jks', '*.keystore', '*.p12', '.env', 'node_modules/']
    .forEach(function (regel) {
      assert.ok(gi.split(/\r?\n/).indexOf(regel) >= 0, '.gitignore mist de regel: ' + regel);
    });
  assert.ok(!/storePassword\s+["'][^"']+["']/.test(APP_GRADLE),
    'er staat een letterlijk wachtwoord in build.gradle');
});

t('D3b: .gitignore sluit geen enkel getrackt bronbestand uit', function () {
  /* Een te breed patroon (bijvoorbeeld *.json of docs/) zou stilzwijgend
     projectbestanden onzichtbaar maken bij de volgende `git add`. */
  var index = gitBestanden();
  if (!index) { console.log('      (overgeslagen: geen Git-checkout beschikbaar)'); return; }
  var uitgesloten = gitUitgesloten(index);
  if (uitgesloten === null) { console.log('      (overgeslagen: git check-ignore niet beschikbaar)'); return; }
  assert.deepStrictEqual(uitgesloten, [],
    '.gitignore sluit getrackte bronbestanden uit: ' + uitgesloten.join(', '));
});

t('D3c: er staat geen sleutelmateriaal in de Git-index', function () {
  /* .gitignore beschermt alleen tegen NIEUWE bestanden. Deze test controleert de
     werkelijke eis: er staat op dit moment geen sleutel, certificaat of
     wachtwoordbestand ín de repository. Dat is de garantie die telt. */
  var index = gitBestanden();
  if (!index) { console.log('      (overgeslagen: geen Git-checkout beschikbaar)'); return; }
  var verdacht = index.filter(function (f) {
    return /\.(jks|keystore|p12|pem|key|aab|apk)$/i.test(f) ||
           /(^|\/)keystore\.properties$/.test(f) ||
           /(^|\/)\.env(\.|$)/.test(f) ||
           /(^|\/)local\.properties$/.test(f);
  });
  assert.deepStrictEqual(verdacht, [],
    'sleutelmateriaal of build-artefacten staan in Git: ' + verdacht.join(', '));
});

t('D4: er is een ingevuld voorbeeld voor de eigenaar', function () {
  assert.ok(bestaat('android/keystore.properties.voorbeeld'), 'geen voorbeeldbestand');
  var v = lees('android/keystore.properties.voorbeeld', 'het sjabloon voor de eigenaar');
  assert.ok(/keytool -genkeypair/.test(v), 'het voorbeeld legt niet uit hoe je de sleutel maakt');
  assert.ok(/storePassword=\s*$/m.test(v), 'het voorbeeld bevat een ingevuld wachtwoord');
});

/* ══ E. OMVANG VAN HET ARTEFACT ════════════════════════════════════════════ */
console.log('\nE. Omvang van het artefact');

t('E1: de video-bibliotheek wordt niet meegebundeld', function () {
  /* videos/ is 437 MB. Meegebundeld overschrijdt de AAB het Play-plafond van 200 MB voor
     de basismodule en wordt de upload geweigerd. */
  assert.ok(/const COPY_DIRS = \['core'\];/.test(BUILDWWW),
    "build-www kopieert nog steeds meer dan alleen core/ — controleer of videos/ terug is");
  assert.ok(!bestaat('android/app/src/main/assets/public/videos'),
    'de video-map zit in het Android-artefact');
});

t('E2: de video-oorsprong is in de native app expliciet geregeld', function () {
  var sw = lees('sw.js', 'de service worker regelt de media-oorsprong');
  assert.ok(/const MEDIA_ORIGIN/.test(sw), 'sw.js kent geen media-oorsprong');
  assert.ok(/mediaUrl\(key\)/.test(sw),
    'handleVideo haalt nog steeds relatief op — in de app is dat https://localhost en dus 404');
  assert.ok(/hostname === 'localhost'/.test(sw),
    'de native oorsprong wordt niet herkend');
});

t('E3: testcode zit niet in het uitgeleverde artefact', function () {
  assert.ok(/\.endsWith\('\.test\.js'\)/.test(BUILDWWW), 'build-www filtert geen testbestanden');
  var dir = path.join(ROOT, 'android/app/src/main/assets/public/core');
  if (fs.existsSync(dir)) {
    var tests = fs.readdirSync(dir).filter(function (f) { return f.endsWith('.test.js'); });
    assert.deepStrictEqual(tests, [], 'testbestanden in het artefact: ' + tests.join(', '));
  }
});

t('E4: de app-assets zijn actueel ten opzichte van de bron', function () {
  var bron = lees('index.html', 'de app zelf');
  var artefact = lees('android/app/src/main/assets/public/index.html',
    'de web-assets van de Android-app; opnieuw op te bouwen met `npm run cap:sync`');
  var v = bron.match(/const APP_VER = '(v[\d.]+)';/)[1];
  assert.ok(artefact.indexOf("const APP_VER = '" + v + "'") > 0,
    'de Android-assets zijn van een oudere versie — draai `npm run cap:copy`');
});

/* ══ F. MERKBEELD ══════════════════════════════════════════════════════════ */
console.log('\nF. Merkbeeld');

/* PNG-afmetingen uit de IHDR-chunk; geen beeldbibliotheek nodig. */
function pngMaat(p) {
  var vol = path.join(ROOT, p);
  assert.ok(fs.existsSync(vol), 'ontbrekende afbeelding: ' + p +
    ' — opnieuw te genereren met `python3 scripts/android-icons.py`');
  var b = fs.readFileSync(vol);
  assert.strictEqual(b.readUInt32BE(0), 0x89504e47, p + ' is geen PNG');
  return { breedte: b.readUInt32BE(16), hoogte: b.readUInt32BE(20), bytes: b.length };
}

t('F1: alle launcher-iconen bestaan in de juiste maten', function () {
  var maten = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  Object.keys(maten).forEach(function (dpi) {
    var px = maten[dpi];
    ['ic_launcher', 'ic_launcher_round'].forEach(function (naam) {
      var m = pngMaat('android/app/src/main/res/mipmap-' + dpi + '/' + naam + '.png');
      assert.strictEqual(m.breedte, px, dpi + '/' + naam + ' is ' + m.breedte + 'px i.p.v. ' + px);
      assert.strictEqual(m.hoogte, px);
    });
    var fg = pngMaat('android/app/src/main/res/mipmap-' + dpi + '/ic_launcher_foreground.png');
    assert.strictEqual(fg.breedte, Math.round(px * 108 / 48),
      'de adaptieve voorgrond hoort een 108dp-canvas te zijn');
  });
});

t('F2: het adaptieve icoon verwijst naar de eigen voorgrond en achtergrond', function () {
  var x = lees('android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml',
    'het adaptieve icoon voor Android 8 en nieuwer');
  assert.ok(/<foreground android:drawable="@mipmap\/ic_launcher_foreground"\/>/.test(x));
  assert.ok(/<background android:drawable="@color\/ic_launcher_background"\/>/.test(x));
});

t('F3: de iconen zijn reproduceerbaar afgeleid van het merkbestand', function () {
  /* Het generatiescript hoort in de repository te staan; anders is bij een volgende
     rebrand niet meer te achterhalen hoe de resources zijn ontstaan. */
  assert.ok(bestaat('scripts/android-icons.py'), 'geen generatiescript voor de Android-resources');
  var g = lees('scripts/android-icons.py', 'maakt de Android-resources reproduceerbaar');
  assert.ok(/icon-512\.png/.test(g) && /logo-wordmark\.png/.test(g),
    'het script leidt niet af uit de merkbestanden in de repository');
  assert.ok(bestaat('icon-512.png') && bestaat('logo-wordmark.png'), 'de merkbestanden ontbreken');
});

t('F4: de splash bestaat voor elke dichtheid en oriëntatie', function () {
  ['drawable', 'drawable-port-mdpi', 'drawable-port-hdpi', 'drawable-port-xhdpi',
   'drawable-port-xxhdpi', 'drawable-port-xxxhdpi', 'drawable-land-mdpi', 'drawable-land-hdpi',
   'drawable-land-xhdpi', 'drawable-land-xxhdpi', 'drawable-land-xxxhdpi'].forEach(function (d) {
    var m = pngMaat('android/app/src/main/res/' + d + '/splash.png');
    assert.ok(m.bytes > 2000, d + '/splash.png lijkt leeg');
  });
});

/* ══ G. EDGE-TO-EDGE ═══════════════════════════════════════════════════════ */
console.log('\nG. Edge-to-edge');

t('G1: de viewport laat de veilige zones daadwerkelijk doorwerken', function () {
  /* Zonder viewport-fit=cover geeft env(safe-area-inset-*) altijd 0 terug en zijn alle
     bestaande safe-area-regels in de CSS zinloos. */
  assert.ok(/<meta name="viewport"[^>]*viewport-fit=cover/.test(HTML),
    'viewport-fit=cover ontbreekt — alle safe-area-regels leveren 0 op');
});

t('G2: de koptekst schuift niet onder de statusbalk', function () {
  assert.ok(/\.hdr\{background:var\(--bg\);padding:max\(52px,calc\(12px \+ env\(safe-area-inset-top,0px\)\)\)/.test(HTML),
    'de koptekst heeft een vaste bovenmarge — met edge-to-edge verdwijnt hij onder de statusbalk');
});

t('G3: de onderbalk houdt rekening met de navigatiebalk', function () {
  assert.ok(/\.bnav\{[^}]*env\(safe-area-inset-bottom,0px\)/.test(HTML),
    'de hoofdnavigatie houdt geen rekening met de systeemnavigatie');
});

console.log('\n========================================================');
console.log('fAndroidRelease.test.js — ' + n + ' tests geslaagd');
