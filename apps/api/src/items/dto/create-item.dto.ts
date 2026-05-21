import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ItemType } from '@seoyoung-erp/database';

export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  itemCode?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsEnum(ItemType)
  itemType?: ItemType;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  basePrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  currentStock?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minimumStock?: number;

  @IsOptional()
  @IsString()
  memo?: string;
}
