-- ── Acompanhar político, partido e projeto ────────────────────────────────────
--
-- Três FKs anuláveis em vez de `targetType` + `targetId`: com FK real, apagar um
-- político do acervo remove os acompanhamentos dele por CASCADE. Com
-- discriminador textual, sobrariam órfãos e a dashboard mostraria "desconhecido".
--
-- A restrição CHECK garante que exatamente uma das três colunas esteja
-- preenchida. O Prisma não expressa CHECK no schema, então ela vive aqui.

CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "personId" TEXT,
    "partyId" TEXT,
    "billId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- Exatamente um alvo por linha. `num_nonnulls` devolve quantas colunas não são
-- nulas; qualquer valor diferente de 1 é estado impossível.
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_um_alvo"
    CHECK (num_nonnulls("personId", "partyId", "billId") = 1);

-- No Postgres NULLs são distintos, então cada UNIQUE só restringe a coluna
-- preenchida: seguir 1 político, 1 partido e 1 projeto não colide entre si.
CREATE UNIQUE INDEX "Follow_userId_personId_key" ON "Follow"("userId", "personId");
CREATE UNIQUE INDEX "Follow_userId_partyId_key" ON "Follow"("userId", "partyId");
CREATE UNIQUE INDEX "Follow_userId_billId_key" ON "Follow"("userId", "billId");
CREATE INDEX "Follow_userId_createdAt_idx" ON "Follow"("userId", "createdAt");
CREATE INDEX "Follow_personId_idx" ON "Follow"("personId");
CREATE INDEX "Follow_partyId_idx" ON "Follow"("partyId");
CREATE INDEX "Follow_billId_idx" ON "Follow"("billId");

ALTER TABLE "Follow" ADD CONSTRAINT "Follow_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_personId_fkey"
    FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_partyId_fkey"
    FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_billId_fkey"
    FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Resultado do espectro político ────────────────────────────────────────────

CREATE TABLE "SpectrumResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scores" JSONB NOT NULL,
    "versao" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpectrumResult_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SpectrumResult_userId_createdAt_idx" ON "SpectrumResult"("userId", "createdAt");

ALTER TABLE "SpectrumResult" ADD CONSTRAINT "SpectrumResult_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Logo do partido ───────────────────────────────────────────────────────────
-- Nulo é o estado normal: a maioria das legendas não teve a logo carregada, e a
-- interface cai para um monograma com a sigla.

ALTER TABLE "Party" ADD COLUMN "logoUrl" TEXT;
