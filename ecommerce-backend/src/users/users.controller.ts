import { Controller, Get, Patch, Param, Delete, Body, UseGuards, Request, Put } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('usuarios')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(+id, dto);
  }

  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }

  // Endpoints para gestión de perfil de cliente
  @UseGuards(JwtAuthGuard)
  @Get('clientes/perfil')
  getCustomerProfile(@Request() req) {
    const userId = req.user.userId;
    return this.usersService.getCustomerProfile(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('clientes/perfil')
  updateCustomerProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    const userId = req.user.userId;
    return this.usersService.updateProfile(userId, updateProfileDto);
  }
}
