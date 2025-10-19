import { Module } from '@nestjs/common';
import { LoggingService } from './logging.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [LoggingService],
  exports: [LoggingService],
})
export class LoggingModule {}
