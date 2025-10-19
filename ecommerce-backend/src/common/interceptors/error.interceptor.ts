import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        // Log the original error
        console.error('Error caught by interceptor:', error);

        // Transform Prisma errors
        if (error.code === 'P2002') {
          return throwError(() => 
            new HttpException(
              'El recurso ya existe en la base de datos',
              HttpStatus.CONFLICT
            )
          );
        }

        if (error.code === 'P2025') {
          return throwError(() => 
            new HttpException(
              'Recurso no encontrado',
              HttpStatus.NOT_FOUND
            )
          );
        }

        // Transform validation errors
        if (error.name === 'ValidationError') {
          return throwError(() => 
            new HttpException(
              'Datos de entrada inválidos',
              HttpStatus.BAD_REQUEST
            )
          );
        }

        // If it's already an HttpException, re-throw it
        if (error instanceof HttpException) {
          return throwError(() => error);
        }

        // For any other error, return a generic message
        return throwError(() => 
          new HttpException(
            'Error interno del servidor',
            HttpStatus.INTERNAL_SERVER_ERROR
          )
        );
      }),
    );
  }
}
