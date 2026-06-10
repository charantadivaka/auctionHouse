import { Controller, Get, Param } from '@nestjs/common';
import { BidsService } from './bids.service';
import { Bid } from './bid.entity';

@Controller('bids')
export class BidsController {
  constructor(private readonly bidsService: BidsService) {}

  @Get('auction/:auctionId')
  async findByAuction(@Param('auctionId') auctionId: string): Promise<Bid[]> {
    return this.bidsService.findByAuction(auctionId);
  }
}
