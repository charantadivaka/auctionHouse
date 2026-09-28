import { Controller, Post, Body, Get, Param, Query, UseGuards } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';

@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Get('seller/:sellerId')
  async getSellerRatings(
    @Param('sellerId') sellerId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.ratingsService.getBySeller(sellerId, parseInt(page, 10), parseInt(limit, 10));
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createRating(@Body() createRatingDto: CreateRatingDto, @CurrentUser() user: User) {
    return this.ratingsService.create(user.id, createRatingDto);
  }
}
