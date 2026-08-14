import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type UsuarioAutenticado,
} from '../common/decorators/current-user.decorator';
import { Rol } from '../common/enums/rol.enum';
import { VencimientosService } from './vencimientos.service';

@ApiTags('alertas')
@Roles(Rol.ADMIN_GENERAL, Rol.ANALISTA_CREDITO)
@Controller('alertas')
export class AlertasController {
  constructor(private readonly vencimientosService: VencimientosService) {}

  @Get('resumen')
  resumen(@CurrentUser() user: UsuarioAutenticado) {
    return this.vencimientosService.resumenOrganizacion(user.organizacionId);
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Post('procesar-vencimientos')
  procesar() {
    return this.vencimientosService.procesar();
  }
}
