import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class CrearOfertaDto {
  @ApiProperty()
  @IsUUID()
  clienteId: string;

  @ApiProperty({ example: 150000 })
  @IsNumber()
  @Min(1)
  montoOfrecido: number;

  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(1)
  cantidadCuotas: number;

  @ApiProperty({
    required: false,
    description: 'Días de vigencia de la oferta (default 7)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  diasVigencia?: number;
}
