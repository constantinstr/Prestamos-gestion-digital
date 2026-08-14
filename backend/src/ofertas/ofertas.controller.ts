import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type UsuarioAutenticado,
} from '../common/decorators/current-user.decorator';
import { Rol } from '../common/enums/rol.enum';
import { OfertasService } from './ofertas.service';
import { CrearOfertaDto } from './dto/crear-oferta.dto';
import { AceptarOfertaDto } from './dto/aceptar-oferta.dto';
import { RechazarOfertaDto } from './dto/rechazar-oferta.dto';

@ApiTags('ofertas')
@Controller('ofertas')
export class OfertasController {
  constructor(private readonly ofertasService: OfertasService) {}

  @Roles(Rol.ADMIN_GENERAL, Rol.ANALISTA_CREDITO)
  @Post()
  crear(@Body() dto: CrearOfertaDto, @CurrentUser() user: UsuarioAutenticado) {
    return this.ofertasService.crear(user.organizacionId, user.id, dto);
  }

  @Roles(Rol.ADMIN_GENERAL, Rol.ANALISTA_CREDITO)
  @Get()
  listar(@CurrentUser() user: UsuarioAutenticado) {
    return this.ofertasService.listarDeOrganizacion(user.organizacionId);
  }

  @Get('mias')
  misOfertas(@CurrentUser() user: UsuarioAutenticado) {
    return this.ofertasService.misOfertas(user.id);
  }

  @Get(':id')
  obtener(@Param('id') id: string, @CurrentUser() user: UsuarioAutenticado) {
    return this.ofertasService.obtenerDeCliente(id, user.id);
  }

  @Post(':id/aceptar')
  aceptar(
    @Param('id') id: string,
    @Body() dto: AceptarOfertaDto,
    @CurrentUser() user: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    return this.ofertasService.aceptar(id, user.id, {
      ip: req.ip ?? 'desconocida',
      userAgent: req.get('user-agent') ?? 'desconocido',
    });
  }

  @Post(':id/rechazar')
  rechazar(
    @Param('id') id: string,
    @Body() dto: RechazarOfertaDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.ofertasService.rechazar(id, user.id, dto.motivo);
  }

  @Roles(Rol.ADMIN_GENERAL, Rol.ANALISTA_CREDITO)
  @Delete(':id')
  cancelar(@Param('id') id: string, @CurrentUser() user: UsuarioAutenticado) {
    return this.ofertasService.cancelar(id, user.organizacionId);
  }
}
