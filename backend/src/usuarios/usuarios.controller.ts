import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type UsuarioAutenticado,
} from '../common/decorators/current-user.decorator';
import { Rol } from '../common/enums/rol.enum';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@ApiTags('usuarios')
@Roles(Rol.ADMIN_GENERAL)
@Controller()
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Roles(Rol.ADMIN_GENERAL, Rol.ANALISTA_CREDITO, Rol.CAJERO)
  @Get('usuarios/me')
  me(@CurrentUser() user: UsuarioAutenticado) {
    return this.usuariosService.obtener(user.id);
  }

  @Get('usuarios')
  listar(@CurrentUser() user: UsuarioAutenticado) {
    return this.usuariosService.listar(user.organizacionId);
  }

  @Post('usuarios')
  crear(
    @Body() dto: CreateUsuarioDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.usuariosService.crear(dto, user.organizacionId);
  }

  @Patch('usuarios/:id')
  actualizar(
    @Param('id') id: string,
    @Body() dto: UpdateUsuarioDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.usuariosService.actualizar(id, dto, user.organizacionId);
  }

  @Get('roles')
  roles() {
    return this.usuariosService.roles();
  }
}
