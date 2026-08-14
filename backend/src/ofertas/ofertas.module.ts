import { Module } from '@nestjs/common';
import { ConfiguracionTasasModule } from '../configuracion-tasas/configuracion-tasas.module';
import { PrestamosModule } from '../prestamos/prestamos.module';
import { OfertasController } from './ofertas.controller';
import { OfertasService } from './ofertas.service';

@Module({
  imports: [ConfiguracionTasasModule, PrestamosModule],
  controllers: [OfertasController],
  providers: [OfertasService],
})
export class OfertasModule {}
