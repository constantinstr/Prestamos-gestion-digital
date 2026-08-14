import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { TipoDocumentoKyc } from '@prisma/client';

export class UploadDocumentoDto {
  @ApiProperty({ enum: TipoDocumentoKyc })
  @IsEnum(TipoDocumentoKyc)
  tipo: TipoDocumentoKyc;
}
