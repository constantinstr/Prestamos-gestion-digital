import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { EstadoInvitacion } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CrearInvitacionDto } from './dto/crear-invitacion.dto';

const DIAS_VIGENCIA_INVITACION = 7;

@Injectable()
export class InvitacionesService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(
    organizacionId: string,
    creadoPorId: string,
    dto: CrearInvitacionDto,
  ) {
    if (!dto.telefono && !dto.email) {
      throw new BadRequestException(
        'Debe indicar al menos un teléfono o email de contacto',
      );
    }

    const expiraEn = new Date();
    expiraEn.setDate(expiraEn.getDate() + DIAS_VIGENCIA_INVITACION);

    return this.prisma.invitacionCliente.create({
      data: {
        organizacionId,
        creadoPorId,
        telefono: dto.telefono,
        email: dto.email,
        token: randomBytes(24).toString('base64url'),
        expiraEn,
      },
    });
  }

  async listar(organizacionId: string) {
    return this.prisma.invitacionCliente.findMany({
      where: { organizacionId },
      orderBy: { createdAt: 'desc' },
      include: {
        cliente: {
          select: { id: true, nombres: true, apellidos: true, dni: true },
        },
      },
    });
  }

  /** Valida un token de invitación sin consumirlo; usado por el frontend público antes de mostrar el wizard. */
  async validar(token: string) {
    const invitacion = await this.obtenerVigente(token);
    return {
      organizacion: invitacion.organizacion,
      telefono: invitacion.telefono,
      email: invitacion.email,
    };
  }

  /** Devuelve la invitación completa si está vigente, o lanza. Uso interno
   * (p. ej. ClientesService) que sí necesita el id/organizacionId completos. */
  async obtenerVigente(token: string) {
    const invitacion = await this.prisma.invitacionCliente.findUnique({
      where: { token },
      include: { organizacion: { select: { id: true, nombre: true } } },
    });
    if (!invitacion) throw new NotFoundException('Invitación no encontrada');

    if (
      invitacion.estado === EstadoInvitacion.PENDIENTE &&
      invitacion.expiraEn < new Date()
    ) {
      await this.prisma.invitacionCliente.update({
        where: { id: invitacion.id },
        data: { estado: EstadoInvitacion.EXPIRADA },
      });
      throw new BadRequestException('La invitación expiró');
    }
    if (invitacion.estado !== EstadoInvitacion.PENDIENTE) {
      throw new BadRequestException('La invitación ya no está disponible');
    }

    return invitacion;
  }

  async revocar(id: string, organizacionId: string) {
    const { count } = await this.prisma.invitacionCliente.updateMany({
      where: { id, organizacionId, estado: EstadoInvitacion.PENDIENTE },
      data: { estado: EstadoInvitacion.REVOCADA },
    });
    if (count === 0)
      throw new NotFoundException('Invitación no encontrada o ya utilizada');
  }
}
