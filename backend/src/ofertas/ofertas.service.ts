import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { EstadoOferta } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ConfiguracionTasasService } from '../configuracion-tasas/configuracion-tasas.service';
import { PrestamosService } from '../prestamos/prestamos.service';
import { CLIENTE_RESUMEN_SELECT } from '../common/prisma-selects';
import { CrearOfertaDto } from './dto/crear-oferta.dto';

const DIAS_VIGENCIA_DEFAULT = 7;

interface DatosAceptacion {
  ip: string;
  userAgent: string;
}

@Injectable()
export class OfertasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configuracionTasas: ConfiguracionTasasService,
    private readonly prestamos: PrestamosService,
  ) {}

  /** El Admin/Analista ofrece un monto, cuotas y tasa (la vigente de la organización)
   * a un cliente de su propia cartera; el cliente decide si acepta o rechaza. */
  async crear(
    organizacionId: string,
    ofrecidoPorId: string,
    dto: CrearOfertaDto,
  ) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: dto.clienteId },
    });
    if (!cliente || cliente.organizacionId !== organizacionId) {
      throw new NotFoundException('Cliente no encontrado en tu organización');
    }

    const tasa = await this.configuracionTasas.vigente(organizacionId);
    const montoMinimo = Number(tasa.montoMinimo);
    const montoMaximo = Number(tasa.montoMaximo);
    if (dto.montoOfrecido < montoMinimo || dto.montoOfrecido > montoMaximo) {
      throw new BadRequestException(
        `El monto debe estar entre ${montoMinimo} y ${montoMaximo}`,
      );
    }
    if (
      dto.cantidadCuotas < tasa.cuotasMinimas ||
      dto.cantidadCuotas > tasa.cuotasMaximas
    ) {
      throw new BadRequestException(
        `La cantidad de cuotas debe estar entre ${tasa.cuotasMinimas} y ${tasa.cuotasMaximas}`,
      );
    }

    const expiraEn = new Date();
    expiraEn.setDate(
      expiraEn.getDate() + (dto.diasVigencia ?? DIAS_VIGENCIA_DEFAULT),
    );

    return this.prisma.ofertaPrestamo.create({
      data: {
        organizacionId,
        clienteId: dto.clienteId,
        ofrecidoPorId,
        montoOfrecido: dto.montoOfrecido,
        cantidadCuotas: dto.cantidadCuotas,
        tna: tasa.tna,
        tea: tasa.tea,
        configuracionTasasId: tasa.id,
        expiraEn,
      },
    });
  }

  async listarDeOrganizacion(organizacionId: string) {
    return this.prisma.ofertaPrestamo.findMany({
      where: { organizacionId },
      orderBy: { createdAt: 'desc' },
      include: { cliente: { select: CLIENTE_RESUMEN_SELECT } },
    });
  }

  async misOfertas(clienteId: string) {
    return this.prisma.ofertaPrestamo.findMany({
      where: { clienteId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async obtenerVigenteOFallar(id: string) {
    const oferta = await this.prisma.ofertaPrestamo.findUnique({
      where: { id },
    });
    if (!oferta) throw new NotFoundException('Oferta no encontrada');

    if (
      oferta.estado === EstadoOferta.PENDIENTE &&
      oferta.expiraEn &&
      oferta.expiraEn < new Date()
    ) {
      const expirada = await this.prisma.ofertaPrestamo.update({
        where: { id },
        data: { estado: EstadoOferta.EXPIRADA },
      });
      return expirada;
    }
    return oferta;
  }

  async obtenerDeCliente(id: string, clienteId: string) {
    const oferta = await this.obtenerVigenteOFallar(id);
    if (oferta.clienteId !== clienteId)
      throw new NotFoundException('Oferta no encontrada');
    return oferta;
  }

  /**
   * Aceptación con trazabilidad forense (clickwrap): se guarda IP, user-agent
   * y un hash SHA-256 de los términos exactos aceptados (monto, tasa, cuotas,
   * cliente, timestamp), para dejar evidencia de qué documento exacto aceptó
   * el cliente y cuándo. Esto NO constituye asesoramiento legal: para que el
   * préstamo sea ejecutable judicialmente en caso de incumplimiento, hay que
   * validar con un abogado los requisitos de la Ley 25.506 y del Código Civil
   * y Comercial (y evaluar sumar un segundo factor, p. ej. OTP por SMS).
   */
  async aceptar(id: string, clienteId: string, datos: DatosAceptacion) {
    const oferta = await this.obtenerDeCliente(id, clienteId);
    if (oferta.estado !== EstadoOferta.PENDIENTE) {
      throw new ForbiddenException(
        'Esta oferta ya no está disponible para aceptar',
      );
    }

    const aceptadaEn = new Date();
    const documento = JSON.stringify({
      ofertaId: oferta.id,
      clienteId: oferta.clienteId,
      montoOfrecido: oferta.montoOfrecido.toString(),
      cantidadCuotas: oferta.cantidadCuotas,
      tna: oferta.tna.toString(),
      tea: oferta.tea.toString(),
      aceptadaEn: aceptadaEn.toISOString(),
    });
    const hashDocumento = createHash('sha256').update(documento).digest('hex');

    const ofertaActualizada = await this.prisma.ofertaPrestamo.update({
      where: { id },
      data: {
        estado: EstadoOferta.ACEPTADA,
        aceptadaEn,
        aceptadaIp: datos.ip,
        aceptadaUserAgent: datos.userAgent,
        hashDocumento,
      },
    });

    return this.prestamos.crearDesdeOrigen(
      {
        organizacionId: oferta.organizacionId,
        clienteId: oferta.clienteId,
        montoSolicitado: Number(oferta.montoOfrecido),
        cantidadCuotas: oferta.cantidadCuotas,
        ofertaId: ofertaActualizada.id,
      },
      Number(oferta.tna),
      Number(oferta.tea),
    );
  }

  async rechazar(id: string, clienteId: string, motivo?: string) {
    const oferta = await this.obtenerDeCliente(id, clienteId);
    if (oferta.estado !== EstadoOferta.PENDIENTE) {
      throw new ForbiddenException('Esta oferta ya no está disponible');
    }
    return this.prisma.ofertaPrestamo.update({
      where: { id },
      data: { estado: EstadoOferta.RECHAZADA, motivoRechazo: motivo },
    });
  }

  async cancelar(id: string, organizacionId: string) {
    const { count } = await this.prisma.ofertaPrestamo.updateMany({
      where: { id, organizacionId, estado: EstadoOferta.PENDIENTE },
      data: { estado: EstadoOferta.CANCELADA },
    });
    if (count === 0)
      throw new NotFoundException(
        'Oferta no encontrada o ya no está pendiente',
      );
  }
}
