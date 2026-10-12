import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'charan@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'MyStr0ngP@ssword' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
