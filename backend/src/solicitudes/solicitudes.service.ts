import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EstadoSolicitud, Solicitud } from '@prisma/client';
import { CLIENTE_RESUMEN_SELECT } from '../common/prisma-selects';
import { PrismaService } from '../prisma/prisma.service';
import { ConfiguracionTasasService } from '../configuracion-tasas/configuracion-tasas.service';
import { PrestamosService } from '../prestamos/prestamos.service';
import { BuroService } from '../buro/buro.service';
import { ReglasDecisionService } from './reglas-decision.service';
import { CreateSolicitudDto } from './dto/create-solicitud.dto';
import { DecisionSolicitudDto } from './dto/decision-solicitud.dto';
import { BURO_QUEUE } from '../queues/queue.module';

@Injectable()
export class SolicitudesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configuracionTasas: ConfiguracionTasasService,
    private readonly prestamos: PrestamosService,
    private readonly buro: BuroService,
    private readonly reglas: ReglasDecisionService,
    @InjectQueue(BURO_QUEUE) private readonly buroQueue: Queue,
  ) {}

  async crear(
    clienteId: string,
    organizacionId: string,
    dto: CreateSolicitudDto,
  ) {
    const tasaVigente = await this.configuracionTasas.vigente(organizacionId);
    const montoMinimo = Number(tasaVigente.montoMinimo);
    const montoMaximo = Number(tasaVigente.montoMaximo);

    if (
      dto.montoSolicitado < montoMinimo ||
      dto.montoSolicitado > montoMaximo
    ) {
      throw new BadRequestException(
        `El monto debe estar entre ${montoMinimo} y ${montoMaximo}`,
      );
    }
    if (
      dto.cantidadCuotas < tasaVigente.cuotasMinimas ||
      dto.cantidadCuotas > tasaVigente.cuotasMaximas
    ) {
      throw new BadRequestException(
        `La cantidad de cuotas debe estar entre ${tasaVigente.cuotasMinimas} y ${tasaVigente.cuotasMaximas}`,
      );
    }

    const solicitud = await this.prisma.solicitud.create({
      data: {
        clienteId,
        montoSolicitado: dto.montoSolicitado,
        cantidadCuotas: dto.cantidadCuotas,
        estado: EstadoSolicitud.CONSULTANDO_BURO,
        configuracionTasasId: tasaVigente.id,
      },
    });

    await this.buroQueue.add('consultar', { solicitudId: solicitud.id });

    return solicitud;
  }

  /** Invocado por el processor de la cola `buro` tras encolar la solicitud. */
  async procesarConsultaBuro(solicitudId: string) {
    const solicitud = await this.prisma.solicitud.findUniqueOrThrow({
      where: { id: solicitudId },
    });
    const cliente = await this.prisma.cliente.findUniqueOrThrow({
      where: { id: solicitud.clienteId },
    });

    const respuestaBuro = await this.buro.consultar(cliente.dni, cliente.cuil);

    await this.prisma.logBuro.create({
      data: {
        solicitudId,
        clienteId: cliente.id,
        proveedor: respuestaBuro.proveedor,
        score: respuestaBuro.score,
        situacionBcra: respuestaBuro.situacionBcra,
        respuestaRaw: respuestaBuro.respuestaRaw as never,
      },
    });

    const resultado = this.reglas.evaluar(respuestaBuro);

    if (resultado === EstadoSolicitud.PRE_APROBADA) {
      // Aprobación automática: se resuelve directamente como APROBADA y se genera el préstamo.
      const solicitudActualizada = await this.prisma.solicitud.update({
        where: { id: solicitudId },
        data: { estado: EstadoSolicitud.APROBADA, resueltoAt: new Date() },
      });
      await this.crearPrestamoParaSolicitud(
        solicitudActualizada,
        cliente.organizacionId,
      );
      return;
    }

    await this.prisma.solicitud.update({
      where: { id: solicitudId },
      data: {
        estado: resultado,
        resueltoAt:
          resultado === EstadoSolicitud.RECHAZADA_AUTOMATICA
            ? new Date()
            : undefined,
      },
    });
  }

  async listar(organizacionId: string, estado?: EstadoSolicitud) {
    return this.prisma.solicitud.findMany({
      where: { estado, cliente: { organizacionId } },
      orderBy: { createdAt: 'desc' },
      include: { cliente: { select: CLIENTE_RESUMEN_SELECT } },
    });
  }

  /** Uso interno (processor de la cola), sin restricción de organización. */
  private async obtenerInterno(id: string) {
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id },
      include: { cliente: { select: CLIENTE_RESUMEN_SELECT } },
    });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada');
    return solicitud;
  }

  async obtener(id: string, organizacionId: string) {
    const solicitud = await this.obtenerInterno(id);
    if (solicitud.cliente.organizacionId !== organizacionId) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    return solicitud;
  }

  async informeBuro(id: string, organizacionId: string) {
    await this.obtener(id, organizacionId);
    return this.prisma.logBuro.findMany({
      where: { solicitudId: id },
      orderBy: { consultadoEn: 'desc' },
    });
  }

  async decidir(
    id: string,
    dto: DecisionSolicitudDto,
    analistaId: string,
    organizacionId: string,
  ) {
    const solicitud = await this.obtener(id, organizacionId);
    if (solicitud.estado !== EstadoSolicitud.EN_REVISION) {
      throw new ForbiddenException(
        'Solo se pueden resolver manualmente solicitudes en revisión',
      );
    }

    if (dto.decision === 'APROBADA') {
      const solicitudActualizada = await this.prisma.solicitud.update({
        where: { id },
        data: {
          estado: EstadoSolicitud.APROBADA,
          analistaId,
          resueltoAt: new Date(),
        },
      });
      return this.crearPrestamoParaSolicitud(
        solicitudActualizada,
        organizacionId,
      );
    }

    return this.prisma.solicitud.update({
      where: { id },
      data: {
        estado: EstadoSolicitud.RECHAZADA_MANUAL,
        analistaId,
        motivoRechazo: dto.motivo,
        resueltoAt: new Date(),
      },
    });
  }

  private async crearPrestamoParaSolicitud(
    solicitud: Solicitud,
    organizacionId: string,
  ) {
    const tasa = await this.prisma.configuracionTasa.findUniqueOrThrow({
      where: { id: solicitud.configuracionTasasId! },
    });
    return this.prestamos.crearDesdeOrigen(
      {
        organizacionId,
        clienteId: solicitud.clienteId,
        montoSolicitado: Number(solicitud.montoSolicitado),
        cantidadCuotas: solicitud.cantidadCuotas,
        solicitudId: solicitud.id,
      },
      Number(tasa.tna),
      Number(tasa.tea),
    );
  }
}
