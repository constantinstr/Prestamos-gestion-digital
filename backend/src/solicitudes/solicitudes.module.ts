import { Module } from '@nestjs/common';
import { QueueModule } from '../queues/queue.module';
import { BuroModule } from '../buro/buro.module';
import { ConfiguracionTasasModule } from '../configuracion-tasas/configuracion-tasas.module';
import { PrestamosModule } from '../prestamos/prestamos.module';
import { SolicitudesController } from './solicitudes.controller';
import { SolicitudesService } from './solicitudes.service';
import { ReglasDecisionService } from './reglas-decision.service';
import { BuroConsultaProcessor } from './buro-consulta.processor';

@Module({
  imports: [QueueModule, BuroModule, ConfiguracionTasasModule, PrestamosModule],
  controllers: [SolicitudesController],
  providers: [SolicitudesService, ReglasDecisionService, BuroConsultaProcessor],
})
export class SolicitudesModule {}
