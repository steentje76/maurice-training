# B9-H6 Connected Equipment Provider Research

## EGYM

**SUPPORTED?** Nee. **OFFICIAL API?** Ja, een uitgebreide developer portal (developer.egym.com) met MMS API v2, Equipment Vendor API (device-to-server en server-to-server). **SDK?** Niet apart gevonden. **BLE/FTMS?** Niet vermeld in de gevonden documentatie; API-integratie is HTTPS-gebaseerd. **CLOUD?** Ja, EGYM Cloud. **DEVELOPER ACCESS?** Vereist expliciet contact via integrations@egym.com/partnerships@egym.com voor een partnerschapstraject en credentials -- **externe, menselijke handeling**. **REALISTIC NEXT STEP:** Product Owner neemt contact op met EGYM voor een partnerschapsgesprek. **EXTERNAL BLOCKER:** Ja, partnerschapsgoedkeuring door EGYM zelf.

## Technogym

**SUPPORTED?** Nee. **OFFICIAL API?** Ja, via een marketplace/partner-model (bijv. via Sportalliance/PerfectGym-integratieportaal). **SDK?** Niet onderzocht in detail. **BLE/FTMS?** Niet vastgesteld. **CLOUD?** Ja. **DEVELOPER ACCESS?** Vereist activatie/bevestiging door Technogym zelf als partner -- **externe, menselijke handeling**. **REALISTIC NEXT STEP:** partnerschapsaanvraag. **EXTERNAL BLOCKER:** Ja.

## Life Fitness / Matrix / Precor / Keiser / Wattbike / Milon / Gym80

**SUPPORTED?** Nee voor alle. Niet individueel, diepgaand onderzocht binnen deze sessie se tijdsbudget (buiten de twee meest genoemde/relevante vendors EGYM/Technogym). Geen aanwijzing gevonden van bestaande code/architectuur voor een van deze.

## FTMS (Bluetooth Fitness Machine Service, generieke standaard)

Een open, generieke Bluetooth-standaard voor fitnessapparatuur (indoor bike/rower/treadmill/cross trainer), niet vendor-specifiek. Zou in theorie een breder toepasbare adapterlaag kunnen zijn dan losse vendor-APIs. **Niet geïmplementeerd, niet onderzocht op detailniveau binnen deze sessie.** Aanbevolen als een mogelijk zinvolle, toekomstige, generieke uitbreiding (zou minder afhankelijk zijn van individuele vendor-partnerschappen dan EGYM/Technogym), maar vereist eerst een gerichte, technische haalbaarheidsstudie -- niet gebouwd binnen deze sprint conform sectie 35 ("Bouw alleen softwarefundament als dit veilig, testbaar en passend is... Geen omvangrijke speculatieve implementatie zonder device-validatie").

## Conclusie

Alle onderzochte vendor-uitbreidingen vereisen een externe, menselijke
partnerschapsstap die buiten deze sessie valt. Dit is geen technische
tekortkoming van de software, maar een reëel, extern kenmerk van deze
markt (vendor-API's voor fitnessapparatuur zijn zelden zelfstandig,
zonder partnerschap, toegankelijk).
