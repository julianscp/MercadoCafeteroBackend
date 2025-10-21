import { Controller, Post, Get, Body, Param, UseGuards, Request, HttpCode, HttpStatus, ParseIntPipe } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePreferenceDto } from './dto/create-preference.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Crea una preferencia de pago en Mercado Pago
   * El usuario debe estar autenticado
   */
  @UseGuards(JwtAuthGuard)
  @Post('create-preference')
  async createPreference(
    @Request() req,
    @Body() createPreferenceDto: CreatePreferenceDto
  ) {
    const userId = req.user.userId;
    return this.paymentsService.createPreference(userId, createPreferenceDto);
  }

  /**
   * Webhook para recibir notificaciones de Mercado Pago
   * Este endpoint NO requiere autenticación (es llamado por Mercado Pago)
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async processWebhook(@Body() body: any) {
    console.log('🔔 Webhook recibido:', body);
    return this.paymentsService.processWebhook(body);
  }

  /**
   * Obtiene el estado de una orden
   * El usuario debe estar autenticado y ser dueño de la orden
   */
  @UseGuards(JwtAuthGuard)
  @Get('order/:id')
  async getOrderStatus(
    @Request() req,
    @Param('id', ParseIntPipe) orderId: number
  ) {
    const userId = req.user.userId;
    return this.paymentsService.getOrderStatus(orderId, userId);
  }
}
