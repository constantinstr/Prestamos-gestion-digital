import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TipoMensajeWhatsapp } from '@prisma/client';

const PLANTILLA_ESTADO_CUENTA =
  'Hola, soy {{nombre}} {{apellido}} (DNI {{dni}}). Quiero consultar el estado de cuenta de mi préstamo N° {{numero_prestamo}}.';

const PLANTILLA_RECORDATORIO =
  'Hola {{nombre}}, te recordamos que la cuota N° {{numero_cuota}} de tu préstamo {{numero_prestamo}} por ${{monto_cuota}} vence el {{fecha_vencimiento}}. Podés abonarla en nuestra sucursal {{sucursal_nombre}} ({{sucursal_direccion}}). Ante dudas, respondé este mensaje.';

type Contexto = Record<string, string | number>;

@Injectable()
export class WhatsappLinkService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /** Cliente -> Empresa: pre-llena mensaje con DNI y N° de préstamo para identificación rápida. */
  async generarLinkEstadoCuenta(
    clienteId: string,
    prestamoId: string,
    generadoPorId?: string,
  ) {
    const [cliente, prestamo] = await Promise.all([
      this.prisma.cliente.findUniqueOrThrow({ where: { id: clienteId } }),
      this.prisma.prestamo.findUniqueOrThrow({ where: { id: prestamoId } }),
    ]);

    const numeroEmpresa = this.config.getOrThrow<string>(
      'WHATSAPP_NUMERO_EMPRESA',
    );

    return this.generarYRegistrar(
      numeroEmpresa,
      PLANTILLA_ESTADO_CUENTA,
      {
        nombre: cliente.nombres,
        apellido: cliente.apellidos,
        dni: cliente.dni,
        numero_prestamo: prestamo.id,
      },
      TipoMensajeWhatsapp.ESTADO_CUENTA,
      clienteId,
      prestamoId,
      generadoPorId,
    );
  }

  /** Empresa -> Cliente: recordatorio de vencimiento generado por un operador de Cobranzas. */
  async generarLinkRecordatorio(
    prestamoId: string,
    cuotaId: string,
    generadoPorId: string,
    organizacionId: string,
  ) {
    const cuota = await this.prisma.cuota.findUnique({
      where: { id: cuotaId },
      include: {
        prestamo: { include: { cliente: true, sucursalEntrega: true } },
      },
    });
    if (
      !cuota ||
      cuota.prestamo.organizacionId !== organizacionId ||
      cuota.prestamoId !== prestamoId
    ) {
      throw new NotFoundException('Cuota no encontrada');
    }
    const { cliente, sucursalEntrega } = cuota.prestamo;

    return this.generarYRegistrar(
      cliente.telefono,
      PLANTILLA_RECORDATORIO,
      {
        nombre: cliente.nombres,
        numero_cuota: cuota.numeroCuota,
        numero_prestamo: prestamoId,
        monto_cuota: Number(cuota.montoTotal).toFixed(2),
        fecha_vencimiento: cuota.fechaVencimiento.toLocaleDateString('es-AR'),
        sucursal_nombre: sucursalEntrega?.nombre ?? 'nuestra sucursal',
        sucursal_direccion: sucursalEntrega?.direccion ?? '',
      },
      TipoMensajeWhatsapp.RECORDATORIO_VENCIMIENTO,
      cliente.id,
      prestamoId,
      generadoPorId,
    );
  }

  private async generarYRegistrar(
    telefonoDestino: string,
    plantilla: string,
    contexto: Contexto,
    tipoMensaje: TipoMensajeWhatsapp,
    clienteId: string,
    prestamoId: string,
    generadoPorId?: string,
  ) {
    const numero = normalizarTelefonoArgentinaE164(telefonoDestino);
    const mensaje = renderPlantilla(plantilla, contexto);
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;

    await this.prisma.mensajeWhatsappLog.create({
      data: {
        clienteId,
        prestamoId,
        tipoMensaje,
        telefonoDestino: numero,
        mensajeTexto: mensaje,
        urlGenerada: url,
        generadoPorId,
      },
    });

    return { url };
  }
}

function renderPlantilla(plantilla: string, contexto: Contexto): string {
  return plantilla.replace(/{{(\w+)}}/g, (_match: string, key: string) =>
    contexto[key] !== undefined ? String(contexto[key]) : `{{${key}}}`,
  );
}

function normalizarTelefonoArgentinaE164(telefono: string): string {
  const soloDigitos = telefono.replace(/\D/g, '');
  if (soloDigitos.startsWith('549')) return soloDigitos;
  if (soloDigitos.startsWith('54')) return `549${soloDigitos.slice(2)}`;
  const sinCero = soloDigitos.replace(/^0/, '');
  return `549${sinCero}`;
}
