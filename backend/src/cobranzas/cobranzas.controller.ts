import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type UsuarioAutenticado,
} from '../common/decorators/current-user.decorator';
import { Rol } from '../common/enums/rol.enum';
import { CobranzasService } from './cobranzas.service';
import { RecordatorioDto } from './dto/recordatorio.dto';

@ApiTags('cobranzas')
@Roles(Rol.CAJERO, Rol.ADMIN_GENERAL, Rol.ANALISTA_CREDITO)
@Controller('cobranzas')
export class CobranzasController {
  constructor(private readonly cobranzasService: CobranzasService) {}

  @Get('vencimientos')
  vencimientos(
    @CurrentUser() user: UsuarioAutenticado,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Query('sucursal_id') sucursalId?: string,
  ) {
    return this.cobranzasService.vencimientos(
      user.organizacionId,
      new Date(desde),
      new Date(hasta),
      sucursalId ? Number(sucursalId) : undefined,
    );
  }

  @Post(':prestamoId/recordatorio-whatsapp')
  recordatorio(
    @Param('prestamoId') prestamoId: string,
    @Body() dto: RecordatorioDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.cobranzasService.recordatorioWhatsapp(
      prestamoId,
      dto.cuotaId,
      user.id,
      user.organizacionId,
    );
  }
}
