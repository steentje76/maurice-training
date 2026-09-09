-- migratie_v548.sql
-- GAP-P2-013 — Provenance-onderscheid device-gemeten vs. split-afgeleid vermogen.
--
-- CONTEXT: audit toonde empirisch aan dat sessions.watt zowel device-gemeten
-- (rechtstreeks door de gebruiker van het scherm van de erg afgelezen en
-- ingetypt) als split-afgeleide (CALC-END-002, Concept2-formule) waarden
-- kan bevatten, zonder enige onderscheidende metadata -- en dat dit
-- downstream PR-/trenddetectie (cardioProgressionMetrics -> ProgressionCore.
-- isNewBest/trendBy) materieel kan beinvloeden. Zie het GAP-P2-013-
-- auditrapport voor de volledige 10-punts-analyse en conclusie A.
--
-- OPLOSSING: hergebruikt bewust de AL BESTAANDE, correct ontworpen
-- vocabulaire uit DeviceCore/tkRenderConcept2Actual
-- ('concept2_measured'/'concept2_derived') in plaats van nieuwe waarden
-- te verzinnen -- consistentie tussen de live-Concept2-BLE-laag en de
-- historische sessions-laag.
--
-- SCOPE VAN DEZE FIX (expliciet, kleinste optie): uitsluitend de kolom +
-- het vullen ervan bij nieuwe/gewijzigde cardio-invoer. GEEN wijziging
-- aan de PR-/trendvergelijkingsalgoritmes zelf (die blijven ongewijzigd
-- 'watts' gebruiken, ongeacht bron) -- dat is een aparte, grotere
-- productbeslissing, hier bewust niet meegenomen. GEEN backfill van
-- bestaande rijen (onmogelijk: de herkomst van reeds gelogde watt-
-- waarden is niet meer te reconstrueren -- expliciet NULL laten is
-- eerlijker dan een geraden waarde invullen).

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS watt_source text NULL;

-- Alleen deze twee waarden zijn toegestaan (of NULL voor onbekende/
-- historische herkomst) -- voorkomt dat een toekomstige, andere feature
-- per ongeluk een derde, ongedocumenteerde waarde in deze kolom zet.
ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_watt_source_check
  CHECK (watt_source IS NULL OR watt_source IN ('concept2_measured', 'concept2_derived'));

COMMENT ON COLUMN public.sessions.watt_source IS
  'Herkomst van de watt-waarde voor dit apparaat (RowErg/BikeErg/SkiErg): concept2_measured (gebruiker heeft het getal rechtstreeks van het scherm van de erg afgelezen en ingetypt) of concept2_derived (automatisch berekend uit de split via CALC-END-002, de Concept2-vermogensformule). NULL voor rijen zonder bekende herkomst (o.a. alle rijen van vóór deze kolom bestond -- bewust niet geraden/gebackfilled). GAP-P2-013.';

-- RLS: geen wijziging nodig. Gewone kolom binnen de bestaande sessions-rij,
-- de bestaande owner-policy (eigen_data_alleen, user_id = auth.uid())
-- dekt deze kolom automatisch mee -- exact zoals bij migratie_v547.sql
-- (edit_revision) al bevestigd.
