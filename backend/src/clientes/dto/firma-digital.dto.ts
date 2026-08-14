import { ApiProperty } from '@nestjs/swagger';
import { Equals } from 'class-validator';

export class FirmaDigitalDto {
  @ApiProperty({
    example: true,
    description: 'Debe ser true: confirma la lectura y aceptación de T&C',
  })
  @Equals(true, {
    message: 'Debe aceptar los Términos y Condiciones para continuar',
  })
  aceptaTerminos: boolean;
}
