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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuctionCondition, AuctionType } from '../auction.entity';

export class CreateAuctionDto {
  @ApiProperty({ example: 'Vintage Rolex Submariner', minLength: 3, maxLength: 120 })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title: string;

  @ApiProperty({
    example: 'A pristine 1969 Rolex Submariner in original condition...',
    minLength: 10,
    maxLength: 2000,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @ApiPropertyOptional({ type: [String], example: ['https://example.com/image1.jpg'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ enum: AuctionCondition, example: AuctionCondition.GOOD })
  @IsEnum(AuctionCondition)
  @IsOptional()
  condition?: AuctionCondition;

  @ApiProperty({ example: 500.0, minimum: 0.01, description: 'Starting bid price in USD' })
  @IsNumber()
  @Min(0.01)
  startingPrice: number;

  @ApiPropertyOptional({ example: 10.0, minimum: 0.01, description: 'Minimum increment between bids' })
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  minBidIncrement?: number;

  @ApiPropertyOptional({ example: 1000.0, minimum: 0.01, description: 'Hidden reserve price; auction only sells if this is met' })
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  reservePrice?: number;

  @ApiPropertyOptional({ example: '2026-12-01T10:00:00Z', description: 'ISO 8601 — defaults to now if omitted' })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiProperty({ example: '2026-12-08T10:00:00Z', description: 'ISO 8601 auction end time (must be in the future)' })
  @IsDateString()
  endTime: string;

  @ApiPropertyOptional({ example: 'New York, NY' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ example: 'Ships worldwide via FedEx. Buyer pays shipping.' })
  @IsString()
  @IsOptional()
  shippingInfo?: string;

  @ApiPropertyOptional({ enum: AuctionType, example: AuctionType.TIMED })
  @IsEnum(AuctionType)
  @IsOptional()
  auctionType?: AuctionType;

  @ApiPropertyOptional({ example: 'https://youtube.com/watch?v=example' })
  @IsString()
  @IsOptional()
  videoUrl?: string;
}
