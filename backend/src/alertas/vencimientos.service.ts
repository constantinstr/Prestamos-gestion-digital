import { Injectable, Logger } from '@nestjs/common';
import { EstadoCuota, EstadoOferta, EstadoPrestamo } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VencimientosService {
  private readonly logger = new Logger(VencimientosService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Corre periódicamente (ver VencimientosProcessor): marca cuotas y
   * ofertas vencidas/expiradas, y pone en mora los préstamos con cuotas vencidas. */
  async procesar() {
    const hoy = new Date();

    const cuotasVencidas = await this.prisma.cuota.updateMany({
      where: { estado: EstadoCuota.PENDIENTE, fechaVencimiento: { lt: hoy } },
      data: { estado: EstadoCuota.VENCIDA },
    });

    const prestamosConMora = await this.prisma.prestamo.findMany({
      where: {
        estado: EstadoPrestamo.ACTIVO,
        cuotas: { some: { estado: EstadoCuota.VENCIDA } },
      },
      select: { id: true },
    });
    if (prestamosConMora.length > 0) {
      await this.prisma.prestamo.updateMany({
        where: { id: { in: prestamosConMora.map((p) => p.id) } },
        data: { estado: EstadoPrestamo.EN_MORA },
      });
    }

    const ofertasExpiradas = await this.prisma.ofertaPrestamo.updateMany({
      where: { estado: EstadoOferta.PENDIENTE, expiraEn: { lt: hoy } },
      data: { estado: EstadoOferta.EXPIRADA },
    });

    const resultado = {
      cuotasMarcadasVencidas: cuotasVencidas.count,
      prestamosPasadosAMora: prestamosConMora.length,
      ofertasExpiradas: ofertasExpiradas.count,
    };
    this.logger.log(
      `Procesamiento de vencimientos: ${JSON.stringify(resultado)}`,
    );
    return resultado;
  }

  /** Resumen para el dashboard del backoffice de una organización puntual. */
  async resumenOrganizacion(organizacionId: string) {
    const [prestamosEnMora, cuotasVencidas, cuotasPorVencerPronto] =
      await Promise.all([
        this.prisma.prestamo.count({
          where: { organizacionId, estado: EstadoPrestamo.EN_MORA },
        }),
        this.prisma.cuota.count({
          where: { estado: EstadoCuota.VENCIDA, prestamo: { organizacionId } },
        }),
        this.prisma.cuota.count({
          where: {
            estado: EstadoCuota.PENDIENTE,
            fechaVencimiento: { gte: new Date(), lte: enDias(3) },
            prestamo: { organizacionId },
          },
        }),
      ]);
    return { prestamosEnMora, cuotasVencidas, cuotasPorVencerPronto };
  }
}

function enDias(dias: number): Date {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fecha;
}
