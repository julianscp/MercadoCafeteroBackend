import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService] // Exportar por si otros módulos lo necesitan
})
export class PaymentsModule {}
