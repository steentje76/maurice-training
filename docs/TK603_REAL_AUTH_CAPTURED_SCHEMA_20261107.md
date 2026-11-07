# TK603 real local Auth acceptance — 7 November 2026

Status: PASS. 53 checks. Run completed 2026-11-07T04:09:25.809Z

Actual services: cached Supabase PostgreSQL 17.11.0.006, GoTrue v2.197.0, PostgREST v16.5, dedicated internal backend plus dedicated frontend Docker network; only ephemeral loopback Auth/REST ports. Two synthetic email/password accounts received independent JWTs; tokens verified by GoTrue and PostgREST. No cloud project, production data, media or credentials used.

Schema: captured 21 exercise and 39 session columns, constraints, table ACLs, RLS policies, three functions and two noninternal triggers pinned through a normalized full-contract SHA256; synthetic dependency tables are locked with synthetic ACL/RLS, not production dependency-table parity. Unmodified captured scope trigger RED was required before a LOCAL-ONLY guarded proposal enabled 582 synthetic aliases. Original staged typed-FK migration executed unchanged. Function owners/EXECUTE ACLs, column grants, indexes and type modifiers are not replayed. Test requests explicitly add a synthetic date. This is not a full database restore, cloud acceptance, actual UI writer payload, media or Android test. Scope proposal remains outside production migration.

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
- synthetic forged-owner probe row deleted by actual owner
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
- B cannot self-assign synthetic coach relationship through REST
- B cannot elevate synthetic profile privileges
- real B JWT cannot read athlete A with disabled coach scope
- real B coach JWT reads A only after server-enabled scope
- explicit own-user filter excludes authorized athlete rows
- historical identity RPC remains own-only despite coach read scope
- coach read permission never grants athlete UPDATE
- coach scope revocation removes athlete visibility with same real JWT
- anonymous PATCH cannot mutate populated session
- anonymous DELETE cannot mutate populated session
- authenticated A cannot exploit global unowned scope proposal
- authenticated B cannot exploit global unowned scope proposal
- locally signed service_role JWT cannot provision reserved global aliases

Cleanup: dedicated containers, anonymous volumes and network removed

Reproduce: `node tools/tk603-real-auth-captured-schema.cjs` with Docker running and listed cached images. Generated local secrets remain in memory only and are never printed or committed.
