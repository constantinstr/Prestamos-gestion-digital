-- CreateEnum
CREATE TYPE "SistemaAmortizacion" AS ENUM ('FRANCES', 'ALEMAN', 'AMERICANO');

-- AlterTable
ALTER TABLE "ofertas_prestamo"
  ADD COLUMN "sistema_amortizacion" "SistemaAmortizacion" NOT NULL DEFAULT 'FRANCES';

-- AlterTable
ALTER TABLE "prestamos"
  ADD COLUMN "sistema_amortizacion" "SistemaAmortizacion" NOT NULL DEFAULT 'FRANCES';
