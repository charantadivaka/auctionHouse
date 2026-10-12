import { IsOptional, IsString, IsEnum, IsNumberString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AuctionStatus, AuctionCondition, AuctionType } from '../auction.entity';

export class QueryAuctionDto {
  @ApiPropertyOptional({ example: 'rolex', description: 'Full-text search on title and description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'uuid-of-seller', description: 'Filter by seller user ID' })
  @IsOptional()
  @IsString()
  seller?: string;

  @ApiPropertyOptional({ example: 'Electronics', description: 'Filter by category name or ID' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: AuctionStatus, example: AuctionStatus.ACTIVE })
  @IsOptional()
  @IsEnum(AuctionStatus)
  status?: AuctionStatus;

  @ApiPropertyOptional({ enum: AuctionCondition, example: AuctionCondition.GOOD })
  @IsOptional()
  @IsEnum(AuctionCondition)
  condition?: AuctionCondition;

  @ApiPropertyOptional({ enum: AuctionType, example: AuctionType.TIMED })
  @IsOptional()
  @IsEnum(AuctionType)
  auctionType?: AuctionType;

  @ApiPropertyOptional({ example: '100', description: 'Minimum current price filter (USD)' })
  @IsOptional()
  @IsNumberString()
  minPrice?: string;

  @ApiPropertyOptional({ example: '5000', description: 'Maximum current price filter (USD)' })
  @IsOptional()
  @IsNumberString()
  maxPrice?: string;

  @ApiPropertyOptional({
    example: 'ending_soon',
    enum: ['price_asc', 'price_desc', 'ending_soon', 'most_bids', 'newest', 'most_viewed'],
    description: 'Sort order for results',
  })
  @IsOptional()
  @IsString()
  sort?: 'price_asc' | 'price_desc' | 'ending_soon' | 'most_bids' | 'newest' | 'most_viewed';

  @ApiPropertyOptional({ example: '1', description: 'Page number (1-indexed)' })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ example: '12', description: 'Results per page' })
  @IsOptional()
  @IsNumberString()
  limit?: string;
}
