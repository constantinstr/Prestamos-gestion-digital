import { Module } from '@nestjs/common';
import { CobranzasController } from './cobranzas.controller';
import { CobranzasService } from './cobranzas.service';

@Module({
  controllers: [CobranzasController],
  providers: [CobranzasService],
})
export class CobranzasModule {}
