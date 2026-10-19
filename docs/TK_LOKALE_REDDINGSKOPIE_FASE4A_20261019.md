# Trainingskompas — veilige lokale reddingskopie, fase 4A
**Datum:** 19 oktober 2026 · **Branch:** `feat/tk-local-encrypted-backup-20261019` · **Status:** Draft; geen merge/deploy/datawijziging.

## Nieuwe functionaliteit
De bestaande JSON-export exporteert hoofdzakelijk gegevens die al op Supabase staan. Dit is een **aanvullende, versleutelde deelkopie** van lokale data op het toestel. Het importeren of terugzetten is bewust **niet** gebouwd.

Bij Instellingen → Gegevens exporteren kunnen gebruikers een wachtzin van minimaal 12 tekens invoeren en een `.tkbackup`-bestand maken. De inhoud wordt uitsluitend lokaal versleuteld met WebCrypto (AES-256-GCM, PBKDF2-SHA256 met 210.000 iteraties, willekeurige salt/nonce en een geauthenticeerde formaatmarker). Wachtzinnen worden niet opgeslagen. Het formaat bevat geen plaintext recorddata, accounttokens of geheime sleutels.

De knop **Bestand controleren** opent een lokaal gekozen bestand met wachtzin en valideert de authenticatietag en het envelopeformaat. Dit is **uitsluitend een leescontrole**: er wordt geen record teruggeschreven en er wordt geen offline queue verwerkt. Een bestand van een andere eigenaar wordt niet als geschikt voor dit account gepresenteerd.

## Reikwijdte en fail-closed
- Lokale personal cache, trainingsconcepten, Guided Workout-log, legacy Builder-records en eigen wachtrij-items worden via het gecontroleerde `localinventory.v1`-manifest geselecteerd.
- De huidige aangemelde eigenaar moet overeenkomen met `tk_cache_owner_uid` voor data die aan de persoonlijke cache hangt. Een lopende uitvoeringssleutel met een ander eigenaarssuffix wordt niet overgenomen.
- Een wachtrij-item van een andere of onbekende eigenaar wordt nooit in deze export opgenomen.
- Sessie- en toegangsgegevens worden niet uitgelezen. Herkenbare geheimvelden in JSON-objecten en wachtrij-items worden verwijderd.
- Onbekende of onbetrouwbare bronnen worden overgeslagen en geteld, zonder hun inhoud uit te lezen.
- Export is **altijd onvolledig**: overige IndexedDB-stores, historische eigenaarloze records en sommige bronsoorten vallen buiten deze eerste versie. De bestandstatus `complete:false` en `restoreAllowed:false` is hard afgedwongen.
- De bestaande `maurice_offline`- en `tk_verificatie`-databases blijven ongewijzigd; geen automatische herstelactie, geen servercalls, geen upload.

## Testbewijs en beperkingen
`core/fLocalEncryptedBackup.test.js` toetst encrypt/decrypt, wachtwoordfouten, corrupte ciphertext, accountisolatie, uitsluiting van auth-sessies, verwijdering van gevoelige velden en byte-ongewijzigde brondata. `core/fLocalEncryptedBackupChromium.test.js` is toegevoegd aan de echte Chromium-acceptatieworkflow. Definitieve CI-status moet op de exacte PR-HEAD worden gecontroleerd.

**Geen garantie voor volledig herstel.** De browserdownload en het openen van het bestand bewijzen niet dat elk denkbaar lokaal record erin staat. Het wachtwoord is niet te herstellen; verlies van wachtwoord maakt de kopie onbruikbaar. De gebruiker moet de daadwerkelijke gedownloade file apart controleren. Android/WebView- en fysieke toestelacceptatie zijn nog open. De-installatiepoort blijft altijd **NO-GO**.

## Volgende fases
1. Breid de inventaris en de reddingskopie uit naar alle andere relevante bronnen, met privacy- en eigenaarschecks per bron.
2. Bouw een gescheiden, gecontroleerde restore-preview (zonder schrijven), gevolgd door een expliciet goedgekeurde, idempotente en per eigenaar geautoriseerde herstelprocedure.
3. Demonstreer de volledige data-roundtrip op een fysiek Android-toestel, zonder eerst de bestaande installatie of data te wissen.

**Harde grenzen:** geen merge naar `main`, geen productie- of databasewijziging, geen Android-installatie/de-installatie, geen wijziging van lokale gebruikersgegevens.
