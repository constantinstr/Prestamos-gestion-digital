import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { AuthModule } from './auth/auth.module';
import { OrganizacionesModule } from './organizaciones/organizaciones.module';
import { InvitacionesModule } from './invitaciones/invitaciones.module';
import { ClientesModule } from './clientes/clientes.module';
import { SolicitudesModule } from './solicitudes/solicitudes.module';
import { OfertasModule } from './ofertas/ofertas.module';
import { PrestamosModule } from './prestamos/prestamos.module';
import { CajaModule } from './caja/caja.module';
import { CobranzasModule } from './cobranzas/cobranzas.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { ConfiguracionTasasModule } from './configuracion-tasas/configuracion-tasas.module';
import { PublicConfigModule } from './public-config/public-config.module';
import { AlertasModule } from './alertas/alertas.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StorageModule,
    WhatsappModule,
    AuthModule,
    OrganizacionesModule,
    InvitacionesModule,
    ClientesModule,
    SolicitudesModule,
    OfertasModule,
    PrestamosModule,
    CajaModule,
    CobranzasModule,
    UsuariosModule,
    ConfiguracionTasasModule,
    PublicConfigModule,
    AlertasModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
