import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  rol: string;
  organizacionId: string;
  tipo: 'usuario' | 'cliente';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.tipo === 'usuario') {
      const usuario = await this.prisma.usuario.findUnique({
        where: { id: payload.sub },
        include: { rol: true },
      });
      if (!usuario || !usuario.activo) throw new UnauthorizedException();
      return {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol.nombre,
        sucursalId: usuario.sucursalId,
        organizacionId: usuario.organizacionId,
        tipo: 'usuario',
      };
    }

    const cliente = await this.prisma.cliente.findUnique({
      where: { id: payload.sub },
    });
    if (!cliente || cliente.estado !== 'ACTIVO')
      throw new UnauthorizedException();
    return {
      id: cliente.id,
      email: cliente.email,
      rol: null,
      organizacionId: cliente.organizacionId,
      tipo: 'cliente',
    };
  }
}
