import { Controller, Post, Delete, Get, Param, Query, UseGuards } from '@nestjs/common';
import { WatchlistService } from './watchlist.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';

@Controller('watchlist')
@UseGuards(JwtAuthGuard)
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  @Get()
  async getMyWatchlist(
    @CurrentUser() user: User,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '12',
  ) {
    return this.watchlistService.getUserWatchlist(user.id, parseInt(page, 10), parseInt(limit, 10));
  }

  // FEAT-03/BUG-12: Efficient single-item watchlist check
  @Get('check/:auctionId')
  async checkWatchlist(@Param('auctionId') auctionId: string, @CurrentUser() user: User) {
    const isWatchlisted = await this.watchlistService.isWatchlisted(user.id, auctionId);
    return { isWatchlisted };
  }

  @Post(':auctionId')
  async addToWatchlist(@Param('auctionId') auctionId: string, @CurrentUser() user: User) {
    await this.watchlistService.add(user.id, auctionId);
    return { success: true };
  }

  @Delete(':auctionId')
  async removeFromWatchlist(@Param('auctionId') auctionId: string, @CurrentUser() user: User) {
    await this.watchlistService.remove(user.id, auctionId);
    return { success: true };
  }
}
