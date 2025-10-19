import { Controller, Post, Get, Body, UseGuards, Request, Query, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ConfirmEmailDto } from './dto/confirm-email.dto';
import { UsersService } from '../users/users.service';

@Controller('autenticacion')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService, // 👈 inyección con camelCase
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 registros por minuto
  @Post('registro')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 intentos de login por minuto
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: any) {
    const ipAddress = req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.authService.login(loginDto, ipAddress as string, userAgent);
  }

  @UseGuards(JwtAuthGuard)
  @Get('perfil')
  async getPerfil(@Request() req) {
    const userId = Number(req.user.userId); 
    const user = await this.usersService.findOne(userId);
    return user; 
  }

  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 solicitudes de reset por 5 minutos
  @Post('request-password-reset')
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 intentos de reset por 5 minutos
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 confirmaciones por 5 minutos
  @Post('confirm-email')
  async confirmEmail(@Body() dto: ConfirmEmailDto) {
    return this.authService.confirmEmail(dto.email, dto.code);
  }

  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 reenvíos por 5 minutos
  @Post('resend-verification')
  resendVerification(@Body('email') email: string) {
    return this.authService.resendVerificationCode(email);
  }

  @Get('check-email')
  async checkEmail(@Query('email') email: string) {
    return this.authService.checkEmail(email);
  }
}
