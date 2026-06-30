import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ example: 'Acme Corp', description: 'Tenant name (min 2 characters)' })
  @IsString()
  @MinLength(2)
  name: string;
}
