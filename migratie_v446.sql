-- ══════════════════════════════════════════════════════════════════════════════
-- migratie_v446.sql — Fase 2: levenscyclus van training_instances herstellen
-- Herziene versie (19 augustus 2026) — zie CORRECTIE onderaan.
--
-- AANLEIDING
-- completeTrainingInstance() bestond sinds Werkblok A maar werd nergens aangeroepen.
-- Daardoor bleef elke via Preview of Guided gestarte training voor altijd op status
-- 'active' staan. Stand 19 augustus 2026: 139 rijen, allemaal 'active', waarvan er
-- 11 wel en 128 geen gekoppelde sessie hebben. De code-oorzaak is verholpen in
-- v4.47.0; deze migratie ruimt de historische rijen op.
--
-- TOEGESTANE STATUSWAARDEN
-- training_instances_status_check staat exact drie waarden toe:
--     'active' · 'completed' · 'aborted'
-- Er wordt hier dus GEEN nieuwe statuswaarde geintroduceerd en de constraint wordt
-- niet gewijzigd; 'aborted' is de bestaande term voor een niet-uitgevoerde training.
--
-- NIET-DESTRUCTIEF
-- Er wordt NIETS verwijderd. Rijen zonder sessie krijgen 'aborted'; hun snapshot
-- (inclusief de destijds geldende decision_rules) blijft volledig bewaard — juist dat
-- is het materiaal voor toekomstige plan-versus-uitvoering-analyse. Rijen MET een
-- sessie krijgen 'completed' met een completed_at afgeleid uit de laatste sessie.
--
-- ALLES-OF-NIETS
-- Stap 1 en 2 staan in één transactie. Slaagt er één niet, dan wordt de hele migratie
-- teruggerold en blijft de database precies zoals hij was.
--
-- HANDMATIG UITVOEREN in de Supabase SQL-editor. Draai stap 0 apart en bewaar de
-- uitkomst voordat je het transactieblok draait.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── STAP 0 — vóórmeting + controle van de toegestane statuswaarden ────────────
-- Draai dit blok APART (selecteer alleen deze twee queries) en bewaar de uitkomst.
select pg_get_constraintdef(con.oid) as toegestane_statuswaarden
from   pg_constraint con
join   pg_class rel on rel.oid = con.conrelid
where  rel.relname = 'training_instances'
  and  con.conname = 'training_instances_status_check';

select status,
       count(*)                                                              as rijen,
       count(*) filter (where exists (select 1 from sessions s
                                      where s.training_instance_id = ti.id)) as met_sessie,
       count(completed_at)                                                   as met_completed_at
from   training_instances ti
group  by status
order  by status;

-- ── STAP 1 + 2 — het transactieblok (selecteer en draai dit in één keer) ──────
begin;

  -- 1. Instances MET sessies afronden.
  --    completed_at = het laatste created_at van de gekoppelde sessies, niet now(),
  --    zodat de tijdlijn historisch klopt in plaats van "vandaag afgerond".
  update training_instances ti
  set    status       = 'completed',
         completed_at = coalesce(ti.completed_at, x.laatste)
  from  (select s.training_instance_id as id, max(s.created_at) as laatste
         from   sessions s
         where  s.training_instance_id is not null
         group  by s.training_instance_id) x
  where  ti.id = x.id
    and  ti.status = 'active';

  -- 2. Instances ZONDER sessies markeren als afgebroken.
  --    'aborted' i.p.v. 'completed': er is nooit iets uitgevoerd. completed_at blijft
  --    bewust leeg — een training die niet is gedaan heeft geen afrondingsmoment.
  update training_instances ti
  set    status = 'aborted'
  where  ti.status = 'active'
    and  not exists (select 1 from sessions s where s.training_instance_id = ti.id);

commit;

-- ── STAP 3 — nameting ─────────────────────────────────────────────────────────
-- Verwacht: 'completed' met 11 rijen (alle met_sessie), 'aborted' met 128 rijen
-- (geen met_sessie), en GEEN rij meer met status 'active'.
select status,
       count(*)                                                              as rijen,
       count(*) filter (where exists (select 1 from sessions s
                                      where s.training_instance_id = ti.id)) as met_sessie,
       count(completed_at)                                                   as met_completed_at
from   training_instances ti
group  by status
order  by status;

-- ══════════════════════════════════════════════════════════════════════════════
-- ROLLBACK (alleen nodig ná een geslaagde commit, als je alsnog terug wilt)
--   update training_instances set status='active', completed_at=null
--   where status in ('completed','aborted');
-- Let op: dit zet OOK rijen terug die door de nieuwe code correct zijn afgerond.
-- Gebruik daarom liever de vóórmeting uit stap 0 om gericht te herstellen.
--
-- CORRECTIE 19 augustus 2026
-- De eerste versie van deze migratie gebruikte de statuswaarde 'abandoned'. Die
-- bestaat niet: training_instances_status_check staat alleen 'active', 'completed'
-- en 'aborted' toe. Stap 2 faalde daardoor met 23514, waarna de hele migratie
-- terugrolde — er is niets half uitgevoerd. Oorzaak: bij het schrijven zijn wel de
-- kolomdefinities opgevraagd maar niet de constraints. Stap 0 controleert nu eerst
-- welke waarden zijn toegestaan.
-- ══════════════════════════════════════════════════════════════════════════════
