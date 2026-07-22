import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

import { Auction } from './auction.entity';
import { AuctionsService } from './auctions.service';
import { AuctionsController } from './auctions.controller';
import { AuctionsGateway } from './auctions.gateway';
import { AuctionProcessor } from './auction.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Auction]),
    BullModule.registerQueue({
      name: 'auctions',
    }),
    JwtModule,
    ConfigModule,
  ],
  providers: [AuctionsService, AuctionsGateway, AuctionProcessor],
  controllers: [AuctionsController],
  exports: [AuctionsService],
})
export class AuctionsModule {}
