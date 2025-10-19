import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { LoggingModule } from '../logging/logging.module';

@Module({
  imports: [
    PrismaModule, UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule, UsersModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'), // <-- lee el secret desde .env
        signOptions: { expiresIn: '1h' },
      }),
      
    }),
    MailModule,
    LoggingModule
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
