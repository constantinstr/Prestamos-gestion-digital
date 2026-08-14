import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { OrganizacionesService } from './organizaciones.service';
import { CrearOrganizacionDto } from './dto/crear-organizacion.dto';

@ApiTags('organizaciones')
@Controller('organizaciones')
export class OrganizacionesController {
  constructor(private readonly organizacionesService: OrganizacionesService) {}

  @Public()
  @Post()
  crear(@Body() dto: CrearOrganizacionDto) {
    return this.organizacionesService.crear(dto);
  }
}
