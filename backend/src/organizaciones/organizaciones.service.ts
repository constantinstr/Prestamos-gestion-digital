import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { Rol } from '../common/enums/rol.enum';
import { slugify } from '../common/slugify';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from '../auth/token.service';
import { CrearOrganizacionDto } from './dto/crear-organizacion.dto';

@Injectable()
export class OrganizacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  /** Alta de un nuevo prestamista en la plataforma: crea su organización y
   * el primer usuario (Admin General) que queda a cargo de invitar al resto. */
  async crear(dto: CrearOrganizacionDto) {
    const existente = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });
    if (existente)
      throw new BadRequestException(
        'Ya existe un usuario registrado con ese email',
      );

    const rolAdmin = await this.prisma.role.findUnique({
      where: { nombre: Rol.ADMIN_GENERAL },
    });
    if (!rolAdmin) {
      throw new BadRequestException(
        'El catálogo de roles no está inicializado (falta ejecutar el seed)',
      );
    }

    const passwordHash = await argon2.hash(dto.password);
    const slug = await this.generarSlugUnico(dto.nombre);

    const { organizacion, usuario } = await this.prisma.$transaction(
      async (tx) => {
        const organizacion = await tx.organizacion.create({
          data: {
            nombre: dto.nombre,
            slug,
            razonSocial: dto.razonSocial,
            cuit: dto.cuit,
          },
        });
        const usuario = await tx.usuario.create({
          data: {
            organizacionId: organizacion.id,
            nombre: dto.nombreAdmin,
            email: dto.email,
            passwordHash,
            rolId: rolAdmin.id,
          },
          include: { rol: true },
        });
        return { organizacion, usuario };
      },
    );

    const tokensSesion = await this.tokens.generarPar({
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol.nombre,
      organizacionId: organizacion.id,
      tipo: 'usuario',
    });

    return {
      organizacion,
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email },
      ...tokensSesion,
    };
  }

  /** Datos públicos mínimos para mostrar el branding del prestamista en su URL propia. */
  async obtenerPorSlug(slug: string) {
    const organizacion = await this.prisma.organizacion.findUnique({
      where: { slug },
      select: { id: true, nombre: true, slug: true },
    });
    if (!organizacion)
      throw new NotFoundException('Organización no encontrada');
    return organizacion;
  }

  private async generarSlugUnico(nombre: string): Promise<string> {
    const base = slugify(nombre) || 'prestamista';
    let candidato = base;
    let sufijo = 1;
    while (
      await this.prisma.organizacion.findUnique({ where: { slug: candidato } })
    ) {
      sufijo += 1;
      candidato = `${base}-${sufijo}`;
    }
    return candidato;
  }
}
