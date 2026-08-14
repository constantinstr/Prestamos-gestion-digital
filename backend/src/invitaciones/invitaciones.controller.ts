import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type UsuarioAutenticado,
} from '../common/decorators/current-user.decorator';
import { Rol } from '../common/enums/rol.enum';
import { InvitacionesService } from './invitaciones.service';
import { CrearInvitacionDto } from './dto/crear-invitacion.dto';

@ApiTags('invitaciones')
@Controller('invitaciones')
export class InvitacionesController {
  constructor(private readonly invitacionesService: InvitacionesService) {}

  @Roles(Rol.ADMIN_GENERAL, Rol.ANALISTA_CREDITO)
  @Post()
  crear(
    @Body() dto: CrearInvitacionDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.invitacionesService.crear(user.organizacionId, user.id, dto);
  }

  @Roles(Rol.ADMIN_GENERAL, Rol.ANALISTA_CREDITO)
  @Get()
  listar(@CurrentUser() user: UsuarioAutenticado) {
    return this.invitacionesService.listar(user.organizacionId);
  }

  @Public()
  @Get(':token')
  validar(@Param('token') token: string) {
    return this.invitacionesService.validar(token);
  }

  @Roles(Rol.ADMIN_GENERAL, Rol.ANALISTA_CREDITO)
  @Delete(':id')
  revocar(@Param('id') id: string, @CurrentUser() user: UsuarioAutenticado) {
    return this.invitacionesService.revocar(id, user.organizacionId);
  }
}
