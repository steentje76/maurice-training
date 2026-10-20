# Testprotocol fysiek Android-toestel — native export (TK-REL-SEC-33)

**Voorwaarde:** afzonderlijke toestemming van de eigenaar voor de installatie. Installeer **alleen** de variant `com.trainingskompas.app.exportproef`: het CI-artefact `trainingskompas-exportproef-apk`, gecontroleerd tegen `SHA256SUMS.txt` en `commit.txt`.

- De bestaande app niet bijwerken, niet verwijderen, geen gegevens wissen.
- Geen productiegegevens kopiëren: log in met een **testaccount** en voer synthetische gegevens in.

## Voorbereiding

1. Controleer de pakketnaam vóór de installatie: `aapt2 dump badging …apk | grep package` moet `com.trainingskompas.app.exportproef` tonen.
2. Installeer met `adb install` zonder `-r`. Faalt dat omdat het pakket al bestaat, stop dan en vraag om nieuwe instructies.
3. Controleer dat de bestaande app ongewijzigd naast de testvariant staat: twee pictogrammen, en de bestaande app heeft zijn gegevens nog.

## Scenario's (testaccount, synthetische gegevens)

| # | Handeling | Verwacht |
|---|---|---|
| T1 | 2 eigen trainingen, 1 lopende training, offline 1 set loggen (wachtrij). Instellingen → Gegevens exporteren → wachtzin 2× → "Versleuteld bestand maken" → kies Downloads → Opslaan | "Versleutelde kopie weggeschreven en teruggelezen. Bestand: …" + cloudvoorbehoud |
| T2 | Bestanden-app → Downloads | Bestand aanwezig, grootte > 0. Openen in een teksteditor: alleen `format`, `kdf`, `iterations`, `cipher`, `salt`, `iv`, `data`; geen trainingsnamen |
| T3 | In de app: "Herstelpreview" → hetzelfde bestand → wachtzin | "Dit is alleen een controle…", records BESTAAT_AL; "Herstel uitvoeren" uitgeschakeld |
| T4 | Export → in het SAF-dialoog Annuleren | "Opslaan geannuleerd." Geen nieuw bestand in Downloads |
| T5 | Export → dezelfde naam als T1 kiezen | Gemelde naam met " (1)", of de provider vraagt te vervangen. Het oorspronkelijke bestand blijft geldig (opnieuw T3) |
| T6 | Export → Google Drive (als die beschikbaar is) | Gelukt, met cloudvoorbehoud. Later in Drive controleren of het bestand er staat |
| T7 | Export starten → tijdens het opslaan de app via Recents wegvegen → app opnieuw openen → opnieuw exporteren | Waarschuwing "een eerdere export … is onderbroken"; nieuwe export lukt. Eventueel achtergebleven bestand → herstelpreview weigert het |
| T8 | Toestel bijna vol (testbestanden) → export | "onvoldoende opslagruimte" of "Opslaan mislukt"; geen succes; geen bestand of gemeld dat het niet verwijderd kon worden |
| T9 | Export → vlak na Opslaan uitloggen en met een tweede testaccount inloggen (indien haalbaar) | "ander account … afgebroken"; geen succes |
| T10 | Vliegtuigmodus aan → export naar Downloads | Gelukt (alleen lokaal) |
| T11 | `adb logcat` tijdens T1 | Geen wachtzin, geen trainingsnamen, geen `data`-inhoud van de envelop |
| T12 | Instellingen → Apps → Trainingskompas (exportproef) → Machtigingen | Geen machtiging voor opslag of bestanden |

## Vastleggen

Leg per scenario vast: datum, toestel en Android-versie, app-versie (`-exportproef`), commit, uitkomst en een schermafbeelding van de melding. Zet geen wachtzin of persoonsgegevens in het verslag.

## Afronden

Verwijder na de proef alleen de **testvariant**. Alleen met toestemming van de eigenaar; de bestaande app blijft onaangeroerd.
