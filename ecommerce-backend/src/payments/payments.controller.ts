import { Controller, Post, Get, Body, Param, Query, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePreferenceDto } from './dto/create-preference.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create-preference')
  async createPreference(
    @Request() req,
    @Body() createPreferenceDto: CreatePreferenceDto
  ) {
    const userId = req.user.userId;
    return this.paymentsService.createPreference(userId, createPreferenceDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('check/:orderId')
  async checkPayment(
    @Request() req,
    @Param('orderId', ParseIntPipe) orderId: number,
    @Query('paymentId') paymentId?: string
  ) {
    const userId = req.user.userId;
    return this.paymentsService.checkPaymentStatus(orderId, userId, paymentId);
  }

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
