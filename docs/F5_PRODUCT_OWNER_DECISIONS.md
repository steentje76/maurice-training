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

## Beslissing 2 — Garmin-integratie ondanks de huidige toegangsbarrière

**Waarom nodig:** MS-F5-05 ontdekte dat Garmin (de provider met de hoogste atleetwaarde qua marktaandeel) momenteel feitelijk ontoegankelijk is: het Garmin Connect Developer Program is partner-goedkeuring-only, en nieuwe aanmeldingen liggen sinds 2026 gerapporteerd stil (het publieke aanvraagformulier is verwijderd, geen heropeningsdatum bekend).

**Opties:**
1. **Wachten** tot Garmin de aanmeldingen heropent, geen actie nu.
2. **Een third-party aggregator** (bv. Terra, Spike -- geen van beide hier aanbevolen of gekozen) gebruiken die al een eigen Garmin-partnerschap heeft, tegen een terugkerende kostprijs.
3. **Prioriteit geven aan Polar/COROS** (beide nu al toegankelijk) en Garmin laten rusten totdat de situatie verandert.

**Impact:** optie 2 introduceert een terugkerende, commerciële kostenpost en een extra provenance-tussenlaag (TK zou "aggregator" als bron moeten vastleggen). Optie 1/3 kosten niets maar vertragen Garmin-toegang onbepaald.

**Aanbevolen, omkeerbare default:** optie 3 (Polar/COROS eerst, Garmin later heroverwegen) -- geen kosten, geen commitment, technisch onafhankelijk van de Garmin-beslissing.

**Kan het werk doorgaan zonder deze beslissing?** JA -- Polar/COROS-integratie (indien ooit gebouwd) is hier niet van afhankelijk.
