import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bid } from './bid.entity';
import { BidsService } from './bids.service';
import { BidsController } from './bids.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Bid])],
  providers: [BidsService],
  controllers: [BidsController],
  exports: [BidsService],
})
export class BidsModule {}
