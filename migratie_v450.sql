-- ══════════════════════════════════════════════════════════════════════════════
-- migratie_v450.sql — Gebruiksregistratie en quota voor de AI-coach
--
-- AANLEIDING
-- netlify/functions/coach.js verifieert de JWT en begrenst sinds v4.49.0 het model, het
-- tokenplafond en de omvang van het verzoek. Wat ontbreekt is een grens op het AANTAL
-- aanroepen. Registratie staat open, dus elk zelfgemaakt account kan onbeperkt verzoeken
-- door de ANTHROPIC_API_KEY van de eigenaar duwen. Dat is het enige onbegrensde
-- kostenkanaal in het project.
--
-- WAAROM DIT IN DE DATABASE HOORT EN NIET IN DE FUNCTIE
-- Netlify Functions zijn stateloos en draaien parallel. Een teller in het geheugen van de
-- functie telt dus niets. En een teller die de CLIENT bijhoudt is geen grens maar een
-- suggestie: hij staat in de browser van degene die hem zou moeten respecteren.
--
-- WAAROM ÉÉN FUNCTIE EN NIET LEZEN-DAN-SCHRIJVEN
-- Twee gelijktijdige verzoeken die eerst de stand lezen en daarna verhogen, lezen
-- allebei dezelfde stand en laten allebei door. Bij een quotum is dat precies de race die
-- je niet wilt. ai_usage_registreer() doet de verhoging en de toets in ÉÉN statement, in
-- één transactie; de rij wordt daarbij vergrendeld. Parallelle verzoeken serialiseren
-- daardoor vanzelf.
--
-- WAT DEZE MIGRATIE DOET
--   1. tabel  public.ai_usage        — één rij per gebruiker per dag
--   2. RLS aan ZONDER policies       — default-deny voor anon en authenticated; alleen
--                                      service_role komt erbij, net als bij
--                                      wearable_connections (migratie v328)
--   3. functie ai_usage_registreer() — atomair verhogen + toetsen, geeft het besluit terug
--   4. functie ai_usage_tokens()     — tokens bijschrijven ná het antwoord (best effort)
--
-- Beide functies zijn SECURITY DEFINER MET een vaste search_path, en EXECUTE wordt
-- ingetrokken voor anon en authenticated — dezelfde twee lessen als migratie_v447.
--
-- WELKE PERSOONSGEGEVENS
-- Alleen user_id, datum en tellers. Geen prompts, geen antwoorden, geen inhoud.
--
-- NIET-DESTRUCTIEF
-- Voegt uitsluitend toe. Raakt geen bestaande tabel, kolom, policy of functie.
--
-- ROLLBACK
--   drop function if exists public.ai_usage_tokens(uuid, integer, integer);
--   drop function if exists public.ai_usage_registreer(uuid, integer, integer);
--   drop table if exists public.ai_usage;
-- ══════════════════════════════════════════════════════════════════════════════

-- STAP 1 — de tabel
create table if not exists public.ai_usage (
  user_id     uuid    not null,
  dag         date    not null,
  aanroepen   integer not null default 0,
  tokens_in   bigint  not null default 0,
  tokens_uit  bigint  not null default 0,
  bijgewerkt  timestamptz not null default now(),
  primary key (user_id, dag)
);

comment on table public.ai_usage is
  'Gebruik van de AI-coach per gebruiker per dag. Uitsluitend tellers — geen prompts, geen antwoorden, geen inhoud. Alleen bereikbaar voor service_role; de Netlify-functie coach.js is de enige schrijver.';

-- STAP 2 — dichtzetten. RLS aan zonder enkele policy betekent: anon en authenticated
-- kunnen niets, ook niet lezen. service_role omzeilt RLS en houdt toegang.
alter table public.ai_usage enable row level security;

-- STAP 3 — atomair verhogen en toetsen.
-- Geeft terug: mag dit verzoek door, en wat is de stand ná deze aanroep.
-- De verhoging gebeurt ALTIJD, ook wanneer het quotum al bereikt is: zo telt een
-- afgewezen poging mee en kan een aanvaller niet gratis blijven proberen.
create or replace function public.ai_usage_registreer(
  p_user          uuid,
  p_limiet_dag    integer,
  p_limiet_maand  integer
)
returns table (toegestaan boolean, vandaag integer, maand bigint, reden text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vandaag integer;
  v_maand   bigint;
begin
  if p_user is null then
    return query select false, 0, 0::bigint, 'geen_gebruiker'::text;
    return;
  end if;

  insert into public.ai_usage (user_id, dag, aanroepen, bijgewerkt)
  values (p_user, current_date, 1, now())
  on conflict (user_id, dag) do update
    set aanroepen = public.ai_usage.aanroepen + 1,
        bijgewerkt = now()
  returning public.ai_usage.aanroepen into v_vandaag;

  select coalesce(sum(u.aanroepen), 0) into v_maand
  from public.ai_usage u
  where u.user_id = p_user
    and u.dag >= date_trunc('month', current_date)::date;

  if p_limiet_dag is not null and p_limiet_dag > 0 and v_vandaag > p_limiet_dag then
    return query select false, v_vandaag, v_maand, 'daglimiet'::text;
    return;
  end if;
  if p_limiet_maand is not null and p_limiet_maand > 0 and v_maand > p_limiet_maand then
    return query select false, v_vandaag, v_maand, 'maandlimiet'::text;
    return;
  end if;

  return query select true, v_vandaag, v_maand, 'ok'::text;
end;
$$;

-- STAP 4 — tokens bijschrijven nadat het antwoord binnen is. Best effort: mislukt dit,
-- dan is alleen het tokenoverzicht onvolledig, nooit de toets zelf.
create or replace function public.ai_usage_tokens(
  p_user uuid,
  p_in   integer,
  p_uit  integer
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.ai_usage
     set tokens_in  = tokens_in  + greatest(coalesce(p_in, 0), 0),
         tokens_uit = tokens_uit + greatest(coalesce(p_uit, 0), 0),
         bijgewerkt = now()
   where user_id = p_user and dag = current_date;
$$;

-- STAP 5 — geen van beide functies hoort als RPC bereikbaar te zijn voor een bezoeker of
-- een ingelogde gebruiker. Alleen service_role (de Netlify-functie) roept ze aan.
--
-- LET OP: 'public' MOET in deze lijst staan. PostgreSQL geeft een nieuwe functie standaard
-- EXECUTE aan de pseudorol PUBLIC (iedereen), en rechten zijn additief — alleen anon en
-- authenticated intrekken laat die grant staan, waarna de anon-sleutel uit de app volstaat
-- om via /rest/v1/rpc/ai_usage_registreer de teller van een wíllekeurige gebruiker vol te
-- schrijven en zijn coach de rest van de dag te blokkeren. migratie_v447.sql deed dit al
-- goed; hier stond het aanvankelijk fout. 'public' is de rol, niet het schema.
revoke execute on function public.ai_usage_registreer(uuid, integer, integer) from public, anon, authenticated;
revoke execute on function public.ai_usage_tokens(uuid, integer, integer)     from public, anon, authenticated;
grant  execute on function public.ai_usage_registreer(uuid, integer, integer) to service_role;
grant  execute on function public.ai_usage_tokens(uuid, integer, integer)     to service_role;

-- STAP 6 — verificatie (leest alleen)
select 'tabel' as onderdeel, count(*)::text as aanwezig
  from information_schema.tables
 where table_schema = 'public' and table_name = 'ai_usage'
union all
select 'functies', count(*)::text
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname in ('ai_usage_registreer', 'ai_usage_tokens')
union all
select 'rls_aan', c.relrowsecurity::text
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relname = 'ai_usage'
union all
-- moet TWEE KEER 'f' opleveren: kan anon deze functies aanroepen? Nee.
select 'anon_mag_registreer', has_function_privilege('anon', 'public.ai_usage_registreer(uuid, integer, integer)', 'execute')::text
union all
select 'anon_mag_tokens',     has_function_privilege('anon', 'public.ai_usage_tokens(uuid, integer, integer)', 'execute')::text;
