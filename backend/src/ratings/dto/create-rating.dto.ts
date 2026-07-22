import { IsInt, Min, Max, IsString, IsOptional, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateRatingDto {
  @IsUUID()
  @IsNotEmpty()
  sellerId: string;

  @IsUUID()
  @IsNotEmpty()
  auctionId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  stars: number;

  @IsString()
  @IsOptional()
  comment?: string;
}
