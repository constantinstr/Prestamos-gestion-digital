import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RechazarOfertaDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  motivo?: string;
}
