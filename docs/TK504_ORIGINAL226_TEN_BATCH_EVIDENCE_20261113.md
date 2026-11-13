# TK504/TK614 — MoveKit 226: batchbewijs en gesloten vrijgavepoort (13 november 2026)

## Feitelijk gevalideerd

Op 13 november zijn 226/226 oorspronkelijke oefeningen (TK-000001 t/m TK-000226) in 10 afzonderlijke geauthenticeerde batches gecontroleerd: 452/452 objecten geslaagd (226 MP4 plus 226 WebP), zonder failures, unable of retries. Bytes: 780.852.020 video + 3.879.362 poster = 784.731.382 bytes. Alle bronrapporten zijn bewust gemarkeerd als BATCH_PASS_NOT_RELEASE_EVIDENCE.

## Onderdeel dat deze branch daadwerkelijk toevoegt

- tools/tk614_original226_ten_batch_evidence.cjs is een offline, fail-closed validator die het naar Git gepinde 226/452-stagingmanifest, de tien originele private auditrapporten, de vaste catalogus-ID-ranges en de SHA-herkomst gecontroleerd combineert.
- De video- en posterbyteaantallen worden per batch ONAFHANKELIJK vanuit het gepinde originele manifest opgeteld. Niet alleen de door het rapport geclaimde verified_bytes worden vertrouwd.
- Iedere rapport-SHA256 wordt vastgelegd, de output bevat geen token, naam, URL of downloadbare video.
- De validator leest geen wachtwoorden, JWT, Storage-inhoud of productiedatabase en creëert geen grants, publicaties, handtekeningen, migraties of deployments. Bij elke afwijking ontstaat geen output.
- Een nieuw bestand wordt exclusief aangemaakt buiten Git: bestaande output wordt niet overschreven.
- De synthetic-only test core/tk614Original226TenBatchEvidence.test.js controleert de geslaagde reeks en bewuste afwijzingen voor ontbrekende batches, foutieve ID's, corrupte bron-hash, verkeerde manifest-byteaantallen, retries, mislukte checks en onterechte vrijgaveclaims.

## Gebruik op DESKTOP-DP6BUNC

Vanuit de root van de feature-worktree, met Node.js en alleen al eerder lokaal gecontroleerde rapporten:

    node tools/tk614_original226_ten_batch_evidence.cjs --reports-dir C:\Steensoft --out C:\Steensoft\TK504-Audit-10Batch-VerifiedV2-20261113.json

Dit is daadwerkelijk uitgevoerd. De gegenereerde private JSON heeft SHA256 8709b0b6a724dc5d9b267ce95f6afa0129f982d1202b1d5be84fdcf17ef3c3dd. Gebruik voor een herhaling een nieuw doelbestand. Upload de private rapporten of mediabestanden niet in Git.

## Wat uitdrukkelijk NIET is vrijgegeven

452/452 batchvalidatie is geen continue full-scope-authenticated live-scan en geen eigenaarsondertekende media-attestatie. In het bestaande production eligible-mechanisme tools/tk614_original226_media_eligibility.cjs is CUTOVER.enabled letterlijk false. De huidige eigenaar-attestatie vereist een aparte echte live-verifier en signature. Een live-batch-samenvatting mag niet stilzwijgend in mode live worden veranderd. Deze code wijzigt noch die signature-/attestatieregels, noch de broker.

De originele 226 hebben op het meetmoment nog 0/226 actieve getypeerde catalogus-FK-bindings en 0/226 publicaties; de latere 356 blijven onveranderd. De volgende stappen vereisen afzonderlijk gecontroleerde getypeerde FK-stage, eigenaar- en DBA-besluiten, signed media-rechten, account grants en een gezamenlijke V1→V2-cutover zonder verlies van bestaande weergave. Het echte browser-/Android-logging- en multiaccounttraject (#603/#614) blijft een releaseblokkade. PR #628 blijft DRAFT en mag niet automatisch worden gemerged.

Het bewijs in deze branch is dus alleen reproducibele, niet-vrijgevende code en testinfrastructuur. Geen live datawrite, release of APK.
