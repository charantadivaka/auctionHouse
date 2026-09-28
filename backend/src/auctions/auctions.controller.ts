import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AuctionsService } from './auctions.service';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';
import { QueryAuctionDto } from './dto/query-auction.dto';
import { Auction } from './auction.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('auctions')
export class AuctionsController {
  constructor(private readonly auctionsService: AuctionsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() createAuctionDto: CreateAuctionDto,
    @CurrentUser() user: User,
  ): Promise<Auction> {
    return this.auctionsService.create(createAuctionDto, user.id);
  }

  @Get()
  async findAll(@Query() query: QueryAuctionDto) {
    return this.auctionsService.findAll(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  async findMine(@CurrentUser() user: User, @Query('limit') limit?: string) {
    return this.auctionsService.findMine(user.id, limit ? parseInt(limit, 10) : 4);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Auction> {
    return this.auctionsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAuctionDto,
    @CurrentUser() user: User,
  ): Promise<Auction> {
    return this.auctionsService.update(id, updateDto, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: User): Promise<void> {
    return this.auctionsService.remove(id, user.id, user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/end')
  async manualEnd(@Param('id') id: string, @CurrentUser() user: User) {
    return this.auctionsService.manualEndAuction(id, user.id);
  }

  /** POST /auctions/:id/pay  — winner confirms payment */
  @UseGuards(JwtAuthGuard)
  @Post(':id/pay')
  async markAsPaid(@Param('id') id: string, @CurrentUser() user: User) {
    return this.auctionsService.markAsPaid(id, user.id);
  }
}
