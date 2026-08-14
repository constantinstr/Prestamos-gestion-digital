import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoPrestamo, Solicitud } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { calcularPlanDeCuotas } from './util/amortizacion.util';

@Injectable()
export class PrestamosService {
  constructor(private readonly prisma: PrismaService) {}

  /** Se invoca cuando una solicitud pasa a estado APROBADA. Genera el préstamo y su plan de cuotas. */
  async crearDesdeSolicitud(solicitud: Solicitud, tna: number, tea: number) {
    const cuotasCalculadas = calcularPlanDeCuotas(
      Number(solicitud.montoSolicitado),
      solicitud.cantidadCuotas,
      tna,
    );

    return this.prisma.prestamo.create({
      data: {
        solicitudId: solicitud.id,
        clienteId: solicitud.clienteId,
        montoOtorgado: solicitud.montoSolicitado,
        tna,
        tea,
        cantidadCuotas: solicitud.cantidadCuotas,
        estado: EstadoPrestamo.PENDIENTE_ENTREGA,
        cuotas: {
          create: cuotasCalculadas.map((cuota, index) => ({
            numeroCuota: cuota.numeroCuota,
            montoCapital: cuota.montoCapital,
            montoInteres: cuota.montoInteres,
            montoTotal: cuota.montoTotal,
            saldoPendiente: cuota.saldoPendiente,
            fechaVencimiento: sumarMeses(new Date(), index + 1),
          })),
        },
      },
      include: { cuotas: true },
    });
  }

  async obtener(id: string) {
    const prestamo = await this.prisma.prestamo.findUnique({ where: { id } });
    if (!prestamo) throw new NotFoundException('Préstamo no encontrado');
    return prestamo;
  }

  async cuotas(id: string) {
    await this.obtener(id);
    return this.prisma.cuota.findMany({
      where: { prestamoId: id },
      orderBy: { numeroCuota: 'asc' },
    });
  }

  async estadoCuenta(id: string) {
    const cuotas = await this.cuotas(id);
    const pagado = cuotas
      .filter((c) => c.estado === 'PAGADA')
      .reduce((sum, c) => sum + Number(c.montoTotal), 0);
    const pendiente = cuotas
      .filter((c) => c.estado !== 'PAGADA')
      .reduce((sum, c) => sum + Number(c.saldoPendiente), 0);
    const proximaCuota = cuotas.find(
      (c) => c.estado === 'PENDIENTE' || c.estado === 'VENCIDA',
    );

    return {
      totalPagado: pagado,
      totalPendiente: pendiente,
      proximoVencimiento: proximaCuota?.fechaVencimiento ?? null,
      cantidadCuotasPendientes: cuotas.filter((c) => c.estado !== 'PAGADA')
        .length,
    };
  }

  async entregar(id: string, sucursalId: number, usuarioId: string) {
    const prestamo = await this.obtener(id);
    if (prestamo.estado !== EstadoPrestamo.PENDIENTE_ENTREGA) {
      throw new ForbiddenException(
        'El préstamo ya fue entregado o no está en condiciones de entrega',
      );
    }

    return this.prisma.prestamo.update({
      where: { id },
      data: {
        estado: EstadoPrestamo.ACTIVO,
        fechaDesembolso: new Date(),
        sucursalEntregaId: sucursalId,
        usuarioEntregaId: usuarioId,
      },
    });
  }
}

function sumarMeses(fecha: Date, meses: number): Date {
  const resultado = new Date(fecha);
  resultado.setMonth(resultado.getMonth() + meses);
  return resultado;
}
