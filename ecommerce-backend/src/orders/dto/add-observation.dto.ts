import { IsString, IsNotEmpty } from 'class-validator';

export class AddObservationDto {
  @IsString()
  @IsNotEmpty()
  observacion: string;
}

