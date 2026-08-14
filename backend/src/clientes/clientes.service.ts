import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { EstadoInvitacion, TipoDocumentoKyc } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { TokenService } from '../auth/token.service';
import { InvitacionesService } from '../invitaciones/invitaciones.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { LoginClienteDto } from './dto/login-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly tokens: TokenService,
    private readonly invitaciones: InvitacionesService,
  ) {}

  async crear(dto: CreateClienteDto) {
    const invitacion = await this.invitaciones.obtenerVigente(dto.token);

    const existente = await this.prisma.cliente.findFirst({
      where: { OR: [{ dni: dto.dni }, { cuil: dto.cuil }] },
    });
    if (existente) {
      throw new BadRequestException(
        'Ya existe un cliente registrado con ese DNI/CUIL',
      );
    }

    // `token` ya se consumió arriba (obtenerVigente); se excluye para no persistirlo en Cliente.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, token, ...datosCliente } = dto;
    const passwordHash = await argon2.hash(password);

    const cliente = await this.prisma.$transaction(async (tx) => {
      const cliente = await tx.cliente.create({
        data: {
          ...datosCliente,
          organizacionId: invitacion.organizacionId,
          passwordHash,
          fechaNacimiento: new Date(dto.fechaNacimiento),
        },
      });
      await tx.invitacionCliente.update({
        where: { id: invitacion.id },
        data: {
          estado: EstadoInvitacion.USADA,
          usadaEn: new Date(),
          clienteId: cliente.id,
        },
      });
      return cliente;
    });

    const tokens = await this.tokens.generarPar({
      sub: cliente.id,
      email: cliente.email ?? '',
      rol: null as unknown as string,
      organizacionId: cliente.organizacionId,
      tipo: 'cliente',
    });

    return { cliente: this.aPublico(cliente), ...tokens };
  }

  async subirDocumento(
    clienteId: string,
    tipo: TipoDocumentoKyc,
    archivo: Express.Multer.File,
  ) {
    await this.obtenerOFallar(clienteId);

    const extension = archivo.mimetype.split('/').pop() ?? 'bin';
    const { storageKey, hashIntegridad } = await this.storage.subir(
      `kyc/${clienteId}`,
      archivo.buffer,
      extension,
    );

    return this.prisma.documentoKyc.create({
      data: { clienteId, tipo, storageKey, hashIntegridad },
    });
  }

  async estadoDocumentos(clienteId: string) {
    const documentos = await this.documentosVigentesPorTipo(clienteId);
    return documentos.map(({ id, tipo, verificado, livenessScore }) => ({
      id,
      tipo,
      verificado,
      livenessScore,
    }));
  }

  /** Backoffice: documentos vigentes del cliente (el más reciente por tipo), con URL para visualizarlos. */
  async documentosDeOrganizacion(clienteId: string, organizacionId: string) {
    await this.obtenerDeOrganizacion(clienteId, organizacionId);
    const documentos = await this.documentosVigentesPorTipo(clienteId);
    return Promise.all(
      documentos.map(async (doc) => ({
        ...doc,
        url: await this.storage.obtenerUrlFirmada(doc.storageKey),
      })),
    );
  }

  /** Backoffice: aprueba o rechaza un documento KYC vigente del cliente. */
  async verificarDocumento(
    clienteId: string,
    documentoId: string,
    organizacionId: string,
    verificadoPorId: string,
    aprobado: boolean,
    motivoRechazo?: string,
  ) {
    await this.obtenerDeOrganizacion(clienteId, organizacionId);
    const { count } = await this.prisma.documentoKyc.updateMany({
      where: { id: documentoId, clienteId },
      data: {
        verificado: aprobado,
        verificadoPorId,
        verificadoEn: new Date(),
        motivoRechazo: aprobado
          ? null
          : (motivoRechazo ?? 'Rechazado sin motivo especificado'),
      },
    });
    if (count === 0) throw new NotFoundException('Documento no encontrado');
    return this.prisma.documentoKyc.findUniqueOrThrow({
      where: { id: documentoId },
    });
  }

  /** Se queda con el documento más reciente de cada tipo (por si el cliente resubió alguno). */
  private async documentosVigentesPorTipo(clienteId: string) {
    const documentos = await this.prisma.documentoKyc.findMany({
      where: { clienteId },
      orderBy: { createdAt: 'desc' },
    });
    const vistos = new Set<string>();
    return documentos.filter((doc) => {
      if (vistos.has(doc.tipo)) return false;
      vistos.add(doc.tipo);
      return true;
    });
  }

  async firmar(clienteId: string) {
    await this.obtenerOFallar(clienteId);
    return this.prisma.documentoKyc.create({
      data: {
        clienteId,
        tipo: TipoDocumentoKyc.FIRMA,
        storageKey: `firmas/${clienteId}-${Date.now()}.json`,
        hashIntegridad: 'pendiente', // se completa al persistir el comprobante de aceptación T&C
        verificado: true,
      },
    });
  }

  async obtener(clienteId: string) {
    return this.aPublico(await this.obtenerOFallar(clienteId));
  }

  /** Backoffice: solo puede ver clientes de su propia organización. */
  async obtenerDeOrganizacion(clienteId: string, organizacionId: string) {
    const cliente = await this.obtenerOFallar(clienteId);
    if (cliente.organizacionId !== organizacionId) {
      throw new NotFoundException('Cliente no encontrado');
    }
    return this.aPublico(cliente);
  }

  /** Backoffice: clientes de la organización del usuario autenticado, con su estado de KYC. */
  async listarDeOrganizacion(organizacionId: string) {
    const clientes = await this.prisma.cliente.findMany({
      where: { organizacionId },
      orderBy: { createdAt: 'desc' },
      include: {
        documentos: {
          select: { tipo: true, verificado: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    return clientes.map(({ documentos, ...cliente }) => {
      const vigentesPorTipo = new Map<string, boolean>();
      for (const doc of documentos) {
        if (!vigentesPorTipo.has(doc.tipo))
          vigentesPorTipo.set(doc.tipo, doc.verificado);
      }
      const requeridos = ['DNI_FRENTE', 'DNI_DORSO', 'SELFIE', 'FIRMA'];
      return {
        ...this.aPublico(cliente),
        kycSubido: requeridos.every((tipo) => vigentesPorTipo.has(tipo)),
        kycCompleto: requeridos.every(
          (tipo) => vigentesPorTipo.get(tipo) === true,
        ),
      };
    });
  }

  async misPrestamos(clienteId: string) {
    return this.prisma.prestamo.findMany({
      where: { clienteId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async actualizar(
    clienteId: string,
    dto: Partial<Omit<CreateClienteDto, 'password' | 'token'>>,
  ) {
    await this.obtenerOFallar(clienteId);
    const cliente = await this.prisma.cliente.update({
      where: { id: clienteId },
      data: {
        ...dto,
        fechaNacimiento: dto.fechaNacimiento
          ? new Date(dto.fechaNacimiento)
          : undefined,
      },
    });
    return this.aPublico(cliente);
  }

  async loginCliente({ dni, password }: LoginClienteDto) {
    const cliente = await this.prisma.cliente.findUnique({ where: { dni } });
    if (!cliente || !cliente.passwordHash)
      throw new UnauthorizedException('Credenciales inválidas');

    const passwordValida = await argon2.verify(cliente.passwordHash, password);
    if (!passwordValida)
      throw new UnauthorizedException('Credenciales inválidas');

    const tokens = await this.tokens.generarPar({
      sub: cliente.id,
      email: cliente.email ?? '',
      rol: null as unknown as string,
      organizacionId: cliente.organizacionId,
      tipo: 'cliente',
    });

    return { cliente: this.aPublico(cliente), ...tokens };
  }

  private async obtenerOFallar(clienteId: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: clienteId },
    });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');
    return cliente;
  }

  private aPublico(cliente: {
    id: string;
    dni: string;
    cuil: string;
    nombres: string;
    apellidos: string;
    fechaNacimiento: Date;
    telefono: string;
    email: string | null;
    estado: string;
  }) {
    const {
      id,
      dni,
      cuil,
      nombres,
      apellidos,
      fechaNacimiento,
      telefono,
      email,
      estado,
    } = cliente;
    return {
      id,
      dni,
      cuil,
      nombres,
      apellidos,
      fechaNacimiento,
      telefono,
      email,
      estado,
    };
  }
}
