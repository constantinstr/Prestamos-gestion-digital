import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar() {
    return this.prisma.usuario.findMany({
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

  async crear(dto: CreateUsuarioDto) {
    const passwordHash = await argon2.hash(dto.password);
    return this.prisma.usuario.create({
      data: {
        nombre: dto.nombre,
        email: dto.email,
        passwordHash,
        rolId: dto.rolId,
        sucursalId: dto.sucursalId,
      },
      select: { id: true, nombre: true, email: true, rolId: true },
    });
  }

  async actualizar(id: string, dto: UpdateUsuarioDto) {
    return this.prisma.usuario.update({ where: { id }, data: dto });
  }

  async roles() {
    return this.prisma.role.findMany();
  }
}
