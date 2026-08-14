import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './token.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  async loginUsuario({ email, password }: LoginDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
      include: { rol: true },
    });
    if (!usuario || !usuario.activo)
      throw new UnauthorizedException('Credenciales inválidas');

    const passwordValida = await argon2.verify(usuario.passwordHash, password);
    if (!passwordValida)
      throw new UnauthorizedException('Credenciales inválidas');

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoLogin: new Date() },
    });

    return this.tokens.generarPar({
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol.nombre,
      organizacionId: usuario.organizacionId,
      tipo: 'usuario',
    });
  }

  async refresh(refreshToken: string) {
    const payload = await this.tokens.verificarRefresh(refreshToken);
    return this.tokens.generarPar(payload);
  }
}
