import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const BURO_QUEUE = 'buro';
export const MANTENIMIENTO_QUEUE = 'mantenimiento';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.getOrThrow<string>('REDIS_URL'),
          // Evita el flood de reintentos por defecto de ioredis cuando Redis
          // está caído: backoff acotado en vez de reintento inmediato infinito.
          retryStrategy: (attempts: number) =>
            Math.min(attempts * 1000, 30_000),
          maxRetriesPerRequest: null,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: BURO_QUEUE },
      { name: MANTENIMIENTO_QUEUE },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
