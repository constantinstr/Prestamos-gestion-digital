import { Injectable } from '@nestjs/common';
import { EstadoCuota } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappLinkService } from '../whatsapp/whatsapp-link.service';

@Injectable()
export class CobranzasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappLink: WhatsappLinkService,
  ) {}

  async vencimientos(desde: Date, hasta: Date, sucursalId?: number) {
    return this.prisma.cuota.findMany({
      where: {
        estado: { in: [EstadoCuota.PENDIENTE, EstadoCuota.VENCIDA] },
        fechaVencimiento: { gte: desde, lte: hasta },
        prestamo: sucursalId ? { sucursalEntregaId: sucursalId } : undefined,
      },
      include: { prestamo: { include: { cliente: true } } },
      orderBy: { fechaVencimiento: 'asc' },
    });
  }

  async recordatorioWhatsapp(
    prestamoId: string,
    cuotaId: string,
    operadorId: string,
  ) {
    return this.whatsappLink.generarLinkRecordatorio(
      prestamoId,
      cuotaId,
      operadorId,
    );
  }
}
