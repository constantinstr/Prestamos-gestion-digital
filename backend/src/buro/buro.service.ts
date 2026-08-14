import { Inject, Injectable } from '@nestjs/common';
import { BURO_PROVIDER, type BuroProvider } from './buro-provider.interface';

@Injectable()
export class BuroService {
  constructor(@Inject(BURO_PROVIDER) private readonly provider: BuroProvider) {}

  consultar(dni: string, cuil: string) {
    return this.provider.consultar(dni, cuil);
  }
}
