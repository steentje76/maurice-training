# Fase 4B — veilige herstelpreview (19 oktober 2026)

Branch `review/claude-restore-preview-20261019`, gestapeld op de herstel-PR van de review (#567), die zelf op #566 staat. De preview leest en controleert alleen:

- er wordt niets teruggezet en geen lokale opslag overschreven;
- de wachtrij wordt niet geleegd of afgespeeld;
- er wordt niets naar de server geschreven, alleen met het eigen token gelezen;
- er gaat niets naar een AI-model, een externe API of telemetrie.

De onafhankelijke review van #566 staat in `docs/TK_REVIEW_PR566_REDDINGSKOPIE_20261019.md`.

## 1. Werking

**B1 — Bestand veilig openen** (`tkHerstelPreview`). Elke fout is fail-closed en geeft een melding zonder inhoud.

1. De grootte wordt gecontroleerd vóór het inlezen: maximaal 24 MB, niet leeg.
2. Een lees- of onderbrekingsfout geeft `lezen_onderbroken`.
3. JSON.
4. `TKLocalBackup.inspect`:
   - exacte envelop;
   - iteraties 600.000, of 210.000 voor v1;
   - authenticatietag;
   - strikte inhoudsvalidatie tegen het manifest.
5. De eigenaar van het bestand moet het ingelogde account zijn. Een kopie van een ander account wordt geweigerd zonder aantallen, zonder inhoud en zonder serververzoek.
6. Na elke asynchrone stap volgt een accountcontrole; bij een wissel stopt de preview.

**B2 — Classificatie** (`core/restorePreview.js`, `restorepreview.v1`, puur). Dit gebeurt per record, volgens de vorm in het bronmanifest:

- een array: per element, met id als identiteit, of inhoud bij een log;
- een map: per sleutel;
- een waarde: als geheel;
- de wachtrij: per item, met `tabel:body.id` als identiteit, anders de inhoud.

**B3 — Concept-herstelplan.** Het plan is deterministisch en hangt niet af van de volgorde in het bestand. Per bron bevat het:

- datatype en aantal;
- eigenaar en identiteitscontrole;
- verwachte conflicten en afhankelijkheden;
- `overslaan`, `nader_onderzoek`, `al_op_server` en `alleen_lokaal`.

Per record bevat het alleen de sleutel, status, redenen, vingerafdruk en `op_server` (ja, nee of onbekend; "nee" is niet definitief). Er staat geen inhoud en geen credentials in. Het plan wordt niet opgeslagen.

**B4 — Interface.** Onder Instellingen → Gegevens exporteren staat een herstelpreview met de melding **"Dit is alleen een controle. Er worden geen gegevens teruggezet."** Het scherm toont:

- het aantal records in het bestand;
- potentieel herstelbaar, staat al op dit toestel, conflicten, onvoldoende vast te stellen, niet ondersteund en ander account;
- per bron de aantallen;
- dat het bestand onvolledig is;
- een waarschuwing bij een oude sleutelafleiding of een onleesbare lokale wachtrij.

"Herstel uitvoeren" is uitgeschakeld en geen code schakelt de knop in. De wachtzin wordt op elk pad gewist.

## 2. Herstelcategorieën

| Status | Betekenis | Voorbeelden |
|---|---|---|
| HERSTELBAAR | Technisch geschikt voor een **latere, afzonderlijk geautoriseerde** herstelprocedure. **Geen toestemming tot herstellen.** | Eigen training die lokaal ontbreekt; Guided Workout-log of -historie; voorkeur; wachtrij-item met client-id of natuurlijke sleutel, waarvan de ouder aantoonbaar bestaat |
| BESTAAT_AL | Zelfde identiteit en inhoud staat al lokaal | Ongewijzigde training; identiek wachtrij-item |
| CONFLICT | Zelfde identiteit lokaal, andere inhoud | Training die sinds de kopie is gewijzigd |
| ANDER_ACCOUNT | Eigenaar in de sleutel, payload of filter is niet het ingelogde account | Uitvoeringssleutel van een ander; `user_id` of filter van een ander (oud of gemanipuleerd bestand) |
| ONBEKEND | Identiteit, bron, inhoud of ouder onvoldoende vast te stellen | Item met weggelaten geheimvelden; element zonder id; markering zonder training; kind zonder ouder; onleesbare lokale wachtrij |
| NIET_ONDERSTEUND | Kan nog niet veilig worden teruggezet | Concepten (lopende training van toen); serverkopieën; oude structuren; insert zonder client-id (dubbel risico); RPC-items |

**Wel versus niet op de server.** Eigen trainingen en wachtrij-inserts worden met het eigen token teruggelezen. Een eigen training telt pas als "op de server" bij dezelfde inhoud, inclusief oefeningen. Zijn de oefeningen niet te lezen, dan is de status "onbekend".

## 3. Niet-herstelbare gegevens en resterende risico's

- **Niet herstelbaar (by design):**
  - lopende concepten;
  - serverkopieën (horen opnieuw van de server te komen);
  - oude structuren;
  - inserts zonder client-id;
  - RPC-items;
  - gegevens van andere accounts;
  - alles wat niet in de kopie zat (toestelinstellingen, sessionStorage, credentials).
- **Weggelaten geheimvelden** maken een record onvolledig: ONBEKEND.
- **Identiteit op inhoud** (Guided Workout-log) herkent een identieke regel, maar niet een "zelfde regel met andere inhoud".
- **Gelijk aan de server** is een momentopname; de latere herstelprocedure moet opnieuw controleren.
- **Android:**
  - bestandskeuze en WebCrypto werken in de WebView;
  - het **maken** van een kopie werkt in de app nog niet (zie de review, F2), dus in de app zijn er nog geen kopieën om te openen;
  - niet getest op een fysiek toestel.

## 4. Tests

| Suite | Resultaat | RED op #567 |
|---|---|---|
| `fRestorePreview` (TK-REL-SEC-31) | 53/53 | P0 RED: de functie ontbreekt |
| `fRestorePreviewChromium`: echte localStorage, IndexedDB-wachtrij, controleregister, WebCrypto, `setInputFiles` | 9/9 | het element ontbreekt (time-out) |
| `fLocalBackupReview` / `fLocalEncryptedBackup` / `fLocalEncryptedBackupChromium` | 36/36, 18/18, 11/11 | — |
| Volledige core-suite (Node 20) | 487/487 | — |

**Dekking van de 14 verplichte scenario's:**

| Scenario | Test |
|---|---|
| 1 Geldige kopie | P1 |
| 2 Verkeerde wachtzin | P2 |
| 3 Beschadigde ciphertext | P3 |
| 4 Gewijzigde salt, IV, iteraties, KDF of cipher | P4 |
| 5 Account A opent de kopie van B | P5, P17 |
| 6 Accountwissel bij het lezen van het bestand of bij het teruglezen | P6 |
| 7 Identiek lokaal record | P7 |
| 8 Conflicterend lokaal record | P8, P17 |
| 9 Oud formaat (v1) en onbekend formaat | P9 |
| 10 Onvolledige kopie | P10 |
| 11 Ontbrekende ouder | P11, P17 |
| 12 Te groot, leeg of ongeldig bestand | P12 |
| 13 Onderbreking tijdens het inlezen | P13 |
| 14 Herhaalde preview zonder mutatie | P14 en K3/K4 in Chromium |

In K3 zijn localStorage, de offline-wachtrij, het controleregister en de databaseversies na meerdere previews inhoudelijk gelijk.

**Mutaties:** 26 mutaties, 25 gedood. Q1 is equivalent: de accountcontrole direct na het inlezen wordt ook door de controle na `inspect` afgevangen.

## 5. Architectuurvoorstel voor de echte herstelfunctie

Zie `docs/TK_FASE4C_HERSTELVOORSTEL_20261019.md`.
