import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, Min } from 'class-validator';

export class CreateSolicitudDto {
  @ApiProperty({ example: 150000 })
  @IsNumber()
  @Min(1)
  montoSolicitado: number;

  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(1)
  cantidadCuotas: number;
}
