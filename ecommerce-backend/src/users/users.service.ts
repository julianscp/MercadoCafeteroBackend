import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

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

  async findOne(id: number) {
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
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

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

  async remove(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

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

  // Métodos específicos para gestión de perfil de cliente
  async updateProfile(userId: number, updateData: { nombre?: string; direccion?: string; telefono?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
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

  async getCustomerProfile(userId: number) {
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
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      ...user,
      estadisticas: {
        totalPedidos: user._count.Orders,
        totalReclamos: user._count.Reclamos
      }
    };
  }
}
