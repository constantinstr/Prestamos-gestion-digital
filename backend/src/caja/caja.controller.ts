import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Rol } from '../common/enums/rol.enum';
import { CajaService } from './caja.service';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';

interface UsuarioAutenticado {
  id: string;
  sucursalId: number;
}

@ApiTags('caja')
@Roles(Rol.CAJERO, Rol.ADMIN_GENERAL)
@Controller('caja')
export class CajaController {
  constructor(private readonly cajaService: CajaService) {}

  @Get('clientes/buscar')
  buscar(@Query('dni') dni?: string, @Query('prestamo') prestamoId?: string) {
    return this.cajaService.buscarCliente(dni, prestamoId);
  }

  @Post('cuotas/:cuotaId/pago')
  registrarPago(
    @Param('cuotaId') cuotaId: string,
    @Body() dto: RegistrarPagoDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.cajaService.registrarPago(
      cuotaId,
      dto,
      user.id,
      user.sucursalId,
    );
  }

  @Get('pagos/:pagoId/comprobante')
  comprobante(@Param('pagoId') pagoId: string) {
    return this.cajaService.comprobante(pagoId);
  }
}
