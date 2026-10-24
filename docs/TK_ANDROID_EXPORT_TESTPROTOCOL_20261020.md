# Testprotocol fysiek Android-toestel — native export en herstelpreview (TK-REL-SEC-33/34)

**Versie 3.** Versie 2 volgde op de fysieke test op de Galaxy A70 (Android 11), met blocker T3: de herstelpreview kon het eigen exportbestand niet selecteren (oorzaak en herstel: `docs/TK_ANDROID_MIME_HERSTEL_20261020.md`). Versie 3 voert de heracceptatie uit op een **aparte, schone testvariant** `com.trainingskompas.app.exportproefmime` (label "TK MIME-proef"), zodat de eerder geïnstalleerde `com.trainingskompas.app.exportproef` en de bestaande app onaangeroerd blijven.

**Uitvoering:** onafhankelijk (ChatGPT) op het verbonden toestel. Geautomatiseerde tests (node, Chromium, emulator) zijn **geen** bewijs voor deze scenario's. Elk scenario moet op het fysieke toestel zelf worden aangetoond.

## 0. Harde grenzen

- Installeer voor de heracceptatie **alleen** `com.trainingskompas.app.exportproefmime` (label "TK MIME-proef"), en pas nadat pakketnaam, SHA-256 en broncommit van de APK zijn geverifieerd (§ 1). De eigenaar heeft voor deze variant toestemming gegeven (20-10-2026).
- Raak `com.trainingskompas.app` en `com.trainingskompas.app.exportproef` niet aan: niet bijwerken, niet vervangen, niet verwijderen, geen `pm clear`. Gebruik nooit `adb install -r` met de exportproefmime-APK als een van deze pakketten het doel zou zijn.
- Gebruik alleen het testaccount (Radio) en synthetische gegevens. Geen productieaccount.
- Lees geen wachtzinnen, tokens of accountgegevens uit: geen `run-as` op de bestaande app, geen dump van WebView-opslag.
- Voer geen herstel uit; "Herstel uitvoeren" moet uitgeschakeld blijven.
- Zet de wachtzin niet in logs, schermafbeeldingen of het verslag. Gebruik een wegwerpwachtzin van ≥ 12 tekens alleen voor deze proef.

## 1. ADB-controles vooraf

```sh
adb devices -l                                   # exact één toestel: SM-A705FN
adb shell getprop ro.build.version.release       # 11
adb shell pm list packages | grep trainingskompas
#   verwacht: package:com.trainingskompas.app              (bestaand, NIET aanraken)
#             package:com.trainingskompas.app.exportproef  (eerdere testvariant, NIET aanraken)
#             package:com.trainingskompas.app.exportproefmime ontbreekt nog
APK=Trainingskompas-exportproefmime-4.70.25-<sha9>.apk  # uit CI-artifact trainingskompas-exportproefmime-apk
sha256sum "$APK"                                 # moet gelijk zijn aan SHA256SUMS.txt én de CI-annotatie exportproefmime-apk
cat BUILDINFO.txt                                # commit = PR-head-commit; package; label; cert_sha256
aapt2 dump badging "$APK" | grep -E "^package:|^application-label:"
#   verwacht: package: name='com.trainingskompas.app.exportproefmime' versionCode='47025' versionName='4.70.25-exportproefmime'
#             application-label:'TK MIME-proef'
apksigner verify --print-certs "$APK" | grep -E "Subject|SHA-256"   # CN=Android Debug; digest = cert_sha256
for p in com.trainingskompas.app com.trainingskompas.app.exportproef; do
  adb shell dumpsys package $p | grep -E "versionName|firstInstallTime|lastUpdateTime"   # beginwaarde vastleggen
done
adb install "$APK"                               # nieuwe installatie, ZONDER -r
```

- **Stopcriteria vóór installatie:** afwijkende SHA-256, pakketnaam, label, broncommit of ondertekening; een al aanwezig `…exportproefmime`-pakket van een andere build. Dan niet installeren en melden.
- **Ondertekening:** de APK is getekend met de debug-sleutel van de CI-runner. Een APK uit een latere CI-run heeft een andere sleutel; `adb install -r` daarover faalt met een signature-mismatch. Dan stoppen en melden; niet de-installeren zonder toestemming.
- **Na de installatie:** `adb shell dumpsys package com.trainingskompas.app.exportproefmime | grep -E "versionName|firstInstallTime|lastUpdateTime"`.
- **Bestaande pakketten ongewijzigd:** de dumpsys-waarden van `com.trainingskompas.app` en `com.trainingskompas.app.exportproef` vóór en na de proef moeten gelijk zijn.
- **Schone opslag:** de nieuwe variant heeft eigen lokale gegevens. Log in met het testaccount Radio en maak de synthetische gegevens van § 2 opnieuw aan. Het oude exportbestand in Downloads (T3b) blijft via de kiezer bereikbaar; daarvoor zijn geen opslagrechten nodig.

## 2. Synthetische testgegevens (opdracht C)

Voer deze stappen uit in de testvariant, ingelogd met het testaccount Radio:

1. **Twee eigen trainingen:** "Proef Kracht A" (squat, bench) en "Proef Kracht B" (row, deadlift).
2. **Eén lopende training:** start "Proef Kracht A", log 1 set en sluit de app niet af.
3. **Offline set:** vliegtuigmodus aan, log nog 1 set. De wachtrijbadge toont ≥ 1.
4. **Een voorkeur:** Instellingen → coachstijl wijzigen (indien aanwezig).

Laat de vliegtuigmodus aan tot na T1. Dan blijft het wachtrij-item lokaal staan en komt het in de export.

## 3. Scenario's

Vul per scenario **Werkelijk**, **Bewijs** en **Uitkomst** (PASS/FAIL/BLOCKED) in.

| # | Handeling | Verwacht | Bewijsvorm | Restrisico |
|---|---|---|---|---|
| T1 | Instellingen → Gegevens exporteren → wachtzin 2× → "Versleuteld bestand maken" → kies Downloads → Opslaan | Melding begint met "N items, 0 overgeslagen. Aanwezige bronnen: …". **Geëxporteerd** bevat `eigen_trainingen: 2`, `actieve_training: 1`, `offline_wachtrij: ≥1` (en `coach_stijl: 1` bij stap 4). **Niet exporteerbaar** noemt toestel/systeem (o.a. `sessie`). Daarna "Versleutelde kopie weggeschreven en teruggelezen. Bestand: …" + cloudvoorbehoud | Schermafbeelding van de melding (zonder wachtzin) | "Geëxporteerd" is geen bewijs van herstelbaarheid; zie T3 |
| T2 | `adb shell ls -l /sdcard/Download/` en `adb pull` van het bestand; `jq 'keys'` | Bestand aanwezig, > 0 bytes. Exact 7 velden: `cipher, data, format, iterations, salt, iv, kdf`; `iterations` = 600000. `grep -c "Proef Kracht"` = 0 | Uitvoer van `ls`, `jq keys`, `grep` | — |
| T3 | **Herstelpreview:** Gegevens exporteren → Herstelpreview → "Bestand kiezen" → in de kiezer naar Downloads → het bestand uit T1 kiezen → wachtzin → "Herstelpreview tonen" | Het bestand is **selecteerbaar**: UI Automator `enabled=true` op de regel. Resultaat: "Dit is alleen een controle. Er worden geen gegevens teruggezet." Per bron: `eigen_trainingen: 2 (2 staat al op dit toestel)`, `offline_wachtrij` BESTAAT_AL, `actieve_training` niet ondersteund. "Herstel uitvoeren (niet beschikbaar)" is uitgeschakeld | `adb shell uiautomator dump` van de kiezer (regel met de bestandsnaam: `enabled="true"`); schermafbeelding van het resultaat | Andere fabrikant-kiezers kunnen MIME anders filteren |
| T3b | Zelfde als T3 met het **oude** bestand van 20-10 (1.322 bytes, octet-stream) | Selecteerbaar en leesbaar. De oude kopie bevat minder bronnen; de preview toont wat erin staat | Zoals T3 | — |
| T3c | Herstelpreview met een **verkeerde wachtzin** | "Onjuiste wachtzin of beschadigd bestand." Geen aantallen | Schermafbeelding | — |
| T3d | Kopie op de pc manipuleren (één teken in `data` wijzigen, `adb push` als `…-gewijzigd.tkbackup`) → herstelpreview | "Onjuiste wachtzin of beschadigd bestand." | Schermafbeelding + `diff` van de bestanden | — |
| T3e | Ongeldige envelop: `echo '{"format":"tk-local-rescue-encrypted.v1"}' > x.tkbackup`, `adb push` → herstelpreview | "Onbekend of ongeldig bestandsformaat." | Schermafbeelding | — |
| T4 | Export → in de kiezer **Annuleren** | "Opslaan geannuleerd. Er is geen kopie gemaakt."; `ls` toont geen nieuw bestand | Schermafbeelding + `ls` | — |
| T5 | Export → **zelfde naam** als T1 | De melding noemt de werkelijke naam (bijv. "… (1).tkbackup"), of de provider vraagt te vervangen. Het origineel uit T1 blijft leesbaar (herhaal T3) | Schermafbeelding + `ls -l` | Een provider die stil vervangt |
| T6 | Export naar Google Drive (indien beschikbaar, testaccount) | Gelukt met cloudvoorbehoud; later in Drive aanwezig | Schermafbeelding | Cloudsynchronisatie niet door de app bewezen |
| T7 | Export starten → tijdens "Lokale gegevens worden … versleuteld" of meteen na Opslaan de app wegvegen via Recents → app openen → opnieuw exporteren | Waarschuwing "een eerdere export (…) is onderbroken … gebruik het niet als back-up"; nieuwe export lukt. Een eventueel achtergebleven deelbestand → herstelpreview weigert het | Schermafbeeldingen + `ls -l` | Timing moeilijk te raken; dan BLOCKED met toelichting |
| T8 | Weinig vrije ruimte (testbestanden met `adb shell dd`, alleen in `/sdcard/Download/tk-vul-*`, achteraf verwijderen) → export | "onvoldoende opslagruimte" of "Opslaan mislukt"; geen succesmelding | Schermafbeelding + `df` | Vulbestanden achteraf verwijderen |
| T9 | Export → direct na Opslaan uitloggen en met een tweede testaccount inloggen (indien haalbaar) | "ander account … afgebroken"; geen succes | Schermafbeelding | Timing; anders BLOCKED |
| T10 | Vliegtuigmodus aan → export naar Downloads | Gelukt (alleen lokaal) | Schermafbeelding | — |
| T11 | `adb logcat -c` vóór T1 en T3; daarna `adb logcat -d > log.txt`; zoeken naar de wachtzin, "Proef Kracht", `"data":"`, `access_token` | Geen treffers | `grep -c` per zoekterm (0) | — |
| T12 | `adb shell dumpsys package com.trainingskompas.app.exportproefmime \| grep -A3 "runtime permissions"` en Instellingen → Apps → machtigingen | Geen opslag- of bestandsmachtiging | Uitvoer | — |

## 4. Afsluiting

1. Vliegtuigmodus uit.
2. Vulbestanden `tk-vul-*` verwijderen. Proefbestanden in Downloads blijven staan; ze zijn versleuteld met een wegwerpwachtzin.
3. Leg `dumpsys package` van `com.trainingskompas.app` en `com.trainingskompas.app.exportproef` opnieuw vast; beide moeten gelijk zijn aan de beginwaarde.
4. De testvarianten verwijderen alleen met toestemming van de eigenaar.

## 5. Verslag

Per scenario: handeling, verwacht, werkelijk, bewijs (bestandsnamen van schermafbeeldingen en dumps), PASS/FAIL/BLOCKED en restrisico. Vermeld ook toestel, Android-versie, pakketnaam (`com.trainingskompas.app.exportproefmime`), de commit en de APK-SHA-256 uit de CI-annotatie `exportproefmime-apk`, en de datum.

**Definitieve acceptatie** vraagt minimaal T1, T2, T3, T3c, T3d, T3e, T4, T11 en T12 met PASS.
