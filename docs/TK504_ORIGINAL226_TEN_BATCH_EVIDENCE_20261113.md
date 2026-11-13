# TK504/TK614 — MoveKit 226: controle van batchrapporten en gesloten vrijgavepoort

Datum: 13 november 2026. Scope: oorspronkelijke oefening-ID's TK-000001 t/m TK-000226.

## Wat de auditrapporten zeggen — en wat dit hulpmiddel controleert

Er bestaan tien afzonderlijke geselecteerde, als live-batch gemarkeerde rapporten: negen rapporten voor elk 25 oefeningen plus één voor oefening TK-000226. Daarin staan samen 452 PASS-resultaten (226 MP4 en 226 WebP), 0 fail, 0 unable en 0 retries *binnen die geselecteerde rapporten*. De totale geclaimde en aan het manifest getoetste byteaantallen zijn 780.852.020 video en 3.879.362 poster, samen 784.731.382 bytes.

BELANGRIJK: De software herberekent de batch- en bytesom vanuit het vastgepinde catalogusmanifest en vergelijkt die met de **zelf gerapporteerde**, niet-ondertekende batchsamenvattingen. Dit is een reproduceerbare consistentiecontrole, niet zelf een nieuw bewijs dat deze tien downloads werkelijk met een bevoegde account en op genoemde tijdstippen gebeurden. De rapporten bevatten geen ondertekende per-object resultaten, run-ID's of cryptografisch bevestigde tijdstempels. Een beheerder met schrijftoegang tot de private auditbestanden kan zulke samenvattingen synthetisch aanmaken. Daarom is de uitkomst GEEN onafhankelijk cloud-attest.

**B01 had een eerdere onvolledige poging.** `TK504-Audit-B01-20261113.json` rapporteert 0 PASS, 0 FAIL en 50 UNABLE (status `BATCH_INCOMPLETE_UNABLE`, SHA256 `ca72bf72b7b2b39d3a6316b72f72074ef1eb9ef81d80178459a64ce7792a79ef`). De aggregatie selecteert uitsluitend de latere succesvolle `TK504-Audit-B01-20261113-RETRY1.json`. De 0 retries in de aggregatie hebben betrekking op de object-retries binnen die tien geselecteerde rapporten, niet op het aantal eerdere batchpogingen.

## Wat de feature-branch daadwerkelijk toevoegt

`tools/tk614_original226_ten_batch_evidence.cjs` controleert het volledige originele stagingmanifest op een exact vastgezette file-SHA256 en semantische fouten, vervolgens tien geselecteerde JSON-rapporten op vaste ID-bereiken, schema/provenance, een exacte sleutelset, video/postertotalen en expliciete niet-vrijgavestatus. Iedere gerapporteerde bytesom wordt vergeleken met de som die zelfstandig vanuit het originele manifest is opgebouwd. De tool berekent van elk rapport de SHA256, maar toetst geen individuele video-SHA opnieuw en verifieert geen externe cloud-identiteit of de git-provenance van de gerapporteerde app-commit.

Er worden geen tokens, wachtwoorden, media-URL's of gedownloade video's naar de output gekopieerd. De tool leest geen productiedatabase en kan geen grants, publicaties, handtekeningen, migraties of deploys uitvoeren. Als één controle faalt, schrijft hij geen output. De output krijgt buiten de repository een nieuwe bestandsnaam met exclusive create; een bestaand doel wordt niet overschreven.

`core/tk614Original226TenBatchEvidence.test.js` bevat uitsluitend synthetische gegevens en negatieve tests, waaronder gemanipuleerde sleutelsets, hash/bytes, batchgrenzen, ontbrekende rapporten en onterechte vrijgavevelden. De onafhankelijke code-review leidde tot aanvullende controles; gerichte regressietests moeten groen zijn voor verdere integratie.

## Reproduceren in de afzonderlijke lokale ontwikkel-worktree

Gebruik onderstaande opdracht uitsluitend waar de tien eerder gecontroleerde rapportbestanden daadwerkelijk zijn opgeslagen:

    node tools/tk614_original226_ten_batch_evidence.cjs --reports-dir C:\Steensoft --out C:\Steensoft\TK504-Audit-10Batch-VerifiedV3-20261113.json

De versie na review is daadwerkelijk uitgevoerd en gaf 452/452 consistent, SHA256 van uitvoerbestand `4269cc0217ed21030f6a13322b15916a5006839ee3a2d1478b762d289661c770`. Gebruik voor herhaling een NIEUW uitvoerpad. Laat de private bronrapporten en originele media buiten Git.

Op POSIX kan Node.js bij het aanmaken `mode:0600` afdwingen. Op Windows erft de samenvatting de ACL van de doelmap; de tool stelt die niet zelf in. De mapbeheerder moet die toegang apart beperken. Op systemen met aangepaste Git line-endings is de byte-exact gepinde manifest-SHA bewust fail-closed; BOM-JSON wordt eveneens als ongeldig afgewezen. Dit is geen bewijs van een cloud- of OS-permissiegrens.

## Vrijgavegates — NIET door dit bewijs gepasseerd

De bestaande `tools/tk614_original226_media_eligibility.cjs` is een voorbereide pure securitymodule die nog NIET aan de productiebroker hangt. Hij heeft `CUTOVER.enabled = false` als harde codeconstante, vereist los daarvan een eigenaarsondertekend `mode=live`-attest, een apart ondertekend mediareleasebesluit, per-oefening publicatie en accountgebonden grant. De huidige tien losse `mode=live-batch` samenvattingen mogen nooit met het aanpassen van hun velden tot een geautoriseerd `mode=live`-attest worden vervalst.

Alle 226 technische FK-aliasrows zijn al in productie gestaged (fase A), maar stonden bij de verificatie nog inactive/unreviewed en hadden 0 publicaties. De latere 356 actieve oefeningen moeten ongewijzigd blijven. Voor fase B is een afzonderlijke met de eigenaarssleutel ondertekende beslissing met zes aantoonbaar geaccepteerde evidence-gates en DBA-controle vereist; ook de mediaserver-release, begrensde accountgrants en de V1→V2 gezamenlijke cutover met echte browser-/Android-logging en multiaccount regressie blijven open (issues #504, #603, #614; PR #628 DRAFT).

Deze PR bevat uitsluitend code-only, niet-vrijgevende controlemiddelen. Er is geen productie-DB-write, geen media-activatie en geen APK uitgevoerd.
