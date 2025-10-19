import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReclamoDto } from './dto/create-reclamo.dto';

@Injectable()
export class ReclamosService {
  constructor(private prisma: PrismaService) {}

  async createReclamo(userId: number, createReclamoDto: CreateReclamoDto) {
    const { orderId, mensaje } = createReclamoDto;

    // Si se proporciona orderId, verificar que el pedido pertenezca al usuario
    if (orderId) {
      const order = await this.prisma.order.findFirst({
        where: {
          id: orderId,
          userId
        }
      });

      if (!order) {
        throw new BadRequestException('El pedido especificado no existe o no pertenece al usuario');
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

  async findReclamosByUser(userId: number) {
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

  async findReclamoById(reclamoId: number, userId: number) {
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
      throw new NotFoundException('Reclamo no encontrado');
    }

    return reclamo;
  }

  // Métodos administrativos
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

  async updateReclamoStatus(reclamoId: number, estado: string) {
    const reclamo = await this.prisma.reclamo.findUnique({
      where: { id: reclamoId }
    });

    if (!reclamo) {
      throw new NotFoundException('Reclamo no encontrado');
    }

    return this.prisma.reclamo.update({
      where: { id: reclamoId },
      data: { estado }
    });
  }
}
