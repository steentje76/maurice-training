# TK614 unified 582 real local Auth acceptance — 9 November 2026

Status: PASS. 65 checks. Run completed 2026-11-09T08:12:57.371Z

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
- real signed JWT account A: all 582 post-approval canonical catalog FKs resolve
- real signed JWT account B: all 582 post-approval canonical catalog FKs resolve
- provider spoof denied for both-cohort representative TK-000001
- provider spoof denied for both-cohort representative TK-000063
- provider spoof denied for both-cohort representative TK-000188
- provider spoof denied for both-cohort representative TK-000226
- provider spoof denied for both-cohort representative TK-000227
- provider spoof denied for both-cohort representative TK-000300
- provider spoof denied for both-cohort representative TK-000582
- real GoTrue JWT A can write same 7 cross-cohort catalog sessions
- real GoTrue JWT B can write same 7 cross-cohort catalog sessions
- JWT A can read own original-226 session
- JWT A cannot read B original-226 history
- JWT A cannot forge other owner original-226 write
- JWT A original-226 retry does not create duplicate
- JWT A single UUID remains unique after retry
- JWT A cross-owner UUID replay forbidden
- JWT B can read own original-226 session
- JWT B cannot read A original-226 history
- JWT B cannot forge other owner original-226 write
- JWT B original-226 retry does not create duplicate
- JWT B single UUID remains unique after retry
- JWT B cross-owner UUID replay forbidden
- JWT A sees revoked original-226 binding denied
- JWT A cannot insert after original-226 revocation
- JWT A retains own historical original-226 session after revocation
- JWT B sees revoked original-226 binding denied
- JWT B cannot insert after original-226 revocation
- JWT B retains own historical original-226 session after revocation

Cleanup: dedicated containers, anonymous volumes and network removed

Reproduce: `node tools/tk603-real-auth-acceptance.cjs` with Docker running and listed cached images. Generated local secrets remain in memory only and are never printed or committed.
