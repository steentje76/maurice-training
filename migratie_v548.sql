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
-- vocabulaire uit DeviceCore/tkRenderConcept2Actual ('concept2_measured'/
-- 'concept2_derived') waar toepasselijk, aangevuld met 'manual' voor
-- directe gebruikersinvoer (die GEEN devicemeting bewijst -- zie de
-- correctie hieronder bij de CHECK-constraint) en 'imported_unknown'/
-- 'unknown' voor overige, niet-bewezen herkomst.
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

-- Toegestane waarden (of NULL voor onbekende/historische herkomst) --
-- voorkomt dat een toekomstige, andere feature per ongeluk een
-- ongedocumenteerde waarde in deze kolom zet.
--
-- GAP-P2-013 CORRECTIE (Hard Gate-terugkoppeling op de eerste versie van
-- deze migratie): 'concept2_measured' mag NOOIT gezet worden door directe
-- gebruikersinvoer -- dat bewijst geen devicemeting (de gebruiker kan het
-- getal van het scherm hebben afgelezen, onthouden, geschat, of uit een
-- andere bron hebben). Een daadwerkelijk bevestigd, gepersisteerd
-- PM5/native/device-datapad bestaat op dit moment NIET reachable in de
-- codebase (geverifieerd: tkRenderConcept2Actual()/DeviceCore.
-- resolveConcept2Watts() worden nergens aangeroepen vanuit een save-flow
-- -- dode code). 'concept2_measured' blijft daarom in de constraint
-- staan als toekomstige, nog niet gebruikte state (voor wanneer een
-- echte device-datapad ooit gebouwd wordt), maar wordt door DEZE fix
-- nergens daadwerkelijk gezet. De handmatige invoerflow zet 'manual'.
ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_watt_source_check
  CHECK (watt_source IS NULL OR watt_source IN ('concept2_measured', 'concept2_derived', 'manual', 'imported_unknown', 'unknown'));

COMMENT ON COLUMN public.sessions.watt_source IS
  'Herkomst van de watt-waarde voor dit apparaat (RowErg/BikeErg/SkiErg). concept2_derived: automatisch berekend uit de split via CALC-END-002 (de Concept2-vermogensformule). manual: de gebruiker heeft het getal rechtstreeks in het watt-veld getypt (bewijst GEEN devicemeting -- kan afgelezen, onthouden, geschat of elders vandaan zijn). concept2_measured: gereserveerd voor een daadwerkelijk bevestigd PM5/native/device-datapad -- op dit moment nergens reachable gezet (geen bestaande, gepersisteerde device-meetflow), maar behouden voor een toekomstige, hier niet gebouwde uitbreiding. imported_unknown: via import ontvangen, herkomst niet bewezen. unknown/NULL: geen bekende herkomst (o.a. alle rijen van vóór deze kolom bestond -- bewust niet geraden/gebackfilled). GAP-P2-013.';

-- RLS: geen wijziging nodig. Gewone kolom binnen de bestaande sessions-rij,
-- de bestaande owner-policy (eigen_data_alleen, user_id = auth.uid())
-- dekt deze kolom automatisch mee -- exact zoals bij migratie_v547.sql
-- (edit_revision) al bevestigd.
