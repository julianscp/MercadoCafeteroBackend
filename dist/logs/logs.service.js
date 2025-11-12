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
exports.LogsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let LogsService = class LogsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(filters) {
        const where = {};
        if (filters?.level) {
            where.level = filters.level;
        }
        if (filters?.event) {
            where.event = filters.event;
        }
        if (filters?.userEmail) {
            where.userEmail = filters.userEmail;
        }
        if (filters?.dateFrom || filters?.dateTo) {
            where.timestamp = {};
            if (filters?.dateFrom) {
                where.timestamp.gte = new Date(filters.dateFrom);
            }
            if (filters?.dateTo) {
                where.timestamp.lte = new Date(filters.dateTo);
            }
        }
        return this.prisma.logEntry.findMany({
            where,
            orderBy: {
                timestamp: 'desc',
            },
        });
    }
};
exports.LogsService = LogsService;
exports.LogsService = LogsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LogsService);
//# sourceMappingURL=logs.service.js.map