# DECISION_LOG — Maurice Training Coach

> Alleen grote koerskeuzes (geen ADR's per technische keuze — governance-niveau B).

## DEC-001
- Datum: 12 juli 2026
- Beslissing: Supabase Auth + RLS geactiveerd, policies verscherpt naar `auth.uid() = user_id` (migratie v320/v321).
- Reden: noodzakelijke stap richting Fase 2 (multi-user voorbereiding).
- Alternatieven: geen serieus alternatief — vereiste stap voor multi-user.
- Impact: bestaande data succesvol geclaimd naar echt account, geen dataverlies. TEXT→UUID-fix nodig op vijf tabellen (user_id-kolom).
- Verantwoordelijke: Maurice

## DEC-002
- Datum: 12 juli 2026
- Beslissing: Rollen/entitlements-schema aangelegd (migratie_v322: gym_role-hiërarchie, systeemrollen, plan_features, credit_packs, discounts), maar handhaving uitgesteld naar Fase 5.
- Reden: schema nu klaarzetten voorkomt latere, pijnlijkere migratie; vroege handhaving is niet nodig zolang het project single-user is.
- Alternatieven: schema pas in Fase 5 bouwen (afgewezen — grotere migratie-impact later).
- Impact: tabellen als credit_packs/plan_features bestaan al zonder actieve betaalflow — geen verwarring, mits gedocumenteerd (zie Blueprint.md).
- Verantwoordelijke: Maurice

## DEC-003
- Datum: [vóór 31 juli 2026, exacte datum nog aan te vullen]
- Beslissing: Blueprint v6 (enterprise-governance: ADR's, C4-diagrammen, meerdere-engineers-schaal) afgewezen als projectstandaard.
- Reden: schaal past niet bij een solo-project met één ontwikkelaar/AI.
- Alternatieven: losse bruikbare ideeën (ACWR, PR-categorisatie, confidence scoring, plateau-detectie) apart overnemen zonder de volledige structuur.
- Impact: bepaalt ook het governance-niveau voor Project OS zelf (zie DEC-005).
- Verantwoordelijke: Maurice

## DEC-004
- Datum: 31 juli 2026
- Beslissing: Kritieke RLS-lekken gedicht op `users`, `exercises`, `gyms`, `equipment_types`, `exercise_equipment` (read-only policies, `users` beperkt tot eigen rij).
- Reden: Supabase Advisor meldde deze vijf tabellen als kritiek (RLS uitgeschakeld, publiek schrijfbaar).
- Alternatieven: geen — kritieke kwetsbaarheid, direct actie vereist.
- Impact: geen functionaliteitsverlies (public.users had 0 rijen); referentiedata blijft leesbaar, schrijven voortaan beperkt tot service role.
- Verantwoordelijke: Maurice

## DEC-005
- Datum: 31 juli 2026
- Beslissing: Governance-niveau voor toepassing van Project OS op dit project vastgesteld op **Optie B — Middenweg**.
- Reden: sluit aan bij de bestaande, al bewezen lichte werkwijze (zie Blueprint.md); voorkomt het alsnog invoeren van de zwaarte die bij Blueprint v6 al is afgewezen (zie DEC-003).
- Alternatieven overwogen: Optie A (nog lichter — geen besluitregistratie), Optie C (volledig Project OS v1.3, incl. ADR's en Project Health Check).
- Impact: Project OS-toepassing beperkt tot Product Book, Blueprint, CURRENT_STATE.md, lichte Stories, Roadmap en dit DECISION_LOG — geen ADR's, geen Health Check, geen Dashboard-ceremonie.
- Verantwoordelijke: Maurice

## DEC-006
- Datum: 1 augustus 2026
- Beslissing: Fix toegepast op atleet_profiel-sync (user_id werd nooit meegestuurd, kolom is NOT NULL zonder default → alle Supabase-writes faalden stil).
- Reden: ontdekt tijdens Story 2 (per-user profielscheiding) door broncode te combineren met een SQL-schemacheck.
- Alternatieven: user_id default auth.uid() op kolomniveau zetten (database-fix) i.p.v. client-side meesturen — bewust niet gekozen, client-side is expliciet en consistent met hoe de rest van de app werkt.
- Impact: multi-device/multi-user-sync van het atleetprofiel werkt vanaf nu daadwerkelijk; vóór deze fix deed die sync niets (stille no-op), ook al leek de app te werken dankzij de localStorage-cache. Bevestigd: user_id is PRIMARY KEY op atleet_profiel, dus de merge-duplicates-upsert matcht correct — fix is structureel compleet, geen aanvullende constraint nodig.
- Verantwoordelijke: Maurice

## DEC-007
- Datum: 1 augustus 2026
- Beslissing: volledige RLS-audit uitgevoerd op alle 31 tabellen in public — allemaal rowsecurity=true.
- Reden: laatste openstaande technische controlepunt uit het Product Reset Rapport (13.11 uit Project OS-hoofdstuk 13, hier toegepast als Sprint 1-afsluiter).
- Alternatieven: n.v.t. — controle, geen keuze.
- Impact: geen resterende bekende RLS-gaten. Zegt niets over de inhoud van individuele policies (alleen óf RLS aanstaat, niet of elke policy correct is) — dat blijft per-tabel aandachtspunt bij toekomstig werk.
- Verantwoordelijke: Maurice
