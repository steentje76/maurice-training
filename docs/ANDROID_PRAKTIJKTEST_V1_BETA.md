# Android-praktijktest — kandidaat V1-beta (oktober 2026)

**Status:** technisch voorbereid. Alles wat alleen een toestel kan bewijzen staat hieronder als
**OPEN — DEVICE VALIDATION REQUIRED**. Software- en browserbewijs staan apart vermeld en vervangen
geen toestelbewijs.

## 1. Wat er getest wordt

| Onderdeel | Bron | Software/browser bewezen | Toestel |
|---|---|---|---|
| Herstelcommunicatie Vandaag/Inzicht | PR #540, #541 | Chromium 320–412 px | OPEN — DEVICE VALIDATION REQUIRED |
| Setregistratie, bewerken, navigatiebewaking | PR UX-LOG-01 | Chromium 320–412 px | OPEN — DEVICE VALIDATION REQUIRED |
| Builder → uitvoering → historie | PR bouwstap 3 | zie PR | OPEN — DEVICE VALIDATION REQUIRED |
| Updategereedheid (Help) | PR DEV-UPDATE-01 | Chromium | OPEN — DEVICE VALIDATION REQUIRED |
| Google Health-koppeling, terugkeer, deep link | v4.70.25 (DEC-VAULT-001, DEC-API-001) | servertests | OPEN — DEVICE VALIDATION REQUIRED |
| Concept2 PM5 (BLE) | MS-F5-02 | native transporttests | OPEN — DEVICE VALIDATION REQUIRED |

## 2. Ondertekening: waarom de eerste installatie een herinstallatie is

- Elke CI-debugbuild krijgt een nieuwe debug-sleutel (ADR-ANDROID-SIGNING-001, PR #532). Een nieuwe
  debug-APK kan daarom **niet** over een bestaande installatie heen; Android weigert dat zonder schade.
- `allowBackup=false`: **verwijderen wist alle lokale gegevens**, inclusief de offline-wachtrij en een
  niet-afgeronde training.
- Een stabiele testsleutel vraagt de PO-besluiten D1–D4 uit PR #532. Tot dat besluit is elke nieuwe
  testbuild een herinstallatie. Er is in deze sprint niets aan signing, secrets of de applicationId gewijzigd.

## 3. Installatieprocedure — voorbereiding, installatie nog GEBLOKKEERD

**HARD STOP — NIET UITVOEREN op het huidige toestel.** Er is nog geen aantoonbaar veilige
herinstallatie. Vóór enige verwijdering zijn alle vier afzonderlijk vereist: (1) een
geaccepteerd signing-/installatiepad conform D1–D4 uit PR #532, (2) serverzijdige bevestiging
van alle relevante traininggegevens, (3) een aantoonbaar herstel-/overdrachtspad voor
uitsluitend lokale gegevens en (4) expliciete toestelacceptatie en PO-vrijgave. Een groen CI-
resultaat, het ontbreken van een wachtrij of een gedownloade APK vervangt deze gates niet.

De stappen hieronder beschrijven de voorbereiding; stap 5 en 6 zijn geen actuele handelingen.

1. Open op de telefoon de huidige app → **Instellingen → Help & over de app → Klaar voor een update?**
   en tik **Synchroniseren en controleren**.
2. **Stop: verwijder de huidige app niet uitsluitend op basis van deze kaart.** De status
   "Geen lokale blokkades gevonden" bevestigt alleen wat lokaal is gecontroleerd; hij bewijst
   niet dat alle trainingsgegevens op de server staan. Controleer de serverregistratie en zorg
   voor een aantoonbaar veilig overdrachts- of herstelpad. Staat er iets open of zijn gegevens
   beschadigd/onbekend: rond de training af of herstel de gegevens en controleer opnieuw.
   **Ontbreekt de updatekaart in de geïnstalleerde versie, dan is er geen veilige lokale
   inventarisatie mogelijk; het ontbreken van een offline-badge is geen bewijs.**
   Zonder bewezen veilige overdracht blijft herinstallatie GEBLOKKEERD.
3. Download de APK uit de GitHub-pre-release (naam `Trainingskompas-<versie>-<sha>-debug.apk`).
4. Vergelijk de SHA-256 in de release-notes met het bestand (optioneel, via een bestandsbeheerder met hash).
5. **NIET UITVOEREN — HARD STOP.** De huidige app blijft geïnstalleerd. Een eventuele
   toekomstige installatie wordt pas afzonderlijk begeleid na alle vier bovenstaande gates;
   gebruik dus nu niet de optie om de huidige app te verwijderen.
6. **ALLEEN NA APARTE VRIJGAVE:** log na een aantoonbaar veilige installatie in en controleer
   **Help → Versie** tegen de geautoriseerde release. Dit is nog geen geaccepteerde toesteltest.

## 4. Praktijktestchecklist sportschool

Noteer per regel: OK / NIET OK + korte omschrijving + tijd. Bij NIET OK: schermafbeelding.

### A. Vandaag en herstel
- [ ] A1 Check-in (HRV + slaap) invullen; Vandaag toont dagfactor, gereedheid, slaap en spierherstel.
- [ ] A2 Na een training gisteren: subtitel zegt dat sommige spiergroepen nog herstellen; geen "volledig hersteld"-claim.
- [ ] A3 "Waarom vandaag?" uitklappen: "Gebaseerd op" met meetmoment, berekening, betrouwbaarheid, spierherstel als schatting.
- [ ] A4 Inzicht: regel "Op basis van je dagfactor · spierherstel is een aparte schatting"; spiergroep zonder training toont "Geen data".

### B. Setregistratie (staand, met de telefoon in één hand)
- [ ] B1 Gewicht met komma ("62,5") en reps invoeren; de 1RM-schatting verschijnt onder de invoer, velden blijven leesbaar.
- [ ] B2 RPE met +/− instellen zonder mis te tikken.
- [ ] B3 Set afvinken, daarna reps aanpassen: vinkje blijft staan.
- [ ] B4 AMRAP markeren, set afvinken, reps aanpassen: AMRAP blijft.
- [ ] B5 Midden in de training een oefening toevoegen: eerder ingevulde sets blijven zichtbaar.
- [ ] B6 Tik op Samen/Inzicht tijdens de training: vraag "Training verlaten?". "Bij training blijven" houdt je erin.
- [ ] B7 Terugveeg (Android) tijdens de training: dezelfde vraag.
- [ ] B8 Via Coach en terug via Trainen: klok loopt door, scherm blijft aan.
- [ ] B9 Training afronden: één regel per oefening in Logboek, met de juiste sets, gewichten en RPE.
- [ ] B10 Logboek → sessie bewerken: elke set toont zijn eigen RPE; opslaan wijzigt alleen wat je aanpast.

### C. Offline en herstel
- [ ] C1 Vliegtuigmodus aan, training loggen en afronden: melding "in de wachtrij", geen foutmelding.
- [ ] C2 App volledig sluiten (recent apps → wegvegen), heropenen: training of wachtrij is er nog.
- [ ] C3 Vliegtuigmodus uit: wachtrij leegt; Logboek toont de training precies één keer.
- [ ] C4 Tijdens een training de app wegvegen en heropenen: "Hervatten" brengt dezelfde sets terug.

### D. Wearables en apparaten
- [ ] D1 Google Health koppelen vanuit de app: browser opent, na toestemming terug in de app, status "Gekoppeld".
- [ ] D2 Sync: HRV/slaap/rusthartslag van vandaag verschijnen met bron en meetmoment.
- [ ] D3 Concept2 PM5 koppelen (Bluetooth-toestemming), 500 m roeien: tijd/afstand/watt komen live binnen en worden opgeslagen.
- [ ] D4 PM5 tijdens de sessie uitzetten: nette melding, geen app-crash, ingevulde data blijft.

### E. Afsluiten
- [ ] E1 Help → Klaar voor een update? → controleer of de werkelijke melding
      "Geen lokale blokkades gevonden" verschijnt, alleen als alle gecontroleerde lokale bronnen
      leesbaar en leeg zijn. **Ook dan niet verwijderen:** deze status bewijst geen serverregistratie
      en is uitdrukkelijk geen installatie- of herinstallatietoestemming.

## 5. Wat bewust niet in deze test zit
- Play Store-distributie, release-signing en sleutelbeheer (PO-besluit, PR #532).
- Opruimen van wees-secrets in Vault (aparte toestemming, `migratie_v581.sql` niet toegepast).
- Productiemigraties.
