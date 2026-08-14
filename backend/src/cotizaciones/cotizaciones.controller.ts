import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../common/enums/rol.enum';
import { CotizacionesService } from './cotizaciones.service';

@ApiTags('cotizaciones')
@Roles(Rol.ADMIN_GENERAL, Rol.ANALISTA_CREDITO, Rol.CAJERO)
@Controller('cotizaciones')
export class CotizacionesController {
  constructor(private readonly cotizacionesService: CotizacionesService) {}

  @Get('dolar')
  dolar() {
    return this.cotizacionesService.obtenerDolar();
  }
}
