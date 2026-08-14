import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EstadoSolicitud } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type UsuarioAutenticado,
} from '../common/decorators/current-user.decorator';
import { Rol } from '../common/enums/rol.enum';
import { SolicitudesService } from './solicitudes.service';
import { CreateSolicitudDto } from './dto/create-solicitud.dto';
import { DecisionSolicitudDto } from './dto/decision-solicitud.dto';

@ApiTags('solicitudes')
@Controller('solicitudes')
export class SolicitudesController {
  constructor(private readonly solicitudesService: SolicitudesService) {}

  @Post()
  crear(
    @Body() dto: CreateSolicitudDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.solicitudesService.crear(user.id, user.organizacionId, dto);
  }

  @Roles(Rol.ANALISTA_CREDITO, Rol.ADMIN_GENERAL)
  @Get()
  listar(
    @CurrentUser() user: UsuarioAutenticado,
    @Query('estado') estado?: EstadoSolicitud,
  ) {
    return this.solicitudesService.listar(user.organizacionId, estado);
  }

  @Get(':id')
  obtener(@Param('id') id: string, @CurrentUser() user: UsuarioAutenticado) {
    return this.solicitudesService.obtener(id, user.organizacionId);
  }

  @Roles(Rol.ANALISTA_CREDITO, Rol.ADMIN_GENERAL)
  @Get(':id/buro')
  informeBuro(
    @Param('id') id: string,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.solicitudesService.informeBuro(id, user.organizacionId);
  }

  @Roles(Rol.ANALISTA_CREDITO, Rol.ADMIN_GENERAL)
  @Patch(':id/decision')
  decidir(
    @Param('id') id: string,
    @Body() dto: DecisionSolicitudDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.solicitudesService.decidir(
      id,
      dto,
      user.id,
      user.organizacionId,
    );
  }
}
