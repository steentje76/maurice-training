# Voorstel: resterende migraties voor client-id's en database-eigenaarschap (19 oktober 2026)

**Status:** voorstel. Niets is uitgevoerd. Elke stap vraagt een afzonderlijk eigenaarsbesluit en loopt via de PCC-audittrail. Er komt geen directe admin-SQL.

**Bron:** alleen-lezen metadata van productie (`information_schema.columns` en `information_schema.triggers`, project "Maurice training", 19-10-2026). Er zijn geen gegevens gelezen.

## 1. Feiten

**Tabellen met een database-gegenereerd `bigint identity`-id en een `user_id`, zonder client-id:**

| Tabel | Trigger `set_user_id_from_auth` | Gevolg |
|---|---|---|
| `goals` | nee | Na een verloren antwoord kan een replay een tweede rij maken; de write wordt vastgehouden ("Toch versturen"). Niet per rij te verifiëren. |
| `exercise_goals` | nee | Replay idempotent via `on_conflict` op de natuurlijke sleutel (DEC-SYNC-003); geen stabiele record-id voor verificatie. |
| `programs` | ja | Schrijfroute met pre-read (#563); niet per rij te verifiëren. |
| `program_blocks` | ja | Idem. |
| `athlete_conditions` | ja | Niet idempotent en niet per rij te verifiëren. |
| `checkin_conditions` | ja | Idem. |

**Trigger `set_user_id_from_auth()`.** Die staat op 20 tabellen en overschrijft `user_id` met `auth.uid()`:

`athlete_conditions`, `atleet_profiel`, `body_comp`, `chat_history`, `checkin_conditions`, `custom_training_exercises`, `custom_trainings`, `cycle_periods`, `cycle_symptom_logs`, `exercise_favorites`, `hrv_log`, `program_block_exercises`, `program_blocks`, `programs`, `race_segments`, `sessions`, `training_exercises`, `vaste_trainingen`, `wearable_connections` en `weight_log`.

Een write met een payload van A en het token van B landt daardoor stil bij B. De client weigert dat sinds DEC-SEC-005. Het lokale bewijs (pg-semantics P6) bevestigt het servergedrag.

**Kindtabellen zonder eigen `user_id`** (eigendom via de ouder en RLS op de ouder):

- `activity_laps` → `activities`
- `nutrition_meal_items` → `nutrition_meals`
- `nutrition_nutrient_values` en `nutrition_product_identifiers` → `nutrition_products`
- `program_weeks` en `program_sessions` (programmastructuur)

**Verwijderingen.** Na een verloren DELETE-antwoord is de verwijdering niet meer te bewijzen (fase 3, D6). Een replay raakt 0 rijen.

## 2. Voorgestelde migraties

### M1 — client-id voor identity-tabellen (prioriteit 1)

- **Wat:**
  - kolom `client_id uuid null` op de zes tabellen;
  - partiële unieke index `(user_id, client_id) where client_id is not null`, aangemaakt met `create index concurrently`.
- **App:** nieuwe rijen krijgen een client-id die bij elke replay ongewijzigd blijft. Inserts gaan via `on_conflict=user_id,client_id` met `resolution=ignore-duplicates`. Verificatie gebruikt `client_id` als record-id.
- **Bestaande rijen:** `client_id` blijft null. Er is geen backfill nodig; ze blijven buiten het verificatieregister en tellen als historie.
- **Terugdraaien:** index en kolom verwijderen. Oudere app-versies negeren de kolom.
- **Test vooraf:**
  - `tools/pg-semantics` uitbreiden: replay na een verloren antwoord levert één rij, een tweede gebruiker met dezelfde client-id levert geen conflict, oude rijen blijven ongewijzigd;
  - daarna een branch-database en pas dan productie.

### M2 — trigger weigert een afwijkende eigenaar (prioriteit 1)

- **Wat:** `set_user_id_from_auth()` zet `user_id` alleen als die leeg is. Een gevulde `user_id` die niet gelijk is aan `auth.uid()` geeft een exception (`42501`). Bij `auth.uid() is null` (service role) blijft het huidige gedrag.
- **Waarom:** de client-weigering is een verdedigingslaag. Oudere app-versies, de social- en coach-`fetch`-routes en toekomstige code kunnen haar omzeilen.
- **Risico:** aanroepers die nu bewust geen of een andere `user_id` meesturen. Een inventaris per tabel uit de schrijfaanroep-matrix is vereist vóór uitvoering.
- **Terugdraaien:** de vorige functiedefinitie terugzetten (één `create or replace`).
- **Test vooraf:** pg-semantics P6 moet omslaan van "stil op B" naar "geweigerd"; alle bestaande schrijfroutes uit de matrix doorlopen tegen de lokale stack.

### M3 — controlelog voor verwijderingen (prioriteit 2)

- **Wat:**
  - tabel `deleted_records(tabel text, record_id text, user_id uuid, deleted_at timestamptz)`;
  - RLS: alleen eigen rijen lezen, geen client-writes;
  - een `AFTER DELETE`-trigger op de acht tabellen uit het verificatieregister.
- **Waarom:** een verwijdering wordt ook na een verloren antwoord aantoonbaar (exact deze rij, deze eigenaar). Daarmee vervalt beperking D6.
- **Kosten en privacy:** het log bevat alleen id's en tijdstip. Bewaartermijn voorstellen: 90 dagen, opgeschoond via een geplande job.
- **Terugdraaien:** trigger en tabel verwijderen.

### M4 — eigenaar op kindtabellen (prioriteit 3, optioneel)

- **Wat:** `user_id` op `activity_laps` en `nutrition_meal_items`, gevuld door een `BEFORE INSERT`-trigger vanaf de ouder. Een backfill vanaf de ouder gebeurt in batches.
- **Waarom:** verificatie hoeft dan niet meer via de ouder. Nu is een kind zonder geregistreerde ouder hooguit `UNKNOWN` (fase 2, L17).
- **Alternatief:** zo laten. De huidige regel "alleen via een geverifieerde ouder" is correct, alleen strenger.

## 3. Volgorde en besluiten

1. **PO-besluit M2.** Dit heeft de hoogste veiligheidswinst en raakt de minste data.
2. **PO-besluit M1.** Daarna volgt per tabel een app-release: eerst `goals` en `athlete_conditions`, dan `programs` en `program_blocks`.
3. **M3** pas na een akkoord over bewaartermijn en privacy.
4. **M4** alleen als de verificatie via de ouder in de praktijk te veel `UNKNOWN` oplevert.

Elke stap verloopt zo:

- Draft-PR met de migratie als bestand, nog niet toegepast;
- pg-semantics-uitbreiding (RED/GREEN);
- branch-database;
- PCC-goedkeuring;
- productie in een onderhoudsvenster;
- teruglezen met de verificatie uit fase 2.

## 4. Wat dit voorstel niet doet

- Het past geen migratie toe en wijzigt geen trigger of RLS.
- Het verwijdert geen bestaande rijen en vult geen client-id's in voor oude rijen.
- Het maakt de de-installatiepoort niet open. Lokale concepten, voorkeuren en de wachtrij blijven blokkeren, los van de migraties.
