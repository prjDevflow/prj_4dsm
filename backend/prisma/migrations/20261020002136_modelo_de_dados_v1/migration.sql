/*
  Warnings:

  - You are about to drop the `connection_checks` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "perfil" AS ENUM ('ADMIN', 'CONDOMINO', 'VISITANTE');

-- CreateEnum
CREATE TYPE "access_point_tipo" AS ENUM ('PORTARIA', 'PORTA', 'CATRACA');

-- CreateEnum
CREATE TYPE "authorization_situacao" AS ENUM ('ATIVA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "command_tipo" AS ENUM ('ABRIR', 'NEGAR');

-- CreateEnum
CREATE TYPE "event_metodo" AS ENUM ('QR', 'NFC');

-- CreateEnum
CREATE TYPE "event_resultado" AS ENUM ('AUTORIZADO', 'NEGADO');

-- DropTable
DROP TABLE "connection_checks";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "senhaHash" VARCHAR(100) NOT NULL,
    "perfil" "perfil" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buildings" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "endereco" VARCHAR(255) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_points" (
    "id" UUID NOT NULL,
    "buildingId" UUID NOT NULL,
    "tipo" "access_point_tipo" NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "identificacao" VARCHAR(60) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "access_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terminals" (
    "id" UUID NOT NULL,
    "accessPointId" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "apiKeyHash" VARCHAR(64) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoContatoEm" TIMESTAMPTZ(3),
    "ultimaLat" DOUBLE PRECISION,
    "ultimaLon" DOUBLE PRECISION,
    "gpsFix" BOOLEAN NOT NULL DEFAULT false,
    "gpsSimulado" BOOLEAN NOT NULL DEFAULT false,
    "firmware" VARCHAR(40),
    "rssi" INTEGER,
    "modoCadastroUsuarioId" UUID,
    "modoCadastroAte" TIMESTAMPTZ(3),

    CONSTRAINT "terminals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authorizations" (
    "id" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "accessPointId" UUID NOT NULL,
    "dataInicio" DATE NOT NULL,
    "dataFim" DATE NOT NULL,
    "horaInicio" VARCHAR(5) NOT NULL,
    "horaFim" VARCHAR(5) NOT NULL,
    "usosPermitidos" INTEGER NOT NULL,
    "usosRealizados" INTEGER NOT NULL DEFAULT 0,
    "situacao" "authorization_situacao" NOT NULL DEFAULT 'ATIVA',
    "criadoPorId" UUID NOT NULL,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canceladoPorId" UUID,
    "canceladoEm" TIMESTAMPTZ(3),
    "motivoCancelamento" VARCHAR(500),

    CONSTRAINT "authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nfc_tags" (
    "id" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "uid" VARCHAR(20) NOT NULL,
    "descricao" VARCHAR(120),
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nfc_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_credentials" (
    "id" UUID NOT NULL,
    "terminalId" UUID NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "emitidoEm" TIMESTAMPTZ(3) NOT NULL,
    "expiraEm" TIMESTAMPTZ(3) NOT NULL,
    "consumidoEm" TIMESTAMPTZ(3),
    "consumidoPorId" UUID,

    CONSTRAINT "qr_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terminal_commands" (
    "id" SERIAL NOT NULL,
    "terminalId" UUID NOT NULL,
    "tipo" "command_tipo" NOT NULL,
    "motivo" VARCHAR(60),
    "aberturaMs" INTEGER,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" TIMESTAMPTZ(3) NOT NULL,
    "entregueEm" TIMESTAMPTZ(3),
    "executadoEm" TIMESTAMPTZ(3),

    CONSTRAINT "terminal_commands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_events" (
    "id" UUID NOT NULL,
    "ocorridoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terminalId" UUID,
    "accessPointId" UUID,
    "usuarioId" UUID,
    "authorizationId" UUID,
    "metodo" "event_metodo" NOT NULL,
    "resultado" "event_resultado" NOT NULL,
    "motivo" VARCHAR(60),
    "distanciaM" DOUBLE PRECISION,
    "clientEventId" VARCHAR(100),
    "detalhes" JSONB,

    CONSTRAINT "access_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "access_points_buildingId_identificacao_key" ON "access_points"("buildingId", "identificacao");

-- CreateIndex
CREATE UNIQUE INDEX "terminals_accessPointId_key" ON "terminals"("accessPointId");

-- CreateIndex
CREATE INDEX "authorizations_usuarioId_idx" ON "authorizations"("usuarioId");

-- CreateIndex
CREATE INDEX "authorizations_accessPointId_idx" ON "authorizations"("accessPointId");

-- CreateIndex
CREATE UNIQUE INDEX "nfc_tags_uid_key" ON "nfc_tags"("uid");

-- CreateIndex
CREATE INDEX "nfc_tags_usuarioId_idx" ON "nfc_tags"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "qr_credentials_tokenHash_key" ON "qr_credentials"("tokenHash");

-- CreateIndex
CREATE INDEX "qr_credentials_expiraEm_idx" ON "qr_credentials"("expiraEm");

-- CreateIndex
CREATE INDEX "terminal_commands_terminalId_id_idx" ON "terminal_commands"("terminalId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "access_events_clientEventId_key" ON "access_events"("clientEventId");

-- CreateIndex
CREATE INDEX "access_events_ocorridoEm_idx" ON "access_events"("ocorridoEm");

-- CreateIndex
CREATE INDEX "access_events_usuarioId_ocorridoEm_idx" ON "access_events"("usuarioId", "ocorridoEm");

-- CreateIndex
CREATE INDEX "access_events_accessPointId_ocorridoEm_idx" ON "access_events"("accessPointId", "ocorridoEm");

-- AddForeignKey
ALTER TABLE "access_points" ADD CONSTRAINT "access_points_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "buildings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terminals" ADD CONSTRAINT "terminals_accessPointId_fkey" FOREIGN KEY ("accessPointId") REFERENCES "access_points"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terminals" ADD CONSTRAINT "terminals_modoCadastroUsuarioId_fkey" FOREIGN KEY ("modoCadastroUsuarioId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorizations" ADD CONSTRAINT "authorizations_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorizations" ADD CONSTRAINT "authorizations_accessPointId_fkey" FOREIGN KEY ("accessPointId") REFERENCES "access_points"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorizations" ADD CONSTRAINT "authorizations_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorizations" ADD CONSTRAINT "authorizations_canceladoPorId_fkey" FOREIGN KEY ("canceladoPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nfc_tags" ADD CONSTRAINT "nfc_tags_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_credentials" ADD CONSTRAINT "qr_credentials_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "terminals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_credentials" ADD CONSTRAINT "qr_credentials_consumidoPorId_fkey" FOREIGN KEY ("consumidoPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terminal_commands" ADD CONSTRAINT "terminal_commands_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "terminals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_events" ADD CONSTRAINT "access_events_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "terminals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_events" ADD CONSTRAINT "access_events_accessPointId_fkey" FOREIGN KEY ("accessPointId") REFERENCES "access_points"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_events" ADD CONSTRAINT "access_events_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_events" ADD CONSTRAINT "access_events_authorizationId_fkey" FOREIGN KEY ("authorizationId") REFERENCES "authorizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- CHECK constraints (Prisma cannot express them). Names follow <table>_<rule>_chk.
-- Do not regenerate this migration with `db push`: it would drop them.
-- ---------------------------------------------------------------------------

-- users
ALTER TABLE "users" ADD CONSTRAINT "users_email_lowercase_chk" CHECK ("email" = lower("email"));
ALTER TABLE "users" ADD CONSTRAINT "users_senhaHash_bcrypt_chk" CHECK ("senhaHash" ~ '^\$2[aby]\$[0-9]{2}\$.{53}$');

-- buildings and access_points: valid coordinates
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_coordenadas_chk"
  CHECK ("latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180);
ALTER TABLE "access_points" ADD CONSTRAINT "access_points_coordenadas_chk"
  CHECK ("latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180);

-- terminals
ALTER TABLE "terminals" ADD CONSTRAINT "terminals_apiKeyHash_sha256_chk" CHECK ("apiKeyHash" ~ '^[0-9a-f]{64}$');
ALTER TABLE "terminals" ADD CONSTRAINT "terminals_posicao_chk"
  CHECK (("ultimaLat" IS NULL OR "ultimaLat" BETWEEN -90 AND 90)
     AND ("ultimaLon" IS NULL OR "ultimaLon" BETWEEN -180 AND 180));

-- authorizations
ALTER TABLE "authorizations" ADD CONSTRAINT "authorizations_usos_permitidos_chk"
  CHECK ("usosPermitidos" BETWEEN 1 AND 1000);
ALTER TABLE "authorizations" ADD CONSTRAINT "authorizations_usos_chk"
  CHECK ("usosRealizados" >= 0 AND "usosRealizados" <= "usosPermitidos");
ALTER TABLE "authorizations" ADD CONSTRAINT "authorizations_datas_chk" CHECK ("dataFim" >= "dataInicio");
ALTER TABLE "authorizations" ADD CONSTRAINT "authorizations_horas_formato_chk"
  CHECK ("horaInicio" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "horaFim" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
-- The format check guarantees zero-padded HH:mm, so text comparison orders them correctly.
-- A schedule that crosses midnight is not allowed (decision 7 of doc 03).
ALTER TABLE "authorizations" ADD CONSTRAINT "authorizations_horas_ordem_chk" CHECK ("horaFim" > "horaInicio");

-- nfc_tags: uppercase hexadecimal, 8 to 20 characters
ALTER TABLE "nfc_tags" ADD CONSTRAINT "nfc_tags_uid_formato_chk" CHECK ("uid" ~ '^[0-9A-F]{8,20}$');

-- qr_credentials
ALTER TABLE "qr_credentials" ADD CONSTRAINT "qr_credentials_tokenHash_sha256_chk" CHECK ("tokenHash" ~ '^[0-9a-f]{64}$');
ALTER TABLE "qr_credentials" ADD CONSTRAINT "qr_credentials_validade_chk" CHECK ("expiraEm" > "emitidoEm");

-- terminal_commands
ALTER TABLE "terminal_commands" ADD CONSTRAINT "terminal_commands_validade_chk" CHECK ("expiraEm" > "criadoEm");
