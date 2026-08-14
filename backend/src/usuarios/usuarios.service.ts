import { Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(organizacionId: string) {
    return this.prisma.usuario.findMany({
      where: { organizacionId },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        sucursal: true,
        activo: true,
      },
    });
  }

  async crear(dto: CreateUsuarioDto, organizacionId: string) {
    const passwordHash = await argon2.hash(dto.password);
    return this.prisma.usuario.create({
      data: {
        organizacionId,
        nombre: dto.nombre,
        email: dto.email,
        passwordHash,
        rolId: dto.rolId,
        sucursalId: dto.sucursalId,
      },
      select: { id: true, nombre: true, email: true, rolId: true },
    });
  }

  async actualizar(id: string, dto: UpdateUsuarioDto, organizacionId: string) {
    const { count } = await this.prisma.usuario.updateMany({
      where: { id, organizacionId },
      data: dto,
    });
    if (count === 0) throw new NotFoundException('Usuario no encontrado');
    return this.prisma.usuario.findUniqueOrThrow({ where: { id } });
  }

  async roles() {
    return this.prisma.role.findMany();
  }
}
