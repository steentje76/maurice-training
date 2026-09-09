-- migratie_v556.sql
-- SOCIAL / SAMEN MASTER SPRINT — S7 Themes & Personalization.
--
-- Expliciete Product Owner-scope (sectie 28), 0% aanwezig in productie
-- (geverifieerd: geen theme-tabel, geen ThemeCore, geen UI). Minimale
-- architectuur: THEME CONFIGURATION -> APPROVED TOKENS -> SOCIAL
-- PRESENTATION (sectie 29). Geen user-supplied CSS/HTML/JS -- uitsluitend
-- een allowlist van vooraf goedgekeurde preset-ID's, afgedwongen op
-- databaseniveau via CHECK (dezelfde bescherming als elders in dit project:
-- theme-data is DATA, geen code).
--
-- Scope bewust beperkt tot de Social-laag (sectie 30/34): dit raakt
-- uitsluitend social_profiles (het eigen profiel/de eigen presentatie),
-- NIET de Training Execution UI of enige andere kern-workflow. Bestaande
-- RLS (social_profiles_eigen_schrijven, ALL, user_id=auth.uid()) dekt het
-- schrijven van deze kolom al -- geen nieuwe policy nodig.
--
-- Presets verwijzen uitsluitend naar AL BESTAANDE, in productie gebruikte
-- design-tokens (--df-g/--df-b/--df-a, de "domain feedback"-kleuren die al
-- hun eigen, geverifieerde light/dark-mode-varianten hebben) -- geen nieuwe
-- kleurwaarde wordt hier geintroduceerd (accessibility-hard-gate, sectie 37).

ALTER TABLE public.social_profiles
  ADD COLUMN theme_id text NULL;

ALTER TABLE public.social_profiles
  ADD CONSTRAINT social_profiles_theme_id_check
  CHECK (theme_id IS NULL OR theme_id IN ('default','sportief_groen','sportief_blauw','energiek_amber'));

COMMENT ON COLUMN public.social_profiles.theme_id IS
  'Social/Samen Master Sprint S7: cosmetische, config-gedreven personalisatie van de eigen Social-profielpresentatie. NULL/onbekende waarde valt altijd terug op het standaardthema (deterministische fallback, sectie 39). Uitsluitend een allowlist-ID -- nooit CSS/HTML/kleurwaarden vanuit de client. Geen enkele invloed op feed-ranking, achievements, leaderboard-score of Coach-aanbevelingen (sectie 36, no pay-to-win).';
