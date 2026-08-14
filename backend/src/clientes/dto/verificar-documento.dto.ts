import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class VerificarDocumentoDto {
  @ApiProperty({ description: 'true para aprobar, false para rechazar' })
  @IsBoolean()
  aprobado: boolean;

  @ApiProperty({
    required: false,
    description: 'Requerido cuando aprobado=false',
  })
  @IsOptional()
  @IsString()
  motivoRechazo?: string;
}
