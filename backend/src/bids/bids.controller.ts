import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { BidsService } from './bids.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';

@ApiTags('bids')
@Controller('bids')
export class BidsController {
  constructor(private readonly bidsService: BidsService) {}

  @ApiOperation({ summary: 'Get bid history for an auction', description: 'Returns all bids placed on a given auction, paginated, sorted by time.' })
  @ApiParam({ name: 'auctionId', description: 'Auction UUID' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  @ApiResponse({ status: 200, description: 'Paginated bid list.' })
  @Get('auction/:auctionId')
  async findByAuction(
    @Param('auctionId') auctionId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.bidsService.findByAuction(auctionId, parseInt(page, 10), parseInt(limit, 10));
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: "Get current user's bid history", description: 'Returns all bids placed by the authenticated user across all auctions.' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  @ApiResponse({ status: 200, description: 'Paginated bid list.' })
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
