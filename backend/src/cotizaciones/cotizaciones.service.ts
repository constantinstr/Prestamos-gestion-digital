import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

interface CotizacionDolarApi {
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

export interface CotizacionDolar {
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

const CASAS_RELEVANTES = ['oficial', 'blue', 'tarjeta'];
const CACHE_MS = 5 * 60 * 1000; // 5 minutos: evita golpear la API externa en cada carga del panel.

@Injectable()
export class CotizacionesService {
  private readonly logger = new Logger(CotizacionesService.name);
  private cache: { datos: CotizacionDolar[]; expiraEn: number } | null = null;

  async obtenerDolar(): Promise<CotizacionDolar[]> {
    if (this.cache && this.cache.expiraEn > Date.now()) {
      return this.cache.datos;
    }

    try {
      const respuesta = await fetch('https://dolarapi.com/v1/dolares');
      if (!respuesta.ok)
        throw new Error(`dolarapi respondió ${respuesta.status}`);

      const todas = (await respuesta.json()) as CotizacionDolarApi[];
      const datos = todas
        .filter((c) => CASAS_RELEVANTES.includes(c.casa))
        .map(({ casa, nombre, compra, venta, fechaActualizacion }) => ({
          casa,
          nombre,
          compra,
          venta,
          fechaActualizacion,
        }));

      this.cache = { datos, expiraEn: Date.now() + CACHE_MS };
      return datos;
    } catch (error) {
      this.logger.warn(
        `No se pudo obtener la cotización del dólar: ${(error as Error).message}`,
      );
      if (this.cache) return this.cache.datos; // preferir datos viejos a no mostrar nada
      throw new ServiceUnavailableException(
        'No se pudo obtener la cotización del dólar',
      );
    }
  }
}
