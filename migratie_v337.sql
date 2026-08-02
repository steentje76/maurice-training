-- Migratie v337 — Sprint 3: Doelen (Handbook 7.1)
-- Slaat UITSLUITEND het doel zelf op (type, streefwaarde, einddatum, motivatie).
-- Actuele/huidige waarden worden NIET gedupliceerd — die worden live gelezen uit
-- de al bestaande tabellen (body_comp, weight_log, exercises.pr/peak_goal, sessions).

CREATE TABLE IF NOT EXISTS public.goals (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('gewicht','vetpercentage','spiermassa','pr','frequentie','volume','conditie','uithoudingsvermogen','eigen')),
  naam text,                    -- vrije naam, verplicht bij type='eigen', optioneel label bij andere types
  exercise_id bigint references public.exercises(id) on delete set null,  -- alleen bij type='pr': verwijst naar bestaande exercises.peak_goal/pr
  doelwaarde numeric,            -- streefwaarde; niet gebruikt bij type='pr' (die leest exercises.peak_goal)
  eenheid text,                  -- 'kg' | '%' | 'sessies' | 'ton' | 'km' | vrij (bij 'eigen')
  startwaarde numeric,            -- waarde op moment van aanmaken, voor voortgangsberekening t.o.v. startpunt
  startdatum date not null default current_date,
  einddatum date,
  motivatie text,
  status text not null default 'actief' check (status in ('actief','behaald','gearchiveerd')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goals: eigen doelen lezen" ON public.goals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "goals: eigen doelen aanmaken" ON public.goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goals: eigen doelen bijwerken" ON public.goals
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goals: eigen doelen verwijderen" ON public.goals
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE public.goals IS 'Sprint 3 — persoonlijke doelen (Handbook H6, 7.1). Bevat alleen het doel zelf; actuele waarden komen live uit body_comp/weight_log/exercises/sessions.';
