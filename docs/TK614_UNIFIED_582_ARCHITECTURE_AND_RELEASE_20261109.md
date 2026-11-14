# TK614 — Eén MoveKit-trainingsarchitectuur voor 582 oefeningen

**Besluit:** producteigenaar 9 november 2026: oorspronkelijke 226 op dezelfde beveiligde catalogus-, trainingsregistratie- en historiearchitectuur aansluiten als de nieuwere 356. Geen aparte gebruikerstoepassing of tweede session-writer. Media moet ook veilig worden geconsolideerd, maar krijgt een afzonderlijke licentie- en toegangscontrole. Zie issue #614 en #603.

**Releasestatus:** sourceintegratie en code-review zijn gereed als **code-only kandidaat**. Fase-A staging van 226 globale aliassen/bindings is reeds live. Fase B **NIET geactiveerd** (binds `active=false`, `reviewed_at=NULL`). Activering mag alleen na alle formele, cryptografische en echte apparaat-/authacceptatiepoorten.

## Eén functionele keten (alle 582)

1. De oefening komt uitsluitend uit de canonieke MoveKit-catalogus met exact provider-ID en expliciete catalogusprovenance, onafhankelijk van ID-nummer.
2. `tk504VerifySessionBinding` roept de live `tk504_resolve_catalog_fk` aan. Alleen een op de server **actieve én gereviewde** binding wordt vertrouwd. Geen lokale aanname `TK- -> TKC-`, geen persoonlijke FK-shadow, geen fail-open offline-replay.
3. Eén `writeSessionRow` en bestaande session-logroute bewaren dezelfde UUID/idempotency key, setgegevens, notitie, programma-instance en eigenaar; server-RLS en FK/triggerbescherming blijven leidend.
4. Geschiedenis/statistiek gebruiken de brongekwalificeerde ID en geverifieerde `TKC`-FK. De **23 bestaande historische `TK-`-records** blijven strikt gescheiden; niemand wordt naar MoveKit omgeclassificeerd.
5. Video- en posterrechten zijn **nooit** een bijeffect van het vrijgeven van trainingsregistratie. Het eigenaarbesluit voor 226 is `FK_IDENTITY_BINDING_ONLY`, `media_grants=0`, `media_access=NOT_RELEASED`.

**Productcode voor de trainingsketen is hetzelfde voor alle 582.** Het verschil 226 versus 356 wordt uitsluitend door de actieve serverbinding bepaald totdat fase B is vrijgegeven. De eigenaarssleutel en release-ledger zijn governance/uitrolmiddelen, niet een nieuwe app-functionaliteit.

## Onafhankelijk bewezen op 9 november 2026

- Werkelijke Supabase productie: `TK-000001..226` **226/226 technisch aanwezig, inactief/ongereviewd**; `TK-000227..582` **356/356 actief/gereviewd**; geen ontbrekende FK-aliassen.
- Read-only **werkelijke resolver** voor alle 582 bron-ID/provider-slugs onder twee aparte gesimuleerde `authenticated` PostgreSQL-rol/JWT-subjectcontexten: per subject **356/356 correct oplosbaar, 226/226 correct geweigerd en 0/582 verkeerde provider-slugs aanvaard**. Onder beide synthetische contexten waren 0 sessies van anderen zichtbaar. Dit is **geen** echt token-aanmeldings- of Android-schrijf-/herstartbewijs.
- De bestaande echte `index.html`-functiecontracttests `tk614All582SourceWriteContract.test.js` (**7062 assertions**) en `tk614Typed582SessionWriterContract.test.js` (**44 assertions**) laten onder synthetische post-activatiecondities dezelfde writer voor alle 582 zien. Geen live INSERT.
- Reviewer Claude Code beoordeelde exact de bronvergelijking `main..c434544` als **PASS voor alleen code samenvoegen**, met expliciete **BLOCK** voor productieactivatie. Negen onafhankelijke gerichte suites groen (CLI exitcode 0). Eerdere GitHub Quality Gate op c434544 en lokale releasegate waren groen.
- Vijf staged SQL-migraties zijn als SQL-inhoud bewezen byte-gelijk aan hun uitgevoerde versies in de echte Supabase migration ledger. De repositoryversies zijn daarna gesynchroniseerd; deze code-only wijziging mag geen `supabase db push` of `migration repair` activeren.

## Bewuste afzonderlijke mediagap

De **oorspronkelijke 226 hebben nog een oudere videomanifest-/publieke bestandsroute**, terwijl de nieuwere 356 onder de private media-broker vallen. De flags `TK504_PRIVATE_MEDIA_RELEASE=false`, `TK504_NEW_PRIVATE_MEDIA_RELEASE=true` staan reeds in de bestaande broncode. Het verenigen van trainingsregistratie **maakt deze media nog niet gelijk**. De mediawerkzaamheden vormen een afzonderlijke TK504-releasegate:
- verifieer rechten/licentie en identiteiten voor de originele 226 assets;
- plaats assets in private storage met per-gebruiker kortlevende URL's, zonder openbare ruwe MP4's/downloadlinks;
- test videos/posters, expiring signed URLs, twee echte accounts, offline state en opruimen van oude publieke bestanden/cache;
- activeer de private mediaroute alleen bij bewezen 226/226 dekking en rollbackmogelijkheid.

**Geen publicatie via `released_batches`:** deze array en de 1164 mediarecords blijven voor de reeds goedgekeurde 356 onveranderd. De aparte FK-only eigenaarvrijgave voor 226 is geen videogate.

## Resterende fase-B controlepunten (productiedatabase)

- Back-up- en herstelprocedure gecontroleerd door databasebeheerder.
- Werkelijke twee-account **Supabase Auth JWT/PostgREST** en RLS; bewijskoppeling zonder inzage in elkaars sessies.
- Echte Android read-after-write, gedeeltelijke programma-opslag, offline/online herstel en idempotent retry. Tot die tijd wordt **geen nieuwe APK** als gebruikersrelease gepubliceerd; UX wordt eerst met producteigenaar beoordeeld.
- Actuele live fingerprint en één aparte werkelijk door de producteigenaar ondertekende Ed25519 `B_ACTIVATE` met zes complete, brongebonden evidence-gates, ondertekend buiten Git. De lokale public-key-pin is **niet** deze handtekening.
- Alleen DBA-uitvoering van de geaudite transactionele fase-B SQL, met volledig gecontroleerde 226/226 update, 356 bestaande records onveranderd, 23 oudere records behouden, sessiehashes/stats gelijk, rollback-procedure gereed en post-write resolvercontrole.

**Boodschap aan gebruiker:** één trainingsarchitectuur is technisch gerealiseerd; de resterende taak is verificatie en vrijgave van alle 226, plus de apart te realiseren private-mediamigratie. Een code-merge of succesvolle simulatie mag nooit als een live activatie worden gepresenteerd.
