import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Auction, AuctionStatus } from './auction.entity';
import { Bid } from '../bids/bid.entity';
import { User } from '../users/user.entity';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CreateAuctionDto } from './dto/create-auction.dto';

@Injectable()
export class AuctionsService {
  constructor(
    @InjectRepository(Auction)
    private auctionsRepository: Repository<Auction>,
    @InjectRepository(Bid)
    private bidsRepository: Repository<Bid>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private dataSource: DataSource,
    @InjectQueue('auctions') private auctionsQueue: Queue,
  ) {}

  async create(createAuctionDto: CreateAuctionDto, creatorId: string): Promise<Auction> {
    const endTimeDate = new Date(createAuctionDto.endTime);
    if (endTimeDate <= new Date()) {
      throw new BadRequestException('End time must be in the future');
    }

    const auction = this.auctionsRepository.create({
      ...createAuctionDto,
      endTime: endTimeDate,
      currentPrice: createAuctionDto.startingPrice,
      creator: { id: creatorId },
    });
    const savedAuction = await this.auctionsRepository.save(auction);

    const delay = savedAuction.endTime.getTime() - Date.now();
    if (delay > 0) {
      await this.auctionsQueue.add(
        'endAuction',
        { auctionId: savedAuction.id },
        { delay, jobId: `auction-${savedAuction.id}` },
      );
    }

    return savedAuction;
  }

  async findAll(): Promise<Auction[]> {
    return this.auctionsRepository.find({
      relations: ['creator', 'bids', 'bids.bidder'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Auction> {
    const auction = await this.auctionsRepository.findOne({
      where: { id },
      relations: ['creator', 'bids', 'bids.bidder'],
    });
    if (!auction) {
      throw new NotFoundException(`Auction with id "${id}" not found`);
    }
    return auction;
  }

  async placeBid(auctionId: string, bidderId: string, amount: number): Promise<Auction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const auction = await queryRunner.manager.findOne(Auction, {
        where: { id: auctionId },
        lock: { mode: 'pessimistic_write' },
        relations: ['bids'],
      });

      if (!auction) {
        throw new NotFoundException('Auction not found');
      }
      if (auction.status !== AuctionStatus.ACTIVE) {
        throw new BadRequestException('Auction is not active');
      }

      const currentPriceNum = Number(auction.currentPrice);
      if (amount <= currentPriceNum) {
        throw new BadRequestException(
          `Bid must be higher than current price of $${currentPriceNum.toFixed(2)}`,
        );
      }

      // Create bid as a proper entity via the manager to get id/createdAt
      const bid = queryRunner.manager.create(Bid, {
        amount,
        bidder:  { id: bidderId },
        auction: { id: auctionId },
      });
      await queryRunner.manager.save(Bid, bid);

      // Update auction price
      auction.currentPrice = amount;

      // Anti-sniping: extend by 30 s if bid placed in last 30 s
      const now = new Date();
      const timeLeft = auction.endTime.getTime() - now.getTime();
      if (timeLeft < 30_000) {
        auction.endTime = new Date(now.getTime() + 30_000);
        await this.auctionsQueue.remove(`auction-${auctionId}`).catch(() => null);
        await this.auctionsQueue.add(
          'endAuction',
          { auctionId: auction.id },
          { delay: 30_000, jobId: `auction-${auction.id}` },
        );
      }

      await queryRunner.manager.save(Auction, auction);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    // Return fresh auction with all relations
    return this.findOne(auctionId);
  }

  async endAuction(auctionId: string): Promise<void> {
    const auction = await this.findOne(auctionId);

    // Guard: only close active auctions
    if (auction.status !== AuctionStatus.ACTIVE) return;

    if (auction.bids && auction.bids.length > 0) {
      const highestBid = auction.bids.reduce(
        (max, bid) => (Number(bid.amount) > Number(max.amount) ? bid : max),
        auction.bids[0],
      );
      auction.status   = AuctionStatus.SOLD;
      auction.winnerId = highestBid.bidder.id;
    } else {
      // No bids — mark as cancelled (not sold)
      auction.status = AuctionStatus.CANCELLED;
    }

    await this.auctionsRepository.save(auction);
  }

  /** Seed demo users and a sample auction — development use only */
  async seedDemo(): Promise<Auction> {
    // Upsert user 1 (creator)
    let user1 = await this.usersRepository.findOneBy({ id: '00000000-0000-0000-0000-000000000001' });
    if (!user1) {
      user1 = this.usersRepository.create({
        id:    '00000000-0000-0000-0000-000000000001',
        name:  'Test User 1',
        email: 'test1@example.com',
      });
      await this.usersRepository.save(user1);
    }

    // Upsert user 2 (bidder)
    let user2 = await this.usersRepository.findOneBy({ id: '00000000-0000-0000-0000-000000000002' });
    if (!user2) {
      user2 = this.usersRepository.create({
        id:    '00000000-0000-0000-0000-000000000002',
        name:  'Test User 2 (Bidder)',
        email: 'test2@example.com',
      });
      await this.usersRepository.save(user2);
    }

    const endTime = new Date(Date.now() + 5 * 60 * 1_000); // 5 min
    return this.create(
      {
        title:         'Vintage Watch',
        description:   'Beautiful vintage mechanical watch from the 1960s, in excellent condition.',
        startingPrice: 100,
        endTime:       endTime.toISOString(),
      },
      user1.id,
    );
  }
}

