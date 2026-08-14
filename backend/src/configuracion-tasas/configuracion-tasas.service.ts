import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConfiguracionTasasService {
  constructor(private readonly prisma: PrismaService) {}

  async vigente() {
    const tasa = await this.prisma.configuracionTasa.findFirst({
      where: { activo: true },
      orderBy: { vigenteDesde: 'desc' },
    });
    if (!tasa)
      throw new NotFoundException('No hay una configuración de tasas vigente');
    return tasa;
  }

  crearVersion(data: {
    nombre: string;
    tna: number;
    tea: number;
    moraDiariaPct: number;
    gastosAdministrativos: number;
    montoMinimo: number;
    montoMaximo: number;
    cuotasMinimas: number;
    cuotasMaximas: number;
    creadoPorId: string;
  }) {
    // Se versiona: la tasa anterior queda como historial (activo=false), nunca se edita in place
    // porque puede haber préstamos activos que referencian la versión vigente al momento de otorgarse.
    return this.prisma.$transaction(async (tx) => {
      await tx.configuracionTasa.updateMany({
        where: { activo: true },
        data: { activo: false },
      });
      return tx.configuracionTasa.create({ data });
    });
  }
}
