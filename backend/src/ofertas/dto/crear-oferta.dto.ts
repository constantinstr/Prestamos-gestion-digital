import { ApiProperty } from '@nestjs/swagger';
import { SistemaAmortizacion } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

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
    enum: SistemaAmortizacion,
    required: false,
    description: 'Sistema de amortización (default FRANCES)',
  })
  @IsOptional()
  @IsEnum(SistemaAmortizacion)
  sistemaAmortizacion?: SistemaAmortizacion;

  @ApiProperty({
    required: false,
    description:
      'TNA manual (%). Si no se especifica, usa la tasa vigente de la organización.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tna?: number;

  @ApiProperty({
    required: false,
    description: 'Días de vigencia de la oferta (default 7)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  diasVigencia?: number;
}
