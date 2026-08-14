import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Rol } from '../common/enums/rol.enum';
import { PrestamosService } from './prestamos.service';
import { EntregaPrestamoDto } from './dto/entrega-prestamo.dto';
import { WhatsappLinkService } from '../whatsapp/whatsapp-link.service';

@ApiTags('prestamos')
@Controller('prestamos')
export class PrestamosController {
  constructor(
    private readonly prestamosService: PrestamosService,
    private readonly whatsappLink: WhatsappLinkService,
  ) {}

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.prestamosService.obtener(id);
  }

  @Get(':id/cuotas')
  cuotas(@Param('id') id: string) {
    return this.prestamosService.cuotas(id);
  }

  @Get(':id/estado-cuenta')
  estadoCuenta(@Param('id') id: string) {
    return this.prestamosService.estadoCuenta(id);
  }

  @Roles(Rol.CAJERO, Rol.ADMIN_GENERAL)
  @Post(':id/entrega')
  entregar(
    @Param('id') id: string,
    @Body() dto: EntregaPrestamoDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.prestamosService.entregar(id, dto.sucursalId, user.id);
  }

  @Post(':id/estado-cuenta/whatsapp')
  async linkWhatsapp(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    const prestamo = await this.prestamosService.obtener(id);
    return this.whatsappLink.generarLinkEstadoCuenta(
      prestamo.clienteId,
      id,
      user?.id,
    );
  }
}
