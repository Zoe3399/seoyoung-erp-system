import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateEstimateDto {
  @IsDateString()
  requestedDate!: string;

  @IsString()
  @IsNotEmpty()
  workType!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsOptional()
  @IsString()
  estimatorName?: string;

  @IsOptional()
  @IsString()
  partnerId?: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  memo?: string;
}
