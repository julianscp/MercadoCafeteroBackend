import { IsString, IsOptional, IsNotEmpty, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  nombre?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: 'La dirección debe tener al menos 5 caracteres' })
  direccion?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(7, { message: 'El teléfono debe tener al menos 7 caracteres' })
  telefono?: string;
}
