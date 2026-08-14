import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class EntregaPrestamoDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  sucursalId: number;
}
