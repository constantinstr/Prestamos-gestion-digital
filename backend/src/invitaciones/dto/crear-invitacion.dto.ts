import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CrearInvitacionDto {
  @ApiProperty({
    required: false,
    description: 'Teléfono del cliente a invitar (E.164 sin +)',
  })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;
}
