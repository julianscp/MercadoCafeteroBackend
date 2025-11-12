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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        return this.prisma.user.findMany({
            select: {
                id: true,
                email: true,
                rol: true,
                nombre: true,
                direccion: true,
                telefono: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }
    async findOne(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                rol: true,
                nombre: true,
                direccion: true,
                telefono: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!user)
            throw new common_1.NotFoundException('Usuario no encontrado');
        return user;
    }
    async update(id, dto) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('Usuario no encontrado');
        return this.prisma.user.update({
            where: { id },
            data: dto,
            select: {
                id: true,
                email: true,
                rol: true,
                nombre: true,
                direccion: true,
                telefono: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }
    async remove(id) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('Usuario no encontrado');
        return this.prisma.user.delete({
            where: { id },
            select: {
                id: true,
                email: true,
                rol: true,
                nombre: true,
                direccion: true,
                telefono: true,
            },
        });
    }
    async updateProfile(userId, updateData) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        return this.prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                email: true,
                nombre: true,
                direccion: true,
                telefono: true,
                rol: true,
                verificado: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }
    async getCustomerProfile(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                nombre: true,
                direccion: true,
                telefono: true,
                rol: true,
                verificado: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        Orders: true,
                        Reclamos: true
                    }
                }
            }
        });
        if (!user) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        return {
            ...user,
            estadisticas: {
                totalPedidos: user._count.Orders,
                totalReclamos: user._count.Reclamos
            }
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map