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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { AuctionsService } from './auctions.service';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';
import { QueryAuctionDto } from './dto/query-auction.dto';
import { PlaceBidDto } from './dto/place-bid.dto';
import { Auction } from './auction.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { RolesGuard } from '../common/guards/roles.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { AuctionsGateway } from './auctions.gateway';

@ApiTags('auctions')
@Controller('auctions')
export class AuctionsController {
  constructor(
    private readonly auctionsService: AuctionsService,
    private readonly auctionsGateway: AuctionsGateway,
  ) {}

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Create a new auction', description: 'Creates an auction listing. The authenticated user becomes the seller.' })
  @ApiResponse({ status: 201, description: 'Auction created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input (e.g. end time in the past).' })
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() createAuctionDto: CreateAuctionDto,
    @CurrentUser() user: User,
  ): Promise<Auction> {
    return this.auctionsService.create(createAuctionDto, user.id);
  }

  @ApiOperation({ summary: 'List all auctions', description: 'Returns a paginated, filterable list of auctions.' })
  @ApiResponse({ status: 200, description: 'Paginated auction list.' })
  @Get()
  async findAll(@Query() query: QueryAuctionDto) {
    return this.auctionsService.findAll(query);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: "Get current user's auctions", description: 'Returns the auctions created by the currently authenticated user.' })
  @ApiQuery({ name: 'limit', required: false, example: '4' })
  @UseGuards(JwtAuthGuard)
  @Get('mine')
  async findMine(@CurrentUser() user: User, @Query('limit') limit?: string) {
    return this.auctionsService.findMine(user.id, limit ? parseInt(limit, 10) : 4);
  }

  @ApiOperation({ summary: 'Get a single auction by ID' })
  @ApiParam({ name: 'id', description: 'Auction UUID', example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @ApiResponse({ status: 200, description: 'Auction found.' })
  @ApiResponse({ status: 404, description: 'Auction not found.' })
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: User | null): Promise<Auction> {
    return this.auctionsService.findOne(id, user?.id);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Place a bid on an active auction',
    description: 'Places a bid via REST. Emits real-time WebSocket event to all room participants.',
  })
  @ApiParam({ name: 'id', description: 'Auction UUID' })
  @ApiResponse({ status: 200, description: 'Bid placed successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid bid amount or auction not active.' })
  @UseGuards(JwtAuthGuard)
  @Post(':id/bid')
  async placeBid(
    @Param('id') id: string,
    @Body() dto: PlaceBidDto,
    @CurrentUser() user: User,
  ) {
    const updatedAuction = await this.auctionsService.placeBid(id, user.id, dto.amount);
    if (this.auctionsGateway?.server) {
      this.auctionsGateway.server.to(`auction-${id}`).emit('bidPlaced', updatedAuction);
    }
    return updatedAuction;
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Update an auction', description: 'Only the auction creator can update. Cannot update active/ended auctions.' })
  @ApiParam({ name: 'id', description: 'Auction UUID' })
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAuctionDto,
    @CurrentUser() user: User,
  ): Promise<Auction> {
    return this.auctionsService.update(id, updateDto, user.id);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Delete an auction', description: 'Auction creator or admin can delete. Cannot delete active auctions with bids.' })
  @ApiParam({ name: 'id', description: 'Auction UUID' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: User): Promise<void> {
    return this.auctionsService.remove(id, user.id, user.role);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Manually end an auction early', description: 'Seller can end their own auction before the scheduled end time.' })
  @ApiParam({ name: 'id', description: 'Auction UUID' })
  @UseGuards(JwtAuthGuard)
  @Post(':id/end')
  async manualEnd(@Param('id') id: string, @CurrentUser() user: User) {
    const endedAuction = await this.auctionsService.manualEndAuction(id, user.id);
    if (endedAuction) {
      this.auctionsGateway.server.to(`auction-${id}`).emit('auctionEnded', endedAuction);
    }
    return endedAuction;
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Mark auction as paid', description: 'Auction winner confirms payment. Updates payment status.' })
  @ApiParam({ name: 'id', description: 'Auction UUID' })
  @UseGuards(JwtAuthGuard)
  @Post(':id/pay')
  async markAsPaid(@Param('id') id: string, @CurrentUser() user: User) {
    return this.auctionsService.markAsPaid(id, user.id);
  }
}
