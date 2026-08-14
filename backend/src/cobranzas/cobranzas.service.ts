import { Injectable } from '@nestjs/common';
import { EstadoCuota } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CLIENTE_RESUMEN_SELECT } from '../common/prisma-selects';
import { WhatsappLinkService } from '../whatsapp/whatsapp-link.service';

@Injectable()
export class CobranzasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappLink: WhatsappLinkService,
  ) {}

  async vencimientos(
    organizacionId: string,
    desde: Date,
    hasta: Date,
    sucursalId?: number,
  ) {
    return this.prisma.cuota.findMany({
      where: {
        estado: { in: [EstadoCuota.PENDIENTE, EstadoCuota.VENCIDA] },
        fechaVencimiento: { gte: desde, lte: hasta },
        prestamo: { organizacionId, sucursalEntregaId: sucursalId },
      },
      include: {
        prestamo: { include: { cliente: { select: CLIENTE_RESUMEN_SELECT } } },
      },
      orderBy: { fechaVencimiento: 'asc' },
    });
  }

  async recordatorioWhatsapp(
    prestamoId: string,
    cuotaId: string,
    operadorId: string,
    organizacionId: string,
  ) {
    return this.whatsappLink.generarLinkRecordatorio(
      prestamoId,
      cuotaId,
      operadorId,
      organizacionId,
    );
  }
}
