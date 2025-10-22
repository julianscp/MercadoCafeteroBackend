import { IsArray, IsNumber, IsPositive, ValidateNested, ArrayMinSize, IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class ProductItemDto {
  @IsNumber()
  @IsPositive()
  productId: number;

  @IsNumber()
  @IsPositive()
  cantidad: number;
}

export class CreatePreferenceDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProductItemDto)
  items: ProductItemDto[];

  @IsString()
  @IsOptional()
  direccionEnvio?: string;
}

