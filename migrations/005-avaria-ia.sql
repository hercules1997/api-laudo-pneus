CREATE TABLE IF NOT EXISTS app_avaria_ia_quota (
 dia date NOT NULL,
 chave text NOT NULL,
 usos integer NOT NULL DEFAULT 0,
 PRIMARY KEY(dia,chave)
);
-- migration-step
CREATE OR REPLACE FUNCTION app_reservar_avaria_ia(usuario text,limite_usuario integer,limite_total integer) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE total integer; individual integer; dia_local date := (now() AT TIME ZONE 'America/Sao_Paulo')::date; chave_usuario text := 'u:'||usuario;
BEGIN
 INSERT INTO app_avaria_ia_quota(dia,chave) VALUES(dia_local,'global'),(dia_local,chave_usuario) ON CONFLICT DO NOTHING;
 SELECT usos INTO total FROM app_avaria_ia_quota WHERE dia=dia_local AND chave='global' FOR UPDATE;
 SELECT usos INTO individual FROM app_avaria_ia_quota WHERE dia=dia_local AND chave=chave_usuario FOR UPDATE;
 IF total>=limite_total OR individual>=limite_usuario THEN RETURN false; END IF;
 UPDATE app_avaria_ia_quota SET usos=usos+1 WHERE dia=dia_local AND chave IN ('global',chave_usuario);
 RETURN true;
END; $$;
