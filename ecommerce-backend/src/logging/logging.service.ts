import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

export enum LogEvent {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  REGISTER = 'REGISTER',
  PURCHASE = 'PURCHASE',
  INVENTORY_CHANGE = 'INVENTORY_CHANGE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  FAILED_LOGIN = 'FAILED_LOGIN',
  PRODUCT_CREATED = 'PRODUCT_CREATED',
  PRODUCT_UPDATED = 'PRODUCT_UPDATED',
  PRODUCT_DELETED = 'PRODUCT_DELETED',
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_UPDATED = 'ORDER_UPDATED',
  COMPLAINT_CREATED = 'COMPLAINT_CREATED',
}

export interface LogEntry {
  event: LogEvent;
  level: LogLevel;
  message: string;
  userId?: number;
  userEmail?: string;
  metadata?: Record<string, any>;
  timestamp?: Date;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class LoggingService {
  private readonly logger = new Logger(LoggingService.name);

  constructor(private prisma: PrismaService) {}

  async logEvent(entry: LogEntry): Promise<void> {
    try {
      // Crear entrada en la base de datos
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

      // También loggear en consola con formato estructurado
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
    } catch (error) {
      this.logger.error('Error al registrar log:', error);
    }
  }

  // Métodos específicos para eventos comunes
  async logLogin(userId: number, userEmail: string, ipAddress?: string, userAgent?: string): Promise<void> {
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

  async logLogout(userId: number, userEmail: string, ipAddress?: string): Promise<void> {
    await this.logEvent({
      event: LogEvent.LOGOUT,
      level: LogLevel.INFO,
      message: `Usuario ${userEmail} cerró sesión`,
      userId,
      userEmail,
      ipAddress,
    });
  }

  async logFailedLogin(email: string, reason: string, ipAddress?: string): Promise<void> {
    await this.logEvent({
      event: LogEvent.FAILED_LOGIN,
      level: LogLevel.WARN,
      message: `Intento de inicio de sesión fallido para ${email}: ${reason}`,
      userEmail: email,
      ipAddress,
      metadata: { reason },
    });
  }

  async logPurchase(userId: number, userEmail: string, orderId: number, total: number, ipAddress?: string): Promise<void> {
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

  async logInventoryChange(userId: number, userEmail: string, productId: number, change: number, reason: string, ipAddress?: string): Promise<void> {
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

  async logAccountLocked(userEmail: string, reason: string, ipAddress?: string): Promise<void> {
    await this.logEvent({
      event: LogEvent.ACCOUNT_LOCKED,
      level: LogLevel.WARN,
      message: `Cuenta ${userEmail} bloqueada: ${reason}`,
      userEmail,
      ipAddress,
      metadata: { reason },
    });
  }

  async logProductChange(event: LogEvent, userId: number, userEmail: string, productId: number, productName: string): Promise<void> {
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

  async logOrderChange(event: LogEvent, userId: number, userEmail: string, orderId: number, orderStatus?: string): Promise<void> {
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

  async logComplaint(userId: number, userEmail: string, complaintId: number, complaintType: string): Promise<void> {
    await this.logEvent({
      event: LogEvent.COMPLAINT_CREATED,
      level: LogLevel.INFO,
      message: `Usuario ${userEmail} creó un reclamo de tipo ${complaintType}`,
      userId,
      userEmail,
      metadata: { complaintId, complaintType },
    });
  }

  // Método para obtener logs con filtros
  async getLogs(filters: {
    event?: LogEvent;
    level?: LogLevel;
    userId?: number;
    userEmail?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters.event) where.event = filters.event;
    if (filters.level) where.level = filters.level;
    if (filters.userId) where.userId = filters.userId;
    if (filters.userEmail) where.userEmail = filters.userEmail;
    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    return this.prisma.logEntry.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filters.limit || 100,
      skip: filters.offset || 0,
    });
  }
}
