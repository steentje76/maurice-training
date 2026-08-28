# CONFIGURATION_SECURITY_CONTRACT.md — Trainingskompas (MS-F1-03)

**Auditmethode:** repo-brede patroonscan (API keys, tokens, secrets, JWT's, credentials) op tracked bestanden (`.js`, `.html`, `.json`, `.sql`, `.md`), gerichte `git log`-geschiedenisscan (pickaxe-search op bekende secretprefixen), Android-signing-configuratie, CI-configuratie, en een live DB-check op de `config`-tabel (uitsluitend aanwezigheid, nooit waarden). Geen enkele secretwaarde is in dit document of tijdens de audit getoond.

## Classificatie

| Config-item | Locatie | Classificatie | Status |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Netlify env var (`coach.js`) | **SERVER SECRET** | ✅ correct: geen hardcoded fallback, fail-closed (HTTP 500) als ontbrekend |
| `SUPABASE_SERVICE_ROLE_KEY` | Netlify env var (9 functies) | **SERVER SECRET** | ✅ correct: geen hardcoded fallback, fail-closed in elke functie die hem gebruikt |
| `GOOGLE_HEALTH_CLIENT_SECRET` | Netlify env var (`wearable-auth-*.js`) | **SERVER SECRET** | ✅ correct: geen hardcoded fallback, fail-closed |
| `GOOGLE_HEALTH_CLIENT_ID` | Netlify env var | NON-SECRET INTERNAL CONFIG | ✅ OAuth client-ID's zijn per ontwerp niet geheim |
| `SUPABASE_URL` | env var + hardcoded fallback in client én server | PUBLIC CLIENT CONFIG | ✅ correct: een projectendpoint is geen secret |
| `SUPABASE_ANON_KEY` ("publishable key") | env var + hardcoded fallback in client én 9 server-bestanden | **PUBLIC CLIENT CONFIG** | ✅ correct — dit ís de per-ontwerp publieke Supabase-"publishable"-sleutel; veiligheid hangt terecht af van RLS, niet van geheimhouding van deze sleutel |
| Android upload-keystore (`storePassword`/`keyPassword`) | `android/keystore.properties` (gitignored) of env vars `TK_KEYSTORE_*` | **SERVER SECRET** (build-time) | ✅ correct: nooit gecommit, alleen een leeg voorbeeldbestand (`keystore.properties.voorbeeld`) getracked |
| `config.anthropic_key` (DB-kolom) | Supabase `config`-tabel | **SERVER SECRET, locatie AFGEKEURD** | ⚠️ zie bevinding F-01 |
| `config.pin_hash` (DB-kolom) | Supabase `config`-tabel | UNKNOWN / vermoedelijk orphaned | ⚠️ zie bevinding F-02 |
| Client-side app-lock `PIN_HASH`-constante | `index.html` (hardcoded SHA-256) | NON-SECRET INTERNAL CONFIG (device-lock, geen echte autorisatiegrens) | ⚠️ zie bevinding F-03 (geen P0/P1 — echte toegang loopt via Supabase Auth + RLS) |
| `gym.coach_pin_hash` | Supabase `gyms`-tabel | **SERVER SECRET** | ✅ RLS deny-all sinds MS-F1-01 (P0-001-closure); zie F-04 voor het resterende hardeningspunt |

## Bevindingen

### F-01 (P2) — `config.anthropic_key`: ongebruikte, orphaned duplicaat-opslag van een server-secret in de database
**Bevinding:** de `config`-tabel bevat een kolom `anthropic_key` met een daadwerkelijk aanwezige waarde (aanwezigheid geverifieerd, waarde nooit opgevraagd). Repo-brede code-search (`index.html`, alle `netlify/functions/*.js`) toont **0 referenties** naar deze kolom — `coach.js` gebruikt uitsluitend `process.env.ANTHROPIC_API_KEY`. Dit is dus een niet-gebruikte, waarschijnlijk historische duplicaat-opslag (vermoedelijk een restant van een eerdere architectuur vóór de server-side proxy).
**Risico:** laag-tot-matig. De tabel is RLS-deny-all voor anon/authenticated (alleen `service_role` kan lezen), dus geen actieve client-exposure. Het risico zit in onnodige attack surface: een tweede plek waar dezelfde soort secret kan lekken (bv. bij een toekomstige, per ongeluk te ruime RLS-policy, of bij een service_role-query die de volledige rij logt).
**Classificatie blocker:** `MANUAL_USER_VALIDATION_REQUIRED` — ik kan niet met zekerheid vaststellen of deze kolom nog ergens buiten deze repository wordt gelezen (bv. een extern script, een Supabase Edge Function buiten deze repo, of een handmatig proces), en verwijder daarom geen data zonder die zekerheid (zie opdracht §20: "als onzeker: NIET verwijderen").
**Aanbeveling (niet uitgevoerd):** bevestig met de Product Owner dat niets buiten deze repo deze kolom leest, en verwijder de kolom (of null de waarde) in een aparte, expliciet goedgekeurde migratie. Tot die tijd: geen nieuwe code mag deze kolom ooit lezen of schrijven — canonieke bron blijft uitsluitend `process.env.ANTHROPIC_API_KEY`.

### F-02 (P3) — `config.pin_hash`: eveneens ongebruikt, vermoedelijk orphaned
**Bevinding:** zelfde patroon als F-01. Het daadwerkelijke app-lock-mechanisme (`vPin()`/`vAPin()` in `index.html`) vergelijkt tegen de hardcoded client-side `PIN_HASH`-constante, niet tegen deze DB-kolom.
**Risico:** laag — RLS-beschermd, geen actieve leescode.
**Classificatie blocker:** `MANUAL_USER_VALIDATION_REQUIRED`, zelfde aanbeveling als F-01.

### F-03 (P3, geen P0/P1) — client-side app-lock PIN-hash hardcoded in verzonden JavaScript
**Bevinding:** `index.html` bevat `const PIN_HASH = '<sha256-hash>'` in leesbare, verzonden client-code (zichtbaar voor iedereen via "view source"). De hash is ongesalt SHA-256 van een numerieke pincode — bij een laag aantal cijfers offline binnen seconden te kraken via brute force/rainbow table.
**Waarom geen P0/P1:** dit is een **lokaal device-lock/scherm-lock-gemak**, geen daadwerkelijke autorisatiegrens. Alle echte data-toegang loopt via Supabase Auth (sessie/JWT) + RLS, uitgebreid geaudit en gevalideerd in MS-F1-01. Het kraken van deze hash geeft geen toegang tot enige serverside data — hooguit tot de lokale "scherm ontgrendelen op dit toestel"-functie.
**Classificatie:** `PRODUCT_DECISION_REQUIRED` als een sterkere lock gewenst is (bv. device-side salting, of migratie naar een systeemniveau-biometrie/lockscreen-koppeling) — dat is een productbeslissing over UX, geen beveiligingsincident.
**Geen wijziging uitgevoerd** — puur gedocumenteerd, conform de blocker-regel (§5/§6 van de opdracht: geen productbeslissing verzinnen).

### F-04 (P2, reeds bekend, herbevestigd) — `gym.coach_pin_hash`: ongesalte SHA-256 van een laag-entropische pincode
**Bevinding:** ongewijzigd t.o.v. eerdere audit (zie `SECURITY_FINDINGS.md`). RLS-exposure is gesloten sinds MS-F1-01 (P0-001). Resterende hardening (salting) blijft P2, niet urgent.
**Classificatie:** geen blocker, reeds correct getraceerd in Gap Analysis.

## Git-geschiedenis
Gerichte pickaxe-search (`sk-ant-`, `SUPABASE_SERVICE_ROLE_KEY=`, `ANTHROPIC_API_KEY=`) op de volledige geschiedenis. Vier treffers voor `sk-ant-`, alle vier bleken een onschuldige, inmiddels verwijderde HTML-`placeholder="sk-ant-api03-..."`-tekst te zijn (een UI-hint uit de tijd vóór de server-side proxy, geen echte sleutel — placeholders eindigen op een letterlijke `...`, echte sleutels nooit). Geen `.env`-bestand ooit gecommit. **Geen ROTATION REQUIRED-items gevonden** in deze gerichte scan.

**Kanttekening bij scope:** dit was een gerichte, patroon-gebaseerde scan, geen uitputtende full-history diff-audit van elke byte ooit gecommit. Als aanvullend vertrouwen gewenst is, kan een tool als `gitleaks`/`trufflehog` tegen de volledige geschiedenis draaien — buiten scope van deze sprint (geen netwerktoegang tot een externe scanner vanuit deze omgeving).

## Environment-validatie
Alle 9 Netlify Functions die een server-secret nodig hebben, falen expliciet en veilig (HTTP 500, generieke foutmelding zonder secretwaarde) wanneer die env var ontbreekt — geen enkele functie valt stil terug op dummy/development-gedrag in productie. Geverifieerd voor: `ANTHROPIC_API_KEY` (coach.js), `SUPABASE_SERVICE_ROLE_KEY` (8 functies), `GOOGLE_HEALTH_CLIENT_SECRET`/`GOOGLE_HEALTH_CLIENT_ID` (wearable-auth-*.js).

## Redactie-integratie (observability)
`core/observability.js` REDACT_KEYS uitgebreid met de generieke term `key` (naast `api_key`/`apikey`) nadat een gerichte test aantoonde dat `provider_key` niet werd geredacteerd door de oorspronkelijke lijst — `api_key` matcht niet als substring van `provider_key`. Nieuwe test `core/observability.test.js` sectie K bevestigt: provider key, bearer token, refresh token, service_role, authorization-header en PIN worden allemaal geredacteerd in een gesimuleerd `config.validation.failed`-event. 58/58 tests groen na de uitbreiding, geen regressie op de bestaande AI/wearable-integraties.

## Prohibited storage locations (vastgelegd, vooruitkijkend)
- **Nooit** een server-secret dupliceren in een databasetabel naast de canonieke `process.env`-bron — verhoogt attack surface zonder functioneel voordeel (zie F-01/F-02).
- **Nooit** een fallback-defaultwaarde voor een echte server-secret (`ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_HEALTH_CLIENT_SECRET`) — altijd fail-closed.
- **Nooit** een secret loggen, ook niet via `console.log` voor debug-doeleinden — gebruik `ObservabilityCore` (automatische redactie op keynaam) en geef zelf geen gevoelige waarden mee onder een onverdachte key.
- **Nooit** `.env`-bestanden committen — reeds afgedwongen via `.gitignore`, geverifieerd leeg in de geschiedenis.
- **Nooit** de Android-upload-keystore of zijn wachtwoorden committen — reeds afgedwongen via `.gitignore`, alleen een placeholder-voorbeeldbestand getracked.

## MS-F1-03 acceptance-checklist
- [x] Volledige current-source secret inventory uitgevoerd
- [x] Client/server-classificatie vastgelegd (tabel hierboven)
- [x] Geen confirmed server-secret client-side bereikbaar
- [x] Geen confirmed secret in operationele logs (redactielaag getest, sectie K)
- [x] Config fail-safe gedrag getest (9/9 functies fail-closed bevestigd)
- [x] Relevante historische exposure beoordeeld (gerichte git-geschiedenisscan, geen rotation nodig)
- [x] Rotation-required items expliciet geregistreerd (geen gevonden in deze scan)
- [x] Tests groen (58/58 observability + regressie op coach.js/wearable-sync.js)
- [x] CI groen
- [x] Documentatie bijgewerkt (dit document + Capability Registry + Gap Analysis)

**Openstaande, niet-blokkerende items:** F-01/F-02 (orphaned DB-kolommen) vereisen `MANUAL_USER_VALIDATION_REQUIRED` vóór verwijdering — geen blocker voor MS-F1-03-closure zelf (geen actieve exposure), wel geregistreerd als vervolgwerk in Gap Analysis. F-03 (client-lock-hardening) is `PRODUCT_DECISION_REQUIRED`, evenmin blokkerend voor de kern van deze sprint.
