-- TK504 / #603. Synthetic PostgreSQL 17-only test. NEVER run on live Supabase.
-- Creates an isolated schema and synthetic roles inside a transaction;
-- rollback is unconditional. It does not migrate or mutate any existing rows.
\set ON_ERROR_STOP on
BEGIN;
CREATE SCHEMA tk504_fk_smoke;
SET search_path= tk504_fk_smoke, public;
CREATE ROLE tk504_fk_user_a NOLOGIN;
CREATE ROLE tk504_fk_user_b NOLOGIN;
CREATE TABLE exercises(
 id text PRIMARY KEY,
 name text NOT NULL,
 scope text NOT NULL CHECK (scope IN ('personal','global')),
 created_by text,
 CONSTRAINT reserved_alias_requires_global CHECK
   (id !~ '^TKC-[0-9]{6}$' OR (scope='global' AND created_by IS NULL))
);
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA tk504_fk_smoke TO tk504_fk_user_a,tk504_fk_user_b;
GRANT SELECT,INSERT ON exercises TO tk504_fk_user_a,tk504_fk_user_b;
CREATE POLICY exercise_visible_a ON exercises FOR SELECT TO tk504_fk_user_a
 USING (scope='global' OR created_by='user-A');
CREATE POLICY exercise_visible_b ON exercises FOR SELECT TO tk504_fk_user_b
 USING (scope='global' OR created_by='user-B');
CREATE POLICY insert_private_a ON exercises FOR INSERT TO tk504_fk_user_a
 WITH CHECK (scope='personal' AND created_by='user-A' AND id !~ '^TKC-[0-9]{6}$');
CREATE POLICY insert_private_b ON exercises FOR INSERT TO tk504_fk_user_b
 WITH CHECK (scope='personal' AND created_by='user-B' AND id !~ '^TKC-[0-9]{6}$');
INSERT INTO exercises(id,name,scope,created_by)
 VALUES ('TK-000038','synthetic personal historical TK-shaped ID','personal','user-A');
CREATE TABLE catalog_fk_bindings(
 catalog_id text PRIMARY KEY CHECK (catalog_id ~ '^TK-[0-9]{6}$'),
 exercise_id text NOT NULL UNIQUE REFERENCES exercises(id),
 provider text NOT NULL CHECK (provider='movekit'),
 enabled boolean NOT NULL DEFAULT false,
 CONSTRAINT typed_fk_contract CHECK
   (exercise_id='TKC-'||substring(catalog_id from 4))
);
-- Mimic a server-validated, idempotent provision batch: aliases reserve a
-- separate global FK namespace; user personal TK-shaped IDs are untouched.
INSERT INTO exercises(id,name,scope,created_by)
 SELECT 'TKC-'||lpad(g::text,6,'0'),'synthetic catalog FK '||g,'global',NULL
 FROM generate_series(1,582) g;
INSERT INTO catalog_fk_bindings(catalog_id,exercise_id,provider,enabled)
 SELECT 'TK-'||lpad(g::text,6,'0'),'TKC-'||lpad(g::text,6,'0'),'movekit',false
 FROM generate_series(1,582) g;
CREATE TABLE sessions(
 id text PRIMARY KEY,
 user_id text NOT NULL,
 exercise_id text NOT NULL REFERENCES exercises(id),
 note text
);
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT ON sessions TO tk504_fk_user_a,tk504_fk_user_b;
CREATE POLICY session_select_a ON sessions FOR SELECT TO tk504_fk_user_a
 USING (user_id='user-A');
CREATE POLICY session_insert_a ON sessions FOR INSERT TO tk504_fk_user_a
 WITH CHECK (user_id='user-A');
CREATE POLICY session_select_b ON sessions FOR SELECT TO tk504_fk_user_b
 USING (user_id='user-B');
CREATE POLICY session_insert_b ON sessions FOR INSERT TO tk504_fk_user_b
 WITH CHECK (user_id='user-B');
INSERT INTO sessions VALUES
 ('history-A','user-A','TK-000038','historical personal session untouched'),
 ('catalog-A','user-A','TKC-000038','new canonical session for owner A'),
 ('catalog-B','user-B','TKC-000038','same global catalog FK for owner B'),
 ('catalog-new-A','user-A','TKC-000227','pending release, FK is valid only');
DO $smoke$
BEGIN
 IF (SELECT count(*) FROM catalog_fk_bindings)<>582
   THEN RAISE EXCEPTION 'BINDING_COUNT'; END IF;
 IF (SELECT count(*) FROM exercises WHERE id LIKE 'TKC-%' AND scope='global')<>582
   THEN RAISE EXCEPTION 'ALIAS_COUNT'; END IF;
 IF (SELECT count(*) FROM exercises WHERE id='TK-000038' AND scope='personal')<>1
   THEN RAISE EXCEPTION 'PERSONAL_COLLISION_CHANGED'; END IF;
 IF (SELECT count(*) FROM sessions WHERE exercise_id='TKC-000038')<>2
   THEN RAISE EXCEPTION 'MULTI_OWNER_FK_FAILED'; END IF;
 IF (SELECT count(*) FROM sessions WHERE id='history-A' AND exercise_id='TK-000038')<>1
   THEN RAISE EXCEPTION 'HISTORICAL_SESSION_CHANGED'; END IF;
 IF (SELECT count(*) FROM catalog_fk_bindings WHERE enabled)<>0
   THEN RAISE EXCEPTION 'RELEASE_MUST_REMAIN_OFF'; END IF;
 BEGIN
   INSERT INTO sessions VALUES('bad','user-A','TKC-999999','not provisioned');
   RAISE EXCEPTION 'BAD_FK_ALLOWED';
 EXCEPTION WHEN foreign_key_violation THEN NULL;
 END;
 BEGIN
   INSERT INTO catalog_fk_bindings VALUES('TK-000038','TKC-000039','movekit',false);
   RAISE EXCEPTION 'FORGED_BINDING_ALLOWED';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
END
$smoke$;
-- These role checks prove a normal athlete can see global FK placeholders
-- without being able to create or replace reserved aliases.
SET ROLE tk504_fk_user_a;
INSERT INTO exercises VALUES ('personal-a','normal exercise','personal','user-A');
DO $smoke$
BEGIN
 IF (SELECT count(*) FROM exercises WHERE id='TKC-000038')<>1
   THEN RAISE EXCEPTION 'GLOBAL_ALIAS_NOT_VISIBLE'; END IF;
 IF (SELECT count(*) FROM sessions)<>3
   THEN RAISE EXCEPTION 'OWNER_A_SESSIONS_LEAKED'; END IF;
 BEGIN
   INSERT INTO exercises VALUES ('TKC-000583','impersonated alias','personal','user-A');
   RAISE EXCEPTION 'RESERVED_ALIAS_WRITE_ALLOWED';
 EXCEPTION WHEN check_violation OR insufficient_privilege THEN NULL;
 END;
END
$smoke$;
RESET ROLE;
SET ROLE tk504_fk_user_b;
INSERT INTO exercises VALUES ('personal-b','another personal exercise','personal','user-B');
DO $smoke$
BEGIN
 IF (SELECT count(*) FROM exercises WHERE id='personal-a')<>0
   THEN RAISE EXCEPTION 'PERSONAL_DATA_LEAK_A_TO_B'; END IF;
 IF (SELECT count(*) FROM exercises WHERE scope='global')<>582
   THEN RAISE EXCEPTION 'GLOBAL_FK_NOT_VISIBLE_TO_B'; END IF;
 IF (SELECT count(*) FROM sessions)<>1
   THEN RAISE EXCEPTION 'OWNER_B_SESSIONS_LEAKED'; END IF;
 BEGIN
   INSERT INTO sessions VALUES('forged-B','user-A','TKC-000038','cross-tenant');
   RAISE EXCEPTION 'CROSS_TENANT_SESSION_ALLOWED';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END
$smoke$;
RESET ROLE;
SELECT 'TK504 #603 isolated PostgreSQL 17 FK/RLS smoke PASS (582 reserved aliases, user A/B isolation, old history preserved, no grants)' AS result;
ROLLBACK;
