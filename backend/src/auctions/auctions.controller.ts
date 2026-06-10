import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { AuctionsService } from './auctions.service';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { Auction } from './auction.entity';

/**
 * Default creator ID used for demo/seed purposes (no auth in this build).
 * In a real app, this would come from @Req() user or a JWT guard.
 */
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

@Controller('auctions')
export class AuctionsController {
  constructor(private readonly auctionsService: AuctionsService) {}

  /** POST /auctions — create a new auction */
  @Post()
  async create(@Body() createAuctionDto: CreateAuctionDto): Promise<Auction> {
    return this.auctionsService.create(createAuctionDto, DEMO_USER_ID);
  }

  /**
   * POST /auctions/seed — seed demo users and a sample auction.
   * Only useful in development; remove or guard with an env check in production.
   */
  @Post('seed')
  async seed(): Promise<Auction> {
    return this.auctionsService.seedDemo();
  }

  /** GET /auctions — list all auctions */
  @Get()
  async findAll(): Promise<Auction[]> {
    return this.auctionsService.findAll();
  }

  /** GET /auctions/:id — get a single auction with bids */
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Auction> {
    return this.auctionsService.findOne(id);
  }
}
