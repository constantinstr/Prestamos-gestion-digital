import {
  OnWorkerEvent,
  Processor,
  WorkerHost,
  InjectQueue,
} from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { VencimientosService } from './vencimientos.service';
import { MANTENIMIENTO_QUEUE } from '../queues/queue.module';

const JOB_DIARIO_ID = 'procesar-vencimientos-diario';

@Injectable()
@Processor(MANTENIMIENTO_QUEUE)
export class VencimientosProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(VencimientosProcessor.name);

  constructor(
    private readonly vencimientosService: VencimientosService,
    @InjectQueue(MANTENIMIENTO_QUEUE) private readonly queue: Queue,
  ) {
    super();
  }

  async onModuleInit() {
    // Corre todos los días a las 06:00. Idempotente: upsert no duplica el
    // scheduler entre reinicios del server.
    await this.queue.upsertJobScheduler(JOB_DIARIO_ID, {
      pattern: '0 6 * * *',
    });
  }

  async process() {
    return this.vencimientosService.procesar();
  }

  @OnWorkerEvent('failed')
  onFailed(job: { id?: string }, error: Error) {
    this.logger.error(`Job ${job.id} de vencimientos falló: ${error.message}`);
  }
}
