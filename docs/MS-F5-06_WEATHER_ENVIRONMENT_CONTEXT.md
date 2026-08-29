# MS-F5-06_WEATHER_ENVIRONMENT_CONTEXT.md — Trainingskompas

**Canonieke naam/acceptance (ROADMAP_INDEX.json):** "Weather & Environment Context" -- "Weather attached to outdoor sessions with provenance." P2.

## Correctie op een eerdere, onjuiste claim (MS-F5-01)
Het Provider Integration Contract-rapport (MS-F5-01) stelde ten onrechte dat weer "nog niet geïmplementeerd" was, uitsluitend gebaseerd op het eigen bestandscommentaar van core/weather.js. Deze sprint bevestigt via daadwerkelijke code-audit: dat commentaar was gedateerd -- WeatherCore wordt wel degelijk actief aangeroepen vanuit index.html (TKWeather-wrapper). Leerpunt: een module-header-commentaar is geen vervanging voor daadwerkelijk zoeken naar aanroepen. Gecorrigeerd in dit rapport en in de canonieke documenten.

## Kernbevinding: volledig, reeds gebouwd en live gedeployed
Runtime-trace bevestigt een compleet bestaand feature (roadmap-intern "POST-V1 #3"):
1. core/weather.js (WeatherCore) -- pure, deterministische canonieke module: normalisatie, eenheidsconversie, provenance, de indoor/outdoor-hard-rule, en een privacybewuste Open-Meteo-requestbuilder (coördinaten afgerond naar 2 decimalen).
2. TKWeather (index.html) -- runtime-wrapper: per-uur-cache, timeout+AbortController, consent-gated geolocation met gestructureerde foutredenen (denied/unsupported/unavailable), een expliciete opt-in-vlag, nooit een gefabriceerde waarde bij een mislukte fetch.
3. Sessie-attachment (finishSession()): vóór het opslaan van een sessie wordt, uitsluitend bij een outdoor-capable modaliteit en opt-in, het weer opgehaald en het volledige canonieke object -- inclusief provenance -- opgeslagen in de live bevestigde sessions.weather-kolom (jsonb).
4. De weer-fetch-poging staat in een expliciete try/catch met het uitdrukkelijke commentaar "weer mag nooit het afronden van een sessie blokkeren".

## Toetsing tegen de architectuurwetten
- Weather is context, geen Calculation/Decision-waarheid: bevestigd -- WeatherCore bevat geen enkele trainingsregel.
- AI haalt/interpreteert weer nooit rechtstreeks: bevestigd -- geen enkele AI-prompt-aanroep raakt WeatherCore/TKWeather rechtstreeks aan.
- Locatieprivacy: coördinaten uitsluitend transiënt gebruikt (afgerond naar 2 decimalen), geen permanente locatiegeschiedenis-tabel gevonden.
- Provider-onderzoek: Open-Meteo gekozen (geen verplichte API-key, officiële velden 1-op-1 gemapt), reversibel, geen betaald contract vereist, provider blijft achter de adapter.
- Weather time alignment: de opgehaalde waarde is de op-dat-moment actuele meting, gebruikt ten tijde van de training zelf.
- Historisch weer: geen fabricage -- ontbrekende waarde blijft null.
- Weather Decision Rules: geen enkele gevonden -- weer voedt uitsluitend context.
- Weather AI: geen AI-aanroep gebruikt het weerobject.

## Tests
core/fWeatherEvidence.test.js (reeds bestaand, 100/100) dekt de pure WeatherCore-module grondig. Nieuw in deze sprint: core/fWeatherSessionAttachment.test.js (7/7) bewaakt specifiek de runtime-koppeling: daadwerkelijke sessie-attachment, de nooit-blokkeren-garantie, de opt-in-gate, de outdoor-capable-classificatie, afwezigheid van permanente locatieopslag, en geen fabricage bij een mislukte fetch. Sabotagebewijs geleverd (de weer-attachment tijdelijk verwijderd uit de sessie-write, exact gedetecteerd, teruggedraaid).

## MS-F5-06 acceptance-gate-toetsing
Letterlijke acceptance gate: "Weather attached to outdoor sessions with provenance."
Resultaat: CLOSED. Volledig, reeds bestaand en live gedeployed feature bevestigd via daadwerkelijke code- en database-audit. Nieuwe regressietest sluit het eerder ontbrekende runtime-koppelingsbewijs.
