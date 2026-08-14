import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { ConfiguracionTasasService } from '../configuracion-tasas/configuracion-tasas.service';
import {
  calcularPlanFrances,
  calcularTea,
} from '../prestamos/util/amortizacion.util';

@ApiTags('public')
@Public()
@Controller('public')
export class PublicConfigController {
  constructor(private readonly configuracionTasas: ConfiguracionTasasService) {}

  @Get('simulador')
  async simular(
    @Query('organizacionId') organizacionId: string,
    @Query('monto') montoStr: string,
    @Query('cuotas') cuotasStr: string,
  ) {
    if (!organizacionId)
      throw new BadRequestException('Debe indicar "organizacionId"');
    const monto = Number(montoStr);
    const cantidadCuotas = Number(cuotasStr);
    if (!monto || !cantidadCuotas) {
      throw new BadRequestException('Debe indicar "monto" y "cuotas"');
    }

    const tasa = await this.configuracionTasas.vigente(organizacionId);
    const montoMinimo = Number(tasa.montoMinimo);
    const montoMaximo = Number(tasa.montoMaximo);
    if (monto < montoMinimo || monto > montoMaximo) {
      throw new BadRequestException(
        `El monto debe estar entre ${montoMinimo} y ${montoMaximo}`,
      );
    }
    if (
      cantidadCuotas < tasa.cuotasMinimas ||
      cantidadCuotas > tasa.cuotasMaximas
    ) {
      throw new BadRequestException(
        `La cantidad de cuotas debe estar entre ${tasa.cuotasMinimas} y ${tasa.cuotasMaximas}`,
      );
    }

    const plan = calcularPlanFrances(monto, cantidadCuotas, Number(tasa.tna));
    const cuotaPromedio =
      plan.reduce((sum, c) => sum + c.montoTotal, 0) / plan.length;

    return {
      tna: Number(tasa.tna),
      tea: calcularTea(Number(tasa.tna)),
      cuotaEstimada: Math.round(cuotaPromedio * 100) / 100,
      primerasCuotas: plan.slice(0, 3),
    };
  }

  @Get('configuracion')
  async configuracion(@Query('organizacionId') organizacionId: string) {
    if (!organizacionId)
      throw new BadRequestException('Debe indicar "organizacionId"');
    const tasa = await this.configuracionTasas.vigente(organizacionId);
    return {
      montoMinimo: Number(tasa.montoMinimo),
      montoMaximo: Number(tasa.montoMaximo),
      cuotasMinimas: tasa.cuotasMinimas,
      cuotasMaximas: tasa.cuotasMaximas,
    };
  }
}
