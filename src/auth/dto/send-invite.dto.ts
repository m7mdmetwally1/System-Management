import { IsEmail, IsInt, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export class SendInviteDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 1, description: 'Tenant ID' })
  @IsInt()
  tenantId: number;

  @ApiProperty({ 
    example: 'USER', 
    description: 'User role (USER, ADMIN, or SUPER_ADMIN)', 
    enum: Role,
    default: 'USER'
  })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
