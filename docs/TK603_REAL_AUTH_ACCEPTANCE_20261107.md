# TK603 real local Auth acceptance — 7 November 2026

Status: PASS. 36 checks.

Actual services: cached Supabase PostgreSQL 17.11.0.006, GoTrue v2.197.0, PostgREST v16.5, dedicated internal backend plus dedicated frontend Docker network; only ephemeral loopback Auth/REST ports. Two synthetic email/password accounts received independent JWTs; tokens verified by GoTrue and PostgREST. No cloud project, production data, media or credentials used.

Schema: synthetic minimal exercises/sessions fixture based on the committed SQL security smoke; actual staged typed-FK migration executed unchanged. This is not a full production-schema restore or cloud-hosted Supabase acceptance. No Android, Storage playback, real entitlements or browser restart test.

Checks:
- GoTrue independently verifies owner-a password-login JWT
- GoTrue independently verifies owner-b password-login JWT
- two real independently issued local Auth identities
- PostgREST exposes 582 synthetic reserved aliases to authenticated owner
- anonymous session read returns no rows
- anonymous session INSERT denied
- tampered JWT denied by real PostgREST
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
- cross-owner INSERT denied
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

Reproduce: `node tools/tk603-real-auth-acceptance.cjs` with Docker running and listed cached images. Generated local secrets remain in memory only and are never printed or committed.

Harness development failures were corrected before the final 36/36 run: reserved Supabase role passwords require supabase_admin; internal-only network publication needs a separate frontend network; anonymous RLS SELECT may correctly return HTTP 200 with zero rows; SQLSTATE 23514 check violations map to HTTP 400 rather than the initially assumed 409. Each attempt cleaned its own temporary resources. Final docker ps -a and network ls filtered to tk603-auth returned no resources. These were harness assumptions, not hidden failed product assertions.

The exercise policies intentionally reproduce the permissive synthetic smoke fixture to challenge the narrow reserved-namespace guards. This result does not certify unrelated global/personal exercise-policy security or production schema parity.
