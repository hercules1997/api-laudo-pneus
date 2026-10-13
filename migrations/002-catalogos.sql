CREATE TABLE IF NOT EXISTS app_catalogos (
 tipo text NOT NULL CHECK(tipo IN ('marcas','medidas')),
 id text NOT NULL,
 dados jsonb NOT NULL,
 alterado_por text NOT NULL REFERENCES app_users(id),
 atualizado_em timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tipo,id)
);
