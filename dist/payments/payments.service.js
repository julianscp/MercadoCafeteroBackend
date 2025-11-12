"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mercadopago_1 = require("mercadopago");
const prisma_service_1 = require("../prisma/prisma.service");
const mail_service_1 = require("../mail/mail.service");
let PaymentsService = class PaymentsService {
    configService;
    prisma;
    mailService;
    mercadoPagoClient;
    preferenceClient;
    accessToken;
    constructor(configService, prisma, mailService) {
        this.configService = configService;
        this.prisma = prisma;
        this.mailService = mailService;
        this.accessToken = this.configService.get('MERCADOPAGO_ACCESS_TOKEN') || '';
        if (!this.accessToken) {
            throw new Error('MERCADOPAGO_ACCESS_TOKEN no está configurado');
        }
        this.mercadoPagoClient = new mercadopago_1.MercadoPagoConfig({
            accessToken: this.accessToken,
            options: { timeout: 5000 }
        });
        this.preferenceClient = new mercadopago_1.Preference(this.mercadoPagoClient);
    }
    async createPreference(userId, createPreferenceDto) {
        try {
            console.log('🛒 Creando preferencia para usuario:', userId);
            const { items, direccionEnvio } = createPreferenceDto;
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { email: true, nombre: true }
            });
            if (!user) {
                throw new common_1.NotFoundException('Usuario no encontrado');
            }
            const productIds = items.map(p => p.productId);
            const products = await this.prisma.product.findMany({
                where: { id: { in: productIds }, estado: 'ACTIVO' }
            });
            if (products.length !== productIds.length) {
                throw new common_1.BadRequestException('Algunos productos no están disponibles');
            }
            for (const item of items) {
                const product = products.find(p => p.id === item.productId);
                if (!product) {
                    throw new common_1.BadRequestException(`Producto ${item.productId} no encontrado`);
                }
                if (item.cantidad > product.stock) {
                    throw new common_1.BadRequestException(`Stock insuficiente para "${product.nombre}"`);
                }
            }
            const preferenceItems = items.map(item => {
                const product = products.find(p => p.id === item.productId);
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
            const total = preferenceItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
            const orderProducts = items.map(item => {
                const product = products.find(p => p.id === item.productId);
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
                    direccionEnvio: direccionEnvio || null,
                    mercadoPagoData: {}
                }
            });
            console.log('📦 Orden creada:', order.id);
            const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
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
        }
        catch (error) {
            console.error('❌ Error creando preferencia:', error);
            throw new common_1.BadRequestException('Error al crear preferencia: ' + error.message);
        }
    }
    async checkPaymentStatus(orderId, userId, paymentId) {
        try {
            console.log('🔍 Verificando pago para orden:', orderId, paymentId ? `con payment_id: ${paymentId}` : '');
            const order = await this.prisma.order.findFirst({
                where: { id: orderId, userId }
            });
            if (!order) {
                throw new common_1.NotFoundException('Orden no encontrada');
            }
            if (order.status === 'completado') {
                console.log('✅ Orden ya completada');
                return {
                    orderId: order.id,
                    status: 'completado',
                    message: 'Pago ya confirmado'
                };
            }
            let approvedPayment = null;
            if (paymentId) {
                console.log('💳 Consultando pago directo:', paymentId);
                const paymentUrl = `https://api.mercadopago.com/v1/payments/${paymentId}`;
                const paymentResponse = await fetch(paymentUrl, {
                    headers: { 'Authorization': `Bearer ${this.accessToken}` }
                });
                console.log('📡 Status de respuesta MP:', paymentResponse.status);
                if (paymentResponse.ok) {
                    const payment = await paymentResponse.json();
                    console.log('📊 Pago encontrado:', payment.id, '- Estado:', payment.status, '- Ref:', payment.external_reference);
                    if (payment.external_reference === orderId.toString()) {
                        if (payment.status === 'approved') {
                            approvedPayment = payment;
                            console.log('✅ Pago aprobado y verificado!');
                        }
                        else if (payment.status === 'rejected') {
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
                        else {
                            console.log('⏳ Pago en estado:', payment.status);
                        }
                    }
                    else {
                        console.warn('⚠️ El payment_id no corresponde a esta orden. Esperado:', orderId, 'Recibido:', payment.external_reference);
                    }
                }
                else {
                    const errorText = await paymentResponse.text();
                    console.error('❌ Error consultando pago directo:', paymentResponse.status, errorText.substring(0, 200));
                }
            }
            if (!approvedPayment) {
                console.log('🔎 Buscando pagos por external_reference:', orderId);
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
                console.log('💳 Pagos encontrados por búsqueda:', payments.length);
                approvedPayment = payments.find(p => p.status === 'approved');
            }
            if (approvedPayment) {
                console.log('✅ Pago aprobado encontrado:', approvedPayment.id);
                await this.completeOrder(order, approvedPayment);
                return {
                    orderId: order.id,
                    status: 'completado',
                    message: 'Pago confirmado exitosamente',
                    paymentId: approvedPayment.id
                };
            }
            console.log('⏳ Pago aún pendiente');
            return {
                orderId: order.id,
                status: 'pendiente',
                message: 'Pago en proceso'
            };
        }
        catch (error) {
            console.error('❌ Error verificando pago:', error);
            throw new common_1.BadRequestException('Error al verificar pago: ' + error.message);
        }
    }
    async completeOrder(order, payment) {
        const orderProducts = order.products;
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
        const updatedOrder = await this.prisma.order.update({
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
            },
            include: {
                user: {
                    select: {
                        email: true,
                        nombre: true
                    }
                }
            }
        });
        console.log(`✅ Orden ${order.id} completada`);
        try {
            if (updatedOrder.direccionEnvio && orderProducts.length > 0) {
                await this.mailService.sendOrderConfirmation(updatedOrder.user.email, updatedOrder.user.nombre, updatedOrder.id, orderProducts, updatedOrder.total, updatedOrder.direccionEnvio);
                console.log(`📧 Correo de confirmación enviado a ${updatedOrder.user.email}`);
            }
        }
        catch (error) {
            console.error('Error enviando correo de confirmación:', error);
        }
    }
    async getOrderStatus(orderId, userId) {
        const order = await this.prisma.order.findFirst({
            where: { id: orderId, userId }
        });
        if (!order) {
            throw new common_1.NotFoundException('Orden no encontrada');
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
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        mail_service_1.MailService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map