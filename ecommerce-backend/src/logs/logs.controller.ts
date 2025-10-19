import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LoggingService } from '../logging/logging.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { LogLevel, LogEvent } from '../logging/logging.service';

@Controller('logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class LogsController {
  constructor(private readonly loggingService: LoggingService) {}

  @Get()
  async getLogs(
    @Query('level') level?: string,
    @Query('event') event?: string,
    @Query('userEmail') userEmail?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    // Convertir strings a enums si están presentes
    const logLevel = level ? level as LogLevel : undefined;
    const logEvent = event ? event as LogEvent : undefined;
    
    return this.loggingService.getLogs({
      level: logLevel,
      event: logEvent,
      userEmail,
      startDate: dateFrom ? new Date(dateFrom) : undefined,
      endDate: dateTo ? new Date(dateTo) : undefined,
    });
  }
}
