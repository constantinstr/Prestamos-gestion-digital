-- AlterTable
ALTER TABLE "documentos_kyc"
  ADD COLUMN "verificado_en" TIMESTAMP(3),
  ADD COLUMN "motivo_rechazo" TEXT;
