import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateClienteDto {
  @ApiProperty({ example: '30123456' })
  @IsString()
  @Matches(/^\d{7,9}$/, { message: 'DNI inválido' })
  dni: string;

  @ApiProperty({ example: '20301234567' })
  @IsString()
  @Matches(/^\d{11}$/, { message: 'CUIL inválido, debe tener 11 dígitos' })
  cuil: string;

  @ApiProperty({ example: 'Juan' })
  @IsString()
  nombres: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  apellidos: string;

  @ApiProperty({ example: '1990-05-20' })
  @IsDateString()
  fechaNacimiento: string;

  @ApiProperty({
    example: '5491122334455',
    description: 'Formato E.164, sin el signo +',
  })
  @IsString()
  @Matches(/^\d{10,15}$/, {
    message: 'Teléfono inválido, usar formato E.164 sin +',
  })
  telefono: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Contraseña para acceder luego al portal de cliente',
  })
  @IsString()
  @MinLength(6)
  password: string;
}
