# Fase 3 — historische data-inventaris en basismeting (19 oktober 2026)

Branch `review/claude-hist-fase3-20261019`, gestapeld op Draft-PR #564 (HEAD `51ef982`).

Er is niets gemerged, niets in productie aangepast en niets in de database gewijzigd. Er is niets op Android geïnstalleerd of gede-installeerd en er zijn geen gegevens verwijderd. In productie zijn alleen metadata gelezen (`information_schema`) voor het migratievoorstel.

## 1. DELETE-verificatiecontract (TK-REL-SEC-25)

**Probleem.** In fase 2 telde "na een DELETE niet meer zichtbaar bij teruglezen" als bewijs van verwijdering. Onder RLS bewijst afwezigheid niets:

- de rij kan bij een andere eigenaar staan (trigger, overdracht);
- RLS kan de DELETE stil hebben geweigerd (PostgREST: 2xx met 0 rijen);
- het antwoord kan verloren zijn gegaan (de replay raakt 0 rijen).

**Contract (fail-closed).**

- Elke DELETE vraagt `Prefer: return=representation`: `sbDelQ`, de detailvariant en de replay uit de wachtrij.
- De verwijdering is alleen bewezen (`verwijderBewijs: rij_teruggegeven`) als het antwoord exact deze rij teruggeeft met deze identiteit en deze eigenaar.
- Afwezig mét bewijs is `SERVER_VERIFIED`. Afwezig zonder bewijs is `UNKNOWN` (`verwijdering_niet_bewezen`, niet definitief). Nog aanwezig is `MISMATCH`.
- Een herhaalde DELETE die 0 rijen raakt, behoudt een eerder bewijs. Een nieuwe write op dezelfde rij wist het bewijs.

**Tests.** `fDeleteVerification` 22/22. Op de basis #564 zijn 10 checks RED, waaronder D4: daar telde een rij die bij een andere eigenaar staat als `SERVER_VERIFIED`.

| Scenario | Uitkomst |
|---|---|
| Geslaagde verwijdering (rij teruggegeven) | `SERVER_VERIFIED` |
| Rij staat inmiddels bij een andere eigenaar | `UNKNOWN`; de rij van B blijft staan |
| Geweigerde DELETE (403) | geen verwijdering geregistreerd |
| Stille RLS-weigering (2xx, 0 rijen) | onbewezen; rij nog zichtbaar → `MISMATCH` |
| Onzeker netwerkantwoord | `QUEUED`, item `onzeker`; replay met 0 rijen → `UNKNOWN` |
| Replay die de rij teruggeeft | `SERVER_VERIFIED` |
| Teruggegeven rij van een andere eigenaar | geen bewijs |
| Alle kinderen van een ouder verwijderen | alleen teruggegeven kinderen zijn bewezen |

De bestaande check H9 is aangepast aan het strengere contract. Aantoonbaar correct is nu: afwezig plus bewijs is bevestigd; afwezig zonder bewijs is `UNKNOWN`.

## 2. Bronregister

Het manifest staat in `core/localInventory.js`. Daaruit is `docs/TK_LOKALE_BRONNEN_MANIFEST_20261019.md` gegenereerd: 57 bronnen. Per bron zijn vastgelegd:

- opslaglocatie;
- regel voor de eigenaar;
- recordidentiteit en versie;
- verifieerbaarheid;
- afhankelijkheden;
- categorie: duurzaam, concept, wachtrij, serverkopie, voorkeur, legacy, toestel of systeem.

`fLocalInventory` I1 leest alle 57 opslagsleutels die `index.html` schrijft, leest of wist en eist dat elke sleutel in het manifest staat. Een nieuwe sleutel zonder manifestregel laat de test falen. I13 eist dat het document gelijk is aan de code.

**Eigenaarschap.**

- Persoonlijke caches horen bij `tk_cache_owner_uid`. Bij een eigenaarwissel wist `resetPersonalCacheIfNewDeviceOwner` ze.
- Uitvoeringsconcepten dragen de uid in hun sleutel.
- Wachtrij-items hebben `owner_uid`.
- Oude structuren hebben geen eigenaar: de naamruimte `maurice_*` en de globale `tk_running_execution_v1`.

## 3. Basismeting

`tkInventariseerHistorie()` werkt in deze stappen:

1. Leest een momentopname van localStorage, sessionStorage, de offline-wachtrij (strikt) en `indexedDB.databases()`. Dit gebeurt alleen-lezen; `tk_auth_session` wordt niet uitgelezen.
2. Deelt de bronnen op in records.
3. Vergelijkt eigen trainingen met de server: token van de scanner, dezelfde mapping als de sync (`tkTrainingVanServer`), identiteit, eigenaar en inhoud via `tkTrainingInhoud`.
4. Legt per bron in één transactie de records en de voortgang vast in `tk_verificatie/register`.

Wat het register per record bewaart:

- sleutel: scanner + bron + record;
- status en redenen;
- vingerafdruk, `bron_vingerafdruk` en run;
- `eerst_gezien` en `laatst_gezien`.

Inhoud of tokens worden nooit bewaard. Telemetrie bevat alleen aantallen.

| Eigenschap | Bewijs |
|---|---|
| Nooit `SERVER_VERIFIED` voor historische records | I9, I12, A1 |
| Lokale gegevens byte-gelijk | A2, A3 en C2 (echte Chromium): localStorage, sessionStorage en de wachtrij; `maurice_offline` blijft v1 |
| Geen dubbele registraties | A3, C3 |
| Hervatbaar na crash | A4 (de 3e schrijftransactie breekt af) en C4 (`put` gooit midden in de scan); eindstand gelijk aan een ononderbroken run |
| Accountwissel | A5, C5: stop, geen verzoek met het token van B, de lopende bron niet vastgelegd |
| Meerdere gebruikers | A6: B leest A's trainingen niet bij de server (`ANDERE_EIGENAAR`) |
| Oude structuren | I4, C1 |
| Onleesbaar | I5, A8: inventaris onvolledig, poort niet geïnventariseerd |
| Onbekend eigenaarschap | I3, I4, I7 |
| Wijziging tijdens de scan | A9, A15: run blijft open; alleen de laatst verwerkte bronversie telt |
| Verouderde inventaris | A10: een lokale wijziging na afronding maakt de inventaris ongeldig voor de poort |

## 4. Wat wel en niet aantoonbaar verifieerbaar is

| Lokale gegevens | Aantoonbaar? | Toelichting |
|---|---|---|
| Eigen trainingen (`tk_trainings`) | **gedeeltelijk** | Een record is `HIST_GEKOPPELD` als id, eigenaar en volledige inhoud gelijk zijn aan een zichtbare serverrij. Dat bewijst gelijkheid op het moment van meten, geen serverbevestiging. Een afwijking geeft `AFWIJKEND`, ontbreken geeft `NIET_GEVONDEN`. |
| Offline-wachtrij | nee | Nog niet verstuurd; blokkeert tot de wachtrij leeg is. |
| Lopende training, Guided Workout, HYROX, hardloop-, fiets- en zwemuitvoering, Builder-concept | nee | Concepten staan per definitie niet (volledig) op de server. |
| Guided Workout-log en -historie | nee | Alleen lokaal; geen serveridentiteit (positie of oefening-id). |
| Atleetprofiel, supplement- en voedingskoppelingen | nee | Serverkopie; herstel per veld niet bewezen. |
| Voorkeuren en toestemmingen (coach, machines, favorieten, AI, telemetrie, weer, cyclus, onboarding) | nee | Staan niet op de server. Verlies na de-installatie vraagt een PO-besluit. |
| Oude structuren (`maurice_*`, `tk_wb_saved`, `tk_1rm_*`, `tk_last_training`, globale hardloopsleutel) | nee | Geen eigenaar of geen huidige schrijver. |
| Gegevens van een andere gebruiker op hetzelfde toestel | nee | De scanner mag ze niet met zijn token lezen. |
| Toestelinstellingen, systeemsleutels, inlogsessie, controleregister | n.v.t. | Geen gebruikersgegevens; blokkeren niet. |

**Poort.** `tkVerifieerMetServer` gebruikt een voltooide, volledige en actuele inventaris als invoer voor de historie: alle geblokkeerde records tellen mee. Daardoor blijft de de-installatiepoort op elk toestel met concepten, voorkeuren of een niet-lege wachtrij dicht. "Veilig om te verwijderen" blijft uitgeschakeld en geen code schakelt de knop in (A14).

## 5. Tests en mutaties

| Suite | Resultaat | RED op basis #564 |
|---|---|---|
| `fDeleteVerification` (25) | 22/22 | 10 RED |
| `fLocalInventory` (26) | 38/38 | module ontbreekt (`Cannot find module`) |
| `fHistInventory` (27) | 41/41 | functie ontbreekt (A0 RED) |
| `fHistInventoryChromium` (28), echte Chromium | 13/13 | `tkInventariseerHistorie is not defined` |
| Volledige core-suite (Node 20) | 482/482 | — |
| Chromium-workflowsuites | alle groen | `fHomeDagfactorBasisSafety` lokaal 194/195, identiek op de basis (lettertype in deze container); in CI groen |

**Mutaties.**

- 37 mutaties; 31 gedood in de eerste ronde.
- 4 overlevers gedood na extra tests: A2-sessie, A8-poort, A15 en D11.
- 2 equivalent:
  - A12: `waarde` bereikt `put` nooit, omdat `tkInvVergelijk` hem altijd verwijdert.
  - A21: het bewijs wordt alleen gelezen bij `verwijderd:true`, en een nieuwe write zet `verwijderd:false`.
- Eindstand: 35/35 niet-equivalente mutaties gedood.

## 6. Beperkingen

1. Server-vergelijking bestaat alleen voor eigen trainingen. Andere lokale bronnen hebben geen serveridentiteit, of herstel is niet zonder aanname te bewijzen.
2. `HIST_GEKOPPELD` is een momentopname. Na een latere wijziging op de server of lokaal is de inventaris verouderd (A10), en een nieuwe run is nodig.
3. Een lopende training verandert voortdurend; de inventaris wordt dan niet afgerond (`gewijzigd_tijdens_scan`).
4. `indexedDB.databases()` ontbreekt in oudere WebViews. De inventaris is daar onvolledig (fail-closed).
5. Er is niet getest op een fysiek Android-toestel. De IndexedDB- en Web-Storage-bewijzen komen uit desktop-Chromium.
6. Het register groeit met historische records per scanner; er is nog geen opschoning.

## 7. GO / NO-GO

| Onderdeel | Oordeel |
|---|---|
| DELETE-contract | GO voor review |
| Bronregister en manifest | GO voor review |
| Basismeting (alleen lezen, hervatbaar) | GO voor review |
| UI-inventarisstatus | GO voor review |
| Merge, productie, database | NO-GO zonder afzonderlijke toestemming |
| Android-de-installatie of gegevens wissen | NO-GO: de poort blijft dicht |

Migratievoorstel: `docs/TK_MIGRATIEVOORSTEL_CLIENTID_EIGENAARSCHAP_20261019.md`.
