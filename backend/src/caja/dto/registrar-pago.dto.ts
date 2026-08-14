import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, Min } from 'class-validator';
import { MetodoPago } from '@prisma/client';

export class RegistrarPagoDto {
  @ApiProperty({ example: 15000 })
  @IsNumber()
  @Min(0.01)
  monto: number;

  @ApiProperty({ enum: MetodoPago, default: MetodoPago.EFECTIVO })
  @IsEnum(MetodoPago)
  metodoPago: MetodoPago;
}
