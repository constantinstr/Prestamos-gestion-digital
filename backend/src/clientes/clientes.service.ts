import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { TipoDocumentoKyc } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { TokenService } from '../auth/token.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { LoginClienteDto } from './dto/login-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly tokens: TokenService,
  ) {}

  async crear(dto: CreateClienteDto) {
    const existente = await this.prisma.cliente.findFirst({
      where: { OR: [{ dni: dto.dni }, { cuil: dto.cuil }] },
    });
    if (existente) {
      throw new BadRequestException(
        'Ya existe un cliente registrado con ese DNI/CUIL',
      );
    }

    const { password, ...datosCliente } = dto;
    const passwordHash = await argon2.hash(password);

    const cliente = await this.prisma.cliente.create({
      data: {
        ...datosCliente,
        passwordHash,
        fechaNacimiento: new Date(dto.fechaNacimiento),
      },
    });

    const tokens = await this.tokens.generarPar({
      sub: cliente.id,
      email: cliente.email ?? '',
      rol: null as unknown as string,
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
    const documentos = await this.prisma.documentoKyc.findMany({
      where: { clienteId },
    });
    return documentos.map(({ id, tipo, verificado, livenessScore }) => ({
      id,
      tipo,
      verificado,
      livenessScore,
    }));
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

  async misPrestamos(clienteId: string) {
    return this.prisma.prestamo.findMany({
      where: { clienteId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async actualizar(
    clienteId: string,
    dto: Partial<Omit<CreateClienteDto, 'password'>>,
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
