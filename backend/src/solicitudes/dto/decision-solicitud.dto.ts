import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, ValidateIf } from 'class-validator';

export class DecisionSolicitudDto {
  @ApiProperty({ enum: ['APROBADA', 'RECHAZADA_MANUAL'] })
  @IsIn(['APROBADA', 'RECHAZADA_MANUAL'])
  decision: 'APROBADA' | 'RECHAZADA_MANUAL';

  @ApiProperty({ required: false })
  @ValidateIf(
    (dto: DecisionSolicitudDto) => dto.decision === 'RECHAZADA_MANUAL',
  )
  @IsString()
  @IsOptional()
  motivo?: string;
}
