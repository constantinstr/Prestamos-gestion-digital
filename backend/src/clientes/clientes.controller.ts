import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type UsuarioAutenticado,
} from '../common/decorators/current-user.decorator';
import { Rol } from '../common/enums/rol.enum';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UploadDocumentoDto } from './dto/upload-documento.dto';
import { FirmaDigitalDto } from './dto/firma-digital.dto';
import { LoginClienteDto } from './dto/login-cliente.dto';
import { VerificarDocumentoDto } from './dto/verificar-documento.dto';

@ApiTags('clientes')
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Public()
  @Post()
  crear(@Body() dto: CreateClienteDto) {
    return this.clientesService.crear(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginClienteDto) {
    return this.clientesService.loginCliente(dto);
  }

  @Public()
  @Post(':id/documentos')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('archivo'))
  subirDocumento(
    @Param('id') id: string,
    @Body() dto: UploadDocumentoDto,
    @UploadedFile() archivo: Express.Multer.File,
  ) {
    return this.clientesService.subirDocumento(id, dto.tipo, archivo);
  }

  @Public()
  @Get(':id/documentos/estado')
  estadoDocumentos(@Param('id') id: string) {
    return this.clientesService.estadoDocumentos(id);
  }

  @Public()
  @Post(':id/firma')
  // `dto` no se usa en el handler: su único rol es disparar la validación de
  // `aceptaTerminos` vía ValidationPipe antes de llegar acá.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  firmar(@Param('id') id: string, @Body() dto: FirmaDigitalDto) {
    return this.clientesService.firmar(id);
  }

  @Get('me')
  me(@CurrentUser() user: UsuarioAutenticado) {
    return this.clientesService.obtener(user.id);
  }

  @Get('me/prestamos')
  misPrestamos(@CurrentUser() user: UsuarioAutenticado) {
    return this.clientesService.misPrestamos(user.id);
  }

  @Roles(Rol.ADMIN_GENERAL, Rol.ANALISTA_CREDITO, Rol.CAJERO)
  @Get()
  listar(@CurrentUser() user: UsuarioAutenticado) {
    return this.clientesService.listarDeOrganizacion(user.organizacionId);
  }

  @Roles(Rol.ADMIN_GENERAL, Rol.ANALISTA_CREDITO, Rol.CAJERO)
  @Get(':id')
  obtener(@Param('id') id: string, @CurrentUser() user: UsuarioAutenticado) {
    return this.clientesService.obtenerDeOrganizacion(id, user.organizacionId);
  }

  @Roles(Rol.ADMIN_GENERAL, Rol.ANALISTA_CREDITO)
  @Get(':id/documentos')
  documentos(@Param('id') id: string, @CurrentUser() user: UsuarioAutenticado) {
    return this.clientesService.documentosDeOrganizacion(
      id,
      user.organizacionId,
    );
  }

  @Roles(Rol.ADMIN_GENERAL, Rol.ANALISTA_CREDITO)
  @Patch(':id/documentos/:documentoId')
  verificarDocumento(
    @Param('id') id: string,
    @Param('documentoId') documentoId: string,
    @Body() dto: VerificarDocumentoDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.clientesService.verificarDocumento(
      id,
      documentoId,
      user.organizacionId,
      user.id,
      dto.aprobado,
      dto.motivoRechazo,
    );
  }

  // TODO: validar que el usuario autenticado (CurrentUser) sea el propio cliente
  // o un rol de backoffice antes de habilitar la edición.
  @Patch(':id')
  actualizar(
    @Param('id') id: string,
    @Body() dto: Partial<Omit<CreateClienteDto, 'password' | 'token'>>,
  ) {
    return this.clientesService.actualizar(id, dto);
  }
}
