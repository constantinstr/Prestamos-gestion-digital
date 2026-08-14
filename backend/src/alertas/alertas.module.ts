import { Module } from '@nestjs/common';
import { QueueModule } from '../queues/queue.module';
import { AlertasController } from './alertas.controller';
import { VencimientosService } from './vencimientos.service';
import { VencimientosProcessor } from './vencimientos.processor';

@Module({
  imports: [QueueModule],
  controllers: [AlertasController],
  providers: [VencimientosService, VencimientosProcessor],
})
export class AlertasModule {}
