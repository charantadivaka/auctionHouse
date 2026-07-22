import {
  IsString,
  IsNumber,
  IsDateString,
  MinLength,
  MaxLength,
  Min,
  IsOptional,
  IsArray,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { AuctionCondition } from '../auction.entity';

export class UpdateAuctionDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  @IsOptional()
  title?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsEnum(AuctionCondition)
  @IsOptional()
  condition?: AuctionCondition;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  startingPrice?: number;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  minBidIncrement?: number;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  reservePrice?: number;

  @IsDateString()
  @IsOptional()
  startTime?: string;

  @IsDateString()
  @IsOptional()
  endTime?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  shippingInfo?: string;
}
