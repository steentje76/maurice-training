# MoveKit Media Scale Gate — pre-Batch 002

**Status:** IN PROGRESS — architectuurgate, geen media-import.

## Waarom deze gate nu
De algemene roadmap-reconciliatie laat geen onbehandelde P1-runtimebouwbug over in MS-F3-04 of MS-F4-01. MS-F5-02 resteert vooral fysieke Concept2-validatie en is geparkeerd tot een volgende real-device ronde. De eerstvolgende concrete productblokkade die zonder hardware kan worden opgelost is daarom de reeds vastgelegde **VERPLICHTE GATE VÓÓR BATCH 002** voor de Exercise Library.

## Bewezen repository-baseline
- Canonieke Exercise Catalog: **226** oefeningen.
- MoveKit-bron: **412** unieke oefeningen; circa **186** nog niet geïmporteerd.
- Huidige videobibliotheek: circa **437 MB** voor 206 bestaande video's.
- De resterende MoveKit-video's voegen volgens de bestaande projectinventaris naar schatting circa **630 MB** toe; orde van grootte volledige 412-library circa **1,2 GB**.
- Android bundelt `videos/` bewust niet; `scripts/build-www.mjs` houdt de base app klein.
- Web/PWA gebruikt on-demand video met een aparte `tk-videos-v1` cache en **250 MB LRU**.
- `ExerciseAssetProvider` en `MediaUrlResolver` abstraheren provider en media-origin al; een opslagmigratie vereist dus geen nieuwe Exercise Catalog-identiteit.
- Basale Android-weergave gebruikt de door `MediaUrlResolver` geleverde media-URL rechtstreeks en is niet afhankelijk van service-worker-interceptie.
- Posterdekking is momenteel 206/226; ontbrekende posters falen closed.
- Batch 002 blijft geblokkeerd totdat deze gate een expliciete schaalkeuze vastlegt.

## Te vergelijken opties
1. Normale Git + Netlify deploy-assets.
2. Git LFS.
3. Publieke object storage (waaronder Supabase Storage als concrete kandidaat).
4. Eventueel gescheiden media-CDN/object-origin achter de bestaande `MediaUrlResolver`.

## Verplichte beoordelingsassen
- repo- en Git-history-groei;
- CI/build/deploy-impact;
- bandbreedte en actuele kosten;
- caching/CDN-gedrag;
- web/PWA en 250 MB LRU;
- Android/Capacitor;
- migratie van de reeds gecommitte video's;
- licentie/toegangsmodel voor MoveKit-media;
- schaal naar 412, 1.000 en 10.000 oefeningen;
- rollback/fail-closed gedrag.

## Harde grenzen
- Deze gate importeert **geen** Batch-002-oefeningen of media.
- Geen providerlock in de Exercise Catalog.
- Geen wijziging van intelligence/evidence om opslag te vereenvoudigen.
- Geen publieke media-publicatie voordat het licentie/toegangsmodel dat toestaat.
- Kostenclaims worden pas ingevuld na actuele broncontrole.

## Voorlopige technische observatie
De bestaande `ExerciseAssetProvider` + `MediaUrlResolver`-grens maakt object storage technisch passend zonder catalogusmigratie. Dit is nog **geen definitieve keuze**: kosten, delivery-model, licentie en migratie moeten eerst worden afgerond.

## Acceptance gate
Een expliciete, onderbouwde opslag/delivery-keuze met migratieplan en schaaltoets; pas daarna mag MoveKit Batch 002 worden vrijgegeven.
