import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Rol } from '../common/enums/rol.enum';
import { ConfiguracionTasasService } from './configuracion-tasas.service';
import { CrearConfiguracionTasaDto } from './dto/crear-configuracion-tasa.dto';

@ApiTags('configuracion')
@Roles(Rol.ADMIN_GENERAL)
@Controller('configuracion/tasas')
export class ConfiguracionTasasController {
  constructor(private readonly service: ConfiguracionTasasService) {}

  @Get()
  vigente() {
    return this.service.vigente();
  }

  @Post()
  crear(
    @Body() dto: CrearConfiguracionTasaDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.crearVersion({ ...dto, creadoPorId: user.id });
  }
}
