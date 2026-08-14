import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrganizacionesController } from './organizaciones.controller';
import { OrganizacionesService } from './organizaciones.service';

@Module({
  imports: [AuthModule],
  controllers: [OrganizacionesController],
  providers: [OrganizacionesService],
})
export class OrganizacionesModule {}
