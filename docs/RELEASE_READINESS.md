# RELEASE_READINESS.md

**Datum** 19 augustus 2026 · **Versie** v4.48.0 (RC0) · **Doel** Google Play Internal Testing
**Vorige status** Fase 2 technisch bevroren (v4.47.0, 19 augustus 2026)

Dit document is opgesteld ná een volledige audit van de repository, de productiedatabase, de
Android-configuratie en de kernlus. Het vervangt de verspreide statusteksten in de oudere
roadmapversies als bron voor *releasegereedheid*; `docs/CURRENT_ROADMAP.md` doet hetzelfde
voor de planning.

---

## 1. CURRENT STATE

| Laag | Status | Toelichting |
|---|---|---|
| Fundament (Fase 0/1) | 🟢 | Aanwezig en stabiel |
| Auth, RLS, per-user scheiding (Fase 2) | 🟢 | 65 tabellen, 85 policies, 0 tabellen zonder RLS; isolatie bewezen met een rollback-test met rolwissel en JWT-claims |
| Offline sync | 🟢 | IndexedDB-wachtrij met drie synctriggers; in RC0 aangevuld met her-entree-slot en herstel na 401 |
| Calculation Engine | 🟢 | Deterministisch, vrij van DOM/DB/netwerk/AI — afgedwongen door de release gate |
| Decision Engine | 🟢 | Expliciete regels met versie-id per beslissing |
| Evidence | 🟢 | Wordt geschreven én sinds RC0 getoond in het logboek |
| Relationship Engine | 🟢 | 21 variabelen, 187 kenbare relaties, 82 doorgerekend, 7 gevalideerde patronen |
| AI Coach | 🟢 | Whitelist-grens; AI rekent niet, bepaalt geen confidence, claimt geen causaliteit |
| Active Workout | 🟡 | Werkt; de koppeling met `training_instances` overleeft sinds RC0 een herstart. Zie §5 voor wat resteert |
| Android / packaging | 🟡 | Configuratie is releasegereed gemaakt, maar kon in deze omgeving niet worden gecompileerd |
| Play Store-vermelding | 🔵 | Vereist eigenaarsinvoer (account, keystore, screenshots, supportadres) |
| Testdekking | 🟢 | 66 testbestanden, 0 rood, release gate 12/12 |

**Testresultaat bij aanvang van deze sprint:** 62 bestanden groen, release gate 12/12.
**Testresultaat nu:** 66 bestanden groen, release gate 12/12, 4 nieuwe suites.

---

## 2. RELEASE TARGET

> Een eerste echte gebruiker installeert de app uit Google Play Internal Testing, maakt een
> account, stelt een profiel in, kiest of maakt een training, voert die uit, slaat hem op,
> ziet zijn voortgang, begrijpt waaróm iets geadviseerd wordt, en traint later opnieuw —
> zonder dat er onderweg gegevens verdwijnen.

Buiten scope: social, commercialisatie, white-label, extra wearable-providers, geavanceerde
analytics. Zie `docs/CURRENT_ROADMAP.md`.

---

## 3. P0 BLOCKERS

Alle P0's uit deze audit zijn in deze sprint opgelost.

| # | Blocker | Waarom P0 | Status |
|---|---|---|---|
| P0-1 | **Verlopen sessie leidde tot stil dataverlies.** Android bevriest achtergrondtimers; de token-refresh liep dus niet door. Bij terugkeer gaf `sbGet` een lege lijst (elk scherm toonde "geen data") en `sbPostQ` gaf `false` zónder te queuen — zojuist ingevoerde sets waren echt weg. | Dataverlies + de app liegt over de oorzaak | 🟢 Opgelost — alle REST loopt via `sbFetch`: één 401 → één gedeelde refresh → één retry met verse header; herstelbare fouten gaan naar de wachtrij |
| P0-2 | **Dubbele sync.** `flushOfflineQueue()` had drie aanroepbronnen en geen slot; twee gelijktijdige doorlopen konden hetzelfde item tweemaal versturen. | Dubbele sessierijen in de database | 🟢 Opgelost — her-entree-slot, plus niets versturen zonder sessie |
| P0-3 | **targetSdk 34.** Google Play eist sinds 31-08-2025 minimaal API 35 en vanaf 31-08-2026 API 36. | De upload wordt geweigerd | 🟢 Config op 36 (AGP 8.9.1, Gradle 8.11.1) — 🔵 verificatiebuild vereist |
| P0-4 | **Artefact van ~450 MB.** `videos/` (437 MB) werd integraal meegebundeld; het Play-plafond voor de basismodule is 200 MB. | De upload wordt geweigerd | 🟢 Opgelost — video's worden on-demand opgehaald en gecachet zoals op het web; `www/` van 450 MB naar 14 MB |
| P0-5 | **Geen ondertekening.** De release-buildtype had geen `signingConfig` en leverde een ongetekend artefact. | Niet uploadbaar | 🟢 Configuratie toegevoegd — 🔵 de sleutel zelf is eigenaarsinvoer |

---

## 4. P1 BLOCKERS

| # | Blocker | Waarom P1 | Status |
|---|---|---|---|
| P1-1 | **Tweede sporter op één toestel sloeg de hele intake over.** `tk_onboarding_done` stond niet in `PERSONAL_CACHE_KEYS`; negen andere persoonlijke sleutels evenmin (coachvoorkeuren, apparatuurgeheugen, machinelijsten, gekozen cardio-machine). | Kernfunctie "profiel instellen" wordt overgeslagen; voorkeuren lekken tussen accounts | 🟢 Opgelost, plus een generiek net in de testsuite dat elke nieuwe sleutel dwingt te classificeren |
| P1-2 | **Terugknop sloot de app af vanaf elk scherm.** De app bouwde geen history-entries op. | Eerste wat een tester tegenkomt | 🟢 Opgelost — één ondiepe schermstapel; op het beginscherm pas afsluiten bij de tweede terugveeg |
| P1-3 | **Bewijsspoor onzichtbaar.** `evidence_snapshot.v1` werd geschreven maar had nul lezers in de interface. | Dit is de kernbelofte van het product | 🟢 Opgelost — 'ⓘ Waarom' per oefening in het logboek |
| P1-4 | **Instance-koppeling verdween bij herstart.** `activeInstanceId` zat niet in de draft; na een app-herstart werd `completeTrainingInstance()` nooit aangeroepen. | Precies de 128 weesrijen die migratie v446 achteraf moest opruimen | 🟢 Opgelost |
| P1-5 | **Accountverwijdering was onvolledig.** Elf tabellen met gebruikersgegevens bleven achter, waaronder `wearable_connections` — met het access- én refresh-token in leesbare vorm. | Play-vereiste én in strijd met de eigen privacytekst | 🟢 Opgelost, inclusief beide richtingen van `content_shares` en een gym_id-filter zodat gedeelde inrichting van anderen blijft bestaan |
| P1-6 | **Beheer onbereikbaar voor een solo-sporter.** `teamRoleLevel === -1` betekende zowel "geen gym" als "nog niet opgehaald"; de solo-sporter kwam op een gedeelde pincode-muur en kon zijn eigen apparatuur en oefeningen niet beheren. | Kernfunctie onbereikbaar | 🟢 Opgelost |
| P1-7 | **`[PLACEHOLDER]` zichtbaar in het scherm Help.** | Ontwikkelnotitie in de uitgeleverde interface | 🟢 Opgelost; het supportadres zelf is 🔵 eigenaarsinvoer |
| P1-8 | **Geen publieke privacyverklaring.** | Play-vereiste | 🟢 `privacy.html` toegevoegd — 🔵 juridische toets nog nodig |
| P1-9 | **App-data in de cloudback-up.** `allowBackup="true"` kopieerde de WebView-opslag, inclusief het sessietoken, naar Google Drive. | Privacy/security | 🟢 Opgelost, met regels voor zowel back-up als toesteloverdracht |
| P1-10 | **Standaard Capacitor-logo als app-icoon en splash.** | De Play-vermelding zou het verkeerde merk tonen | 🟢 Opgelost, reproduceerbaar via `scripts/android-icons.py` |
| P1-11 | **Testcode in het uitgeleverde artefact.** 62 `*.test.js` gingen mee in de APK/AAB. | Onnodige omvang en interne details in een publiek bestand | 🟢 Opgelost |

---

## 5. P2 IMPROVEMENTS

Niet noodzakelijk voor de eerste release. Opgenomen in `KNOWN_LIMITATIONS.md`.

| # | Onderwerp | Waarom nu niet |
|---|---|---|
| P2-1 | 82× `auth_rls_initplan` in de Supabase-adviseur: `auth.uid()` wordt per rij geëvalueerd | Prestatiepunt, geen correctheidsprobleem. Bij 112 sessies niet meetbaar. Herschrijven van 82 policies is een databasewijziging met RLS-risico en hoort niet in een releasesprint |
| P2-2 | 43 niet-geïndexeerde foreign keys | Idem; merkbaar pas bij een veelvoud van de huidige data |
| P2-3 | Gedeelde pincode voor Beheer (SHA-256 in de client) | Een 4-cijferige pincode is triviaal te brute-forcen, maar schrijfrechten worden server-side door RLS afgedwongen. De pincode is sinds RC0 alleen nog het vangnet zolang de rol onbekend is |
| P2-4 | `maximum-scale=1, user-scalable=no` in de viewport | Beperkt zoomen (WCAG 1.4.4). Wijzigen raakt de lay-out van elk scherm en hoort in een aparte accessibility-sprint |
| P2-5 | `loadHistory()` gebruikt `sbGet` in plaats van `v43SafeGet` | Geen timeout; bij een hangende verbinding blijft het logboek leeg laden in plaats van een lege staat te tonen |
| P2-6 | Vier verouderde duplicaten in de repo-root (`coaching.js`, `coaching.test.js`, `sw-guard.test.js`, `release-gate.js`) | Dode kopieën van de `core/`-versies; ze worden niet geladen en niet gedraaid, maar verwarren wel |
| P2-7 | `vPin`/`pinBuf` verwijzen naar een verwijderd scherm `s-pin-lock` | Dode code |
| P2-8 | `bak_p_*`-tabellen en de commerciële tabellen (`plans`, `credit_packs`, …) staan leeg met RLS zonder policies | Veilig (alles geweigerd), maar het zijn 18 INFO-meldingen in de adviseur die het beeld vertroebelen |

---

## 6. SAFE AFTER V1

- Rustduur per set vastleggen (ontsluit de relatie *Rustduur*).
- Trainingsduur vastleggen (`duration_s`) — ontsluit 105 relaties én `athlete.unifiedLoad`.
- Weer per sessie vastleggen (ontsluit temperatuur/luchtvochtigheid/wind).
- Cardio-split als relatiebron, na een productbesluit over de machine-sleutel.
- Menstruatiecyclus-tracking als volwaardige UI (`cyclus_fase` bestaat en telt al mee).
- HYROX race-splits en triathlon-brick.

---

## 7. FUTURE ROADMAP

Zie `docs/CURRENT_ROADMAP.md`.

---

## 8. PLAY STORE BLOCKERS

| # | Blocker | Type |
|---|---|---|
| PS-1 | Verificatiebuild van de API 36-configuratie | 🔵 Kan hier niet: geen Android SDK, `dl.google.com` niet bereikbaar |
| PS-2 | Upload-keystore aanmaken en bewaren | 🔵 Onomkeerbare sleutelbeslissing — eigenaar |
| PS-3 | Google Play Console-account en app-aanmelding | 🔵 Financieel/juridisch — eigenaar |
| PS-4 | Screenshots (minimaal 2, telefoonformaat) en een feature graphic | 🔵 Vereist een draaiende app op een toestel |
| PS-5 | Publieke URL van de privacyverklaring | 🟡 `privacy.html` staat klaar; wordt bereikbaar zodra de site is uitgerold |
| PS-6 | Supportadres voor de vermelding én voor `SUPPORT_EMAIL` in de app | 🔵 Eigenaar |
| PS-7 | Datavragenlijst (Data safety) invullen | 🟡 Volledig voorbereid in `PLAY_STORE_READINESS.md`, moet in de Console worden overgenomen |
| PS-8 | Content rating-vragenlijst | 🔵 Console |

---

## 9. DATABASE BLOCKERS

**Geen.** 11/11 migraties uitgevoerd en geverifieerd tegen het productieschema (v328–v337,
v446, v447). 65 tabellen, 85 policies, 0 tabellen zonder RLS. `training_instances`:
0 actief, 11 voltooid, 128 afgebroken, alle 139 snapshots bewaard.

Er is in deze sprint **geen enkele databasewijziging** doorgevoerd.

---

## 10. SECURITY BLOCKERS

| Bevinding | Classificatie |
|---|---|
| `auth_leaked_password_protection` staat uit | **NEEDS ACTION — eigenaar.** Eén schakelaar in de Supabase-console (Authentication → Policies). Voor een app met gezondheidsgegevens verstandig vóór publieke uitrol |
| 18 × `rls_enabled_no_policy` (INFO) op `bak_p_*` en de commerciële tabellen | **FALSE POSITIVE / INTENTIONAL.** RLS aan zonder policy = alles geweigerd voor `anon` en `authenticated`; alleen `service_role` komt erbij. Dat is precies de bedoeling voor `wearable_connections` en `wearable_oauth_state` |
| 8 SECURITY DEFINER-functies | **OPGELOST (v447).** Alle acht hebben een vaste `search_path`; `EXECUTE` is ingetrokken voor `public`, `anon` en `authenticated`; alle 25 triggers intact |
| Access- en refresh-token in de cloudback-up | **OPGELOST (RC0).** `allowBackup="false"` + uitsluitingsregels voor back-up én toesteloverdracht |
| Tokens bleven staan na accountverwijdering | **OPGELOST (RC0)** |
| Client-side pincode voor Beheer | **DEFERRED.** Server-side afgedwongen door RLS; zie P2-3 |

---

## 11. UX BLOCKERS

Alle release-kritieke UX-punten zijn opgelost (P1-2, P1-3, P1-6, P1-7, P1-10 en de
edge-to-edge-correctie). Wat resteert is P2-4 (zoomen) en verificatie op een echt toestel,
die niet in deze omgeving kan.

---

## 12. TEST BLOCKERS

**Geen.** 66 testbestanden groen, 0 rood, release gate 12/12, syntaxcontrole op alle 10
inline scripts. Er is geen test verwijderd of verzwakt. Eén test is aangescherpt: `fFase2`
C2 keek naar de afstand tussen twee tekens in de broncode en eist nu de juiste *volgorde*
(sessie valideren vóór synchroniseren) — een sterkere eis dan voorheen.

Wat de testsuite **niet** kan aantonen en dus handmatig moet:

- de Android-build zelf (§8, PS-1);
- gedrag op een echt toestel: terugveeg, edge-to-edge, toetsenbord, installeren/updaten/
  herinstalleren;
- de smoke-testmatrix in `PLAY_STORE_READINESS.md` §9.
