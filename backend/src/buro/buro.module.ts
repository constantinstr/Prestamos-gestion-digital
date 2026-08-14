import { Module } from '@nestjs/common';
import { BURO_PROVIDER } from './buro-provider.interface';
import { NosisProvider } from './providers/nosis.provider';
import { BuroService } from './buro.service';

@Module({
  providers: [
    NosisProvider,
    { provide: BURO_PROVIDER, useExisting: NosisProvider },
    BuroService,
  ],
  exports: [BuroService],
})
export class BuroModule {}
