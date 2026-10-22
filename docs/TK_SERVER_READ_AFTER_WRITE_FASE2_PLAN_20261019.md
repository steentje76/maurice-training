# Uitvoeringsplan server-read-after-write, fase 2

**Datum:** 19 oktober 2026
**Status:** plan; nog niet gebouwd.
**Basis:** contract `serververify.v1` (`docs/TK_SERVER_READ_AFTER_WRITE_CONTRACT_20261019.md`) en de kern `core/serverVerification.js` (pure functies, getest, niet geladen).
**Voorwaarde:** de schrijfketen uit TK-REL-SEC-16..20 (Draft-PR bovenop #562).

Deze fase wordt in een eigen Draft-PR gebouwd en is afzonderlijk controleerbaar. Ze verandert geen trainingsdata, schema, RLS of trigger en voegt geen productiemigratie toe.

## 1. Doel en afbakening

**Doel.** Per lokaal ingevoerde rij aantonen dat de server dezelfde rij heeft. Dat betekent:

- dezelfde eigenaar en hetzelfde record-id;
- dezelfde inhoud in de velden die de client verstuurde;
- bij ouder-kind: alle kinderen aanwezig en geen onbekende extra kinderen.

Alleen dan geldt `SERVER_VERIFIED`. De-installatiepoort en updatecontrole gebruiken uitsluitend die status.

**Buiten scope:**
- verificatie van gegevens die de server zelf schrijft (wearable-sync, service role);
- historische rijen van vóór het register;
- een automatische reparatie van `MISMATCH` (alleen tonen en blokkeren).

## 2. Bouwstenen

| # | Onderdeel | Ontwerp | Hergebruik |
|---|---|---|---|
| 2.1 | **Lokaal verificatieregister** | Nieuwe IndexedDB-store `verify` in dezelfde database (`maurice_offline`). Er komt alleen een store bij (database-versie +1), de bestaande `queue`-store wordt niet gemigreerd. Per record: `{key: tabel+':'+id, tabel, record_id, owner_uid, velden (alleen verstuurde velden), ouder?, status, hash_lokaal, ts}`. | `offlineDb()`, het tx-patroon van `offlineQueueAdd` (oncomplete, onerror en onabort, fail-closed) |
| 2.2 | **Registreren bij elke write** | `sbPostQ`, `sbPatchQ` en `sbSchrijfQDetail` registreren na `confirmed` of `queued` het record met status `SERVER_ACCEPTED` of `QUEUED`. DELETE registreert een "moet ontbreken"-record. Alleen tabellen met een client-id of een natuurlijke sleutel (`IDEMPOTENT_TABELLEN_MET_CLIENT_ID` en `TK_ON_CONFLICT`); voor andere tabellen meldt het register `UNKNOWN`. | uitkomst-object (`tkSchrijfUitkomst`), eigenaar uit TK-REL-SEC-02/16 |
| 2.3 | **Leesroute per tabel** | `tkVerifieerTabel(tabel, ids, eigenaar)`: `GET /rest/v1/<tabel>?id=in.(…)&select=<velden>,user_id` in blokken van 50, via `sbFetch` met binding `{uid: eigenaar}`. Leest uitsluitend met het token van de eigenaar. Een lees- of identiteitsfout geeft `UNKNOWN`, nooit `MISSING`. Natuurlijke sleutel: filter op die kolommen. | `sbFetch` (uid-pin en binding uit TK-REL-SEC-16), `ServerVerificationCore.verifyRecord` |
| 2.4 | **Ouder-kind** | Per paar uit het contract (§4) één leesronde voor de kinderen per ouder (`?<fk>=in.(…)`), daarna `verifyParentChildren`. | `TK_WACHTRIJ_OUDERS` als bron voor de relaties |
| 2.5 | **Verificatierun** | `tkVerifieerAlles()`: (1) flush, (2) strikt de wachtrij lezen (moet leeg zijn voor de eigenaar), (3) per tabel teruglezen, (4) `aggregate` per bron, (5) resultaat terug in het register. Zonder netwerk niet starten. Web Lock `tk-verify` zodat er één tegelijk loopt. | `flushOfflineQueue`, `tkLeesWachtrijStrikt`, Web Locks-patroon uit TK-REL-SEC-11 |
| 2.6 | **Updategereedheid** | `tkUpdateGereedheid()` krijgt een extra bron "serverbevestiging". Alleen als `uninstallGate()` `toegestaan` geeft, verschijnt "veilig om te verwijderen"; anders blijft het NO-GO met redenen. De bestaande bronnen blijven. | `ServerVerificationCore.uninstallGate` |
| 2.7 | **UI** | In Help → "Klaar voor een update?" per bron aantallen `SERVER_VERIFIED`, `MISMATCH`, `MISSING` en `UNKNOWN`, zonder inhoud van records. Knop "Controleren met de server". | bestaand scherm `tkUpdateGereedheidToon` |

## 3. Volgorde van bouwen (één Draft-PR, aparte commits)

1. Register (2.1) met tests: schrijven, lezen, abort fail-closed, eigenaarscheiding, bestaande `queue`-store ongewijzigd na de versie-upgrade.
2. Registreren in de schrijflaag (2.2). Achter een vlag (`TK_VERIFY_REGISTER`, standaard aan in staging, uit in productie tot de PO beslist).
3. Leesroute en ouder-kind (2.3 en 2.4) met de nep-PostgREST uit `core/fixtures/schrijfHarnas.js`. Uitbreiden met RLS per eigenaar en `in.(…)`-filters.
4. Verificatierun (2.5).
5. Koppeling met de updategereedheid en de UI (2.6 en 2.7).
6. Documentatie, matrix en een CI-gate.

## 4. Testplan

Per stap eerst RED, dan GREEN, met mutatietests en de echte productiefuncties via het harnas.

- `MISSING` en `UNKNOWN` mogen nooit verwisselen. Een leesfout, een 401 of een accountwissel tijdens het lezen moet `UNKNOWN` geven.
- Inhoud wijkt af in één veld: `MISMATCH`, met de veldnaam en zonder de waarde.
- Eigenaar wijkt af (rij bestaat onder een andere `user_id`): `MISMATCH`, met de afwijking `eigenaar`.
- Ouder geverifieerd maar één kind ontbreekt: groep `MISSING`. Een extra kind op de server: `MISMATCH`.
- Een verloren antwoord gevolgd door een replay geeft uiteindelijk één rij en `SERVER_VERIFIED`.
- Een PATCH na een insert: het register vergelijkt met de laatste lokale inhoud, niet met de eerste.
- De-installatiepoort: een niet-lege wachtrij, een onleesbare bron of één `UNKNOWN` geeft NO-GO.
- Performance: 500 records in hooguit 10 leesverzoeken.
- Chromium-acceptatie: verificatierun met IndexedDB in een echte browser en een store-upgrade zonder verlies van de `queue`-store.

## 5. Acceptatiecriteria (Definition of Done fase 2)

- De quality gate en de Chromium-acceptatie zijn groen op de exacte HEAD.
- Mutatietests op de verificatiepaden doden 100% van de niet-equivalente mutanten.
- Een veldtest op een fysiek Android-toestel (niet vervangbaar door de browser):
  1. offline sets invoeren;
  2. online gaan;
  3. "Controleren met de server" kiezen;
  4. het resultaat `SERVER_VERIFIED` in Help zien;
  5. pas daarna, en alleen met aparte toestemming van de PO, een herinstallatie.
- Documentatie bijgewerkt: CURRENT_STATE, DECISION_LOG (nieuw DEC-SYNC-besluit "alleen SERVER_VERIFIED is bewijs") en de matrix.

## 6. Risico's en besluiten voor de PO

| Onderwerp | Toelichting | Besluit nodig |
|---|---|---|
| Tabellen zonder client-id (`goals`, `athlete_conditions`, `checkin_conditions`, `programs`/`program_blocks` met identity-id) | Zonder stabiel id kan alleen fuzzy op inhoud worden teruggelezen. Fase 2 meldt `UNKNOWN`. | Kolom `client_id uuid unique` toevoegen via een aparte migratie, of accepteren dat deze bronnen de de-installatie blokkeren zolang ze lokaal onbevestigd zijn. |
| Trigger `set_user_id_from_auth` overschrijft in plaats van te weigeren | Verificatie vangt een verkeerde eigenaar achteraf (`MISMATCH`) maar voorkomt hem niet. | Trigger laten weigeren bij een afwijkende `user_id` (productiemigratie, apart eigenaarsbesluit). |
| Leesvolume | Een verificatierun leest alles wat sinds de laatste run geregistreerd is. | Bewaartermijn van het register (voorstel: tot `SERVER_VERIFIED` plus 30 dagen). |
| Late aankomst van een getimed origineel verzoek | Een time-out breekt het oorspronkelijke verzoek niet af. In zeldzame gevallen kan het na de replay aankomen. Verificatie na de flush detecteert dat als `MISMATCH`. | `AbortController` in `sbFetch` voor writes (aparte, kleine wijziging). |

## 7. Wat fase 2 niet doet

- Geen merge naar `main`, geen productiemigratie, geen Android-release.
- Geen automatische correctie van serverrijen.
- De AI Coach krijgt geen nieuwe rekenregels of trainingsregels.
