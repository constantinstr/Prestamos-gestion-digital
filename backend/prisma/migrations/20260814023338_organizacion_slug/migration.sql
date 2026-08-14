-- AlterTable: agregar slug nullable primero para poder rellenar filas existentes
ALTER TABLE "organizaciones" ADD COLUMN "slug" TEXT;

-- Rellenar slug de organizaciones ya existentes a partir del nombre (lowercase, guiones),
-- con el id como sufijo para garantizar unicidad.
UPDATE "organizaciones"
SET "slug" = lower(regexp_replace(regexp_replace("nombre", '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
             || '-' || substr("id", 1, 8)
WHERE "slug" IS NULL;

-- Ahora sí, requerido y único
ALTER TABLE "organizaciones" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "organizaciones_slug_key" ON "organizaciones"("slug");
