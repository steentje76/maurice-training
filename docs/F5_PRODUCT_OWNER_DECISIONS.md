# F5_PRODUCT_OWNER_DECISIONS.md — Trainingskompas

Beslissingen die een expliciete Product Owner-keuze vereisen, verzameld tijdens de F5-fase. Geen enkele hiervan blokkeert het onafhankelijk voortzetten van de overige F5-mastersprints.

## Beslissing 1 — Native Android Health Connect-SDK-integratie naast de bestaande Google Health API

**Waarom nodig:** MS-F5-03 ontdekte dat Trainingskompas uitsluitend de Google Health API (cloud, OAuth) gebruikt, geen native Android Health Connect-SDK. Beide zijn legitieme, maar architecturaal fundamenteel verschillende routes naar wearable-gezondheidsdata.

**Opties:**
1. Behoud de huidige, cloud-gebaseerde Google Health API-aanpak (geen wijziging). Werkt cross-platform, vereist geen native SDK-onderhoud.
2. Bouw daarnaast een native Android Health Connect-SDK-integratie. Voordeel: on-device aggregatiepunt, potentieel bereik van meerdere providers via één integratie. Nadeel: Android-only, native SDK-onderhoud, introduceert het cross-provider-deduplicatievraagstuk.
3. Beide naast elkaar, met Health Connect als primair pad waar beschikbaar en de Google Health API als fallback.

**Impact:** optie 2/3 is een aanzienlijke, nieuwe architectuurinvestering (native SDK, nieuwe permissieflows, cross-provider-dedup-logica).

**Aanbevolen, omkeerbare default indien gewenst:** optie 1 (geen wijziging) totdat een concrete productbehoefte dit rechtvaardigt.

**Kan het werk doorgaan zonder deze beslissing?** JA -- de overige F5-mastersprints (MS-F5-04 t/m 06) zijn hier niet van afhankelijk.
