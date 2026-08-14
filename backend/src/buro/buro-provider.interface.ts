import { ProveedorBuro } from '@prisma/client';

export interface RespuestaBuro {
  proveedor: ProveedorBuro;
  score: number;
  situacionBcra: number;
  respuestaRaw: Record<string, unknown>;
}

export interface BuroProvider {
  readonly proveedor: ProveedorBuro;
  consultar(dni: string, cuil: string): Promise<RespuestaBuro>;
}

export const BURO_PROVIDER = 'BURO_PROVIDER';
