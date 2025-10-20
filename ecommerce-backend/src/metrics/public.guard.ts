import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PublicGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const path = request.url;

    // Permitir acceso público al endpoint /metrics
    if (path === '/metrics' || path.startsWith('/metrics?')) {
      return true;
    }

    return true;
  }
}

