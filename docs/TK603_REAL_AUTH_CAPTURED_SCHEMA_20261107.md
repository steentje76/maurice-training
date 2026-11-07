# TK603 real local Auth acceptance — 7 November 2026

Status: PASS. 39 checks. Run completed 2026-11-07T04:06:14.422Z

Actual services: cached Supabase PostgreSQL 17.11.0.006, GoTrue v2.197.0, PostgREST v16.5, dedicated internal backend plus dedicated frontend Docker network; only ephemeral loopback Auth/REST ports. Two synthetic email/password accounts received independent JWTs; tokens verified by GoTrue and PostgREST. No cloud project, production data, media or credentials used.

Schema: captured 21 exercise and 39 session columns, constraints, table ACLs, RLS policies, three digest-verified functions and two noninternal triggers; synthetic dependency tables only. Unmodified captured scope trigger RED was required before a LOCAL-ONLY guarded proposal enabled 582 synthetic aliases. Original staged typed-FK migration executed unchanged. This is not a full database restore, cloud acceptance, actual UI writer payload, media or Android test. Scope proposal remains outside production migration.

Checks:
- GoTrue independently verifies owner-a password-login JWT
- GoTrue independently verifies owner-b password-login JWT
- two real independently issued local Auth identities
- captured production scope trigger blocks unowned admin alias before proposal
- PostgREST exposes 582 synthetic reserved aliases to authenticated owner
- anonymous session read returns no rows
- anonymous session INSERT denied
- tampered JWT denied by real PostgREST
- captured personal scope trigger preserves actual owner A visibility
- owner B cannot read A personal same-number TK exercise
- authenticated binding registry access denied
- real authenticated RPC resolves exact reviewed provider identity
- provider spoof cannot resolve catalog binding
- unreviewed exercise remains unbound
- owner writes own TKC-000038 session via real FK
- owner writes own TK-000038 session via real FK
- owner writes own TKC-000038 session via real FK
- anonymous SELECT exposes no populated sessions
- owner A SELECT isolates personal and typed sessions
- own row cannot be reassigned to another owner
- owner B SELECT hides A sessions
- captured INSERT trigger rewrites forged owner to JWT identity
- rewritten row never belongs to forged owner
- cross-owner UPDATE touches zero rows
- cross-owner DELETE touches zero rows
- same UUID own-session retry succeeds
- same UUID retry leaves exactly one own row
- cross-owner UUID replay denied
- cross-owner replay leaves original owner identity and content intact
- real database FK rejects nonexistent exercise
- direct client reserved-alias INSERT denied
- owner UPDATE allowed
- owner DELETE allowed
- revoked binding no longer resolves
- revocation blocks new catalog session at database boundary (SQLSTATE 23514)
- revocation preserves own historical catalog identity
- history identity RPC denies account without own saved session
- existing history editable after revocation
- personal TK collision session preserved separately

Cleanup: dedicated containers, anonymous volumes and network removed

Reproduce: `node tools/tk603-real-auth-captured-schema.cjs` with Docker running and listed cached images. Generated local secrets remain in memory only and are never printed or committed.
