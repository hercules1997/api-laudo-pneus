CREATE OR REPLACE FUNCTION app_notificar_documento() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP<>'UPDATE' THEN RETURN NEW; END IF;
 IF NEW.data->>'type'<>'proposta' OR NEW.data->>'deletedAt' IS NOT NULL THEN RETURN NEW; END IF;
 IF NEW.data->>'status' NOT IN ('aprovado','reprovado') OR OLD.data->>'status' IS NOT DISTINCT FROM NEW.data->>'status' THEN RETURN NEW; END IF;
 IF NEW.data->'decision' IS NULL OR NEW.data->'decision'->>'version' IS DISTINCT FROM NEW.data->>'version' THEN RETURN NEW; END IF;
 INSERT INTO app_notificacoes(documento_id,usuario_id,status,versao,revisao)
 SELECT NEW.id,u.id,NEW.data->>'status',(NEW.data->>'version')::integer,NEW.revision
 FROM app_users u WHERE u.id=NEW.owner_id AND coalesce((u.data->>'active')::boolean,true)
 ON CONFLICT(documento_id,usuario_id,revisao) DO NOTHING;
 RETURN NEW;
END; $$;
-- migration-step
CREATE INDEX IF NOT EXISTS app_notificacoes_decisoes ON app_notificacoes(usuario_id,criada_em DESC) WHERE status IN ('aprovado','reprovado');

-- migration-step
ALTER TABLE app_notificacoes ADD COLUMN IF NOT EXISTS limpa_em timestamptz;
