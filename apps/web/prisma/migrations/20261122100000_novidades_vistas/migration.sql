-- Marcador de leitura das novidades.
--
-- Nullable de propósito: `NULL` significa "nunca marcou como visto", e a
-- interface trata isso como "mostre desde sempre" em vez de esconder tudo.
-- Um `NOT NULL DEFAULT now()` faria a primeira visita começar vazia, o que é o
-- oposto do desejado.

ALTER TABLE "User" ADD COLUMN "novidadesVistasEm" TIMESTAMP(3);
