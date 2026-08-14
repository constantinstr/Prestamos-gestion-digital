import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EstadoCuota } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CLIENTE_RESUMEN_SELECT } from '../common/prisma-selects';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';

@Injectable()
export class CajaService {
  constructor(private readonly prisma: PrismaService) {}

  async buscarCliente(
    organizacionId: string,
    dni?: string,
    prestamoId?: string,
  ) {
    if (dni) {
      const cliente = await this.prisma.cliente.findFirst({
        where: { dni, organizacionId },
        select: {
          ...CLIENTE_RESUMEN_SELECT,
          prestamos: { include: { cuotas: true } },
        },
      });
      if (!cliente) throw new NotFoundException('Cliente no encontrado');
      return cliente;
    }
    if (prestamoId) {
      const prestamo = await this.prisma.prestamo.findFirst({
        where: { id: prestamoId, organizacionId },
        include: { cliente: { select: CLIENTE_RESUMEN_SELECT }, cuotas: true },
      });
      if (!prestamo) throw new NotFoundException('Préstamo no encontrado');
      return prestamo;
    }
    throw new BadRequestException('Debe indicar DNI o N° de préstamo');
  }

  async registrarPago(
    cuotaId: string,
    dto: RegistrarPagoDto,
    cajeroId: string,
    sucursalId: number,
    organizacionId: string,
  ) {
    const cuota = await this.prisma.cuota.findFirst({
      where: { id: cuotaId, prestamo: { organizacionId } },
    });
    if (!cuota) throw new NotFoundException('Cuota no encontrada');
    if (cuota.estado === EstadoCuota.PAGADA) {
      throw new BadRequestException('La cuota ya se encuentra saldada');
    }

    const nuevoSaldo = Math.max(0, Number(cuota.saldoPendiente) - dto.monto);
    const nuevoEstado =
      nuevoSaldo === 0 ? EstadoCuota.PAGADA : EstadoCuota.PARCIAL;

    const [pago] = await this.prisma.$transaction([
      this.prisma.pago.create({
        data: {
          cuotaId,
          prestamoId: cuota.prestamoId,
          monto: dto.monto,
          metodoPago: dto.metodoPago,
          sucursalId,
          usuarioCajeroId: cajeroId,
          comprobanteNumero: generarNumeroComprobante(),
        },
      }),
      this.prisma.cuota.update({
        where: { id: cuotaId },
        data: { saldoPendiente: nuevoSaldo, estado: nuevoEstado },
      }),
    ]);

    return pago;
  }

  async comprobante(pagoId: string, organizacionId: string) {
    const pago = await this.prisma.pago.findFirst({
      where: { id: pagoId, prestamo: { organizacionId } },
      include: {
        cuota: true,
        prestamo: { include: { cliente: { select: CLIENTE_RESUMEN_SELECT } } },
        sucursal: true,
      },
    });
    if (!pago) throw new NotFoundException('Pago no encontrado');
    // TODO: renderizar a PDF (p. ej. con `pdf-lib` o `puppeteer`) reutilizando esta misma data.
    return pago;
  }
}

function generarNumeroComprobante(): string {
  return `RC-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`;
}
