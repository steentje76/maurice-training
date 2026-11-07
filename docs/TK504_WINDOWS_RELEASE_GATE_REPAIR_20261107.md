# TK504 — herstel van de volledige Windows-releasegate

Datum: 7 november 2026. Refs #504, #603 en PR #607.
Baseline: eb02c5b. Scope: testinfrastructuur; geen applicatie- of databasewijziging.

## Oorzaken

De eerder vastgelegde 16 rode testbestanden zijn afzonderlijk gereproduceerd.
Dit bleken fouten in platformafhankelijke testuitvoering:

| Oorzaak | Herstel |
|---|---|
| Multiline assertions en sabotagevervangingen verwachtten LF; Windows-checkout gebruikte CRLF | Broninspectie leest tekst via tools/test-source-text.cjs en normaliseert uitsluitend CRLF naar LF |
| CRLF voorkwam het verwijderen van de shebang vóór new Function | Dezelfde tekstnormalisatie; de grants-guard en zijn negatieve proeven draaien werkelijk |
| ESM-import kreeg een absoluut Windows-pad met c: als URL-schema | Beide Concept2-tests gebruiken pathToFileURL |
| Artifact-firewall riep npm als executable aan; dat bestand bestaat zo niet op Windows | Dezelfde build-www.mjs wordt rechtstreeks via de actieve Node-executable gestart |
| OCR-/Android-controles misten gegenereerde www/native assets | Webbuild en Capacitor copy uitgevoerd vóór de volledige gate; geen APK-build |

Er zijn geen assertions, negatieve cases of sabotagegevallen verwijderd,
overgeslagen of vervangen door een mildere verwachting. De tests lezen nog
de daadwerkelijke applicatie-, server-, migratie- en beveiligingscode.
De volledige gate blijft ontdekken wat in core aanwezig is.

## Grenzen van tekstnormalisatie

De helper is uitsluitend voor tekstuele broninspectie. Binaire assets,
SHA-/bytecontroles en de bytevergelijking van Android/www-assets blijven
fs.readFileSync gebruiken. De nieuwe helpertest bewijst LF/CRLF-equivalentie,
ongewijzigde oorspronkelijke bestandsbytes, behoud van een losse CR en
normale ENOENT-afhandeling. De helper wordt niet in de app gebundeld.

## Uitgevoerde controles

De 16 oorspronkelijke rode testbestanden slagen nu afzonderlijk. Onder meer:
betaFeedback 134; storage 63; grants-guard 31; helper-orakels 34; quota 27;
retention 24; telemetry 36; Concept2 artifact 27, diagnostics 99 en corrective 59;
Android OCR packaging 24. De LF/CRLF-helper heeft 6 gerichte assertions.

De volledige gecombineerde Windows Node24-projectgate is geslaagd:
500 uitgevoerd, 0 overgeslagen, 0 gefaald; exitcode 0. Ook de eerder
omgevingsafhankelijke Android-releasecontrole is uitgevoerd na assetsynchronisatie.
De Calculation/Decision-purity- en service-workercontroles slagen.
Dit vervangt geen echte Android/WebView-, videostreaming- of productieacceptatie.

## Reproduceren

Vanuit de repository:
- node scripts/build-www.mjs
- node node_modules/@capacitor/cli/bin/capacitor copy android
- node core/release-gate.js

Dit bereidt alleen web/native testassets voor. Er wordt geen Gradle APK-build
uitgevoerd en geen installatiebestand gepubliceerd. Door Capacitor bijgewerkte
getrackte configuratiebestanden zijn buiten de wijziging gehouden.
