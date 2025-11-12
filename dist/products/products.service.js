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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const mail_service_1 = require("../mail/mail.service");
const cloudinary_service_1 = require("../cloudinary/cloudinary.service");
let ProductsService = class ProductsService {
    prisma;
    mailService;
    cloudinaryService;
    constructor(prisma, mailService, cloudinaryService) {
        this.prisma = prisma;
        this.mailService = mailService;
        this.cloudinaryService = cloudinaryService;
    }
    async create(createProductDto) {
        return this.prisma.product.create({
            data: {
                ...createProductDto,
                estado: createProductDto.estado ?? client_1.ProductEstado.ACTIVO,
            },
        });
    }
    async findAll() {
        return this.prisma.product.findMany({
            orderBy: { id: 'desc' },
        });
    }
    async findOne(id) {
        const producto = await this.prisma.product.findUnique({ where: { id } });
        if (!producto)
            throw new common_1.NotFoundException('Producto no encontrado');
        return producto;
    }
    async update(id, updateProductDto) {
        await this.findOne(id);
        return this.prisma.product.update({
            where: { id },
            data: updateProductDto,
        });
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.product.update({
            where: { id },
            data: { estado: client_1.ProductEstado.INACTIVO },
        });
    }
    async updateStock(id, updateStockDto, usuarioId) {
        const producto = await this.findOne(id);
        const nuevoStock = producto.stock + updateStockDto.cantidad;
        if (nuevoStock < 0)
            throw new common_1.BadRequestException('Stock insuficiente');
        await this.prisma.product.update({
            where: { id },
            data: {
                stock: nuevoStock,
                estado: nuevoStock === 0 ? client_1.ProductEstado.AGOTADO : client_1.ProductEstado.ACTIVO,
            },
        });
        await this.prisma.stockLog.create({
            data: {
                productoId: id,
                cantidad: updateStockDto.cantidad,
                tipo: updateStockDto.cantidad > 0 ? client_1.LogTipo.ENTRADA : client_1.LogTipo.SALIDA,
                usuarioId,
            },
        });
        if (nuevoStock <= (producto.stockMinimo ?? 0)) {
            await this.prisma.alerta.create({
                data: {
                    productoId: id,
                    mensaje: `El producto "${producto.nombre}" está en nivel crítico de stock (${nuevoStock} unidades)`,
                },
            });
            const adminEmail = process.env.ADMIN_EMAIL || 'admin@mercadocafetero.com';
            await this.mailService.sendStockAlert(adminEmail, producto.nombre, nuevoStock);
        }
        return { id, nuevoStock };
    }
    async findLogs(id) {
        await this.findOne(id);
        return this.prisma.stockLog.findMany({
            where: { productoId: id },
            orderBy: { fecha: 'desc' },
            include: {
                producto: { select: { id: true, nombre: true } },
            },
        });
    }
    async findCriticos() {
        const productos = await this.prisma.product.findMany({
            select: {
                id: true,
                nombre: true,
                stock: true,
                stockMinimo: true,
                categoria: true,
                subcategoria: true,
                imagenUrl: true,
                estado: true,
            },
            orderBy: { id: 'desc' },
        });
        return productos.filter((p) => p.estado === client_1.ProductEstado.ACTIVO && p.stock < 15);
    }
    async findLogsByDateRange(dto) {
        const { fechaInicio, fechaFin, productoId } = dto;
        console.log(`=== BUSCANDO LOGS DE STOCK ===`);
        console.log(`Fecha inicio: ${fechaInicio}`);
        console.log(`Fecha fin: ${fechaFin}`);
        console.log(`Producto ID: ${productoId}`);
        const logs = await this.prisma.stockLog.findMany({
            where: {
                fecha: {
                    gte: new Date(fechaInicio),
                    lte: new Date(fechaFin),
                },
                ...(productoId ? { productoId } : {}),
            },
            orderBy: { fecha: 'desc' },
            include: {
                producto: {
                    select: { id: true, nombre: true },
                },
                usuario: {
                    select: { id: true, nombre: true, rol: true },
                },
            },
        });
        console.log(`=== LOGS ENCONTRADOS ===`);
        console.log(`Total logs: ${logs.length}`);
        logs.forEach((log, index) => {
            console.log(`Log ${index + 1}:`, {
                id: log.id,
                productoId: log.productoId,
                cantidad: log.cantidad,
                tipo: log.tipo,
                usuarioId: log.usuarioId,
                usuario: log.usuario ? {
                    id: log.usuario.id,
                    nombre: log.usuario.nombre,
                    rol: log.usuario.rol
                } : 'null'
            });
        });
        return logs;
    }
    async updateImageUrl(id, url, newPublicId) {
        const producto = await this.prisma.product.findUnique({
            where: { id },
            select: { id: true, imagenPublicId: true },
        });
        if (!producto)
            throw new common_1.NotFoundException('Producto no encontrado');
        if (producto.imagenPublicId && producto.imagenPublicId !== newPublicId) {
            try {
                await this.cloudinaryService.deleteImage(producto.imagenPublicId);
            }
            catch {
            }
        }
        const updated = await this.prisma.product.update({
            where: { id },
            data: {
                imagenUrl: url ?? null,
                imagenPublicId: newPublicId ?? null,
            },
            select: { id: true, imagenUrl: true, imagenPublicId: true },
        });
        return updated;
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService,
        cloudinary_service_1.CloudinaryService])
], ProductsService);
//# sourceMappingURL=products.service.js.map