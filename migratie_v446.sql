-- ══════════════════════════════════════════════════════════════════════════════
-- migratie_v446.sql — Fase 2: levenscyclus van training_instances herstellen
--
-- AANLEIDING
-- completeTrainingInstance() bestond sinds Werkblok A maar werd nergens aangeroepen.
-- Daardoor bleef elke via Preview of Guided gestarte training voor altijd op status
-- 'active' staan. Stand op 19 augustus 2026: 139 rijen, allemaal 'active', waarvan
-- 128 zonder ook maar één gekoppelde sessie. De code-oorzaak is verholpen in v4.47.0;
-- deze migratie ruimt de historische rijen op.
--
-- NIET-DESTRUCTIEF
-- Er wordt NIETS verwijderd. Rijen zonder sessie krijgen status 'abandoned' zodat ze
-- niet langer als lopende training gelden, maar hun snapshot (inclusief de destijds
-- geldende decision_rules) blijft volledig bewaard — dat is juist het materiaal voor
-- toekomstige plan-versus-uitvoering-analyse. Rijen MET een sessie krijgen 'completed'
-- en een completed_at afgeleid uit de laatste bijbehorende sessie.
--
-- HANDMATIG UITVOEREN in de Supabase SQL-editor. Draai stap 0 eerst en bewaar de
-- uitkomst; daarmee is elke stap terug te draaien (zie ROLLBACK onderaan).
-- ══════════════════════════════════════════════════════════════════════════════

-- ── STAP 0 — vóórmeting (bewaar deze uitkomst) ────────────────────────────────
select status,
       count(*)                                                          as rijen,
       count(*) filter (where exists (select 1 from sessions s
                                      where s.training_instance_id = ti.id)) as met_sessie
from training_instances ti
group by status
order by status;

-- ── STAP 1 — instances MET sessies afronden ───────────────────────────────────
-- completed_at = het laatste created_at van de gekoppelde sessies. Geen now(),
-- zodat de tijdlijn historisch klopt in plaats van "vandaag afgerond".
update training_instances ti
set    status       = 'completed',
       completed_at = coalesce(ti.completed_at, x.laatste)
from  (select s.training_instance_id as id, max(s.created_at) as laatste
       from   sessions s
       where  s.training_instance_id is not null
       group by s.training_instance_id) x
where ti.id = x.id
  and ti.status = 'active';

-- ── STAP 2 — instances ZONDER sessies markeren als afgebroken ─────────────────
-- 'abandoned' i.p.v. 'completed': er is nooit iets uitgevoerd. completed_at blijft
-- bewust leeg — een training die niet is gedaan heeft geen afrondingsmoment.
update training_instances ti
set    status = 'abandoned'
where  ti.status = 'active'
  and  not exists (select 1 from sessions s where s.training_instance_id = ti.id);

-- ── STAP 3 — nameting (moet 0 rijen 'active' zonder sessie opleveren) ─────────
select status,
       count(*)                                                          as rijen,
       count(*) filter (where exists (select 1 from sessions s
                                      where s.training_instance_id = ti.id)) as met_sessie
from training_instances ti
group by status
order by status;

-- ══════════════════════════════════════════════════════════════════════════════
-- ROLLBACK (alleen nodig als stap 1 of 2 onbedoeld te veel rijen raakte)
--   update training_instances set status='active', completed_at=null
--   where status in ('completed','abandoned');
-- Let op: dit zet OOK rijen terug die door de nieuwe code correct zijn afgerond.
-- Gebruik daarom liever de vóórmeting uit stap 0 om gericht te herstellen.
-- ══════════════════════════════════════════════════════════════════════════════
