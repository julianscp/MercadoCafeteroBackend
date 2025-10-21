import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePreferenceDto } from './dto/create-preference.dto';

@Injectable()
export class PaymentsService {
  private mercadoPagoClient: MercadoPagoConfig;
  private preferenceClient: Preference;
  private paymentClient: Payment;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    // Configurar cliente de Mercado Pago
    const accessToken = this.configService.get<string>('MERCADOPAGO_ACCESS_TOKEN');
    
    if (!accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN no está configurado en las variables de entorno');
    }

    this.mercadoPagoClient = new MercadoPagoConfig({ 
      accessToken,
      options: { 
        timeout: 5000 
      }
    });

    this.preferenceClient = new Preference(this.mercadoPagoClient);
    this.paymentClient = new Payment(this.mercadoPagoClient);
  }

  /**
   * Crea una preferencia de pago en Mercado Pago
   */
  async createPreference(userId: number, createPreferenceDto: CreatePreferenceDto) {
    try {
      console.log('🛒 Creando preferencia de pago para usuario:', userId);
      const { items } = createPreferenceDto;

      // Validar que haya productos
      if (!items || items.length === 0) {
        throw new BadRequestException('Debe incluir al menos un producto');
      }

    // Obtener información del usuario
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, nombre: true }
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Obtener información de los productos
    const productIds = items.map(p => p.productId);
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        estado: 'ACTIVO'
      }
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('Algunos productos no existen o no están disponibles');
    }

    // Validar stock
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (!product) {
        throw new BadRequestException(`Producto con ID ${item.productId} no encontrado`);
      }
      if (item.cantidad > product.stock) {
        throw new BadRequestException(`No hay suficiente stock para "${product.nombre}". Disponible: ${product.stock}`);
      }
    }

    // Preparar items para Mercado Pago
    const preferenceItems = items.map(item => {
      const product = products.find(p => p.id === item.productId)!;
      const precioConDescuento = product.descuento 
        ? product.precio * (1 - product.descuento / 100)
        : product.precio;

      return {
        id: product.id.toString(),
        title: product.nombre,
        description: product.descripcion || 'Producto del Mercado Cafetero',
        quantity: item.cantidad,
        unit_price: Number(precioConDescuento.toFixed(2)),
        currency_id: 'COP', // Pesos colombianos
      };
    });

    // Calcular total
    const total = preferenceItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

    // URLs de retorno
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const backendUrl = this.configService.get<string>('BACKEND_URL') || 'http://localhost:3001';

    // Crear orden pendiente en la base de datos
    const order = await this.prisma.order.create({
      data: {
        userId,
        products: items.map(item => {
          const product = products.find(p => p.id === item.productId)!;
          const precioConDescuento = product.descuento 
            ? product.precio * (1 - product.descuento / 100)
            : product.precio;
          
          return {
            id: product.id,
            nombre: product.nombre,
            precio: precioConDescuento,
            cantidad: item.cantidad,
            subtotal: precioConDescuento * item.cantidad
          };
        }),
        total,
        status: 'pendiente', // Estado inicial: pendiente de pago
        mercadoPagoData: {} // Se actualizará con datos del pago
      }
    });

    // Crear preferencia en Mercado Pago
    console.log('💰 Total del pedido:', total);
    console.log('📦 Items para Mercado Pago:', JSON.stringify(preferenceItems, null, 2));
    console.log('🔗 URLs:', { frontendUrl, backendUrl });
    
    const preference = await this.preferenceClient.create({
      body: {
        items: preferenceItems,
        payer: {
          email: user.email,
          name: user.nombre,
        },
        back_urls: {
          success: `${frontendUrl}/cliente/pago/exito?orderId=${order.id}`,
          failure: `${frontendUrl}/cliente/pago/error?orderId=${order.id}`,
          pending: `${frontendUrl}/cliente/pago/pendiente?orderId=${order.id}`,
        },
        auto_return: 'approved',
        notification_url: `${backendUrl}/payments/webhook`,
        external_reference: order.id.toString(), // Referencia a nuestra orden
        statement_descriptor: 'Mercado Cafetero',
        metadata: {
          order_id: order.id,
          user_id: userId,
        },
      }
    });
    
    console.log('✅ Preferencia creada exitosamente:', preference.id);

    // Actualizar orden con el ID de preferencia
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
      initPoint: preference.init_point, // URL para redirigir al usuario
      sandboxInitPoint: preference.sandbox_init_point, // URL para modo sandbox
    };
    } catch (error) {
      console.error('❌ Error creando preferencia de Mercado Pago:', error);
      console.error('📋 Detalles del error:', JSON.stringify(error, null, 2));
      throw error;
    }
  }

  /**
   * Procesa el webhook de Mercado Pago
   */
  async processWebhook(data: any) {
    console.log('📨 Webhook recibido de Mercado Pago:', JSON.stringify(data, null, 2));

    // Mercado Pago envía notificaciones de tipo "payment"
    if (data.type === 'payment') {
      const paymentId = data.data.id;

      try {
        // Obtener información del pago
        const payment = await this.paymentClient.get({ id: paymentId });
        
        console.log('💳 Información del pago:', JSON.stringify(payment, null, 2));

        const externalReference = payment.external_reference;
        
        if (!externalReference) {
          console.error('❌ No se encontró external_reference en el pago');
          return { processed: false };
        }
        
        const orderId = parseInt(externalReference);

        if (!orderId) {
          console.error('❌ external_reference no es un número válido');
          return { processed: false };
        }

        // Buscar la orden
        const order = await this.prisma.order.findUnique({
          where: { id: orderId }
        });

        if (!order) {
          console.error(`❌ Orden ${orderId} no encontrada`);
          return { processed: false };
        }

        // Actualizar estado de la orden según el estado del pago
        let newStatus = 'pendiente';
        
        if (payment.status === 'approved') {
          newStatus = 'completado';
          
          // Descontar stock de los productos
          const orderProducts = order.products as any[];
          for (const item of orderProducts) {
            await this.prisma.product.update({
              where: { id: item.id },
              data: {
                stock: {
                  decrement: item.cantidad
                }
              }
            });

            // Crear log de stock
            await this.prisma.stockLog.create({
              data: {
                productoId: item.id,
                cantidad: -item.cantidad,
                tipo: 'SALIDA',
                usuarioId: order.userId,
              }
            });
          }
        } else if (payment.status === 'rejected') {
          newStatus = 'cancelado';
        } else if (payment.status === 'in_process' || payment.status === 'pending') {
          newStatus = 'pendiente';
        }

        // Actualizar orden
        await this.prisma.order.update({
          where: { id: orderId },
          data: {
            status: newStatus,
            mercadoPagoData: {
              preferenceId: order.mercadoPagoData?.['preferenceId'],
              paymentId: payment.id?.toString() || 'unknown',
              paymentStatus: payment.status,
              paymentStatusDetail: payment.status_detail,
              transactionAmount: payment.transaction_amount,
              paymentMethod: payment.payment_method_id,
            }
          }
        });

        console.log(`✅ Orden ${orderId} actualizada a estado: ${newStatus}`);

        return { processed: true, orderId, status: newStatus };
      } catch (error) {
        console.error('❌ Error procesando webhook:', error);
        return { processed: false, error: error.message };
      }
    }

    return { processed: false, message: 'Tipo de notificación no soportado' };
  }

  /**
   * Obtiene el estado de una orden
   */
  async getOrderStatus(orderId: number, userId: number) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId
      }
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
