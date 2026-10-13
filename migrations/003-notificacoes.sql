CREATE TABLE IF NOT EXISTS app_notificacoes (
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
 documento_id text NOT NULL REFERENCES app_documents(id) ON DELETE CASCADE,
 usuario_id text NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
 status text NOT NULL,
 versao integer NOT NULL,
 revisao integer NOT NULL,
 criada_em timestamptz NOT NULL DEFAULT now(),
 lida_em timestamptz,
 push_enviado_em timestamptz,
 push_reservado_ate timestamptz,
 UNIQUE(documento_id,usuario_id,revisao)
);
-- migration-step
CREATE TABLE IF NOT EXISTS app_dispositivos (
 token text PRIMARY KEY,
 usuario_id text NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
 atualizado_em timestamptz NOT NULL DEFAULT now()
);
-- migration-step
CREATE OR REPLACE FUNCTION app_notificar_documento() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  IF OLD.data->>'status'=NEW.data->>'status' AND OLD.data->>'version'=NEW.data->>'version' THEN RETURN NEW; END IF;
 END IF;
 INSERT INTO app_notificacoes(documento_id,usuario_id,status,versao,revisao)
 SELECT NEW.id,u.id,NEW.data->>'status',(NEW.data->>'version')::integer,NEW.revision
 FROM app_users u WHERE coalesce((u.data->>'active')::boolean,true) AND (
  u.id=NEW.owner_id OR (NEW.data->>'status'<>'rascunho' AND (
   u.data->>'role'='admin' OR (u.data->>'role'='gestor' AND EXISTS(SELECT 1 FROM app_user_units m WHERE m.user_id=u.id AND m.unit_id=NEW.unit_id))
  ))
 ) ON CONFLICT(documento_id,usuario_id,revisao) DO NOTHING;
 RETURN NEW;
END; $$;
-- migration-step
DROP TRIGGER IF EXISTS notificar_documento ON app_documents;
-- migration-step
CREATE TRIGGER notificar_documento AFTER INSERT OR UPDATE ON app_documents FOR EACH ROW EXECUTE FUNCTION app_notificar_documento();
