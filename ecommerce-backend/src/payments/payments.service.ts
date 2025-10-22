import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePreferenceDto } from './dto/create-preference.dto';

@Injectable()
export class PaymentsService {
  private mercadoPagoClient: MercadoPagoConfig;
  private preferenceClient: Preference;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const accessToken = this.configService.get<string>('MERCADOPAGO_ACCESS_TOKEN');
    
    if (!accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN no está configurado');
    }

    this.mercadoPagoClient = new MercadoPagoConfig({ 
      accessToken,
      options: { timeout: 5000 }
    });

    this.preferenceClient = new Preference(this.mercadoPagoClient);
  }

  async createPreference(userId: number, createPreferenceDto: CreatePreferenceDto) {
    try {
      console.log('🛒 Iniciando creación de preferencia para usuario:', userId);
      const { items } = createPreferenceDto;

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
        throw new BadRequestException(`No hay suficiente stock para "${product.nombre}"`);
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
        description: product.descripcion || 'Producto',
        quantity: item.cantidad,
        unit_price: Number(precioConDescuento.toFixed(2)),
        currency_id: 'COP',
      };
    });

    // Calcular total
    const total = preferenceItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

    // URLs
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const backendUrl = this.configService.get<string>('BACKEND_URL') || 'http://localhost:3001';

    // Crear orden en BD
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
        status: 'pendiente',
        mercadoPagoData: {}
      }
    });

    // Crear preferencia en Mercado Pago
    console.log('💰 Total:', total, '- Creando preferencia en Mercado Pago...');
    
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
      throw new BadRequestException('Error al crear preferencia de pago: ' + error.message);
    }
  }

  async processWebhook(data: any) {
    try {
      const webhookType = data.topic || data.type;
      console.log('📨 Webhook recibido:', webhookType);

      // Procesar webhooks de tipo payment
      if (webhookType === 'payment' || data.type === 'payment') {
        const paymentId = data.data?.id || data.id;
        if (!paymentId) {
          console.error('❌ No payment ID en webhook');
          return { processed: false, message: 'No payment ID' };
        }

        console.log('💳 Procesando payment ID:', paymentId);

        // Obtener información del pago con retry logic
        const accessToken = this.configService.get<string>('MERCADOPAGO_ACCESS_TOKEN');
        let payment: any = null;
        let attempts = 0;
        const maxAttempts = 5;
        
        while (attempts < maxAttempts && !payment) {
          attempts++;
          
          const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });

          if (paymentResponse.ok) {
            payment = await paymentResponse.json();
            console.log(`✅ Payment obtenido en intento ${attempts}`);
            break;
          } else if (paymentResponse.status === 404 && attempts < maxAttempts) {
            console.log(`⏳ Payment no disponible aún, reintentando en ${attempts * 2}s... (${attempts}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, attempts * 2000)); // 2s, 4s, 6s, 8s
          } else {
            console.error('❌ Error obteniendo payment:', paymentResponse.status);
            return { processed: false, message: 'Error fetching payment after retries' };
          }
        }

        if (!payment) {
          console.error('❌ No se pudo obtener el payment después de', maxAttempts, 'intentos');
          return { processed: false, message: 'Payment not available after retries' };
        }
        console.log('💰 Payment status:', payment.status, '- External ref:', payment.external_reference);

        // Buscar orden por external_reference
        const orderId = parseInt(payment.external_reference);
        if (!orderId) {
          console.error('❌ external_reference inválido en payment');
          return { processed: false, message: 'Invalid order ID' };
        }

        const order = await this.prisma.order.findUnique({
          where: { id: orderId }
        });

        if (!order) {
          console.error('❌ Orden no encontrada:', orderId);
          return { processed: false, message: 'Order not found' };
        }

        // Solo actualizar si el pago está aprobado
        if (payment.status !== 'approved') {
          console.log('⏳ Pago no aprobado aún:', payment.status);
          return { processed: true, message: 'Payment not approved yet' };
        }

        // Actualizar orden a completado
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

        await this.prisma.order.update({
          where: { id: orderId },
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

        console.log(`✅ Orden ${orderId} actualizada a: completado`);
        return { processed: true, orderId, status: 'completado' };
      }

      // Procesar webhooks de tipo merchant_order
      if (webhookType === 'merchant_order') {
        const merchantOrderUrl = data.resource;
        if (!merchantOrderUrl) {
          console.error('❌ No resource URL en webhook');
          return { processed: false, message: 'No resource URL' };
        }

        // Obtener merchant_order
        const accessToken = this.configService.get<string>('MERCADOPAGO_ACCESS_TOKEN');
        const response = await fetch(merchantOrderUrl, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!response.ok) {
          console.error('❌ Error obteniendo merchant_order:', response.status);
          return { processed: false, message: 'Error fetching merchant_order' };
        }

        const merchantOrder = await response.json();
        const payments = merchantOrder.payments || [];

        console.log('🛍️ Merchant Order:', merchantOrder.id, '- Pagos:', payments.length);

        // Si no hay pagos, aún no se completó
        if (payments.length === 0) {
          console.log('⏳ Sin pagos aún');
          return { processed: true, message: 'No payments yet' };
        }

        // Obtener orderId
        const orderId = parseInt(merchantOrder.external_reference);
        if (!orderId) {
          console.error('❌ external_reference inválido');
          return { processed: false, message: 'Invalid order ID' };
        }

        // Buscar orden
        const order = await this.prisma.order.findUnique({
          where: { id: orderId }
        });

        if (!order) {
          console.error('❌ Orden no encontrada:', orderId);
          return { processed: false, message: 'Order not found' };
        }

        // Procesar pago
        const payment = payments[0];
        let newStatus = 'pendiente';
        
        console.log('💳 Estado del pago:', payment.status);
        
        if (payment.status === 'approved') {
          newStatus = 'completado';
          
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
        } else if (payment.status === 'rejected') {
          newStatus = 'cancelado';
        }

        // Actualizar orden
        await this.prisma.order.update({
          where: { id: orderId },
          data: {
            status: newStatus,
            mercadoPagoData: {
              preferenceId: order.mercadoPagoData?.['preferenceId'],
              merchantOrderId: merchantOrder.id?.toString(),
              paymentId: payment.id?.toString(),
              paymentStatus: payment.status,
              transactionAmount: payment.transaction_amount,
              paymentMethod: payment.payment_method_id,
            }
          }
        });

        console.log(`✅ Orden ${orderId} actualizada a: ${newStatus}`);

        return { processed: true, orderId, status: newStatus };
      }

      console.log('⚠️ Tipo de webhook no soportado:', webhookType);
      return { processed: false, message: 'Webhook type not supported' };
    } catch (error) {
      console.error('❌ Error procesando webhook:', error);
      return { processed: false, error: error.message };
    }
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

