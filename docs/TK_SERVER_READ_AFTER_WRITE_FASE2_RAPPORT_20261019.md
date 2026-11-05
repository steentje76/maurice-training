# Read-after-write fase 2 — rapport (19 oktober 2026)

Branch `review/claude-raw-fase2-20261019`, gestapeld op Draft-PR #563 (HEAD `c63ca8e`). Uitvoering van `docs/TK_SERVER_READ_AFTER_WRITE_FASE2_PLAN_20261019.md`. Geen merge, deploy, schemawijziging, triggerwijziging, Android-installatie of gegevensverwijdering.

## 1. Wat is gebouwd

| Onderdeel | Ref | Waar |
|---|---|---|
| Hardere contractkern: samengestelde identiteit tabel + record-id + eigenaar + revisie; registerpoort; MISSING nooit definitief | TK-REL-SEC-21 | `core/serverVerification.js` |
| Lokaal verificatieregister in een aparte IndexedDB-database `tk_verificatie/register` | TK-REL-SEC-22 | `index.html` blok "SERVER READ-AFTER-WRITE, FASE 2" + haken in `sbPostQ`, `sbSchrijfQDetail`, `sbPatchQ`, `sbDelQ` |
| Teruglezen met het token van de oorspronkelijke eigenaar, ouder-kindvolledigheid | TK-REL-SEC-23 | `tkVerifyLees`, `tkVerifieerMetServer`; `sbFetch` bindt nu ook GET aan `opts.uid` |
| "Controleren met de server" in de updategereedheid; "Veilig om te verwijderen" uitgeschakeld | TK-REL-SEC-24 | Help-kaart, `tkVerifieerMetServerToon`, `tkUpdateGereedheid` |
| Geïsoleerde PostgreSQL/PostgREST-semantiek | — | `tools/pg-semantics/` |

### Register (per record)

`key` = `r␟tabel␟record-id␟eigenaar`, met de velden eigenaar, tabel, record_id, sleutelWaarden, verwacht (zonder id, eigenaar en servervelden), revisie, ouder {tabel, record_id}, status, status_revisie, laatste_verificatie, afwijkingen en verwijderd.

- Een `__meta__`-record legt het invoeringsmoment vast.
- Writes die niet aan één record te koppelen zijn, tellen per tabel en eigenaar als `onverifieerbaar`.
- Een opslagfout (open, transactie, exception in een handler) zet `tk_verify_register_defect`. Het register telt daarna als onvolledig en de updategereedheid wordt "onbekend". De write zelf blijft bevestigd.
- De bestaande wachtrij `maurice_offline` (v1) wordt niet geopend, gewijzigd of gemigreerd. Dat is bewezen in node (G10) en in Chromium (B1).

### Teruglezen

- Per tabel volgt een `GET ?select=*&<sleutel>=in.(…)` in blokken van 50, met waarden tussen aanhalingstekens.
- `sbFetch` weigert lokaal als de eigenaar niet meer is ingelogd. Na elk antwoord en vóór het opslaan wordt de identiteit opnieuw gecontroleerd.
- Een leesfout of accountwissel geeft UNKNOWN of stopt de controle. Een rij die niet zichtbaar is, geeft MISSING met `niet_zichtbaar_voor_eigenaar` (`definitief:false`).
- Een resultaat wordt alleen bewaard bij een ongewijzigde revisie (compare-and-set in één transactie).
- Ouder-kind:
  - een ontbrekend kind geeft MISSING;
  - een onverwacht kind op de server zet de ouder op MISMATCH;
  - kinderen niet gelezen geeft UNKNOWN;
  - kinderen zonder eigenaarsveld (`nutrition_meal_items`, `activity_laps`) worden alleen VERIFIED als de ouder in het register staat én VERIFIED is.
- Een item dat nog in de offline-wachtrij staat, krijgt status QUEUED.
- Logging (`verify_run`) bevat alleen aantallen per status, het aantal historische items en de poortuitkomst. Er staan geen id's of inhoud in.

## 2. Testbewijs

| Suite | Resultaat | RED vóór de wijziging |
|---|---|---|
| `fServerVerifyHardening` (TK-REL-SEC-21) | 30/30 | 18 van 26 RED op de oude kern (`scratchpad H-RED`); H11/H12 toegevoegd na mutatierun |
| `fServerVerificationContract` | 31/31 | C22–C27 bewust aangepast aan de strengere poort; C22a nieuw |
| `fVerifyRegister` (TK-REL-SEC-22) | 17/17 | n.v.t.: het blok bestond niet (de test faalt al bij het ophalen van het blok) |
| `fVerifyReadBack` (TK-REL-SEC-23) | 29/29 | idem |
| `fVerifyRegisterChromium` (TK-REL-SEC-24), echte Chromium + IndexedDB | 11/11 | idem |
| Volledige core-suite (Node 20, zonder NODE_PATH, parallel) | 478/478, twee keer | — |
| Chromium-workflowsuites | `fRecoveryCommunicationConsistency` 91/91, `fInzichtHerstelBelasting` 170/170, `fSetLoggingUx` 131/131, `fExecutionIntegrity` 34/34, `fUpdateReadiness` 25/25, `fGuidedSaveReliability` 78/78 | — |
| `fHomeDagfactorBasisSafety` lokaal | 194/195 | Identiek op basis `c63ca8e` (lettertype-afbreking in deze container). CI op #563 groen. |
| `tools/pg-semantics/run.js` tegen PostgreSQL 16 + PostgREST v12.2.3 | 14/14, twee keer | — |

### Accountwisseltests

- L5: wissel tijdens het teruglezen geeft `account_gewisseld`. Er gaat geen verzoek met het token van B en niets wordt als VERIFIED opgeslagen.
- L16: een GET gebonden aan A terwijl B is ingelogd, wordt lokaal geweigerd zonder verzoek.
- B6 (Chromium): leesverzoeken gaan alleen met het token van de eigenaar. Bij een wissel stopt de controle.
- pg-semantics P6/P7: de echte trigger zet een rij stil op B. RLS verbergt een rij van een andere eigenaar, wat MISSING niet-definitief oplevert.

### Mutatietests

- 34 mutaties op kern en app: 26 gedood in de eerste run.
- 6 overlevers gedood na extra tests: H11, H12, L6-aanscherping, L16, L17 en G14 (met `tx.abort` in de mini-IndexedDB).
- 2 equivalent:
  - **A2:** de identiteitscontrole direct na de GET is een extra laag. De controle na `json()`, de GET-binding in `sbFetch` en de eindcontrole vóór het opslaan vangen hetzelfde af. Ook alle drie lagen in `tkVerifyLees` samen weghalen overleeft, door de eindcontrole.
  - **A5:** `tkVerifyNa` markeert het defect ook als `tkVerifyNoteer` `false` teruggeeft. A5b (beide weg) wordt gedood door G9.
- Eindstand: 32/32 niet-equivalente mutaties gedood.

## 3. Bekende beperkingen

1. **De poort is altijd dicht.** Lokale gegevens van vóór het register zijn niet geïnventariseerd (`historie.geinventariseerd:false`). Het gaat om de localStorage-bronnen, de IndexedDB-caches en de eigen trainingen. Het register telt wel bekende historische items (wachtrij-items die het register niet kent, `tk_trainings`). "Veilig om te verwijderen" blijft uitgeschakeld.
2. **Ondersteunde tabellen** zijn de acht uit §1. Andere tabellen (`goals`, `programs`, `program_blocks`, `exercise_goals`, `weight_logs`, `checkins` enz.) worden niet geregistreerd. Tabellen met een identity-id zonder client-id zijn niet per rij te verifiëren zonder schemawijziging.
3. **PATCH op een rij die het register niet kent** krijgt `onvolledig`. De verwachting is dan niet volledig en de rij wordt nooit VERIFIED.
4. **De trigger `set_user_id_from_auth` overschrijft nog steeds.** De client weigert vóór verzending (DEC-SEC-005). De verificatie toont een stil verplaatste rij als MISSING, niet als definitief verloren.
5. **Geen fysiek Android-toestel getest.** IndexedDB-gedrag is bewezen in Chromium (desktop, Playwright), niet in de Android WebView.
6. **De PostgreSQL/PostgREST-stack draait lokaal**, niet in CI. Het schema is afgeleid van de productiemetadata, niet gedumpt.
7. **De register-DB groeit per record.** Er is nog geen opschoning; verwijderde records blijven als `verwijderd:true` staan.

## 4. GO / NO-GO

| Onderdeel | Oordeel |
|---|---|
| 1. Contractkern gehard | **GO** voor review |
| 2. Register (aparte IndexedDB, fail-closed) | **GO** voor review |
| 3. Teruglezen met eigenaarsbinding | **GO** voor review |
| 4. Ouder-kindvolledigheid | **GO** voor review (vier relaties) |
| 5. UI "Controleren met de server" | **GO** voor review; geen toestemming tot verwijderen |
| 6. Tests (Chromium, accountwissel, mutaties, PostgreSQL) | **GO**; beperkingen 5 en 6 open |
| Merge naar `main` | **NO-GO** zonder afzonderlijke toestemming |
| Productie/deploy | **NO-GO** |
| Android-de-installatie of gegevens wissen | **NO-GO**: poort dicht (historie niet geïnventariseerd) |

## 5. Volgende stap (voorstel, niet gebouwd)

- Inventaris van de historische lokale bronnen per eigenaar, zodat `historie.geinventariseerd` aantoonbaar `true` kan worden.
- Een eerste "basismeting": alle lokale rijen van ondersteunde tabellen eenmalig in het register zetten met de verwachting uit de lokale bron.
- Een besluit van de PO over client-id-kolommen voor identity-tabellen (migratie).
