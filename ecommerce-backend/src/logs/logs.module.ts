import { Module } from '@nestjs/common';
import { LogsController } from './logs.controller';
import { LogsService } from './logs.service';
import { LoggingModule } from '../logging/logging.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [LoggingModule, PrismaModule],
  controllers: [LogsController],
  providers: [LogsService],
})
export class LogsModule {}
