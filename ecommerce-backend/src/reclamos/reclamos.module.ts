import { Module } from '@nestjs/common';
import { ReclamosController } from './reclamos.controller';
import { ReclamosService } from './reclamos.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReclamosController],
  providers: [ReclamosService],
  exports: [ReclamosService],
})
export class ReclamosModule {}
