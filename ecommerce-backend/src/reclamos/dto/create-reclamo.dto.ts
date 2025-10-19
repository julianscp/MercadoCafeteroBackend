import { IsString, IsNotEmpty, IsOptional, IsNumber, MinLength } from 'class-validator';

export class CreateReclamoDto {
  @IsOptional()
  @IsNumber()
  orderId?: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'El mensaje debe tener al menos 10 caracteres' })
  mensaje: string;
}
