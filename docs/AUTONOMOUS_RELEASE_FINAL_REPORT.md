# AUTONOMOUS_RELEASE_FINAL_REPORT.md

**Trainingskompas** · van v4.47.0 naar **v4.48.0 (RC0)** · 19 augustus 2026
Autonome release-mastersprint — Lead Engineer, QA Lead, Release Engineer, Technical Product Owner

🟢 gereed · 🟡 gedeeltelijk · 🔴 geblokkeerd · ⚪ toekomst · 🔵 eigenaarsinvoer vereist

---

## 1. START STATUS

Fase 2 was op 19 augustus 2026 technisch bevroren op v4.47.0: Supabase Auth, RLS op alle
tabellen, per-user scheiding, offline sync-wachtrij, security hardening v447, 62 testbestanden
groen, release gate 12/12.

Wat er **niet** was: er was nog nooit een release-build gemaakt. De Android-kant stond
grotendeels nog op de waarden die `cap add android` ooit had gegenereerd, en het gedrag van de
app in een geïnstalleerde app-context — achtergrond, terugknop, edge-to-edge, artefactomvang —
was nooit onderzocht. Precies daar zaten de blokkades.

**Werkwijze.** Eerst een volledige audit (A t/m AD uit de opdracht), daarna vier sprints met
elk hun eigen commit, tests en verificatie. Geen enkele beslissing is aan de eigenaar
voorgelegd behalve de zeven die onomkeerbaar, financieel, juridisch of productbeleid zijn.

---

## 2. WAT IS AANGEPAST

Vier commits op `phase2/completion`, elk zelfstandig te lezen.

### `release/session-integrity` — 67938f3

| Wat | Waarom |
|---|---|
| Alle REST-communicatie via één laag `sbFetch` met 401-herstel | Android bevriest achtergrondtimers, dus de token-refresh liep niet door. Bij terugkeer gaf elke leesactie `[]` (elk scherm "geen data", niet te onderscheiden van dataverlies) en verdwenen zojuist ingevoerde sets met alleen "Fout bij opslaan" |
| Eén gedeelde refresh (single-flight) | Supabase roteert refresh-tokens; tien parallelle refreshes maken elkaars token ongeldig |
| Herstelbare schrijffouten (401/408/425/429/5xx) naar de wachtrij, 400/409/422 niet | Een tijdelijke storing mag geen invoer kosten; een blijvende validatiefout zou eeuwig herhalen |
| Her-entree-slot op `flushOfflineQueue` | Drie aanroepbronnen zonder slot konden hetzelfde item tweemaal versturen — een dubbele sessierij |
| Tien ontbrekende sleutels in `PERSONAL_CACHE_KEYS`, plus `sel_*` | Een tweede sporter op één toestel sloeg de hele intake over en erfde coachvoorkeuren, apparatuurgeheugen en machinelijsten |
| Bestaand `atleet_profiel` als tweede bron voor "onboarding afgerond" | Dezelfde sporter hoefde op een nieuw toestel de intake anders opnieuw te doorlopen |
| `activeInstanceId` in de trainingsdraft | Na een app-herstart was de koppeling weg en werd de sessie nooit afgerond — de weesrijen die v446 achteraf moest opruimen |
| Terug-navigatie: schermstapel, centrale popstate-handler | De app bouwde geen history-entries op; elke terugveeg sloot de app af |

### `release/evidence-visibility` — 4434736

| Wat | Waarom |
|---|---|
| 'ⓘ Waarom' per oefening in het logboek, met de vijf secties van `evidence_snapshot.v1` | Het bewijsspoor werd sinds Sprint 18 geschreven maar had nul lezers buiten de tests. De kernbelofte was onzichtbaar |
| `teamAccessResolved`-vlag | `-1` betekende zowel "geen gym" als "nog niet opgehaald"; de solo-sporter kwam op een pincode-muur en kon zijn eigen apparatuur niet beheren |
| Contactblok op één constante `SUPPORT_EMAIL` | Het scherm Help toonde letterlijk `[PLACEHOLDER]` |
| `privacy.html` | Play-vereiste; de app linkt ernaar vanuit Help |

### `release/android` — e8b2a2c

| Wat | Waarom |
|---|---|
| targetSdk/compileSdk 34 → 36, AGP 8.2.1 → 8.9.1, Gradle 8.2.1 → 8.11.1 | Play weigert vanaf 31-08-2026 alles onder API 36 |
| `videos/` niet meer meegebundeld; `MEDIA_ORIGIN` in `sw.js` | 437 MB tegen een Play-plafond van 200 MB. `www/` van 450 MB naar 14 MB |
| `*.test.js` uit het artefact | 62 testbestanden gingen mee de APK in |
| `signingConfig` uit `keystore.properties` of omgevingsvariabelen | De release-buildtype leverde een ongetekend artefact |
| `allowBackup="false"` + uitsluitingsregels | De WebView-opslag met het sessietoken ging mee in de Google Drive-back-up |
| Alle iconen en splashes uit het merkbeeld | Het was nog het standaard Capacitor-logo |
| `bluetooth_le` op `required="false"` | Filterde het toestelbereik op hardware die de kern niet nodig heeft |
| `viewport-fit=cover` + `max()`-marge op `.hdr` | Zonder cover leverde elke `env(safe-area-inset-*)` 0 op; Android 15+ dwingt edge-to-edge af |
| versionCode 44800 / versionName 4.48.0 | Stond op 1 / "1.0" terwijl de app v4.47.0 meldde |

### `release/readiness` — c77f633

| Wat | Waarom |
|---|---|
| Accountverwijdering van 22 naar 34 tabellen | Elf tabellen bleven achter, waaronder `wearable_connections` met access- én refresh-token in leesbare vorm |
| `content_shares` in beide richtingen; `equipment_catalog`/`exercise_equipment` alleen persoonlijke rijen | De shared_by-kant stond open; gedeelde gym-inrichting moet van anderen blijven |
| Startanker voor de terug-navigatie, alleen in de geïnstalleerde app | Zonder anker sloot de eerste terugveeg op Home de app zonder waarschuwing; in een browsertab hoort terug gewoon te werken |
| Zes documenten + `CHANGELOG`, `CURRENT_STATE`, `DECISION_LOG` (DEC-024 t/m 027) | Zie §19 |

**Niet aangepast, bewust.** Home, Training, Mijn trainingen, Workout Builder, Guided, Coach,
Lichaam en Voortgang zijn byte-identiek aan `origin/main` — geverifieerd door de
schermblokken uit beide versies te vergelijken. Er is geen enkele databasewijziging
doorgevoerd. Er is geen test verwijderd of verzwakt.

---

## 3. WAT IS GETEST

| Soort | Omvang |
|---|---|
| Unit- en logicatests | 66 testbestanden in `core/`, plus `logic_tests.js` (250 asserts) |
| Release gate | 12 poorten, waaronder syntaxcontrole van alle 10 inline scripts en een zuiverheidscontrole op Calculation/Decision Core (geen DOM, DB, netwerk of AI) |
| Browser-smoketest | `scripts/smoke-rc0.mjs` — de uitgeleverde `index.html` in Chromium, met alle verkeer naar Supabase, Netlify en Anthropic geblokkeerd |
| Databasecontrole | Live queries op het productieschema |
| RLS-regressietest | Rolwissel met JWT-claims binnen een teruggerolde transactie |
| Relationship-engine | Op echte productiedata van één gebruiker |
| Android-configuratie | 27 controles op manifest, gradle, ondertekening, artefactomvang, iconen en edge-to-edge |

---

## 4. TEST RESULTATEN

```
66 testbestanden          66 groen, 0 rood
release gate              12/12 🟢
browser-smoketest         41/41 🟢
```

Nieuwe suites in deze sprint:

| Suite | Tests | Wat hij bewaakt |
|---|---:|---|
| `core/fSessieIntegriteit.test.js` | 38 | 401-herstel, single-flight refresh, retry met verse header, welke statuscodes queuen, geen dubbele verzending bij gelijktijdige sync, geen enkele kale `fetch` meer in de sb\*-functies |
| `core/fAndroidRelease.test.js` | 27 | Versienummers, Play-API-ondergrens (beweegt mee met de Play-datums), back-upregels, rechten, ondertekening, artefactomvang, iconen, edge-to-edge |
| `core/fRC0.test.js` | 26 | Bewijsspoor-weergave met een door DecisionCore zélf gebouwde snapshot, Beheer-toegang, contactblok, privacyverklaring, volledigheid van de accountverwijdering |
| `core/fNavigatie.test.js` | 16 | Schermstapel, terug, modal sluit eerst, coach-regel uit v306, afsluiten met bevestiging, gedrag in een browsertab |
| `core/fFase2.test.js` | 36 (was 29) | Uitgebreid met een generiek net dat elke geschreven opslagsleutel dwingt te classificeren |

**Aangescherpt, niet verzwakt.** `fFase2` C2 controleerde of `flushOfflineQueue()` binnen
120 tekens na `visibilitychange` stond — een afstandsmaat in de broncode. Hij leest nu het
volledige handlerblok en eist de juiste *volgorde*: eerst de sessie valideren, dan pas
synchroniseren. Dat is een sterkere eis.

---

## 5. DATABASE STATUS 🟢

Live opgevraagd op 19 augustus 2026, niet aangenomen.

| Controle | Waarde |
|---|---|
| Tabellen (public) | 65 |
| RLS-policies | 85 |
| Tabellen zonder RLS | **0** |
| SECURITY DEFINER-functies | 8 |
| — zonder vaste `search_path` | **0** |
| — uitvoerbaar door `anon`/`authenticated` | **0** |
| Triggers | 29 |
| Migraties uitgevoerd | 11/11 (v328–v337, v446, v447) |
| `training_instances` | 139 totaal · 0 actief · 139 met snapshot bewaard |
| `sessions` | 112 |

**Geen enkele databasewijziging in deze sprint.** Geen migratie geschreven, uitgevoerd of
verwijderd.

---

## 6. SECURITY STATUS 🟢 (met één 🔵)

| Bevinding | Classificatie |
|---|---|
| `auth_leaked_password_protection` staat uit | **NEEDS ACTION — 🔵 eigenaar.** Eén schakelaar in de Supabase-console. Voor een app met gezondheidsgegevens verstandig vóór publieke uitrol |
| 18 × `rls_enabled_no_policy` (INFO) | **FALSE POSITIVE / INTENTIONAL.** RLS aan zonder policy = alles geweigerd voor `anon` en `authenticated`; alleen `service_role` komt erbij. Precies de bedoeling voor `wearable_connections` en `wearable_oauth_state`, en onschadelijk voor de lege `bak_p_*`- en commerciële tabellen |
| 8 SECURITY DEFINER-functies | **OPGELOST (v447), opnieuw geverifieerd** |
| Sessietoken in de Android-cloudback-up | **OPGELOST (RC0)** |
| Wearable-tokens overleefden accountverwijdering | **OPGELOST (RC0)** |
| Client-side pincode voor Beheer | **DEFERRED.** Schrijfrechten server-side door RLS afgedwongen; de pincode is nog slechts het vangnet zolang de rol onbekend is |
| Secrets in de code | **Geen.** De hele diff is doorzocht op service-role-sleutels, client secrets, API-sleutels en privésleutels: nul treffers. Alleen de publishable key staat in de client, zoals bedoeld |

---

## 7. RLS STATUS 🟢

Bewezen met een echte rolwissel binnen een teruggerolde transactie, niet met een aanname:

| Scenario | Rijen |
|---|---:|
| Gebruiker A ziet eigen sessies | 103 |
| Gebruiker B ziet eigen sessies | 9 |
| A ziet sessies van B | **0** |
| A ziet HRV van B | **0** |
| A ziet chatgeschiedenis van B | **0** |
| A ziet wearable-tokens | **0** |
| B ziet sessies van A | **0** |
| Anoniem ziet sessies / HRV / profielen / wearable-tokens | **0 / 0 / 0 / 0** |

103 + 9 = 112 = het totale aantal sessies. Er lekt niets en er verdwijnt niets.

---

## 8. OFFLINE STATUS 🟢

| Eis | Status |
|---|---|
| App starten zonder netwerk | 🟢 Service worker serveert de app-shell; smoketest rendert zes schermen met alle verkeer geblokkeerd |
| Sets opslaan zonder netwerk | 🟢 Wachtrij in IndexedDB |
| Retry en reconnect | 🟢 Drie triggers: online-event, terugkeer in de app, opstart |
| Volgorde | 🟢 Op id gesorteerd; test C3 |
| Dubbelvoorkoming | 🟢 **Nieuw** — her-entree-slot; test C1 stuurt twee gelijktijdige doorlopen op één item af en verwacht precies één verzending |
| Mislukte writes | 🟢 **Nieuw** — herstelbare fouten queuen in plaats van te verdwijnen |
| Conflicthantering | 🟡 Laatste schrijver wint; er is geen versieveld. Bij één gebruiker per account geen praktisch probleem, opgenomen in `KNOWN_LIMITATIONS.md` |
| Stil dataverlies | 🟢 Uitgesloten: elke weg (offline, netwerkfout, verlopen sessie, serverfout) eindigt óf in de wachtrij óf in een expliciete melding |

---

## 9. CALCULATION STATUS 🟢

Deterministisch, reproduceerbaar, testbaar, vrij van DOM, database, netwerk en AI —
afgedwongen door poort 12 van de release gate, die de broncode van `calculation.js` en
`decision.js` scant. Spearman staat exact één keer in de codebase. `Date.now` komt in geen
van beide voor: tijdstippen worden ingespoten.

Nagelopen op rekenlogica die per ongeluk in de UI zou staan: de weergavelaag van het
bewijsspoor roept aantoonbaar geen enkele rekenfunctie aan (test A7 in `fRC0`). Er is in deze
sprint geen enkele berekening verplaatst — dat zou refactor zonder releasewaarde zijn.

---

## 10. DECISION STATUS 🟢

Alle sportbeslissingen zitten in `DecisionCore` met een expliciete `ruleId` en `ruleVersion`
die meereizen in het bewijsspoor. Er is in deze sprint **geen enkele drempel gewijzigd,
toegevoegd of verzonnen**.

---

## 11. EVIDENCE STATUS 🟢 (met één 🟡)

| Eis | Status |
|---|---|
| Evidence wordt correct geproduceerd | 🟢 `buildDecisionEvidence` bij elke afgeronde set mét RPE |
| `relationship_id`, coëfficiënt, sample size, datakwaliteit | 🟢 Aanwezig in elk relatie-object |
| Confidence wordt niet door de AI verzonnen | 🟢 Komt uit `DecisionCore.releaseVerband` |
| Circulariteit uitgesloten | 🟢 23 paren geweigerd vóór er iets wordt berekend |
| Onvoldoende data correct aangegeven | 🟢 `INSUFFICIENT_DATA` is onderscheiden van `NO_PATTERN` |
| **Zichtbaar waar de gebruiker het nodig heeft** | 🟢 **Nieuw** — 'ⓘ Waarom' in het logboek |
| Productierijen mét bewijsspoor | 🟡 **0.** De code is toegevoegd ná de laatste gelogde training (15 augustus). De eerstvolgende afgeronde training mét RPE schrijft er een; schrijf- en leeskant zijn volledig getest |

---

## 12. AI COACH STATUS 🟢

De keten RAW → CALCULATION → DECISION → EVIDENCE → AI is intact en niet omgedraaid. De AI
ontvangt uitsluitend gevalideerde uitkomsten via vier whitelists (`AI_FIELDS` 10,
`LIVE_AI_FIELDS` 14, `READINESS_AI_FIELDS` 11, `INTEL_AI_FIELDS` 6 + `INTEL_INZICHT_FIELDS` 9),
maximaal drie geprioriteerde inzichten, en kan geen relatie zelf berekenen. Onderscheid tussen
feit, berekening, beslissing, verband en interpretatie is in de contracten vastgelegd.
Er is in deze sprint **geen enkele AI-bevoegdheid uitgebreid**.

---

## 13. ACTIVE WORKOUT STATUS 🟢

| Scenario | Status |
|---|---|
| Openen, starten, oefening openen, set invoeren (reps/gewicht/RPE), meerdere sets, aanpassen, verwijderen, overslaan, toevoegen, rust, pauzeren | 🟢 Bestaand, ongewijzigd; gedekt door de bestaande suites |
| App sluiten en heropenen | 🟢 **Verbeterd** — de instance-koppeling reist nu mee in de draft, zodat afronden na een herstart de sessie alsnog op `completed` zet |
| Offline werken en weer online komen | 🟢 **Verbeterd** — geen dubbele rijen meer |
| Afronden, incomplete en afgebroken training | 🟢 Statuswaarden `active`/`completed`/`aborted` bewaakt door `fFase2` sectie D |
| Databasepersistentie, historie, berekeningen, progressie, coach | 🟢 |
| Dezelfde informatie op meerdere plekken anders berekend | 🟢 Niet aangetroffen: één `buildStrengthSessionRow`, één `writeSessionRow`, één progressieregel |

Verificatie op een echt toestel staat in de smoke-testmatrix (`PLAY_STORE_READINESS.md` §9)
en kan hier niet worden uitgevoerd.

---

## 14. ANDROID STATUS 🟡

Alles wat uit de bestanden te bewijzen valt, is bewezen en getest (27 controles). Wat
overblijft is één compilatie.

| Onderdeel | Status |
|---|---|
| applicationId, app-naam, versionCode/versionName | 🟢 |
| Iconen, adaptief icoon, splash | 🟢 uit het merkbeeld, reproduceerbaar |
| Rechten, `neverForLocation`, `maxSdkVersion` op locatie | 🟢 |
| Back-up en toesteloverdracht uitgesloten | 🟢 |
| targetSdk 36 / AGP 8.9.1 / Gradle 8.11.1 | 🟡 **verificatiebuild vereist** |
| Ondertekening | 🟢 configuratie · 🔵 sleutel |
| Artefactomvang | 🟢 14 MB |
| Productie-endpoints, geen debug-secrets | 🟢 |
| Service worker en cache in de native app | 🟢 `MEDIA_ORIGIN` geregeld |
| Terugknop, edge-to-edge, levenscyclus | 🟢 in code · 🟡 toestelverificatie |
| **Release-AAB gebouwd** | 🔴 **Kan hier niet**: geen Android SDK en `dl.google.com` / `repo1.maven.org` geven 403 via de proxy |

---

## 15. PLAY STORE STATUS 🔵

Alles wat zonder Console-toegang voorbereid kan worden, is voorbereid in
`docs/PLAY_STORE_READINESS.md`: vermeldingsteksten (korte en volledige omschrijving), de
volledig ingevulde datavragenlijst (geverifieerd tegen het schema, niet geschat), rechten met
hun verantwoording, technische eisen, buildcommando's, ondertekeningsprocedure, verwachte
content rating en een smoke-testmatrix van 20 scenario's.

Wat alleen de eigenaar kan: Console-account, keystore, screenshots, feature graphic,
supportadres, verwijderings-URL, juridische toets, en de vragenlijsten indienen.

---

## 16. OPEN BLOCKERS

| # | Blocker | Type |
|---|---|---|
| 1 | Verificatiebuild van de API 36-configuratie | 🔴 omgeving — geen Android SDK, `dl.google.com` geblokkeerd |
| 2 | Zeven commits staan niet op de remote | 🔴 omgeving — de git-proxy weigert `steentje76/maurice-training`: "not in this session's authorized repository set". Geleverd als ZIP |

Er zijn **geen openstaande P0- of P1-defecten in de code**.

---

## 17. OWNER INPUT REQUIRED 🔵

| # | Punt | Waarom niet autonoom |
|---|---|---|
| 1 | Google Play Console-account en app aanmelden | Financieel en juridisch |
| 2 | Upload-keystore aanmaken en veiligstellen | Onomkeerbare sleutelbeslissing; verlies vereist een reset via Google |
| 3 | Verificatiebuild draaien | Geen Android SDK in deze omgeving |
| 4 | Screenshots en feature graphic | Vereist een draaiende app op een toestel |
| 5 | Supportadres (`SUPPORT_EMAIL` in `index.html` + Console) | Productbeslissing; een adres verzinnen zou een niet-werkend kanaal opleveren |
| 6 | Webadres voor accountverwijdering in de Console | Productbeslissing |
| 7 | Juridische toets van `privacy.html` | Juridisch |
| 8 | `auth_leaked_password_protection` aanzetten in Supabase | Instelling buiten de repository |
| 9 | `steentje76/maurice-training` aan de sessiebronnen toevoegen | Dan worden de zeven commits alsnog gepusht met hun volledige toelichting |

---

## 18. POST-V1 ITEMS ⚪

Op volgorde van opbrengst per eenheid werk — zie `docs/CURRENT_ROADMAP.md`.

1. **`duration_s` per sessie vastleggen** — ontsluit 105 van de 187 kenbare relaties en
   activeert `athlete.unifiedLoad`. De timer loopt al; alleen het wegschrijven ontbreekt.
2. Rustduur per set vastleggen.
3. Weer per sessie vastleggen.
4. Cardio-split als relatiebron, na een productbesluit over de machine-sleutel.
5. Prestatiepunten: 82 × `auth_rls_initplan`, 43 ontbrekende FK-indexen.
6. Accessibility-sprint (zoomen weer toestaan, contrast, tekstgroottes).
7. Menstruatiecyclus-tracking als volwaardige UI.
8. HYROX race-splits en triathlon-brick.
9. Extra wearable-providers — geblokkeerd op OAuth-credentials per provider.

Volledige lijst met redenen in `docs/KNOWN_LIMITATIONS.md`.

---

## 19. CURRENT ROADMAP

`docs/CURRENT_ROADMAP.md` is vanaf nu de enige actuele roadmap:

```
PHASE 0 — FOUNDATION            🟢
PHASE 1 — DATA / CONTENT        🟢
PHASE 2 — SECURITY / MULTI USER 🟢  (bevroren v4.47.0)
PHASE 3 — UNIFIED EXPERIENCE    🟢  (v4.41.0 – v4.46.0)
RC0     — RELEASE CANDIDATE     🟢  (v4.48.0, dit rapport)
V1.0    — PLAY STORE            🔵  (wacht op de eigenaar)
POST V1 — COACH / DATA / INTEGRATIONS  ⚪
FUTURE  — COMMERCIAL / SOCIAL / WHITE LABEL  ⚪
```

De oudere roadmaps zijn **niet herschreven**. `docs/12_Roadmap/Roadmap.md` heeft een
markering gekregen dat het archief is, met een verwijzing naar het actuele document. Waar de
audit iets tegensprak dat een oud document "afgerond" noemde, staat die correctie expliciet
in `CURRENT_ROADMAP.md` — inclusief drie correcties op mijn eigen eerdere werk (per-user
scheiding, videobundeling en het onzichtbare bewijsspoor) en de correctie op de
relationship-audits, die op een dump van twee vermengde accounts waren gedraaid.

Ook nieuw: `RELEASE_READINESS.md`, `PLAY_STORE_READINESS.md`, `RELATIONSHIP_AUDIT.md`,
`KNOWN_LIMITATIONS.md`, `RELEASE_CHANGELOG.md`. Bijgewerkt: `CHANGELOG.md`,
`CURRENT_STATE.md`, `DECISION_LOG.md` (DEC-024 t/m DEC-027).

---

## 20. EXACT NEXT STEP

Eén commando, op een machine met de Android SDK:

```bash
npm install
npm run cap:sync
cd android && ./gradlew clean bundleRelease
```

Slaagt dat, dan is er een AAB en gaat de rest van `docs/PLAY_STORE_READINESS.md` §10 lopen
(keystore, Console, screenshots, supportadres). Slaagt het niet, dan staat in §6 van dat
document precies wat er dan aan de hand is en wat de volgende stap is — vrijwel zeker een
Capacitor-upgrade, die bewust niet blind is doorgevoerd omdat hij hier niet te verifiëren was.

---

# CONCLUSIE

## 🟡 NOT YET READY — één externe blokkade resteert

Er zijn **geen P0- of P1-defecten meer in de code**. Vijf P0's en elf P1's zijn opgelost,
66 testbestanden zijn groen, de release gate staat 12/12, de browser-smoketest 41/41, de
database is geverifieerd, RLS is bewezen met een echte rolwissel, en de Android-configuratie
is van gegenereerde standaardwaarden naar een uploadbare release gebracht.

Wat ontbreekt is niet af te maken binnen deze omgeving: **de release-AAB kan hier niet worden
gebouwd** — er is geen Android SDK en de proxy blokkeert `dl.google.com`. Zolang die ene
build niet heeft gedraaid, is "Play Store Internal Test Ready" een claim zonder bewijs, en
die claim hoort niet in dit rapport.

Concreet: **RELEASE CANDIDATE READY.** Eén lokale build scheidt dit van Internal Test Ready.
