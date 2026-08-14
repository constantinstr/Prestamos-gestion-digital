import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoPrestamo, SistemaAmortizacion } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { calcularPlan } from './util/amortizacion.util';

/** Datos mínimos necesarios para originar un préstamo, sin importar si viene
 * de una Solicitud auto-iniciada o de una OfertaPrestamo aceptada. */
export interface OrigenPrestamo {
  organizacionId: string;
  clienteId: string;
  montoSolicitado: number;
  cantidadCuotas: number;
  sistemaAmortizacion?: SistemaAmortizacion;
  solicitudId?: string;
  ofertaId?: string;
}

/** Contexto de autorización: quién está pidiendo ver/operar el préstamo. */
export interface ContextoAcceso {
  organizacionId: string;
  /** Presente solo cuando quien consulta es el propio cliente dueño del préstamo. */
  clienteId?: string;
}

const DIAS_ALERTA_PROXIMO_VENCIMIENTO = 3;

@Injectable()
export class PrestamosService {
  constructor(private readonly prisma: PrismaService) {}

  /** Genera el préstamo y su plan de cuotas a partir de una Solicitud u Oferta ya aprobada/aceptada. */
  async crearDesdeOrigen(origen: OrigenPrestamo, tna: number, tea: number) {
    const sistema = origen.sistemaAmortizacion ?? SistemaAmortizacion.FRANCES;
    const cuotasCalculadas = calcularPlan(
      sistema,
      Number(origen.montoSolicitado),
      origen.cantidadCuotas,
      tna,
    );

    return this.prisma.prestamo.create({
      data: {
        organizacionId: origen.organizacionId,
        solicitudId: origen.solicitudId,
        ofertaId: origen.ofertaId,
        clienteId: origen.clienteId,
        montoOtorgado: origen.montoSolicitado,
        tna,
        tea,
        sistemaAmortizacion: sistema,
        cantidadCuotas: origen.cantidadCuotas,
        estado: EstadoPrestamo.PENDIENTE_ENTREGA,
        cuotas: {
          create: cuotasCalculadas.map((cuota, index) => ({
            numeroCuota: cuota.numeroCuota,
            montoCapital: cuota.montoCapital,
            montoInteres: cuota.montoInteres,
            montoTotal: cuota.montoTotal,
            // Arranca igual al monto total de la cuota; se reduce a medida que
            // Caja registra pagos (parciales o totales) sobre esa cuota puntual.
            saldoPendiente: cuota.montoTotal,
            fechaVencimiento: sumarMeses(new Date(), index + 1),
          })),
        },
      },
      include: { cuotas: true },
    });
  }

  async obtener(id: string, contexto: ContextoAcceso) {
    const prestamo = await this.prisma.prestamo.findUnique({ where: { id } });
    if (!prestamo) throw new NotFoundException('Préstamo no encontrado');
    this.verificarAcceso(prestamo, contexto);
    return prestamo;
  }

  async cuotas(id: string, contexto: ContextoAcceso) {
    await this.obtener(id, contexto);
    return this.prisma.cuota.findMany({
      where: { prestamoId: id },
      orderBy: { numeroCuota: 'asc' },
    });
  }

  async pagos(id: string, contexto: ContextoAcceso) {
    await this.obtener(id, contexto);
    return this.prisma.pago.findMany({
      where: { prestamoId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        monto: true,
        metodoPago: true,
        comprobanteNumero: true,
        createdAt: true,
        cuota: { select: { numeroCuota: true } },
        sucursal: { select: { nombre: true } },
      },
    });
  }

  async estadoCuenta(id: string, contexto: ContextoAcceso) {
    const cuotas = await this.cuotas(id, contexto);
    const hoy = new Date();
    const pagado = cuotas
      .filter((c) => c.estado === 'PAGADA')
      .reduce((sum, c) => sum + Number(c.montoTotal), 0);
    const pendiente = cuotas
      .filter((c) => c.estado !== 'PAGADA')
      .reduce((sum, c) => sum + Number(c.saldoPendiente), 0);
    const proximaCuota = cuotas.find(
      (c) => c.estado === 'PENDIENTE' || c.estado === 'VENCIDA',
    );

    const cuotasVencidas = cuotas.filter((c) => c.estado === 'VENCIDA');
    const diasParaVencimiento = proximaCuota
      ? Math.ceil(
          (proximaCuota.fechaVencimiento.getTime() - hoy.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : null;

    return {
      totalPagado: pagado,
      totalPendiente: pendiente,
      proximoVencimiento: proximaCuota?.fechaVencimiento ?? null,
      cantidadCuotasPendientes: cuotas.filter((c) => c.estado !== 'PAGADA')
        .length,
      alertas: {
        tieneCuotasVencidas: cuotasVencidas.length > 0,
        cantidadCuotasVencidas: cuotasVencidas.length,
        proximoVencimientoEnDias:
          diasParaVencimiento !== null && diasParaVencimiento >= 0
            ? diasParaVencimiento
            : null,
        proximoVencimientoUrgente:
          diasParaVencimiento !== null &&
          diasParaVencimiento >= 0 &&
          diasParaVencimiento <= DIAS_ALERTA_PROXIMO_VENCIMIENTO,
      },
    };
  }

  async entregar(
    id: string,
    sucursalId: number,
    usuarioId: string,
    organizacionId: string,
  ) {
    const prestamo = await this.obtener(id, { organizacionId });
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

  private verificarAcceso(
    prestamo: { organizacionId: string; clienteId: string },
    contexto: ContextoAcceso,
  ) {
    if (contexto.clienteId) {
      if (prestamo.clienteId !== contexto.clienteId) {
        throw new NotFoundException('Préstamo no encontrado');
      }
      return;
    }
    if (prestamo.organizacionId !== contexto.organizacionId) {
      throw new NotFoundException('Préstamo no encontrado');
    }
  }
}

function sumarMeses(fecha: Date, meses: number): Date {
  const resultado = new Date(fecha);
  resultado.setMonth(resultado.getMonth() + meses);
  return resultado;
}
