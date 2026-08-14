import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type UsuarioAutenticado,
} from '../common/decorators/current-user.decorator';
import { Rol } from '../common/enums/rol.enum';
import { ConfiguracionTasasService } from './configuracion-tasas.service';
import { CrearConfiguracionTasaDto } from './dto/crear-configuracion-tasa.dto';

@ApiTags('configuracion')
@Roles(Rol.ADMIN_GENERAL)
@Controller('configuracion/tasas')
export class ConfiguracionTasasController {
  constructor(private readonly service: ConfiguracionTasasService) {}

  @Get()
  vigente(@CurrentUser() user: UsuarioAutenticado) {
    return this.service.vigente(user.organizacionId);
  }

  @Post()
  crear(
    @Body() dto: CrearConfiguracionTasaDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.service.crearVersion(user.organizacionId, {
      ...dto,
      creadoPorId: user.id,
    });
  }
}
