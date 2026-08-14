import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CrearOrganizacionDto {
  @ApiProperty({ example: 'Presto Cuotas SRL' })
  @IsString()
  nombre: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  razonSocial?: string;

  @ApiProperty({ required: false, example: '30712345678' })
  @IsOptional()
  @IsString()
  cuit?: string;

  @ApiProperty({
    description: 'Nombre del administrador general que queda a cargo',
  })
  @IsString()
  nombreAdmin: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;
}
