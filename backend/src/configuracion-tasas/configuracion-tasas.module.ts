import { Module } from '@nestjs/common';
import { ConfiguracionTasasService } from './configuracion-tasas.service';
import { ConfiguracionTasasController } from './configuracion-tasas.controller';

@Module({
  controllers: [ConfiguracionTasasController],
  providers: [ConfiguracionTasasService],
  exports: [ConfiguracionTasasService],
})
export class ConfiguracionTasasModule {}
