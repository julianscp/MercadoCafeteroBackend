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
exports.ReclamosService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const mail_service_1 = require("../mail/mail.service");
let ReclamosService = class ReclamosService {
    prisma;
    mailService;
    constructor(prisma, mailService) {
        this.prisma = prisma;
        this.mailService = mailService;
    }
    async createReclamo(userId, createReclamoDto) {
        const { orderId, mensaje } = createReclamoDto;
        if (orderId) {
            const order = await this.prisma.order.findFirst({
                where: {
                    id: orderId,
                    userId
                }
            });
            if (!order) {
                throw new common_1.BadRequestException('El pedido especificado no existe o no pertenece al usuario');
            }
        }
        const reclamo = await this.prisma.reclamo.create({
            data: {
                userId,
                orderId: orderId || null,
                mensaje,
                estado: 'pendiente'
            }
        });
        return reclamo;
    }
    async findReclamosByUser(userId) {
        return this.prisma.reclamo.findMany({
            where: { userId },
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
    }
    async findReclamoById(reclamoId, userId) {
        const reclamo = await this.prisma.reclamo.findFirst({
            where: {
                id: reclamoId,
                userId
            },
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
        if (!reclamo) {
            throw new common_1.NotFoundException('Reclamo no encontrado');
        }
        return reclamo;
    }
    async findAllReclamos() {
        return this.prisma.reclamo.findMany({
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
    }
    async updateReclamoStatus(reclamoId, estado) {
        const reclamo = await this.prisma.reclamo.findUnique({
            where: { id: reclamoId }
        });
        if (!reclamo) {
            throw new common_1.NotFoundException('Reclamo no encontrado');
        }
        return this.prisma.reclamo.update({
            where: { id: reclamoId },
            data: { estado }
        });
    }
    async respondToReclamo(reclamoId, respuesta) {
        const reclamo = await this.prisma.reclamo.findUnique({
            where: { id: reclamoId },
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
        if (!reclamo) {
            throw new common_1.NotFoundException('Reclamo no encontrado');
        }
        const updatedReclamo = await this.prisma.reclamo.update({
            where: { id: reclamoId },
            data: {
                respuesta,
                estado: 'resuelto',
                respondedAt: new Date()
            },
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
        try {
            await this.mailService.sendComplaintResponse(reclamo.user.email, reclamo.user.nombre, reclamoId, respuesta);
        }
        catch (error) {
            console.error('Error enviando correo de respuesta de reclamo:', error);
        }
        return updatedReclamo;
    }
};
exports.ReclamosService = ReclamosService;
exports.ReclamosService = ReclamosService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService])
], ReclamosService);
//# sourceMappingURL=reclamos.service.js.map