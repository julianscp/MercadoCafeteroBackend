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
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const logging_service_1 = require("../logging/logging.service");
const mail_service_1 = require("../mail/mail.service");
const metrics_service_1 = require("../metrics/metrics.service");
let OrdersService = class OrdersService {
    prisma;
    loggingService;
    mailService;
    metricsService;
    constructor(prisma, loggingService, mailService, metricsService) {
        this.prisma = prisma;
        this.loggingService = loggingService;
        this.mailService = mailService;
        this.metricsService = metricsService;
    }
    async createOrder(userId, createOrderDto, userEmail, ipAddress) {
        console.log(`=== CREANDO ORDEN ===`);
        console.log(`Usuario ID: ${userId}`);
        console.log(`Email: ${userEmail}`);
        console.log(`IP: ${ipAddress}`);
        console.log(`Productos:`, createOrderDto.products);
        const { products } = createOrderDto;
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, nombre: true }
        });
        if (!user) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        const productIds = products.map(p => p.productId);
        const existingProducts = await this.prisma.product.findMany({
            where: {
                id: { in: productIds },
                estado: 'ACTIVO'
            }
        });
        if (existingProducts.length !== productIds.length) {
            throw new common_1.BadRequestException('Algunos productos no existen o no están disponibles');
        }
        let total = 0;
        const orderProducts = products.map(orderProduct => {
            const product = existingProducts.find(p => p.id === orderProduct.productId);
            if (!product) {
                throw new common_1.BadRequestException(`Producto con ID ${orderProduct.productId} no encontrado`);
            }
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
        const order = await this.prisma.order.create({
            data: {
                userId,
                products: orderProducts,
                total,
                status: 'completado',
                mercadoPagoData: {}
            }
        });
        for (const orderProduct of orderProducts) {
            const product = existingProducts.find(p => p.id === orderProduct.id);
            if (product) {
                const stockAnterior = product.stock;
                const nuevoStock = product.stock - orderProduct.cantidad;
                console.log(`Actualizando stock del producto ${product.nombre}: ${stockAnterior} -> ${nuevoStock} (vendido: ${orderProduct.cantidad})`);
                const updatedProduct = await this.prisma.product.update({
                    where: { id: orderProduct.id },
                    data: {
                        stock: nuevoStock,
                        estado: nuevoStock === 0 ? 'AGOTADO' : nuevoStock <= (product.stockMinimo || 0) ? 'ACTIVO' : 'ACTIVO'
                    }
                });
                console.log(`Stock actualizado: ${updatedProduct.stock}`);
                if (nuevoStock <= (product.stockMinimo ?? 0)) {
                    await this.prisma.alerta.create({
                        data: {
                            productoId: orderProduct.id,
                            mensaje: `El producto "${product.nombre}" está en nivel crítico de stock (${nuevoStock} unidades)`,
                        },
                    });
                    const adminEmail = process.env.ADMIN_EMAIL || 'admin@mercadocafetero.com';
                    await this.mailService.sendStockAlert(adminEmail, product.nombre, nuevoStock);
                }
                await this.loggingService.logInventoryChange(userId, user.email, orderProduct.id, -orderProduct.cantidad, `Venta - Orden #${order.id}`, ipAddress);
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
        await this.loggingService.logPurchase(userId, user.email, order.id, total, ipAddress);
        this.metricsService.incrementOrders('success');
        return order;
    }
    async findOrdersByUser(userId) {
        return this.prisma.order.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
    }
    async findOrderById(orderId, userId) {
        const order = await this.prisma.order.findFirst({
            where: {
                id: orderId,
                userId
            }
        });
        if (!order) {
            throw new common_1.NotFoundException('Pedido no encontrado');
        }
        return order;
    }
    async getCustomerLoyaltyMetrics() {
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
        return orders.map(order => ({
            ...order,
            products: Array.isArray(order.products) ? order.products : []
        }));
    }
    async getPendingOrders() {
        const orders = await this.prisma.order.findMany({
            where: {
                status: 'completado'
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
        return orders.map(order => ({
            ...order,
            products: Array.isArray(order.products) ? order.products : []
        }));
    }
    async confirmOrder(orderId, adminId) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId }
        });
        if (!order) {
            throw new common_1.NotFoundException('Pedido no encontrado');
        }
        if (order.status !== 'completado') {
            throw new common_1.BadRequestException('Solo se pueden confirmar pedidos completados');
        }
        const updatedOrder = await this.prisma.order.update({
            where: { id: orderId },
            data: {
                status: 'confirmado',
                updatedAt: new Date()
            }
        });
        const admin = await this.prisma.user.findUnique({
            where: { id: adminId },
            select: { email: true }
        });
        if (admin) {
            await this.loggingService.logInventoryChange(adminId, admin.email, orderId, 0, `Admin confirmó/despachó pedido #${orderId}`, undefined);
        }
        return updatedOrder;
    }
    async addOrderObservation(orderId, observacion, adminId) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId }
        });
        if (!order) {
            throw new common_1.NotFoundException('Pedido no encontrado');
        }
        const updatedOrder = await this.prisma.order.update({
            where: { id: orderId },
            data: {
                observacionesAdmin: observacion,
                updatedAt: new Date()
            }
        });
        const admin = await this.prisma.user.findUnique({
            where: { id: adminId },
            select: { email: true }
        });
        if (admin) {
            await this.loggingService.logInventoryChange(adminId, admin.email, orderId, 0, `Admin agregó observación a pedido #${orderId}: ${observacion}`, undefined);
        }
        return updatedOrder;
    }
    async getSalesStats(period) {
        const now = new Date();
        let startDate;
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
        const totalSales = orders.reduce((sum, order) => sum + Number(order.total), 0);
        const orderCount = orders.length;
        const productSales = {};
        for (const order of orders) {
            const products = Array.isArray(order.products) ? order.products : [];
            for (const product of products) {
                if (!product)
                    continue;
                const productId = product.id || product.productId;
                if (!productId || typeof productId !== 'number')
                    continue;
                const cantidad = product.cantidad || 0;
                const precio = product.precio || 0;
                const nombre = product.nombre || 'Producto desconocido';
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
        let topProduct = null;
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
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        logging_service_1.LoggingService,
        mail_service_1.MailService,
        metrics_service_1.MetricsService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map