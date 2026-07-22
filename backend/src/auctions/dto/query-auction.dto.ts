import { IsOptional, IsString, IsEnum, IsNumberString } from 'class-validator';
import { AuctionStatus, AuctionCondition } from '../auction.entity';

export class QueryAuctionDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(AuctionStatus)
  status?: AuctionStatus;

  @IsOptional()
  @IsEnum(AuctionCondition)
  condition?: AuctionCondition;

  @IsOptional()
  @IsNumberString()
  minPrice?: string;

  @IsOptional()
  @IsNumberString()
  maxPrice?: string;

  @IsOptional()
  @IsString()
  sort?: 'price_asc' | 'price_desc' | 'ending_soon' | 'most_bids' | 'newest';

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
