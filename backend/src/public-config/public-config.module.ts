import { Module } from '@nestjs/common';
import { ConfiguracionTasasModule } from '../configuracion-tasas/configuracion-tasas.module';
import { PublicConfigController } from './public-config.controller';

@Module({
  imports: [ConfiguracionTasasModule],
  controllers: [PublicConfigController],
})
export class PublicConfigModule {}
