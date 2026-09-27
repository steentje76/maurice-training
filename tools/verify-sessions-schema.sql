-- READ-ONLY verificatie van het live schema van public.sessions.
-- Draai dit na elke migratie die public.sessions raakt en werk docs/db/sessions.columns.json bij
-- (columns + verifiedThroughMigration). Schrijft niets.
select column_name as name, data_type as type, (is_nullable = 'YES') as nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'sessions'
order by ordinal_position;
