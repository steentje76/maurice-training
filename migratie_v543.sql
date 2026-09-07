-- migratie_v543.sql
-- PR #253 / stap A — anon-grant hardening op public.nutrition_entries.
--
-- AANLEIDING
-- Bij de PR #253-review bleek dat public.nutrition_entries de enige
-- nutrition-tabel is die nog standaard-Supabase-grants voor anon had
-- (INSERT/SELECT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER). Alle overige
-- nutrition-tabellen staan al op anon:NONE. Dit was live in Supabase al
-- gecorrigeerd, maar nooit als versioned migratie vastgelegd -- dit
-- bestand maakt dat reproduceerbaar en herhaalbaar op elke omgeving.
--
-- WAAROM VEILIG
-- Alle vier bestaande policies op nutrition_entries zijn auth.uid()-scoped
-- (nutrition_entries_select_own/insert_own/update_own/delete_own, zie
-- migratie_v536.sql/v537.sql) -- anon kon dus sowieso nooit een rij van
-- een ander zien of wijzigen. Functioneel niet exploiteerbaar; dit sluit
-- alleen de resterende inconsistentie in de dubbele beveiligingslaag
-- (RLS + grants).
--
-- SCOPE (bewust beperkt)
-- - Alleen public.nutrition_entries.
-- - Alleen de anon-rol. Geen enkele authenticated-grant wordt aangeraakt.
-- - Geen nieuwe/gewijzigde policy. Geen schema-wijziging.
--
-- HANDMATIG UITVOEREN in de Supabase SQL-editor. Draai stap 0 apart en
-- bewaar de uitkomst.

-- ── STAP 0 — vóórmeting (apart draaien, uitkomst bewaren) ─────────────────────
select 'anon'::text as rol, priv,
       has_table_privilege('anon', 'public.nutrition_entries', priv) as mag
from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) as priv
union all
select 'authenticated'::text as rol, priv,
       has_table_privilege('authenticated', 'public.nutrition_entries', priv) as mag
from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) as priv
order by 1, 2;

-- ── STAP 1 — het transactieblok ────────────────────────────────────────────
begin;

  -- Idempotent: REVOKE van een privilege dat al ingetrokken is, geeft geen
  -- fout in Postgres. Veilig om herhaald te draaien of op een omgeving waar
  -- dit al (deels) live is gecorrigeerd.
  revoke insert, select, update, delete, truncate, references, trigger
    on public.nutrition_entries from anon;

  -- Expliciet NIET aangeraakt: authenticated-grants, RLS-policies, schema.

commit;

-- ── STAP 2 — nameting ───────────────────────────────────────────────────────
-- Verwacht: alle zeven privileges voor anon = false. Authenticated-rij
-- exact gelijk aan de vóórmeting van stap 0.
select 'anon'::text as rol, priv,
       has_table_privilege('anon', 'public.nutrition_entries', priv) as mag
from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) as priv
union all
select 'authenticated'::text as rol, priv,
       has_table_privilege('authenticated', 'public.nutrition_entries', priv) as mag
from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) as priv
order by 1, 2;

-- ── STAP 3 — rooktest ────────────────────────────────────────────────────────
-- Voer na de migratie een normale, ingelogde voedingsactie uit (bv. een
-- meal-item loggen) en bevestig dat dit ongewijzigd slaagt. Anon-toegang
-- (geen sessie) op nutrition_entries moet met "permission denied" falen.

-- ══════════════════════════════════════════════════════════════════════════
-- ROLLBACK
--   begin;
--     grant insert, select, update, delete, truncate, references, trigger
--       on public.nutrition_entries to anon;
--   commit;
-- ══════════════════════════════════════════════════════════════════════════
