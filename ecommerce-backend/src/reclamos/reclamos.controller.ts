import { Controller, Post, Get, Param, Body, UseGuards, Request, ParseIntPipe, Patch } from '@nestjs/common';
import { ReclamosService } from './reclamos.service';
import { CreateReclamoDto } from './dto/create-reclamo.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('clientes')
export class ReclamosController {
  constructor(private readonly reclamosService: ReclamosService) {}

  @UseGuards(JwtAuthGuard)
  @Post('reclamos')
  createReclamo(@Request() req, @Body() createReclamoDto: CreateReclamoDto) {
    const userId = req.user.userId;
    return this.reclamosService.createReclamo(userId, createReclamoDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('reclamos')
  findReclamosByUser(@Request() req) {
    const userId = req.user.userId;
    return this.reclamosService.findReclamosByUser(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('reclamos/:id')
  findReclamoById(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user.userId;
    return this.reclamosService.findReclamoById(id, userId);
  }

  // Endpoints administrativos
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/reclamos')
  findAllReclamos() {
    return this.reclamosService.findAllReclamos();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch('admin/reclamos/:id/estado')
  updateReclamoStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('estado') estado: string
  ) {
    return this.reclamosService.updateReclamoStatus(id, estado);
  }
}
