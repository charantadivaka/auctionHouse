import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { BidsService } from './bids.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';

@Controller('bids')
export class BidsController {
  constructor(private readonly bidsService: BidsService) {}

  @Get('auction/:auctionId')
  async findByAuction(
    @Param('auctionId') auctionId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.bidsService.findByAuction(auctionId, parseInt(page, 10), parseInt(limit, 10));
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async findMyBids(
    @CurrentUser() user: User,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.bidsService.findByUser(user.id, parseInt(page, 10), parseInt(limit, 10));
  }
}
