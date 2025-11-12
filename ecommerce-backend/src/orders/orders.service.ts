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

  // Métodos para administración de pedidos

  async getAllOrders() {
    const orders = await this.prisma.order.findMany({
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
            direccion: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Asegurar que products siempre sea un array
    return orders.map(order => ({
      ...order,
      products: Array.isArray(order.products) ? order.products : []
    }));
  }

  async getPendingOrders() {
    const orders = await this.prisma.order.findMany({
      where: {
        status: 'completado' // Pedidos pagados pero no despachados
      },
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
            direccion: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Asegurar que products siempre sea un array
    return orders.map(order => ({
      ...order,
      products: Array.isArray(order.products) ? order.products : []
    }));
  }

  async confirmOrder(orderId: number, adminId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    if (order.status !== 'completado') {
      throw new BadRequestException('Solo se pueden confirmar pedidos completados');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'confirmado',
        updatedAt: new Date()
      }
    });

    // Log de la acción del admin
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { email: true }
    });

    if (admin) {
      await this.loggingService.logInventoryChange(
        adminId,
        admin.email,
        orderId,
        0,
        `Admin confirmó/despachó pedido #${orderId}`,
        undefined
      );
    }

    return updatedOrder;
  }

  async addOrderObservation(orderId: number, observacion: string, adminId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        observacionesAdmin: observacion,
        updatedAt: new Date()
      }
    });

    // Log de la acción del admin
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { email: true }
    });

    if (admin) {
      await this.loggingService.logInventoryChange(
        adminId,
        admin.email,
        orderId,
        0,
        `Admin agregó observación a pedido #${orderId}: ${observacion}`,
        undefined
      );
    }

    return updatedOrder;
  }

  // Estadísticas de ventas
  async getSalesStats(period: 'day' | 'week' | 'month') {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Obtener órdenes completadas en el período
    const orders = await this.prisma.order.findMany({
      where: {
        status: 'completado',
        createdAt: {
          gte: startDate
        }
      },
      select: {
        id: true,
        total: true,
        products: true,
        createdAt: true
      }
    });

    // Calcular total de ventas
    const totalSales = orders.reduce((sum, order) => sum + Number(order.total), 0);

    // Calcular cantidad de pedidos
    const orderCount = orders.length;

    // Calcular producto más vendido
    const productSales: { [key: number]: { nombre: string; cantidad: number; total: number } } = {};

    for (const order of orders) {
      const products = Array.isArray(order.products) ? order.products : [];
      for (const product of products) {
        if (!product) continue; // Skip null/undefined products
        
        const productId = (product as any).id || (product as any).productId;
        if (!productId || typeof productId !== 'number') continue; // Skip invalid product IDs
        
        const cantidad = (product as any).cantidad || 0;
        const precio = (product as any).precio || 0;
        const nombre = (product as any).nombre || 'Producto desconocido';

        if (!productSales[productId]) {
          productSales[productId] = {
            nombre,
            cantidad: 0,
            total: 0
          };
        }

        productSales[productId].cantidad += cantidad;
        productSales[productId].total += precio * cantidad;
      }
    }

    // Encontrar el producto más vendido
    let topProduct: { id: number; nombre: string; cantidad: number; total: number } | null = null;
    let maxCantidad = 0;

    for (const [productId, stats] of Object.entries(productSales)) {
      if (stats.cantidad > maxCantidad) {
        maxCantidad = stats.cantidad;
        topProduct = {
          id: parseInt(productId),
          nombre: stats.nombre,
          cantidad: stats.cantidad,
          total: stats.total
        };
      }
    }

    return {
      period,
      startDate,
      endDate: now,
      totalSales,
      orderCount,
      topProduct,
      products: Object.entries(productSales).map(([id, stats]) => ({
        id: parseInt(id),
        nombre: stats.nombre,
        cantidad: stats.cantidad,
        total: stats.total
      })).sort((a, b) => b.cantidad - a.cantidad)
    };
  }

  // Estadísticas del dashboard
  async getDashboardStats() {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ===== CLIENTES =====
    // Cantidad total de clientes
    const totalClientes = await this.prisma.user.count({
      where: { rol: 'cliente' }
    });

    // Usuarios registrados en las últimas 24h
    const usuariosUltimas24h = await this.prisma.user.count({
      where: {
        rol: 'cliente',
        createdAt: { gte: last24Hours }
      }
    });

    // Alertas de inicios de sesión fallidos (últimas 24h)
    const loginFallidos = await this.prisma.logEntry.count({
      where: {
        event: 'FAILED_LOGIN',
        timestamp: { gte: last24Hours }
      }
    });

    // Cliente MVP (con más compras en últimos 30 días)
    const ordersLast30Days = await this.prisma.order.findMany({
      where: {
        status: 'completado',
        createdAt: { gte: last30Days }
      },
      select: {
        userId: true,
        user: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    // Contar compras por cliente
    const comprasPorCliente: { [key: number]: { count: number; user: any } } = {};
    ordersLast30Days.forEach(order => {
      if (!comprasPorCliente[order.userId]) {
        comprasPorCliente[order.userId] = {
          count: 0,
          user: order.user
        };
      }
      comprasPorCliente[order.userId].count++;
    });

    // Encontrar cliente MVP
    let clienteMVP: { id: number; nombre: string; email: string; compras: number } | null = null;
    let maxCompras = 0;
    for (const [userId, data] of Object.entries(comprasPorCliente)) {
      if (data.count > maxCompras) {
        maxCompras = data.count;
        clienteMVP = {
          id: data.user.id,
          nombre: data.user.nombre,
          email: data.user.email,
          compras: data.count
        };
      }
    }

    // ===== PRODUCTOS =====
    // Cantidad total de productos
    const totalProductos = await this.prisma.product.count({
      where: { estado: 'ACTIVO' }
    });

    // Productos con stock crítico (obtener y filtrar en memoria)
    const productosActivos = await this.prisma.product.findMany({
      where: { estado: 'ACTIVO' },
      select: {
        id: true,
        stock: true,
        stockMinimo: true
      }
    });

    // Productos con stock crítico: stock <= 0 o stock <= stockMinimo (si stockMinimo está definido)
    const productosCriticos = productosActivos.filter(
      p => {
        if (p.stock <= 0) return true; // Stock agotado o negativo siempre es crítico
        if (p.stockMinimo != null && p.stock <= p.stockMinimo) return true; // Stock por debajo del mínimo
        return false;
      }
    ).length;

    // Movimientos de stock (últimos 30 días)
    const movimientosStock = await this.prisma.stockLog.groupBy({
      by: ['tipo'],
      where: {
        fecha: { gte: last30Days }
      },
      _count: {
        id: true
      }
    });

    const entradasStock = movimientosStock.find(m => m.tipo === 'ENTRADA')?._count.id || 0;
    const salidasStock = movimientosStock.find(m => m.tipo === 'SALIDA')?._count.id || 0;

    // ===== VENTAS =====
    // Ventas de los últimos 30 días
    const ventasLast30Days = await this.prisma.order.findMany({
      where: {
        status: 'completado',
        createdAt: { gte: last30Days }
      },
      select: {
        total: true
      }
    });

    const totalVentas30d = ventasLast30Days.reduce((sum, order) => sum + Number(order.total), 0);

    // Pedidos despachados
    const pedidosDespachados = await this.prisma.order.count({
      where: { status: 'despachado' }
    });

    // Pedidos pendientes
    const pedidosPendientes = await this.prisma.order.count({
      where: {
        status: { in: ['completado', 'pendiente', 'confirmado'] }
      }
    });

    // Reclamos pendientes
    const reclamosPendientes = await this.prisma.reclamo.count({
      where: { estado: 'pendiente' }
    });

    // Reclamos resueltos
    const reclamosResueltos = await this.prisma.reclamo.count({
      where: { estado: 'resuelto' }
    });

    // Último pedido recibido
    const ultimoPedido = await this.prisma.order.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    return {
      clientes: {
        total: totalClientes,
        ultimas24h: usuariosUltimas24h,
        loginFallidos: loginFallidos,
        clienteMVP: clienteMVP
      },
      productos: {
        total: totalProductos,
        stockCritico: productosCriticos,
        movimientos: {
          entradas: entradasStock,
          salidas: salidasStock
        }
      },
      ventas: {
        total30d: totalVentas30d,
        pedidosDespachados: pedidosDespachados,
        pedidosPendientes: pedidosPendientes,
        reclamosPendientes: reclamosPendientes,
        reclamosResueltos: reclamosResueltos,
        ultimoPedido: ultimoPedido ? {
          id: ultimoPedido.id,
          total: ultimoPedido.total,
          status: ultimoPedido.status,
          createdAt: ultimoPedido.createdAt,
          user: ultimoPedido.user
        } : null
      }
    };
  }
}
