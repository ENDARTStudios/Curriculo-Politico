-- ── Histórico de mudanças ─────────────────────────────────────────────────────
--
-- Tabela de fatos: uma linha por mudança de um campo, com valor antes e depois.
-- `ocorridoEm` é quando o dado mudou; `criadoEm` é quando o sistema soube.
-- `entidadeId` não tem FK de propósito: o histórico sobrevive à remoção da
-- entidade — um log que desaparece junto com o dado não serve para auditar.

CREATE TYPE "ChangeEntity" AS ENUM ('PERSON', 'PARTY', 'BILL');
CREATE TYPE "ChangeType" AS ENUM ('SCORE', 'STATUS', 'FINANCE', 'LEGAL', 'PROFILE');

CREATE TABLE "ChangeLog" (
    "id" TEXT NOT NULL,
    "entidade" "ChangeEntity" NOT NULL,
    "entidadeId" TEXT NOT NULL,
    "tipo" "ChangeType" NOT NULL,
    "campo" TEXT NOT NULL,
    "valorAntes" TEXT,
    "valorDepois" TEXT,
    "ocorridoEm" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeLog_pkey" PRIMARY KEY ("id")
);

-- Idempotência do backfill: reprocessar o mesmo snapshot não duplica linha.
CREATE UNIQUE INDEX "ChangeLog_entidade_entidadeId_campo_ocorridoEm_key"
    ON "ChangeLog"("entidade", "entidadeId", "campo", "ocorridoEm");

CREATE INDEX "ChangeLog_entidade_entidadeId_ocorridoEm_idx"
    ON "ChangeLog"("entidade", "entidadeId", "ocorridoEm");
CREATE INDEX "ChangeLog_ocorridoEm_idx" ON "ChangeLog"("ocorridoEm");
