import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePreferenceDto } from './dto/create-preference.dto';

@Injectable()
export class PaymentsService {
  private mercadoPagoClient: MercadoPagoConfig;
  private preferenceClient: Preference;
  private accessToken: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.accessToken = this.configService.get<string>('MERCADOPAGO_ACCESS_TOKEN') || '';
    
    if (!this.accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN no está configurado');
    }

    this.mercadoPagoClient = new MercadoPagoConfig({ 
      accessToken: this.accessToken,
      options: { timeout: 5000 }
    });

    this.preferenceClient = new Preference(this.mercadoPagoClient);
  }

  async createPreference(userId: number, createPreferenceDto: CreatePreferenceDto) {
    try {
      console.log('🛒 Creando preferencia para usuario:', userId);
      const { items } = createPreferenceDto;

      // Obtener usuario
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, nombre: true }
      });

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Obtener productos
      const productIds = items.map(p => p.productId);
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds }, estado: 'ACTIVO' }
      });

      if (products.length !== productIds.length) {
        throw new BadRequestException('Algunos productos no están disponibles');
      }

      // Validar stock
      for (const item of items) {
        const product = products.find(p => p.id === item.productId);
        if (!product) {
          throw new BadRequestException(`Producto ${item.productId} no encontrado`);
        }
        if (item.cantidad > product.stock) {
          throw new BadRequestException(`Stock insuficiente para "${product.nombre}"`);
        }
      }

      // Preparar items
      const preferenceItems = items.map(item => {
        const product = products.find(p => p.id === item.productId)!;
        const precio = product.descuento 
          ? product.precio * (1 - product.descuento / 100)
          : product.precio;

        return {
          id: product.id.toString(),
          title: product.nombre,
          description: product.descripcion || 'Producto',
          quantity: item.cantidad,
          unit_price: Number(precio.toFixed(2)),
          currency_id: 'COP',
        };
      });

      const total = preferenceItems.reduce((sum, item) => 
        sum + (item.unit_price * item.quantity), 0
      );

      // Crear orden
      const orderProducts = items.map(item => {
        const product = products.find(p => p.id === item.productId)!;
        const precio = product.descuento 
          ? product.precio * (1 - product.descuento / 100)
          : product.precio;
        
        return {
          id: product.id,
          nombre: product.nombre,
          precio: precio,
          cantidad: item.cantidad,
          subtotal: precio * item.cantidad
        };
      });

      const order = await this.prisma.order.create({
        data: {
          userId,
          products: orderProducts,
          total,
          status: 'pendiente',
          mercadoPagoData: {}
        }
      });

      console.log('📦 Orden creada:', order.id);

      // Crear preferencia en Mercado Pago
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      
      const preference = await this.preferenceClient.create({
        body: {
          items: preferenceItems,
          payer: {
            email: user.email,
            name: user.nombre,
          },
          back_urls: {
            success: `${frontendUrl}/cliente/pago/verificando?orderId=${order.id}`,
            failure: `${frontendUrl}/cliente/pago/error?orderId=${order.id}`,
            pending: `${frontendUrl}/cliente/pago/verificando?orderId=${order.id}`,
          },
          auto_return: 'approved',
          external_reference: order.id.toString(),
          statement_descriptor: 'Mercado Cafetero',
        }
      });

      console.log('✅ Preferencia creada:', preference.id);

      // Actualizar orden con preferenceId
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          mercadoPagoData: {
            preferenceId: preference.id,
          }
        }
      });

      return {
        orderId: order.id,
        preferenceId: preference.id,
        initPoint: preference.init_point,
        sandboxInitPoint: preference.sandbox_init_point,
      };

    } catch (error) {
      console.error('❌ Error creando preferencia:', error);
      throw new BadRequestException('Error al crear preferencia: ' + error.message);
    }
  }

  async checkPaymentStatus(orderId: number, userId: number) {
    try {
      console.log('🔍 Verificando pago para orden:', orderId);

      // Buscar orden
      const order = await this.prisma.order.findFirst({
        where: { id: orderId, userId }
      });

      if (!order) {
        throw new NotFoundException('Orden no encontrada');
      }

      // Si ya está completada, retornar
      if (order.status === 'completado') {
        console.log('✅ Orden ya completada');
        return {
          orderId: order.id,
          status: 'completado',
          message: 'Pago ya confirmado'
        };
      }

      // Obtener preferenceId
      const preferenceId = order.mercadoPagoData?.['preferenceId'];
      if (!preferenceId) {
        throw new BadRequestException('Orden sin preferencia de pago');
      }

      // Buscar pagos asociados a esta preferencia
      console.log('🔎 Buscando pagos para preferencia:', preferenceId);
      
      const searchUrl = `https://api.mercadopago.com/v1/payments/search?external_reference=${orderId}`;
      const response = await fetch(searchUrl, {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      });

      if (!response.ok) {
        console.error('❌ Error consultando pagos:', response.status);
        return {
          orderId: order.id,
          status: 'pendiente',
          message: 'No se pudo verificar el pago, intenta nuevamente'
        };
      }

      const data = await response.json();
      const payments = data.results || [];

      console.log('💳 Pagos encontrados:', payments.length);

      // Buscar pago aprobado
      const approvedPayment = payments.find(p => p.status === 'approved');

      if (approvedPayment) {
        console.log('✅ Pago aprobado encontrado:', approvedPayment.id);

        // Actualizar orden a completado
        await this.completeOrder(order, approvedPayment);

        return {
          orderId: order.id,
          status: 'completado',
          message: 'Pago confirmado exitosamente',
          paymentId: approvedPayment.id
        };
      }

      // Si hay pago rechazado
      const rejectedPayment = payments.find(p => p.status === 'rejected');
      if (rejectedPayment) {
        console.log('❌ Pago rechazado');
        
        await this.prisma.order.update({
          where: { id: orderId },
          data: { status: 'cancelado' }
        });

        return {
          orderId: order.id,
          status: 'cancelado',
          message: 'Pago rechazado'
        };
      }

      // Aún pendiente
      console.log('⏳ Pago aún pendiente');
      return {
        orderId: order.id,
        status: 'pendiente',
        message: 'Pago en proceso'
      };

    } catch (error) {
      console.error('❌ Error verificando pago:', error);
      throw new BadRequestException('Error al verificar pago: ' + error.message);
    }
  }

  private async completeOrder(order: any, payment: any) {
    // Descontar stock
    const orderProducts = order.products as any[];
    for (const item of orderProducts) {
      await this.prisma.product.update({
        where: { id: item.id },
        data: { stock: { decrement: item.cantidad } }
      });

      await this.prisma.stockLog.create({
        data: {
          productoId: item.id,
          cantidad: -item.cantidad,
          tipo: 'SALIDA',
          usuarioId: order.userId,
        }
      });
    }

    // Actualizar orden
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'completado',
        mercadoPagoData: {
          preferenceId: order.mercadoPagoData?.['preferenceId'],
          paymentId: payment.id?.toString(),
          paymentStatus: payment.status,
          transactionAmount: payment.transaction_amount,
          paymentMethod: payment.payment_method_id,
        }
      }
    });

    console.log(`✅ Orden ${order.id} completada`);
  }

  async getOrderStatus(orderId: number, userId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId }
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    return {
      orderId: order.id,
      status: order.status,
      total: order.total,
      products: order.products,
      mercadoPagoData: order.mercadoPagoData,
      createdAt: order.createdAt,
    };
  }
}
