CREATE TABLE IF NOT EXISTS app_units(id text PRIMARY KEY, name text NOT NULL UNIQUE, state text NOT NULL);
-- migration-step
CREATE TABLE IF NOT EXISTS app_users(id text PRIMARY KEY, username text UNIQUE NOT NULL, data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
-- migration-step
CREATE TABLE IF NOT EXISTS app_user_units(user_id text NOT NULL REFERENCES app_users(id), unit_id text NOT NULL REFERENCES app_units(id), PRIMARY KEY(user_id,unit_id));
-- migration-step
CREATE TABLE IF NOT EXISTS app_auth_revision(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), revision bigint NOT NULL DEFAULT 1);
-- migration-step
INSERT INTO app_auth_revision(singleton,revision) VALUES(true,1) ON CONFLICT DO NOTHING;
-- migration-step
CREATE TABLE IF NOT EXISTS app_documents(id text PRIMARY KEY,owner_id text NOT NULL REFERENCES app_users(id),unit_id text NOT NULL REFERENCES app_units(id),type text NOT NULL CHECK(type IN ('laudo-completo','laudo-destinacao','proposta')),revision integer NOT NULL, data jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
-- migration-step
CREATE INDEX IF NOT EXISTS app_documents_owner_unit ON app_documents(owner_id,unit_id);
-- migration-step
CREATE TABLE IF NOT EXISTS app_document_versions(document_id text NOT NULL REFERENCES app_documents(id),version integer NOT NULL,data jsonb NOT NULL,PRIMARY KEY(document_id,version));
-- migration-step
CREATE TABLE IF NOT EXISTS app_document_decisions(document_id text NOT NULL REFERENCES app_documents(id),version integer NOT NULL,manager_id text NOT NULL REFERENCES app_users(id),approved boolean NOT NULL,notes text NOT NULL,decided_at timestamptz NOT NULL,PRIMARY KEY(document_id,version));
-- migration-step
CREATE TABLE IF NOT EXISTS app_pdf_files(key text PRIMARY KEY,document_id text NOT NULL REFERENCES app_documents(id),owner_id text NOT NULL REFERENCES app_users(id),version integer NOT NULL,sha256 text NOT NULL,bytes bytea NOT NULL CHECK(octet_length(bytes)<=4194304),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(document_id,version,sha256));
-- migration-step
CREATE OR REPLACE FUNCTION app_replace_users(expected_revision bigint, new_users jsonb) RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE current_revision bigint; account jsonb; assigned_unit text;
BEGIN
 SELECT revision INTO current_revision FROM app_auth_revision WHERE singleton=true FOR UPDATE;
 IF current_revision<>expected_revision THEN RAISE EXCEPTION 'AUTH_REVISION_CONFLICT' USING ERRCODE='40001'; END IF;
 FOR account IN SELECT value FROM jsonb_array_elements(new_users) LOOP
  INSERT INTO app_users(id,username,data) VALUES(account->>'id',account->>'username',account) ON CONFLICT(id) DO UPDATE SET username=excluded.username,data=excluded.data,updated_at=now();
  DELETE FROM app_user_units WHERE user_id=account->>'id';
  FOR assigned_unit IN SELECT jsonb_array_elements_text(coalesce(account->'unitIds','[]'::jsonb)) LOOP
   INSERT INTO app_user_units(user_id,unit_id) VALUES(account->>'id',assigned_unit);
  END LOOP;
 END LOOP;
 UPDATE app_auth_revision SET revision=revision+1 WHERE singleton=true RETURNING revision INTO current_revision;
 RETURN current_revision;
END; $$;
-- migration-step
CREATE OR REPLACE FUNCTION app_update_document(document_id text,expected_revision integer,next_data jsonb) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE changed text; snapshot jsonb; decision jsonb;
BEGIN
 UPDATE app_documents SET data=next_data,revision=(next_data->>'revision')::integer,updated_at=now() WHERE id=document_id AND revision=expected_revision RETURNING id INTO changed;
 IF changed IS NULL THEN RAISE EXCEPTION 'DOCUMENT_REVISION_CONFLICT' USING ERRCODE='40001'; END IF;
 FOR snapshot IN SELECT value FROM jsonb_array_elements(coalesce(next_data->'versions','[]'::jsonb)) LOOP
  INSERT INTO app_document_versions(document_id,version,data) VALUES(changed,(snapshot->>'version')::integer,snapshot) ON CONFLICT DO NOTHING;
 END LOOP;
 decision=next_data->'decision';
 IF decision IS NOT NULL THEN
  INSERT INTO app_document_decisions(document_id,version,manager_id,approved,notes,decided_at) VALUES(changed,(decision->>'version')::integer,decision->>'managerId',(decision->>'approved')::boolean,coalesce(decision->>'notes',''),(decision->>'at')::timestamptz) ON CONFLICT DO NOTHING;
 END IF;
 RETURN true;
END; $$;
