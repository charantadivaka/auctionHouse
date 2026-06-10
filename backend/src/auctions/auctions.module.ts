import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Auction } from './auction.entity';
import { User } from '../users/user.entity';
import { Bid } from '../bids/bid.entity';
import { AuctionsService } from './auctions.service';
import { AuctionsController } from './auctions.controller';
import { AuctionsGateway } from './auctions.gateway';
import { AuctionProcessor } from './auction.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Auction, User, Bid]),
    BullModule.registerQueue({
      name: 'auctions',
    }),
  ],
  providers: [AuctionsService, AuctionsGateway, AuctionProcessor],
  controllers: [AuctionsController],
  exports: [AuctionsService],
})
export class AuctionsModule {}
