import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { LoggingService } from '../logging/logging.service';
import { MailService } from '../mail/mail.service';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private loggingService: LoggingService,
    private mailService: MailService,
    private metricsService: MetricsService,
  ) {}

  async createOrder(userId: number, createOrderDto: CreateOrderDto, userEmail?: string, ipAddress?: string) {
    console.log(`=== CREANDO ORDEN ===`);
    console.log(`Usuario ID: ${userId}`);
    console.log(`Email: ${userEmail}`);
    console.log(`IP: ${ipAddress}`);
    console.log(`Productos:`, createOrderDto.products);

    const { products } = createOrderDto;

    // Obtener información del usuario
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, nombre: true }
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Validar que los productos existan y estén activos
    const productIds = products.map(p => p.productId);
    const existingProducts = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        estado: 'ACTIVO'
      }
    });

    if (existingProducts.length !== productIds.length) {
      throw new BadRequestException('Algunos productos no existen o no están disponibles');
    }

    // Calcular total y preparar datos de productos
    let total = 0;
    const orderProducts = products.map(orderProduct => {
      const product = existingProducts.find(p => p.id === orderProduct.productId);
      if (!product) {
        throw new BadRequestException(`Producto con ID ${orderProduct.productId} no encontrado`);
      }
      
      // Usar el precio del producto de la BD, no el del frontend
      const precioConDescuento = product.descuento 
        ? product.precio * (1 - product.descuento / 100)
        : product.precio;
      
      const subtotal = precioConDescuento * orderProduct.cantidad;
      total += subtotal;

      return {
        id: product.id,
        nombre: product.nombre,
        precio: precioConDescuento,
        cantidad: orderProduct.cantidad,
        subtotal: subtotal
      };
    });

    // Crear el pedido
    const order = await this.prisma.order.create({
      data: {
        userId,
        products: orderProducts,
        total,
        status: 'completado', // Cambiamos a completado para simular compra exitosa
        mercadoPagoData: {} // Objeto vacío para órdenes creadas sin Mercado Pago
      }
    });

    // Descontar stock de los productos comprados
    for (const orderProduct of orderProducts) {
      const product = existingProducts.find(p => p.id === orderProduct.id);
      if (product) {
        const stockAnterior = product.stock;
        const nuevoStock = product.stock - orderProduct.cantidad;
        
        console.log(`Actualizando stock del producto ${product.nombre}: ${stockAnterior} -> ${nuevoStock} (vendido: ${orderProduct.cantidad})`);
        
        // Actualizar el stock del producto
        const updatedProduct = await this.prisma.product.update({
          where: { id: orderProduct.id },
          data: { 
            stock: nuevoStock,
            estado: nuevoStock === 0 ? 'AGOTADO' : nuevoStock <= (product.stockMinimo || 0) ? 'ACTIVO' : 'ACTIVO'
          }
        });

        console.log(`Stock actualizado: ${updatedProduct.stock}`);

        // ⚠️ Verificación de alerta de stock bajo
        if (nuevoStock <= (product.stockMinimo ?? 0)) {
          await this.prisma.alerta.create({
            data: {
              productoId: orderProduct.id,
              mensaje: `El producto "${product.nombre}" está en nivel crítico de stock (${nuevoStock} unidades)`,
            },
          });

          // Enviar correo al admin
          const adminEmail = process.env.ADMIN_EMAIL || 'admin@mercadocafetero.com';
          await this.mailService.sendStockAlert(adminEmail, product.nombre, nuevoStock);
        }

        // Registrar log de cambio en inventario
        await this.loggingService.logInventoryChange(
          userId,
          user.email,
          orderProduct.id,
          -orderProduct.cantidad, // Salida de inventario
          `Venta - Orden #${order.id}`,
          ipAddress
        );

        // Registrar también en StockLog para movimientos de stock
        console.log(`=== CREANDO STOCKLOG ===`);
        console.log(`Producto ID: ${orderProduct.id}`);
        console.log(`Cantidad: ${-orderProduct.cantidad}`);
        console.log(`Usuario ID: ${userId}`);
        console.log(`Usuario Email: ${user.email}`);
        console.log(`Usuario Nombre: ${user.nombre}`);
        
        const stockLog = await this.prisma.stockLog.create({
          data: {
            productoId: orderProduct.id,
            cantidad: -orderProduct.cantidad,
            tipo: 'SALIDA',
            usuarioId: userId,
          },
        });
        console.log(`StockLog creado exitosamente:`, stockLog);
      }
    }

    // Registrar log de compra
    await this.loggingService.logPurchase(
      userId,
      user.email,
      order.id,
      total,
      ipAddress
    );

    // Registrar métrica de pedido exitoso
    this.metricsService.incrementOrders('success');

    return order;
  }

  async findOrdersByUser(userId: number) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOrderById(orderId: number, userId: number) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId
      }
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    return order;
  }

  async getCustomerLoyaltyMetrics() {
    // Métricas de fidelización para administradores
    const customers = await this.prisma.user.findMany({
      where: { rol: 'cliente' },
      include: {
        _count: {
          select: { Orders: true }
        }
      }
    });

    return customers.map(customer => ({
      id: customer.id,
      nombre: customer.nombre,
      email: customer.email,
      totalPedidos: customer._count.Orders,
      fechaRegistro: customer.createdAt
    }));
  }
}
