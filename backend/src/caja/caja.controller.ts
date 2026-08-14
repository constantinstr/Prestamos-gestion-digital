import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type UsuarioAutenticado,
} from '../common/decorators/current-user.decorator';
import { Rol } from '../common/enums/rol.enum';
import { CajaService } from './caja.service';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';

@ApiTags('caja')
@Roles(Rol.CAJERO, Rol.ADMIN_GENERAL)
@Controller('caja')
export class CajaController {
  constructor(private readonly cajaService: CajaService) {}

  @Get('clientes/buscar')
  buscar(
    @CurrentUser() user: UsuarioAutenticado,
    @Query('dni') dni?: string,
    @Query('prestamo') prestamoId?: string,
  ) {
    return this.cajaService.buscarCliente(user.organizacionId, dni, prestamoId);
  }

  @Post('cuotas/:cuotaId/pago')
  registrarPago(
    @Param('cuotaId') cuotaId: string,
    @Body() dto: RegistrarPagoDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    if (!user.sucursalId) {
      throw new BadRequestException('El cajero no tiene una sucursal asignada');
    }
    return this.cajaService.registrarPago(
      cuotaId,
      dto,
      user.id,
      user.sucursalId,
      user.organizacionId,
    );
  }

  @Get('pagos/:pagoId/comprobante')
  comprobante(
    @Param('pagoId') pagoId: string,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.cajaService.comprobante(pagoId, user.organizacionId);
  }
}
