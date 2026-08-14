import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const [adminGeneral, analistaCredito, cajero] = await Promise.all([
    prisma.role.upsert({
      where: { nombre: 'ADMIN_GENERAL' },
      update: {},
      create: {
        nombre: 'ADMIN_GENERAL',
        descripcion: 'Configuración de tasas y gestión de usuarios',
      },
    }),
    prisma.role.upsert({
      where: { nombre: 'ANALISTA_CREDITO' },
      update: {},
      create: {
        nombre: 'ANALISTA_CREDITO',
        descripcion: 'Verificación KYC y aprobación/rechazo de solicitudes',
      },
    }),
    prisma.role.upsert({
      where: { nombre: 'CAJERO' },
      update: {},
      create: {
        nombre: 'CAJERO',
        descripcion: 'Registro de cobros y entrega de préstamos en sucursal',
      },
    }),
  ]);

  // Organización de ejemplo para desarrollo local. En producción cada
  // prestamista crea la suya propia vía POST /organizaciones.
  const organizacion = await prisma.organizacion.upsert({
    where: { cuit: '30712345678' },
    update: {},
    create: {
      nombre: 'Presto Cuotas Demo',
      slug: 'presto-cuotas-demo',
      razonSocial: 'Presto Cuotas Demo SRL',
      cuit: '30712345678',
    },
  });

  const sucursal = await prisma.sucursal.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      organizacionId: organizacion.id,
      nombre: 'Casa Central',
      direccion: 'Av. Siempre Viva 123, CABA',
      telefono: '5491100000000',
    },
  });

  const passwordHash = await argon2.hash('CambiarEn2026!');
  await prisma.usuario.upsert({
    where: { email: 'admin@prestocuotas.com' },
    update: {},
    create: {
      organizacionId: organizacion.id,
      nombre: 'Administrador General',
      email: 'admin@prestocuotas.com',
      passwordHash,
      rolId: adminGeneral.id,
      sucursalId: sucursal.id,
    },
  });

  const tasaVigente = await prisma.configuracionTasa.findFirst({
    where: { organizacionId: organizacion.id, activo: true },
  });
  if (!tasaVigente) {
    await prisma.configuracionTasa.create({
      data: {
        organizacionId: organizacion.id,
        nombre: 'Tasa estándar 2026',
        tna: 65.5,
        tea: 88.2,
        moraDiariaPct: 0.5,
        gastosAdministrativos: 5000,
        montoMinimo: 20000,
        montoMaximo: 2000000,
        cuotasMinimas: 3,
        cuotasMaximas: 24,
      },
    });
  }

  console.log('Seed completo:', {
    organizacion,
    adminGeneral,
    analistaCredito,
    cajero,
    sucursal,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
