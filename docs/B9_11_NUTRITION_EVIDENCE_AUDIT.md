# B9-11 Nutrition Evidence Audit

| Claim ID | Claim | Evidence level | Bron | Scope | Limitation | Allowed wording |
|---|---|---|---|---|---|---|
| NUTR-EV-001 | Koolhydraatbeschikbaarheid vóór/tijdens langdurige of intensieve inspanning kan relevant zijn voor prestatie | C (contextafhankelijk -- sterk afhankelijk van sportsoort, duur, intensiteit, individuele tolerantie) | Algemeen aanvaarde sportvoedingsconsensus (bijv. IOC/ACSM-achtige position stands over koolhydraatbeschikbaarheid rond inspanning) | Uitsluitend als algemene, kwalitatieve context bij een gekoppelde training met `timing_context=pre_training`/`during_training` | Geen individuele dosering, geen "moet"-taal, geen claim dat dit voor deze specifieke sporter geldt | "Bij langere of intensievere inspanning kan koolhydraatbeschikbaarheid relevant zijn voor prestatie." |
| NUTR-EV-002 | Vochtinname tijdens langdurige/intensieve inspanning kan relevant zijn voor prestatie en comfort | C | Algemeen aanvaarde consensus over hydratatie rond inspanning | Uitsluitend context bij `timing_context=during_training` bij langere sessies | Geen ml-advies, geen zweetverlies-berekening | "Bij langere inspanning kan hydratatie extra aandacht verdienen." |
| NUTR-EV-003 | Eiwit en koolhydraten kunnen een rol spelen in het hersteproces na training | C | Algemeen aanvaarde consensus over herstelvoeding | Uitsluitend context bij `timing_context=post_training` | Geen g/kg-advies, geen "anabolic window"-deadline, geen garantie op herstel | "Na training kunnen eiwit en koolhydraten een rol spelen bij herstel." |

Alle drie claims zijn bewust beperkt tot **Evidence Level C**
(contextafhankelijk) -- geen Evidence Level A/B-claim wordt gedaan,
omdat individuele precisie/dosering buiten de scope en het
bewijsniveau van deze sprint valt. Elke claim wordt uitsluitend
getoond als een gekoppelde, user-entered `timing_context`-registratie
daadwerkelijk bestaat -- nooit als een op zichzelf staande, algemene
tip.
