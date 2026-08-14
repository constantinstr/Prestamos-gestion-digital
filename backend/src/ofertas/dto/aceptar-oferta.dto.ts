import { ApiProperty } from '@nestjs/swagger';
import { Equals } from 'class-validator';

export class AceptarOfertaDto {
  @ApiProperty({
    example: true,
    description:
      'Debe ser true: confirma la lectura y aceptación de las condiciones del préstamo',
  })
  @Equals(true, {
    message: 'Debe aceptar las condiciones del préstamo para continuar',
  })
  aceptaCondiciones: boolean;
}
