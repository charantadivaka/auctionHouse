import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { User } from '../users/user.entity';
import { Auction } from '../auctions/auction.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Auction]),
    // BUG-07: Import the auctions queue so AdminService can remove jobs on cancel
    BullModule.registerQueue({ name: 'auctions' }),
  ],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
