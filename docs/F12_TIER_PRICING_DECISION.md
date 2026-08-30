# F12_TIER_PRICING_DECISION.md — Trainingskompas

**Datum onderzoek:** 30 augustus 2026. Bronnen: officiële pricing-pagina's en source-checked reviews van augustus 2026.

## Marktbenchmark (geverifieerd augustus 2026)

| App | Free-tier | Athlete premium | Coach/gym-model |
|---|---|---|---|
| Hevy | Ruim (4 routines, 7 custom oefeningen, 3 maanden historie) | $2,99/mnd, $23,99/jaar, $74,99 lifetime | Geen apart coach-product |
| Strong | Onbeperkt loggen, 3 custom routines | $4,99/mnd, $29,99/jaar | Geen |
| Alpha Progression | 14-daagse trial, daarna betaald | $9,99-12,99/mnd, $79,99/jaar | Geen |
| Fitbod | 7-daagse trial | $15,99/mnd, $95,99/jaar | Geen |
| TrainingPeaks | Basic gratis | Coach-paid $9/atleet (aflopend >1000), athlete-paid $19,95/mnd of $124,99/jaar | Coach Edition $21,99/mnd, Unlimited $54,99/mnd |
| TrainHeroic | - | - | Coach-plans vanaf ~$9,99/mnd; athlete-tier-schaal $34,99 (15 atleten) tot $399,99 (1000 atleten); marketplace-model $9,99 basis + $1/atleet + 2,9%+$0,30 |

## Waarnemingen
- Loggers (Hevy, Strong) zijn goedkoop ($3-5/mnd) omdat ze vooral opslag/weergave zijn.
- Generators/AI-coaches (Fitbod, Alpha Progression) liggen hoger ($10-16/mnd) -- computatie/AI-gebruik rechtvaardigt de prijs.
- Coach/gym-B2B-producten hanteren bijna universeel een per-seat/per-atleet-model (TrainingPeaks, TrainHeroic), niet een vaste organisatieprijs -- direct relevant voor F11's al bestaande seat/membership-architectuur.
- Een echt bruikbaar gratis niveau (Hevy, Strong) wordt in reviews expliciet gewaardeerd tegenover trial-only-apps (Fitbod, Alpha Progression) -- sterk signaal vóór Trainingskompas' eigen productstrategische wet ("Free Athlete moet een daadwerkelijk bruikbaar product zijn, geen crippleware").

## Trainingskompas-positionering
Trainingskompas combineert een logger + AI-programma-generator + AI-coach + wetenschappelijke Calculation/Decision-laag + cyclus/recovery-context -- dit plaatst het conceptueel tussen Alpha Progression en een coach-product. Dit rechtvaardigt een Premium-prijs in de EUR 6-10/maand-band (jaarlijks), duidelijk onder Fitbod maar boven Hevy -- consistent met de eigen productstrategische wet ("zo laag mogelijk geprijsd voor de individuele sporter").

## Drie scenario's (geen definitieve keuze -- Product Owner-beslissing)

### Scenario A -- "Toegankelijk logger-plus" (laagste instapprijs)
Free Athlete: onbeperkt loggen, basis-Calculation/Decision, geen AI-limiet-uitbreiding. Premium Athlete: EUR 4,99/mnd of EUR 39,99/jaar -- AI Coach + Programma-generator (metered/quota), 1RM-grafieken, HRV-analyse.
Voordeel: laagste drempel, past bij Hevy/Strong-precedent. Nadeel: AI-kosten (tokens) kunnen bij lage prijs marge onder druk zetten zonder strikte quota.

### Scenario B -- "Gebalanceerd, AI-bewust" (middenweg)
Free Athlete: onbeperkt loggen, beperkt AI-quota (bijv. 5 AI-coach-gesprekken/maand). Premium Athlete: EUR 7,99/mnd of EUR 69,99/jaar -- hogere/onbeperkte AI-quota, alle inzicht-features.
Voordeel: balanceert toegankelijkheid met AI-kostendekking. Nadeel: vereist zorgvuldige quota-communicatie in de UX.

### Scenario C -- "Twee niveaus Premium" (Basis/Pro, sluit aan bij bestaand plans-schema)
Free Athlete: zoals boven. Atleet Basis: EUR 4,99/mnd -- inzicht-features (1RM-grafieken, HRV-analyse), geen AI-uitbreiding. Atleet Pro: EUR 9,99/mnd of EUR 89,99/jaar -- volledige AI Coach + Programma-generator.
Voordeel: sluit exact aan bij het reeds bestaande plans-schema (gratis/atleet_basis/atleet_pro staan al in de database). Nadeel: meer productbeslissingen, risico op tier-explosie als de grenzen niet scherp zijn.

**Coach Pro / Gym-Club-Team (alle scenario's):** per-seat-model naar TrainingPeaks/TrainHeroic-precedent -- een organisatie betaalt een platformbasisprijs + per actief-lid-bedrag, aansluitend bij F11's bestaande memberships-architectuur. Geen definitieve prijs vastgelegd -- CONFIG/PROVISIONAL (plans.prijs_cent blijft NULL totdat een Product Owner-besluit valt).

## Aanbeveling
Scenario C sluit het meest naadloos aan bij de reeds bestaande database (atleet_basis/atleet_pro bestaan al als plan-keys) en vermijdt een schema-wijziging. Dit is een aanbeveling, geen vastgelegde beslissing -- de daadwerkelijke prijs_cent-waarden blijven NULL/CONFIG totdat de Product Owner een bedrag bevestigt. De entitlement-architectuur (MS-F12-01) functioneert volledig onafhankelijk van de uiteindelijke prijs.

## Configureerbaarheid
Prijzen leven uitsluitend in plans.prijs_cent (database), nooit hardcoded in index.html/core/*.js/netlify/functions/*.js. Een prijswijziging vereist geen code-deploy.
