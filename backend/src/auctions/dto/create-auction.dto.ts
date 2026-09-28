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
import { AuctionCondition, AuctionType } from '../auction.entity';

export class CreateAuctionDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

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
  startingPrice: number;

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
  endTime: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  shippingInfo?: string;

  @IsEnum(AuctionType)
  @IsOptional()
  auctionType?: AuctionType;

  @IsString()
  @IsOptional()
  videoUrl?: string;
}
