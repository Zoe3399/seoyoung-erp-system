import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateWorkOrderDto {
  @IsDateString()
  scheduledStart!: string;

  @IsOptional()
  @IsDateString()
  scheduledEnd?: string;

  @IsString()
  @IsNotEmpty()
  workType!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsOptional()
  @IsString()
  estimateId?: string;

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
