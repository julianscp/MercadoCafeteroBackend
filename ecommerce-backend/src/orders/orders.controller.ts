import { Controller, Post, Get, Param, Body, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('clientes')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(JwtAuthGuard)
  @Post('pedidos')
  createOrder(@Request() req, @Body() createOrderDto: CreateOrderDto) {
    const userId = req.user.userId;
    const userEmail = req.user.email;
    const ipAddress = req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || 'unknown';
    return this.ordersService.createOrder(userId, createOrderDto, userEmail, ipAddress);
  }

  @UseGuards(JwtAuthGuard)
  @Get('pedidos')
  findOrdersByUser(@Request() req) {
    const userId = req.user.userId;
    return this.ordersService.findOrdersByUser(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('pedidos/:id')
  findOrderById(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user.userId;
    return this.ordersService.findOrderById(id, userId);
  }

  // Endpoint administrativo para métricas de fidelización
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('fidelizacion')
  getCustomerLoyaltyMetrics() {
    return this.ordersService.getCustomerLoyaltyMetrics();
  }
}
