import { IsArray, IsNotEmpty, ValidateNested, IsNumber, Min, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderProductDto {
  @IsNumber()
  @Min(1)
  productId: number;

  @IsNumber()
  @Min(1)
  cantidad: number;

  // Campos opcionales para compatibilidad con el frontend
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsNumber()
  precio?: number;

  @IsOptional()
  @IsNumber()
  subtotal?: number;
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderProductDto)
  products: OrderProductDto[];

  // Campos opcionales para compatibilidad con el frontend
  @IsOptional()
  @IsNumber()
  total?: number;

  @IsOptional()
  @IsString()
  status?: string;
}
