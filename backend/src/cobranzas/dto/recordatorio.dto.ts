import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class RecordatorioDto {
  @ApiProperty()
  @IsUUID()
  cuotaId: string;
}
