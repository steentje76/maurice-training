# SEC-570 — herstel eigenaarscontrole serververificatie en back-upisolatie

**Datum:** 21 oktober 2026
**Status:** DRAFT, NO MERGE / NO DEPLOY / NO ANDROID-(HER)INSTALLATIE. Heracceptatie door de onafhankelijke auditor.
**Repository:** `steentje76/maurice-training`
**Basis:** PR #570, integratiebranch `integration/tk-full-security-ux-20261020`, HEAD `d81f63b71e54e357922416ff57131bab10eb6ecf`
**Baseline main:** `160fefc2e1dabc424922e907f7dc360e4f84543f` (niet gewijzigd)
**Herstelbranch:** `fix/sec-570-owner-backup-isolation` (eigen Draft-PR naar de integratiebranch; de PR #570-branch is niet gewijzigd)
**Auditrapport:** PR #570, comment 6324855196 (CONDITIONAL / NO MERGE)

## 1. Gewijzigde bestanden

| Bestand | Wijziging |
|---|---|
| `core/serverVerification.js` | SEC-570-01: lokale eigenaarscontrole, geen `String()`-coërcie als eigendomsbewijs, consistentiecontrole van bewijs in `beoordeelRegister()` |
| `core/localBackup.js` | SEC-570-02: tekst- en JSON-payloads in wachtrijrecords gecontroleerd, strikte payloadtypen, strikte eigenaarsgelijkheid |
| `core/fSec570Herstel.test.js` | nieuw: 79 negatieve en positieve regressiescenario's, `TK_RED=1` voor bewijs tegen de oude code |
| `core/fSec570Mutants.test.js` | nieuw: 14 mutanten + ongemuteerde controle, draait in de Quality Gate |
| `sw.js` | `CACHE_NAME` en `CACHE_STATIC` `v470270` → `v470271` (regel: core wijzigt → beide bumpen). `CORE_SIG` ongewijzigd: beide modules vallen buiten de gehashte canonical set (`sw-guard` 5/5) |
| `docs/…` | dit rapport, `CHANGELOG.md`, `CURRENT_STATE.md`, `DECISION_LOG.md` (DEC-SEC-007) |

Niet gewijzigd: `index.html`, overige core-modules, beschermde core (`calculation`, `decision`, `relationship`, `athlete`, `coaching`: SHA256 identiek), schema, RLS, migraties, secrets, signing, authenticatieconfiguratie, versionCode, bestaande tests.

## 2. SEC-570-01 — eigenaarscontrole in `verifyRecord()`

### Root cause
`verifyRecord()` vergeleek `server[eigenaarVeld]` met `eigenaar`, maar las `verwacht[eigenaarVeld]` nooit. Een lokale rij van eigenaar B met een serverrij en opgegeven eigenaar A leverde `SERVER_VERIFIED`. Daarnaast:
- eigenaar, tabel, record-id en revisie werden met `String()` vergeleken, waardoor `['A']` gelijk was aan `'A'`;
- `beoordeelRegister()` nam `status` over zonder te controleren of de uitkomst intern consistent was (een `SERVER_VERIFIED` met afwijkingen, zonder tijdstip, met een andere sleutel of een andere contractversie telde als bewijs).

### Herstel
1. Een identiteitscomponent is alleen een niet-lege tekst of een eindig getal (`component()`); anders is de sleutel ongeldig.
2. Is `verwacht[eigenaarVeld]` aanwezig (niet `undefined`), dan moet die exact de opgegeven eigenaar zijn. Anders: `UNKNOWN`, niet definitief, reden `eigenaar_lokaal_tegenstrijdig`. Dit geldt vóór elk pad, ook het DELETE-bewijspad.
3. Afwezig lokaal eigenaarsveld is geen bewijs: het eigendom komt dan uitsluitend uit de serverrij (ongewijzigd fail-closed: geen of andere server-eigenaar = `MISMATCH`).
4. `eigenaarVeld:null` met `eigenaarViaOuder` (maaltijdregels, ronden) blijft ongewijzigd; `verifyParentChildren()` rekent kinderen alleen toe als de ouder `SERVER_VERIFIED` is.
5. `beoordeelRegister()` telt een uitkomst alleen als `SERVER_VERIFIED` bij eigen contractversie, lege afwijkingenlijst, verificatietijdstip, primitieve revisie en exact dezelfde samengestelde sleutel; anders `UNKNOWN`. Registeritems met niet-primitieve componenten zijn `IDENTITEIT_ONVOLLEDIG`.

### Bereikbaarheid in de applicatie
- Enige productieaanroeper: `tkVerifieerMetServer()` (`index.html`). `verwacht` = `e.verwacht` + sleutelwaarden + id. `e.verwacht` komt uit `verwachtVan()` in `tkVerifyAfleiden()`, dat `cfg.eigenaarVeld` expliciet weglaat. `eigenaar` is de ingelogde uid; registeritems worden gefilterd op `x.eigenaar===uid`; teruglezen via `sbFetch` met `{uid:eigenaar}`.
- Een gemanipuleerd registerrecord met `verwacht.user_id=B` in IndexedDB komt via `velden:Object.keys(e.verwacht)` in de veldvergelijking en gaf op de oude code al `MISMATCH`.
- **Conclusie:** contractfout in de pure kern, geen bewezen exploit via de applicatie. Het herstel maakt het contract zelf fail-closed, onafhankelijk van de aanroeper.

## 3. SEC-570-02 — back-upisolatie in `prepare()`

### Root cause
`embeddedOtherOwner()` doorzocht alleen objecten en de tekst van een sleutel `filter`. Elke andere tekstwaarde (een JSON-tekst als body, een geneste of dubbel gecodeerde JSON-tekst, een filterpatroon in een veld) werd niet gecontroleerd. Verder gold `String(x)!==owner` (een array `[A]` passeerde), was alleen `=eq.` in filters herkend (`neq`, `or=(user_id.eq.B)` niet) en gaf te diepe nesting een niet-herkenbare reden.

### Herstel
1. `body` en `args` moeten object of array zijn en `filter` tekst (zoals `offlineQueueAdd` ze altijd opslaat). Een ander type: overgeslagen met reden `unexpected_payload_type`.
2. Tekstwaarden op elke diepte: JSON wordt begrensd (≤ 8 MB) geparsed en met dezelfde regels doorzocht, ook genest en dubbel gecodeerd. Ongeldige JSON of tekst die een eigenaarskolom noemt: `payload_unverifiable`.
3. Eigenaarskolommen (`user_id`, `owner_uid`, `p_user_id`, hoofdletterongevoelig) moeten exact de tekst van de exporteur zijn; `null`/afwezig blijft toegestaan (legacyrecords zonder payloadeigenaar, eigenaar via `owner_uid` van het record).
4. Filters: een eigenaarskolom moet `=eq.<exporteur>` zijn (na percent-decodering, ook van de kolomnaam); een eigenaarskolom elders in het filter is `payload_unverifiable`.
5. Te diepe nesting (> 25): `payload_unverifiable`, geen crash.
6. `prepare()` leest alleen: de wachtrij-invoer blijft byte-gelijk; records in `maurice_offline/queue` worden niet verwijderd of gewijzigd en blijven gewoon gerepliceerd door `flushOfflineQueue()`.
7. De kopie blijft `complete:false` en `restoreAllowed:false`; de UI noemt haar een "deelkopie" met het aantal overgeslagen items en "De app verwijderen blijft ONVEILIG".

### Bereikbaarheid in de applicatie
- Alle productieschrijvers (`sbPostQ`, `sbPatchQ`/`sbSchrijfQDetail`, `sbDelQ`, `sbRpcQ`) queuen object-`body`/`args` en tekst-`filter`; geen enkele schrijft een JSON-tekst als body. Wachtrijfilters met een eigenaarskolom gebruiken alleen `=eq.` (de `neq`/`in`-varianten in `index.html` zijn GET's, nooit gequeued).
- Bereikbaar alleen met een afwijkend, legacy of gemanipuleerd record dat al op het toestel van A staat, met `owner_uid` A.
- **Conclusie:** defect in de conservatieve validatie van afwijkende wachtrijdata; geen bewezen exploit in de normale applicatiestroom. Impact: verkeerd toegerekende gegevens in de export van A, geen exfiltratie naar een ander toestel.

## 4. Testbewijs

### RED/GREEN
| Code | `fSec570Herstel` | Oorspronkelijke reproducties auditor |
|---|---|---|
| `d81f63b7` (oude modules, `TK_RED=1`) | **49 van 79 RED** (exit 1) | SEC-570-01: `SERVER_VERIFIED` (RED); SEC-570-02: 1 queue-entry (RED) |
| herstel | **79/79 PASS** | SEC-570-01: `UNKNOWN`; SEC-570-02: 0 queue-entries |

De 30 scenario's die al op de oude code slaagden zijn de positieve controles (geldige productievormen, via-ouder-eigendom, v1-bestand) en negatieve gevallen die de oude code al dekte; zij bewijzen dat het herstel geen geldig gedrag breekt.

### Mutatietests (`fSec570Mutants`, in de Quality Gate)
M0 ongemuteerde kopie slaagt; **14/14 mutanten gedood**: lokale eigenaarscontrole uit; server-eigenaar, opgegeven eigenaar, identiteitscomponenten en payloadeigenaar terug naar `String()`; consistentiecontrole bewijs uit; tekstcontrole uit; ongeldige-JSON-regel uit; typecontrole uit; filter-eigenaar niet vergeleken; eigenaarskolom elders in filter toegestaan; sleutel die eigenaarskolom noemt toegestaan; hoofdlettergevoelig; diepe nesting niet conservatief. Een mutant waarvan de doeltekst niet exact één keer voorkomt, laat de suite falen.

### Regressie
Zie de Draft-PR voor de volledige lokale lus en de GitHub-runs op de exacte herstel-HEAD. Gerichte bestaande securitysuites zonder testwijziging groen: `fServerVerificationContract` 31/31, `fServerVerifyHardening` 31/31, `fLocalBackupReview` 36/36, `fLocalEncryptedBackup` 18/18, `fVerifyReadBack` 29/29, `fVerifyRegister` 17/17, `fDeleteVerification` 22/22, `fHistInventory` 41/41, `fRestorePreview` 53/53, `fRestorePreviewCanon` 28/28, `fLocalInventory` 38/38, `fAndroidUninstallInstructionsSafety` 6/6. Geen bestaande test is aangepast.

## 5. Resterende beperkingen

1. Een volledig nagemaakt, intern consistent resultaatobject is in een pure functie niet van echt te onderscheiden. De vertrouwensgrens blijft: resultaten komen uit `verifyRecord()` in dezelfde sessie. De poort blijft daarnaast dicht om historie en onverifieerbare bronnen.
2. `valideer()`/`inspect()` (read-only herstelpreview) is bewust niet gewijzigd. Een bestaand bestand dat met de oude code is gemaakt en zo'n afwijkend wachtrijitem bevat, blijft leesbaar in de preview. Een eigenaarscontrole op inhoud in `valideer()` zou zo'n bestand in zijn geheel onleesbaar maken, ook de geldige gegevens van A (databehoud). Herstellen is uitgeschakeld (DEC-SEC-006). Besluit hierover ligt bij PO/auditor.
3. Conservatief overslaan kan een geldig wachtrijitem uit de kopie houden als een tekstveld een eigenaarskolom noemt zonder geldige JSON te zijn. Zichtbaar als `payload_unverifiable`; het item zelf blijft in de wachtrij en wordt gewoon verstuurd.
4. De set eigenaarskolommen is ongewijzigd (`user_id`, `owner_uid`, `p_user_id`); kolommen als `sender_user_id` zijn in dit contract geen eigenaarskolom.
5. Geen fysiek Android-bewijs; niet van toepassing (pure modules, geen native wijziging). De-installatie blijft NO-GO.

## 6. Aanbeveling

Onafhankelijke heracceptatie op de exacte herstel-HEAD door de auditor: beide oorspronkelijke reproducties, `fSec570Herstel` met `TK_RED=1` tegen `d81f63b7`, `fSec570Mutants`, de Quality Gate en de echte Chromium-acceptatie. Daarna besluit over samenvoegen in de integratiebranch van #570. Geen merge, deploy of Android-handeling vanuit deze sprint.

## 7. SEC-570-03 — credentials in tekst- en JSON-tekstvelden (vervolg op de heracceptatie van #573)

**Bron:** heracceptatie PR #573, comment 6325896718 (SEC-570-01/02 ACCEPTED; SEC-570-03 MEDIUM, pre-existing in #570).
**Oude HEAD #573:** `6e1d35fa4aaf4d205af9bd20b8f52439260daa83`. Nieuwe HEAD: zie de commit en de PR-comment.

### Root cause
`clean()` verwijdert credentialvelden (`BAD_KEY`, exacte namen) alleen uit objecten en laat elke tekstwaarde ongemoeid. Een JSON-tekst als veldwaarde (`meta:'{"refresh_token":"…"}'`), ook genest, dubbel gecodeerd of afgebroken, kwam daardoor ongewijzigd in de kopie. Hetzelfde gold voor `localStorage`-waarden, die door dezelfde `clean()` gaan. De eigenaarscontrole van SEC-570-02 zoekt alleen eigenaarskolommen, geen credentials. Verder gold `BAD_SOURCE` alleen voor bronsleutels, niet voor objectsleutels (`refreshToken`, `oauth_state`), en werden een geneste credentialtabel of RPC-naam niet herkend.

### Herstel (alleen `core/localBackup.js`)
`geheimIn()` doorzoekt na `clean()` de geschoonde waarde van elk wachtrij-item en elke `localStorage`-bron. Bij een treffer wordt het item of de bron **overgeslagen**, met een herkenbare reden. Tekst wordt nooit herschreven, zodat de JSON-tekst niet ongemerkt semantisch verandert.

| Treffer | Reden |
|---|---|
| tekst die een `BAD_KEY`- of `BAD_SOURCE`-sleutel als sleutel noemt (`"…": `, `…=`), ook met escapes (`\"`), percent-codering, een JWT of een Bearer-token | `credential_in_text` |
| JSON-tekst (geparsed, ook genest/dubbel gecodeerd) met zo'n sleutel of een credentialtabel | `credential_in_text` |
| objectsleutel die op `BAD_SOURCE` lijkt (exacte `BAD_KEY`-namen verwijdert `clean()` al), geneste credentialtabel, RPC-naam die op `BAD_SOURCE` lijkt | `credential_material` |
| tekst > 8 MB, totaal te doorzoeken tekst > 16 MB per item, diepte > 25, ongeldige JSON met `\u`-escapes | `payload_unverifiable` |

Begrenzing: alle patronen zijn lineair (begrensde kwantoren; JWT via een lineaire scan over tokenreeksen). Gemeten op adversariële 1 MB-invoer (herhaalde `oauth`, `secret_`, backslashes, `eyJ`, spaties, `%41`, `Bearer`, quotes): ≤ 250 ms per item. Een eerste versie met `[A-Za-z0-9_-]*` vóór de bronnaam backtrackte kwadratisch; dit is door de K9-budgettest gevonden vóór commit en vervangen.

Ongewijzigd bestaand gedrag: exacte `BAD_KEY`-velden in objecten worden verwijderd en het item wordt gemarkeerd (`redacted`). De eigenaarsisolatie van SEC-570-01/02 gaat vóór de credentialscan. `valideer()`, `inspect()`, `encrypt()` en de herstelpreview zijn niet gewijzigd. De echte wachtrij wordt niet aangeraakt (`prepare()` leest alleen). De kopie blijft `complete:false` en `restoreAllowed:false`; de UI noemt haar een deelkopie met het aantal overgeslagen items.

### Testbewijs
- **Auditorreproductie:** RED op `d81f63b7` en op `6e1d35fa` (canary in kopie, 1 entry), GREEN na herstel (0 entries, `credential_in_text`).
- **`fSec570CredentialHerstel`:** 58/58 groen.
  - RED-modus tegen de modules van `6e1d35fa`: 43 van 58 RED.
  - RED-modus tegen de modules van `d81f63b7`: 46 van 58 RED.
  - De overige scenario's zijn positieve controles of gevallen die bestaande redactie en SEC-570-02 al dekten.
- **`fSec570CredentialMutants`:** ongemuteerde controle plus 15/15 mutanten gedood. N6 overleefde eerst, omdat het testgeval `refresh_token` gebruikte, dat ook onder `BAD_SOURCE` valt. Toegevoegd is een geval met een sleutel die alleen in `BAD_KEY` staat (`password`); de code is daarvoor niet gewijzigd.
- **Testmatrix (opdrachtpunten 1–14):**
  - K1 auditorreproductie.
  - K2 tien `BAD_KEY`-sleutels en diepe nesting in JSON-tekst.
  - K3 dubbel, drievoudig en afgebroken gecodeerd.
  - K4 arrays.
  - K5 RPC-args, RPC-sleutels en RPC-namen.
  - K6 objecten: exacte sleutels geredigeerd, camelCase en `oauth_state` overgeslagen.
  - K7 legacy en afwijkend: geneste credentialtabel, `\u`-escape, percent-codering, filter, `sleutel: waarde`, `oauth_code=`, JWT, Bearer.
  - K8 ongeldige JSON en te diepe nesting.
  - K9 grenzen: > 8 MB, > 16 MB totaal, 3 MB toegestaan, vertakte meervoudige codering.
  - K10 geldige JSON-tekst, tekst en productievormen behouden.
  - K11 nieuwe versleutelde kopie en een bestaand v1-bestand leesbaar.
  - K12 eigenaarsisolatie gaat voor.
  - K13 wachtrij byte-gelijk.
  - K14 `complete:false` en `restoreAllowed:false`.
  - L1–L3 `localStorage`-pad.
- **Regressie:** zie de PR-comment. Geen bestaande test gewijzigd.

### Backward compatibility
- Het bestandsformaat (envelop, `DATA_FORMAT`, entryvelden), de validatie en de leesroute zijn ongewijzigd. Bestaande v1- en v2-bestanden blijven leesbaar (K11).
- Er zijn geen nieuwe velden; alleen nieuwe omissieredenen (tekst ≤ 64, binnen de bestaande validatie).
- Gedrag dat verandert in een nieuwe kopie:
  - items en bronnen met credentialmateriaal in tekst, of met `BAD_SOURCE`-achtige objectsleutels, worden overgeslagen;
  - `localStorage`-waarden dieper dan 25 niveaus worden overgeslagen (eerder geëxporteerd tot 32).
- Productieschrijvers queuen geen credentialachtige sleutels of RPC-namen (geïnventariseerd in `index.html`). `refresh_token`/`access_token` komen alleen voor in de auth-sessiecode, niet in wachtrij- of `localStorage`-databronnen.

### Credentialrisico in bestaande kopieën
- `core/localBackup.js` staat niet op `main`. De reddingskopie is dus nooit via de productiedeploy beschikbaar geweest. In de Android-app weigert de functie (geen native opslagroute).
- Een bestaande kopie met dit lek kan alleen gemaakt zijn via een Netlify-preview of een lokale build van een draftbranch, met afwijkende of legacy wachtrij- of `localStorage`-data.
- Zo'n bestand is AES-256-GCM-versleuteld met de wachtzin van de gebruiker. Herstel is uitgeschakeld en de preview leest alleen.
- Het herstel verandert zulke bestanden niet: er is geen migratie en de inhoud wordt bij inspectie niet opnieuw gecontroleerd. Het credential blijft in het bestand staan zolang dat bestaat.
- PO-besluit nodig (open): bij `inspect()` waarschuwen of weigeren voor oudere bestanden, of gebruikers vragen kopieën van vóór deze versie te verwijderen. Een contentcontrole in `valideer()` zou zulke bestanden in hun geheel onleesbaar maken (zie beperking 2 in §5).

### Resterende risico's en beperkingen
1. Detectie is patroongebaseerd. Niet herkend worden:
   - credentials zonder sleutelnaam en zonder JWT- of Bearer-vorm, zoals een kale opaque token of een base64-gecodeerd geheim;
   - sleutelnamen buiten `BAD_KEY`/`BAD_SOURCE`, zoals `pin` of `otp`.
2. Valse positieven zijn mogelijk, bijvoorbeeld een notitie met `password: …` of `token=…`. Het item wordt dan overgeslagen; het staat nog wel in de wachtrij en wordt gewoon verstuurd.
3. Bestaande kopieën: zie hierboven.
4. Geen fysiek Android-bewijs; niet van toepassing.

## SEC-570-03A (22 oktober 2026) — kandidaat, nog niet onafhankelijk geaccepteerd
Extra fail-closed controle op meervoudige URL-codering van credentialnamen binnen offlinequeue, filterteksten en lokale reddingskopiebronnen. De scanner decodeert hoogstens vier rondes en inspecteert elke ronde; bij overblijvende percentcodering na die limiet wordt de bron conservatief overgeslagen als payload_unverifiable. Bestaande back-ups blijven onaangeroerd en leesbaar; originele wachtrijrecords veranderen niet.
Nieuwe RED/GREEN-test: core/fSec570PercentDecode.test.js; nieuwe onafhankelijke mutantcontrole: core/fSec570PercentDecodeMutants.test.js. Serviceworker-cache v470273. Geen besluit tot merge, productie of Android-installatie.
