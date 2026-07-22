import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WatchlistItem } from './watchlist.entity';
import { Auction } from '../auctions/auction.entity';
import { WatchlistService } from './watchlist.service';
import { WatchlistController } from './watchlist.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WatchlistItem, Auction])],
  providers: [WatchlistService],
  controllers: [WatchlistController],
  exports: [WatchlistService],
})
export class WatchlistModule {}
