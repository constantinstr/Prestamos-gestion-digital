import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginClienteDto {
  @ApiProperty({ example: '30123456' })
  @IsString()
  dni: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;
}
