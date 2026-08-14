import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional } from 'class-validator';

export class UpdateUsuarioDto {
  @ApiProperty({ required: false }) @IsOptional() @IsInt() rolId?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() sucursalId?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() activo?: boolean;
}
