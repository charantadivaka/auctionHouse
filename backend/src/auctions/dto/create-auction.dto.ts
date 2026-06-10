import { IsString, IsNumber, IsDateString, MinLength, MaxLength, Min } from 'class-validator';

export class CreateAuctionDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @IsNumber()
  @Min(0.01)
  startingPrice: number;

  @IsDateString()
  endTime: string;
}
