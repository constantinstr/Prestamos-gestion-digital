import { Prisma } from '@prisma/client';

/**
 * Nunca incluir `passwordHash` (ni otros campos sensibles) en respuestas de
 * la API. Usar este select en lugar de `cliente: true` en cualquier query
 * que incluya la relación Cliente y cuyo resultado viaje en una respuesta HTTP.
 */
export const CLIENTE_RESUMEN_SELECT = {
  id: true,
  dni: true,
  cuil: true,
  nombres: true,
  apellidos: true,
  fechaNacimiento: true,
  telefono: true,
  email: true,
  estado: true,
} satisfies Prisma.ClienteSelect;
