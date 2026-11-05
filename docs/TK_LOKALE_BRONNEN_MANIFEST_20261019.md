# Bronmanifest lokale gegevens (localinventory.v1)

Gegenereerd uit `core/localInventory.js` met `node tools/inventory-manifest.js`. Niet met de hand bewerken.

Elke opslagsleutel of database die niet in dit manifest staat, telt bij de inventarisatie als `HIST_ONBEKENDE_BRON` en blokkeert. `fLocalInventory` (I1) controleert dat elke sleutel die `index.html` schrijft, leest of wist hier staat.

## Categorieën

| Categorie | Betekenis |
|---|---|
| duurzaam | gebruikersgegevens; blokkeert tenzij per record gelijk aan een serverrij (alleen eigen trainingen) |
| concept | lopend of onafgemaakt; staat per definitie niet (volledig) op de server; blokkeert |
| wachtrij | nog niet verstuurde writes; blokkeert |
| serverkopie | afgeleid van serverdata; herstel na de-installatie niet per veld bewezen; blokkeert |
| voorkeur | persoonsgebonden keuze, niet op de server; blokkeert (verlies vraagt een PO-besluit) |
| legacy | oude opslagstructuur; blokkeert |
| toestel | toestelinstelling zonder persoonsgegevens; blokkeert niet |
| systeem | techniek zonder gebruikersgegevens; blokkeert niet |

## Bronnen

| Id | Opslag | Sleutel / database | Categorie | Vorm | Recordidentiteit | Eigenaar | Versie | Server-verifieerbaar | Afhankelijk van | Omschrijving |
|---|---|---|---|---|---|---|---|---|---|---|
| eigen_trainingen | localStorage | `tk_trainings` | duurzaam | array: record per element | element.id (anders positie: gemarkeerd geen_id) | tk_cache_owner_uid (laatste toesteleigenaar) | v2 (exercises + exercise_targets, metadata) | ja: custom_trainings + custom_training_exercises (identiteit + eigenaar + inhoud → HIST_GEKOPPELD) | `tk_trainings_onbevestigd` | Eigen trainingen (handmatig en Workout Builder) |
| trainingen_onbevestigd | localStorage | `tk_trainings_onbevestigd` | duurzaam | array van id's | id-waarde | tk_cache_owner_uid (laatste toesteleigenaar) | v1 | nee | `tk_trainings` | Markering "alleen op dit toestel" per eigen training |
| actieve_training | localStorage | `tk_draft_training` | concept | één record | opslagsleutel | tk_cache_owner_uid (laatste toesteleigenaar) | v1 {t, sessionLog, sessionExtra, ts, instanceId} | nee |  | Lopende krachttraining (concept, sets nog niet afgerond) |
| begeleide_training_actief | localStorage | `tk_gw_active` | concept | één record | opslagsleutel | tk_cache_owner_uid (laatste toesteleigenaar) | v1 | nee |  | Lopende of niet-opgeslagen Guided Workout |
| begeleide_training_log | localStorage | `tk_gw_log` | duurzaam | array: record per element | positie in de lijst (instabiel) | tk_cache_owner_uid (laatste toesteleigenaar) | v1 (max. 50) | nee |  | Samenvattingen van afgeronde Guided Workouts (alleen lokaal) |
| begeleide_training_historie | localStorage | `tk_gw_hist` | duurzaam | map: record per sleutel | sleutel in de map | tk_cache_owner_uid (laatste toesteleigenaar) | v1 | nee |  | Laatste gewicht/herhalingen per oefening in Guided Workouts (alleen lokaal) |
| hyrox_actief | localStorage | `tk_hyrox_active` | concept | één record | opslagsleutel | tk_cache_owner_uid (laatste toesteleigenaar) | v1 | nee |  | Lopende HYROX/triathlon-race |
| hardloop_uitvoering | localStorage | `tk_running_execution_v1_*` | concept | één record | opslagsleutel | uid in de sleutel | v1 {state, config} | nee |  | Lopende hardlooptraining (per gebruiker) |
| fiets_uitvoering | localStorage | `tk_cycling_execution_v1_*` | concept | één record | opslagsleutel | uid in de sleutel | v1 {state, config} | nee |  | Lopende fietstraining (per gebruiker) |
| zwem_uitvoering | localStorage | `tk_swimming_execution_v1_*` | concept | één record | opslagsleutel | uid in de sleutel | v1 {state, config} | nee |  | Lopende zwemtraining (per gebruiker) |
| hardloop_uitvoering_legacy | localStorage | `tk_running_execution_v1` | legacy | één record | opslagsleutel | onbekend (geen eigenaar in de structuur) | v0 (globale sleutel zonder gebruiker) | nee |  | Oude, niet-gebruikersgebonden hardloopuitvoering |
| builder_concept | localStorage | `tk_wb_draft` | concept | één record | opslagsleutel | tk_cache_owner_uid (laatste toesteleigenaar) | v1 {sel, plan} | nee |  | Workout Builder-concept |
| builder_opgeslagen_legacy | localStorage | `tk_wb_saved` | legacy | array: record per element | element.id (anders positie: gemarkeerd geen_id) | tk_cache_owner_uid (laatste toesteleigenaar) | v0 (vóór Werkblok B; gemigreerd naar tk_trainings als tk_wb_migrated_v1 staat) | nee | `tk_wb_migrated_v1`, `tk_trainings` | Oude, alleen-lokale Builder-trainingen |
| laatste_training_legacy | localStorage | `tk_last_training` | legacy | één waarde | opslagsleutel | tk_cache_owner_uid (laatste toesteleigenaar) | v0 (geen schrijvers meer) | nee |  | Oude laatste-trainingsmarkering |
| eenrm_cache_legacy | localStorage | `tk_1rm_*` | legacy | één waarde | opslagsleutel | tk_cache_owner_uid (laatste toesteleigenaar) | v0 (geen schrijvers meer) | nee |  | Oude 1RM-cache per oefening |
| namespace_legacy | localStorage | `maurice_*` | legacy | één waarde | opslagsleutel | onbekend (geen eigenaar in de structuur) | v0 (vóór namespace-migratie tk_ns_migrated) | nee |  | Sleutels uit de oude naamruimte (migratie niet voltooid) |
| atleetprofiel | localStorage | `tk_atleet` | serverkopie | één record | opslagsleutel | tk_cache_owner_uid (laatste toesteleigenaar) | v1 | nee |  | Kopie van het atleetprofiel (herstel van de server niet per veld bewezen) |
| supplement_koppelingen | localStorage | `tk_supp_defs` | serverkopie | map: record per sleutel | sleutel in de map | tk_cache_owner_uid (laatste toesteleigenaar) | v1 | nee |  | Koppeling supplementnaam → serverdefinitie |
| voeding_shells | localStorage | `tk_voeding_shells` | serverkopie | map: record per sleutel | sleutel in de map | tk_cache_owner_uid (laatste toesteleigenaar) | v1 | nee |  | Koppeling voedingsproduct → serverrij |
| vaste_training_meta | localStorage | `tk_vt_meta` | voorkeur | map: record per sleutel | sleutel in de map | tk_cache_owner_uid (laatste toesteleigenaar) | v1 | nee |  | Weergave-instellingen per vaste training |
| actieve_sport | localStorage | `tk_active_sport` | voorkeur | één waarde | opslagsleutel | tk_cache_owner_uid (laatste toesteleigenaar) | v1 | nee |  | Gekozen sport |
| roeiers | localStorage | `tk_rowers` | voorkeur | één record | opslagsleutel | tk_cache_owner_uid (laatste toesteleigenaar) | v1 | nee |  | Bekende roeimachines |
| roeier | localStorage | `tk_rower` | voorkeur | één waarde | opslagsleutel | tk_cache_owner_uid (laatste toesteleigenaar) | v1 | nee |  | Gekozen roeimachine |
| halterschijven | localStorage | `tk_plates` | voorkeur | één record | opslagsleutel | tk_cache_owner_uid (laatste toesteleigenaar) | v1 | nee |  | Beschikbare halterschijven |
| rusttijd | localStorage | `tk_rest_default` | voorkeur | één waarde | opslagsleutel | tk_cache_owner_uid (laatste toesteleigenaar) | v1 | nee |  | Standaard rusttijd |
| uitrustinggeheugen | localStorage | `tk_eqmem` | voorkeur | map: record per sleutel | sleutel in de map | tk_cache_owner_uid (laatste toesteleigenaar) | v1 | nee |  | Laatst gekozen uitrusting per oefening |
| bibliotheek_favorieten | localStorage | `tk_lib_favs` | voorkeur | één record | opslagsleutel | tk_cache_owner_uid (laatste toesteleigenaar) | v1 | nee |  | Favoriete oefeningen in de bibliotheek |
| bibliotheek_recent | localStorage | `tk_lib_recent` | voorkeur | één record | opslagsleutel | tk_cache_owner_uid (laatste toesteleigenaar) | v1 | nee |  | Recent bekeken oefeningen |
| bibliotheek_zoekopdrachten | localStorage | `tk_lib_recentq` | voorkeur | één record | opslagsleutel | tk_cache_owner_uid (laatste toesteleigenaar) | v1 | nee |  | Recente zoekopdrachten |
| builder_favorieten | localStorage | `tk_wb_favs` | voorkeur | map: record per sleutel | sleutel in de map | tk_cache_owner_uid (laatste toesteleigenaar) | v1 | nee |  | Favoriete Builder-trainingen |
| coach_stijl | localStorage | `tk_coach_style` | voorkeur | één waarde | opslagsleutel | tk_cache_owner_uid (laatste toesteleigenaar) | v1 | nee |  | Coachvoorkeur stijl |
| coach_stem | localStorage | `tk_coach_voice` | voorkeur | één waarde | opslagsleutel | tk_cache_owner_uid (laatste toesteleigenaar) | v1 | nee |  | Coachvoorkeur stem |
| coach_detail | localStorage | `tk_coach_detail` | voorkeur | één waarde | opslagsleutel | tk_cache_owner_uid (laatste toesteleigenaar) | v1 | nee |  | Coachvoorkeur detailniveau |
| machines_bikeerg | localStorage | `bikeerg_machines` | voorkeur | één record | opslagsleutel | tk_cache_owner_uid (laatste toesteleigenaar) | v1 | nee |  | Bekende BikeErgs |
| machines_skierg | localStorage | `skierg_machines` | voorkeur | één record | opslagsleutel | tk_cache_owner_uid (laatste toesteleigenaar) | v1 | nee |  | Bekende SkiErgs |
| machines_assault | localStorage | `assault_machines` | voorkeur | één record | opslagsleutel | tk_cache_owner_uid (laatste toesteleigenaar) | v1 | nee |  | Bekende Assault-machines |
| machinekeuze | localStorage | `sel_*` | voorkeur | één waarde | opslagsleutel | tk_cache_owner_uid (laatste toesteleigenaar) | v1 | nee |  | Laatst gekozen machine per cardiotype |
| onboarding_klaar | localStorage | `tk_onboarding_done` | voorkeur | één waarde | opslagsleutel | tk_cache_owner_uid (laatste toesteleigenaar) | v1 | nee |  | Intake afgerond (afgeleid van atleet_profiel) |
| toestemming_ai | localStorage | `tk_ai_consent` | voorkeur | één waarde | opslagsleutel | tk_cache_owner_uid (laatste toesteleigenaar) | v1 | nee |  | Toestemming AI Coach |
| toestemming_ai_kennis | localStorage | `tk_ai_consent_knowledge` | voorkeur | één waarde | opslagsleutel | tk_cache_owner_uid (laatste toesteleigenaar) | v1 | nee |  | Toestemming kennis-AI |
| toestemming_telemetrie | localStorage | `tk_product_telemetry_consent` | voorkeur | één waarde | opslagsleutel | tk_cache_owner_uid (laatste toesteleigenaar) | v1 | nee |  | Toestemming producttelemetrie |
| toestemming_weer | localStorage | `tk_weather_optin` | voorkeur | één waarde | opslagsleutel | tk_cache_owner_uid (laatste toesteleigenaar) | v1 | nee |  | Toestemming weer |
| toestemming_cyclus | localStorage | `tk_cyclus_optin` | voorkeur | één waarde | opslagsleutel | tk_cache_owner_uid (laatste toesteleigenaar) | v1 | nee |  | Toestemming cycluscontext |
| thema | localStorage | `tk_theme` | toestel | één waarde | opslagsleutel | n.v.t. | v1 | n.v.t. |  | Weergavethema van het toestel |
| geluid | localStorage | `tk_sound_enabled` | toestel | één waarde | opslagsleutel | n.v.t. | v1 | n.v.t. |  | Geluid aan/uit |
| trillen | localStorage | `tk_haptics_enabled` | toestel | één waarde | opslagsleutel | n.v.t. | v1 | n.v.t. |  | Trillen aan/uit |
| dynamische_rust | localStorage | `tk_dynrest_enabled` | toestel | één waarde | opslagsleutel | n.v.t. | v1 | n.v.t. |  | Dynamische rust aan/uit |
| scherm_aan | localStorage | `tk_wakelock_enabled` | toestel | één waarde | opslagsleutel | n.v.t. | v1 | n.v.t. |  | Scherm aan houden |
| meldingen | localStorage | `tk_notif_*` | toestel | één waarde | opslagsleutel | n.v.t. | v1 | n.v.t. |  | Meldingsvoorkeuren van het toestel |
| sessie | localStorage | `tk_auth_session` | systeem | alleen aanwezigheid | opslagsleutel | n.v.t. | v1 | n.v.t. |  | Inlogsessie (inhoud wordt nooit gelezen; opnieuw inloggen herstelt) |
| cache_eigenaar | localStorage | `tk_cache_owner_uid` | systeem | één waarde | opslagsleutel | n.v.t. | v1 | n.v.t. |  | Eigenaar van de persoonlijke caches |
| namespace_migratie | localStorage | `tk_ns_migrated` | systeem | één waarde | opslagsleutel | n.v.t. | v1 | n.v.t. |  | Markering namespace-migratie |
| builder_migratie | localStorage | `tk_wb_migrated_v1` | systeem | één waarde | opslagsleutel | n.v.t. | v1 | n.v.t. |  | Markering Builder-migratie |
| register_defect | localStorage | `tk_verify_register_defect` | systeem | één waarde | opslagsleutel | n.v.t. | v1 | n.v.t. |  | Opslagfout in het controleregister |
| organisatiecontext | sessionStorage | `tk_active_org_pref_v1` | toestel | één waarde | opslagsleutel | n.v.t. | v1 | n.v.t. |  | Gekozen organisatie in deze sessie |
| offline_wachtrij | indexedDB | `maurice_offline` | wachtrij | record per item | item-id (autoIncrement) | owner_uid per item | v1 (store queue) | nee |  | Nog niet verstuurde writes; eigenaar per item (owner_uid) |
| controleregister | indexedDB | `tk_verificatie` | systeem | database | opslagsleutel | n.v.t. | v1 (store register) | n.v.t. |  | Verificatieregister en deze inventaris |

## Uitleesbaarheid en datakwaliteit

- JSON-bronnen die niet te parsen zijn of een onverwachte structuur hebben → `HIST_ONLEESBAAR`; de inventaris is dan onvolledig.
- Een onleesbare localStorage, sessionStorage of offline-wachtrij, of een ontbrekende `indexedDB.databases()` → onvolledig.
- Array-elementen zonder `id` krijgen een positie-identiteit en de reden `geen_id`.
- De inlogsessie (`tk_auth_session`) wordt nooit uitgelezen; alleen de aanwezigheid telt.
