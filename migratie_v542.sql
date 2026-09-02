-- migratie_v542.sql
-- Long-run Benchmark 9+ sprint: HRV metric-type provenance (B9-H4 P2,
-- veilig oplosbaar zonder real-provider-evidence, conform sectie 23-B
-- van de long-run-opdracht).
--
-- B9-H4 stelde vast: Google Health se HRV-veld kan zowel RMSSD
-- (Garmin/Fitbit/Oura) als SDNN (Apple) representeren, afhankelijk van
-- het onderliggende apparaat -- de bestaande code nam stilzwijgend
-- RMSSD aan zonder dit vast te leggen of te verifiëren. Een live
-- API-verificatie van de exacte dataSource-metadata is niet mogelijk
-- binnen deze sessie (B9-H3C: 0 credentials). Maar de ONZEKERHEID zelf
-- kan wel veilig, expliciet worden vastgelegd -- conform het
-- projectbrede principe "missing != zero"/expliciete confidence
-- i.p.v. een stille aanname.
--
-- Nieuwe kolom, default 'unknown' voor ALLE bestaande en toekomstige
-- rijen (eerlijk: we weten het metric-type vandaag niet, noch voor
-- historische, noch voor nieuwe metingen, totdat een toekomstige
-- sessie de Google Health dataSource-respons live kan inspecteren).
alter table public.hrv_log
  add column if not exists hrv_metric_type text default 'unknown'
  check (hrv_metric_type in ('rmssd', 'sdnn', 'unknown'));

comment on column public.hrv_log.hrv_metric_type is
  'B9-H4/long-run-sprint: het onderliggende HRV-berekeningstype (RMSSD vs SDNN). '
  'Google Health se average_heart_rate_variability_milliseconds-veld kan beide '
  'representeren afhankelijk van het synchroniserende apparaat (Apple=SDNN, '
  'Garmin/Fitbit/Oura=RMSSD), zonder dit zelf te specificeren. Default ''unknown'' '
  'totdat een toekomstige sessie de live Google Health dataSource-metadata kan '
  'verifiëren (vereist real-API-toegang, extern geblokkeerd sinds B9-H3C). '
  'RMSSD/SDNN-waarden zijn NIET direct vergelijkbaar -- een baseline mag deze '
  'nooit blind mengen (zie docs/B9_H4_RECOVERY_METRIC_CONTRACTS.md).';
