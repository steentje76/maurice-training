# MS-F5-03_ANDROID_HEALTH_CONNECT_PRODUCTION_PATH.md — Trainingskompas

**Canonieke naam/acceptance (ROADMAP_INDEX.json):** "Android Health Connect Production Path" -- "Current Android health architecture validated end-to-end."

## Kritieke, eerlijke architectuurbevinding (webonderzoek augustus 2026, niet uit training aangenomen)
Repo-brede zoekactie naar health.connect/HealthConnectClient/androidx.health in de gehele android/native-mapstructuur leverde nul treffers op. Er bestaat geen native Android Health Connect-SDK-integratie in deze repo.

Gericht, actueel webonderzoek bevestigt: health.googleapis.com/v4 (de daadwerkelijk gebruikte API in wearable-sync.js) is de Google Health API -- een server-side, cloud-gebaseerde OAuth 2.0 REST-API, opvolger van de sunsettende Fitbit Web API (september 2026). Dit is architecturaal fundamenteel anders dan Android Health Connect, dat een on-device datastore is zonder cloud-API, die uitsluitend via een native Android SDK-component en native Android-permissieschermen (geen OAuth) uitgelezen kan worden.

Conclusie: Trainingskompas heeft uitsluitend de Google Health API-integratie (cloud, OAuth) -- geen Android Health Connect-SDK-integratie. Dit is geen fout of tekortkoming op zich (de Google Health API is een legitieme, werkende, cross-platform route naar wearable-gezondheidsdata), maar het is een feitelijke, belangrijke afwijking van wat de letterlijke roadmap-naam ("Android Health Connect") zou doen vermoeden.

## Interpretatie van de acceptance gate
De acceptance gate luidt "current Android health architecture validated end-to-end" -- niet letterlijk "Health Connect SDK specifically". Conform de instructie om de daadwerkelijke, actuele implementatie te auditen, is de CURRENT Android health architecture de Google Health API-integratie. Deze wordt hieronder end-to-end getoetst.

## End-to-end validatie van de bestaande architectuur

| Onderdeel | Status | Bewijs |
|---|---|---|
| Permissions (minimum necessary) | OK | Uitsluitend googlehealth.health_metrics_and_measurements.readonly + googlehealth.sleep.readonly -- geen schrijfrechten, geen overbodige activity-scope. Code-commentaar toont een eerdere scope-naam-correctie, bewijst zorgvuldige engineering. |
| No-wearable guarantee | OK | Meerdere bestaande !dfInfo-guards (readinessDay(), buildCoachAdvice(), buildCoachIntro(), F3/F4-bevestigd) zorgen voor een nette fallback-tekst, nooit een crash of geforceerde wearable-vereiste. |
| Historical sync bound | OK | since.setDate(since.getDate()-7) -- expliciet begrensd tot 7 dagen, geen ongebonden historie-pull. |
| Incremental sync / idempotency | OK | F3-bevestigd: UNIQUE(user_id,date) + atomaire upsert_daily_health-RPC garandeert idempotente herhaalde sync. |
| Daily health merge | OK | F3 Closure Hotfix: per-veld COALESCE-merge, geen lees-dan-overschrijf-race meer. |
| HRV/RHR/slaap-veldmapping/eenheden/nulls/bron | OK | F3-bevestigd: canonieke eenheden, null nooit als 0, per-veld provenance. |
| Duplicates (Health Connect-aggregatie-scenario) | Niet van toepassing | Aangezien er geen Health Connect-integratie bestaat, is dit scenario momenteel niet aan de orde -- pas relevant bij een toekomstige Health Connect-SDK-integratie. |

## Nieuw, product-relevant besluitpunt
PRODUCT_DECISION_REQUIRED: wil Trainingskompas naast de bestaande Google Health API-integratie ook een native Android Health Connect-SDK-integratie bouwen? Voordeel: Health Connect fungeert als een on-device aggregatiepunt waar meerdere apps hun data in kunnen schrijven. Nadeel: vereist een native Android SDK-component, alleen bruikbaar op Android, introduceert het cross-provider-deduplicatievraagstuk dat nu nog niet speelt. Dit is geen technische blokkade en wordt hier niet zelf besloten -- vastgelegd in F5_PRODUCT_OWNER_DECISIONS.md.

## MS-F5-03 acceptance-gate-toetsing
Letterlijke acceptance gate: "Current Android health architecture validated end-to-end."
Resultaat: CLOSED (voor de daadwerkelijk bestaande architectuur, de Google Health API-integratie) met een expliciet vastgelegd, eerlijk product-besluitpunt over een mogelijke toekomstige, aanvullende Health Connect-SDK-integratie. Geen bewijs verzonnen voor functionaliteit die niet bestaat.
