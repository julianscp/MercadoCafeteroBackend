import { Controller, Post, Get, Param, Body, UseGuards, Request, ParseIntPipe, Patch } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AddObservationDto } from './dto/add-observation.dto';
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

  // Endpoints administrativos para gestión de pedidos
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/pedidos')
  getAllOrders() {
    return this.ordersService.getAllOrders();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/pedidos/pendientes')
  getPendingOrders() {
    return this.ordersService.getPendingOrders();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch('admin/pedidos/:id/confirmar')
  confirmOrder(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const adminId = req.user.userId;
    return this.ordersService.confirmOrder(id, adminId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch('admin/pedidos/:id/observaciones')
  addOrderObservation(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() addObservationDto: AddObservationDto
  ) {
    const adminId = req.user.userId;
    return this.ordersService.addOrderObservation(id, addObservationDto.observacion, adminId);
  }
}
