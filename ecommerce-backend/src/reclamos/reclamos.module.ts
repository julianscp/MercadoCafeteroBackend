import { Module } from '@nestjs/common';
import { ReclamosController } from './reclamos.controller';
import { ReclamosService } from './reclamos.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [ReclamosController],
  providers: [ReclamosService],
  exports: [ReclamosService],
})
export class ReclamosModule {}
