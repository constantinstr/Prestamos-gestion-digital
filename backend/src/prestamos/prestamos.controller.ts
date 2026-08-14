import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type UsuarioAutenticado,
} from '../common/decorators/current-user.decorator';
import { Rol } from '../common/enums/rol.enum';
import { PrestamosService, type ContextoAcceso } from './prestamos.service';
import { EntregaPrestamoDto } from './dto/entrega-prestamo.dto';
import { WhatsappLinkService } from '../whatsapp/whatsapp-link.service';

function contextoDe(user: UsuarioAutenticado): ContextoAcceso {
  return {
    organizacionId: user.organizacionId,
    clienteId: user.tipo === 'cliente' ? user.id : undefined,
  };
}

@ApiTags('prestamos')
@Controller('prestamos')
export class PrestamosController {
  constructor(
    private readonly prestamosService: PrestamosService,
    private readonly whatsappLink: WhatsappLinkService,
  ) {}

  @Get(':id')
  obtener(@Param('id') id: string, @CurrentUser() user: UsuarioAutenticado) {
    return this.prestamosService.obtener(id, contextoDe(user));
  }

  @Get(':id/cuotas')
  cuotas(@Param('id') id: string, @CurrentUser() user: UsuarioAutenticado) {
    return this.prestamosService.cuotas(id, contextoDe(user));
  }

  @Get(':id/estado-cuenta')
  estadoCuenta(
    @Param('id') id: string,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.prestamosService.estadoCuenta(id, contextoDe(user));
  }

  @Roles(Rol.CAJERO, Rol.ADMIN_GENERAL)
  @Post(':id/entrega')
  entregar(
    @Param('id') id: string,
    @Body() dto: EntregaPrestamoDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.prestamosService.entregar(
      id,
      dto.sucursalId,
      user.id,
      user.organizacionId,
    );
  }

  @Post(':id/estado-cuenta/whatsapp')
  async linkWhatsapp(
    @Param('id') id: string,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    const prestamo = await this.prestamosService.obtener(id, contextoDe(user));
    // `generado_por` referencia a `usuarios` (backoffice); cuando el propio
    // cliente genera el enlace desde su portal, debe quedar en null.
    const generadoPorId = user.tipo === 'usuario' ? user.id : undefined;
    return this.whatsappLink.generarLinkEstadoCuenta(
      prestamo.clienteId,
      id,
      generadoPorId,
    );
  }
}
