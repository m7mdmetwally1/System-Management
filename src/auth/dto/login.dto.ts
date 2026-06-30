import { IsEmail, IsString, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123', description: 'User password' })
  @IsString()
  password: string;

  @ApiProperty({ example: 1, description: 'Tenant ID' })
  @IsInt()
  tenantId: number;
}
