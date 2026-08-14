import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsString, Min } from 'class-validator';

export class CrearConfiguracionTasaDto {
  @ApiProperty() @IsString() nombre: string;
  @ApiProperty() @IsNumber() @Min(0) tna: number;
  @ApiProperty() @IsNumber() @Min(0) tea: number;
  @ApiProperty() @IsNumber() @Min(0) moraDiariaPct: number;
  @ApiProperty() @IsNumber() @Min(0) gastosAdministrativos: number;
  @ApiProperty() @IsNumber() @Min(0) montoMinimo: number;
  @ApiProperty() @IsNumber() @Min(0) montoMaximo: number;
  @ApiProperty() @IsInt() @Min(1) cuotasMinimas: number;
  @ApiProperty() @IsInt() @Min(1) cuotasMaximas: number;
}
