import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LogsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: {
    level?: string;
    event?: string;
    userEmail?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const where: any = {};

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
}
