import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SolicitudesService } from './solicitudes.service';
import { BURO_QUEUE } from '../queues/queue.module';

@Processor(BURO_QUEUE)
export class BuroConsultaProcessor extends WorkerHost {
  private readonly logger = new Logger(BuroConsultaProcessor.name);

  constructor(private readonly solicitudesService: SolicitudesService) {
    super();
  }

  async process(job: Job<{ solicitudId: string }>) {
    this.logger.log(
      `Procesando consulta a buró para solicitud ${job.data.solicitudId}`,
    );
    await this.solicitudesService.procesarConsultaBuro(job.data.solicitudId);
  }
}
