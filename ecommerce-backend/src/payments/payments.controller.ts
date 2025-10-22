import { Controller, Post, Get, Body, Param, UseGuards, Request, HttpCode, HttpStatus, ParseIntPipe } from '@nestjs/common';
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

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async processWebhook(@Body() body: any) {
    return this.paymentsService.processWebhook(body);
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

