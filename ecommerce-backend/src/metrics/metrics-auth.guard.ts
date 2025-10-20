import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MetricsAuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    // Obtener el token del header Authorization
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de autenticación requerido');
    }
    
    const token = authHeader.substring(7); // Remover "Bearer "
    const validToken = this.configService.get<string>('METRICS_API_TOKEN');
    
    if (!validToken || token !== validToken) {
      throw new UnauthorizedException('Token inválido');
    }
    
    return true;
  }
}

