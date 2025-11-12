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
var LoggingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingService = exports.LogEvent = exports.LogLevel = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
var LogLevel;
(function (LogLevel) {
    LogLevel["INFO"] = "INFO";
    LogLevel["WARN"] = "WARN";
    LogLevel["ERROR"] = "ERROR";
    LogLevel["DEBUG"] = "DEBUG";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
var LogEvent;
(function (LogEvent) {
    LogEvent["LOGIN"] = "LOGIN";
    LogEvent["LOGOUT"] = "LOGOUT";
    LogEvent["REGISTER"] = "REGISTER";
    LogEvent["PURCHASE"] = "PURCHASE";
    LogEvent["INVENTORY_CHANGE"] = "INVENTORY_CHANGE";
    LogEvent["PASSWORD_RESET"] = "PASSWORD_RESET";
    LogEvent["EMAIL_VERIFICATION"] = "EMAIL_VERIFICATION";
    LogEvent["ACCOUNT_LOCKED"] = "ACCOUNT_LOCKED";
    LogEvent["FAILED_LOGIN"] = "FAILED_LOGIN";
    LogEvent["PRODUCT_CREATED"] = "PRODUCT_CREATED";
    LogEvent["PRODUCT_UPDATED"] = "PRODUCT_UPDATED";
    LogEvent["PRODUCT_DELETED"] = "PRODUCT_DELETED";
    LogEvent["ORDER_CREATED"] = "ORDER_CREATED";
    LogEvent["ORDER_UPDATED"] = "ORDER_UPDATED";
    LogEvent["COMPLAINT_CREATED"] = "COMPLAINT_CREATED";
})(LogEvent || (exports.LogEvent = LogEvent = {}));
let LoggingService = LoggingService_1 = class LoggingService {
    prisma;
    logger = new common_1.Logger(LoggingService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async logEvent(entry) {
        try {
            await this.prisma.logEntry.create({
                data: {
                    event: entry.event,
                    level: entry.level,
                    message: entry.message,
                    userId: entry.userId,
                    userEmail: entry.userEmail,
                    metadata: entry.metadata || {},
                    timestamp: entry.timestamp || new Date(),
                    ipAddress: entry.ipAddress,
                    userAgent: entry.userAgent,
                },
            });
            const logMessage = {
                timestamp: entry.timestamp || new Date().toISOString(),
                level: entry.level,
                event: entry.event,
                message: entry.message,
                userId: entry.userId,
                userEmail: entry.userEmail,
                metadata: entry.metadata,
                ipAddress: entry.ipAddress,
                userAgent: entry.userAgent,
            };
            switch (entry.level) {
                case LogLevel.ERROR:
                    this.logger.error(JSON.stringify(logMessage));
                    break;
                case LogLevel.WARN:
                    this.logger.warn(JSON.stringify(logMessage));
                    break;
                case LogLevel.DEBUG:
                    this.logger.debug(JSON.stringify(logMessage));
                    break;
                default:
                    this.logger.log(JSON.stringify(logMessage));
            }
        }
        catch (error) {
            this.logger.error('Error al registrar log:', error);
        }
    }
    async logLogin(userId, userEmail, ipAddress, userAgent) {
        await this.logEvent({
            event: LogEvent.LOGIN,
            level: LogLevel.INFO,
            message: `Usuario ${userEmail} inició sesión exitosamente`,
            userId,
            userEmail,
            ipAddress,
            userAgent,
        });
    }
    async logLogout(userId, userEmail, ipAddress) {
        await this.logEvent({
            event: LogEvent.LOGOUT,
            level: LogLevel.INFO,
            message: `Usuario ${userEmail} cerró sesión`,
            userId,
            userEmail,
            ipAddress,
        });
    }
    async logFailedLogin(email, reason, ipAddress) {
        await this.logEvent({
            event: LogEvent.FAILED_LOGIN,
            level: LogLevel.WARN,
            message: `Intento de inicio de sesión fallido para ${email}: ${reason}`,
            userEmail: email,
            ipAddress,
            metadata: { reason },
        });
    }
    async logPurchase(userId, userEmail, orderId, total, ipAddress) {
        await this.logEvent({
            event: LogEvent.PURCHASE,
            level: LogLevel.INFO,
            message: `Usuario ${userEmail} realizó una compra por $${total}`,
            userId,
            userEmail,
            ipAddress,
            metadata: { orderId, total },
        });
    }
    async logInventoryChange(userId, userEmail, productId, change, reason, ipAddress) {
        await this.logEvent({
            event: LogEvent.INVENTORY_CHANGE,
            level: LogLevel.INFO,
            message: `Cambio en inventario del producto ${productId}: ${change > 0 ? '+' : ''}${change}`,
            userId,
            userEmail,
            ipAddress,
            metadata: { productId, change, reason },
        });
    }
    async logAccountLocked(userEmail, reason, ipAddress) {
        await this.logEvent({
            event: LogEvent.ACCOUNT_LOCKED,
            level: LogLevel.WARN,
            message: `Cuenta ${userEmail} bloqueada: ${reason}`,
            userEmail,
            ipAddress,
            metadata: { reason },
        });
    }
    async logProductChange(event, userId, userEmail, productId, productName) {
        const messages = {
            [LogEvent.PRODUCT_CREATED]: `Producto "${productName}" creado`,
            [LogEvent.PRODUCT_UPDATED]: `Producto "${productName}" actualizado`,
            [LogEvent.PRODUCT_DELETED]: `Producto "${productName}" eliminado`,
        };
        await this.logEvent({
            event,
            level: LogLevel.INFO,
            message: messages[event],
            userId,
            userEmail,
            metadata: { productId, productName },
        });
    }
    async logOrderChange(event, userId, userEmail, orderId, orderStatus) {
        const messages = {
            [LogEvent.ORDER_CREATED]: `Orden ${orderId} creada`,
            [LogEvent.ORDER_UPDATED]: `Orden ${orderId} actualizada`,
        };
        await this.logEvent({
            event,
            level: LogLevel.INFO,
            message: messages[event],
            userId,
            userEmail,
            metadata: { orderId, orderStatus },
        });
    }
    async logComplaint(userId, userEmail, complaintId, complaintType) {
        await this.logEvent({
            event: LogEvent.COMPLAINT_CREATED,
            level: LogLevel.INFO,
            message: `Usuario ${userEmail} creó un reclamo de tipo ${complaintType}`,
            userId,
            userEmail,
            metadata: { complaintId, complaintType },
        });
    }
    async getLogs(filters) {
        const where = {};
        if (filters.event)
            where.event = filters.event;
        if (filters.level)
            where.level = filters.level;
        if (filters.userId)
            where.userId = filters.userId;
        if (filters.userEmail)
            where.userEmail = filters.userEmail;
        if (filters.startDate || filters.endDate) {
            where.timestamp = {};
            if (filters.startDate)
                where.timestamp.gte = filters.startDate;
            if (filters.endDate)
                where.timestamp.lte = filters.endDate;
        }
        return this.prisma.logEntry.findMany({
            where,
            orderBy: { timestamp: 'desc' },
            take: filters.limit || 100,
            skip: filters.offset || 0,
        });
    }
};
exports.LoggingService = LoggingService;
exports.LoggingService = LoggingService = LoggingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LoggingService);
//# sourceMappingURL=logging.service.js.map