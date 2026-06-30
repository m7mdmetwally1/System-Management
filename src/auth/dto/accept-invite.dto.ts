import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptInviteDto {
  @ApiProperty({ example: 'abc123token', description: 'Invitation token' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'SecurePass123', description: 'New password (min 8 characters)' })
  @IsString()
  @MinLength(8)
  password: string;
}
