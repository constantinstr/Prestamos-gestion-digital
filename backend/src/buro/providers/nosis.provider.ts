import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProveedorBuro } from '@prisma/client';
import { BuroProvider, RespuestaBuro } from '../buro-provider.interface';

interface RespuestaNosisRaw {
  Variables?: {
    score?: number;
    situacion_bcra?: number;
  };
  [key: string]: unknown;
}

/**
 * Integración con Nosis (https://www.nosis.com). Requiere NOSIS_API_URL y
 * NOSIS_API_TOKEN configurados. Si NOSIS_MOCK=true (recomendado en dev/staging
 * sin contrato comercial vigente), devuelve una respuesta simulada determinística
 * en base al DNI, para poder probar el motor de reglas end-to-end.
 */
@Injectable()
export class NosisProvider implements BuroProvider {
  readonly proveedor = ProveedorBuro.NOSIS;
  private readonly logger = new Logger(NosisProvider.name);

  constructor(private readonly config: ConfigService) {}

  async consultar(dni: string, cuil: string): Promise<RespuestaBuro> {
    if (this.config.get<string>('NOSIS_MOCK') === 'true') {
      return this.mock(dni);
    }

    const url = this.config.getOrThrow<string>('NOSIS_API_URL');
    const token = this.config.getOrThrow<string>('NOSIS_API_TOKEN');

    const respuesta = await fetch(`${url}?documento=${cuil}&token=${token}`, {
      method: 'GET',
    });

    if (!respuesta.ok) {
      this.logger.error(`Nosis respondió ${respuesta.status} para DNI ${dni}`);
      throw new Error('No se pudo obtener el informe de Nosis');
    }

    const raw = (await respuesta.json()) as RespuestaNosisRaw;

    return {
      proveedor: this.proveedor,
      score: raw.Variables?.score ?? 0,
      situacionBcra: raw.Variables?.situacion_bcra ?? 0,
      respuestaRaw: raw,
    };
  }

  private mock(dni: string): RespuestaBuro {
    const seed = Number(dni.slice(-3)) || 0;
    const score = 300 + (seed % 700); // 300-999, similar al rango real de Nosis
    return {
      proveedor: this.proveedor,
      score,
      situacionBcra: score > 600 ? 1 : score > 400 ? 2 : 4,
      respuestaRaw: { mock: true, dni, score },
    };
  }
}
