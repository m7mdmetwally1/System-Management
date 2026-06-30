import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { JwtStrategy } from '../common/jwt.strategy';
import { JwtModule } from '@nestjs/jwt';
import { jwtConfig } from '../common/jwtConfig';

@Module({
  imports: [PrismaModule, JwtModule.register(jwtConfig)],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
