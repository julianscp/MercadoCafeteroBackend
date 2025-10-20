import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MetricsAuthGuard } from './metrics-auth.guard';

@Module({
  providers: [MetricsService, MetricsAuthGuard],
  controllers: [MetricsController],
  exports: [MetricsService],
})
export class MetricsModule {}

