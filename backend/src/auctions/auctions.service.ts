import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Brackets } from 'typeorm';
import { Auction, AuctionStatus } from './auction.entity';
import { Bid } from '../bids/bid.entity';
import { User } from '../users/user.entity';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';
import { QueryAuctionDto } from './dto/query-auction.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationType } from '../notifications/notification.entity';

@Injectable()
export class AuctionsService {
  constructor(
    @InjectRepository(Auction)
    private auctionsRepository: Repository<Auction>,
    private dataSource: DataSource,
    @InjectQueue('auctions') private auctionsQueue: Queue,
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  async create(createAuctionDto: CreateAuctionDto, creatorId: string): Promise<Auction> {
    const endTimeDate = new Date(createAuctionDto.endTime);
    if (endTimeDate <= new Date()) {
      throw new BadRequestException('End time must be in the future');
    }

    const startTimeDate = createAuctionDto.startTime ? new Date(createAuctionDto.startTime) : new Date();
    if (startTimeDate >= endTimeDate) {
      throw new BadRequestException('Start time must be before end time');
    }

    const auction = this.auctionsRepository.create({
      ...createAuctionDto,
      startTime: startTimeDate,
      endTime: endTimeDate,
      currentPrice: createAuctionDto.startingPrice,
      creator: { id: creatorId },
      status: startTimeDate > new Date() ? AuctionStatus.PENDING : AuctionStatus.ACTIVE,
    });
    
    if (createAuctionDto.categoryId) {
      auction.category = { id: createAuctionDto.categoryId } as any;
    }

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

  async findAll(query: QueryAuctionDto) {
    const { search, category, status, condition, minPrice, maxPrice, sort, page = '1', limit = '12' } = query;
    
    const qb = this.auctionsRepository.createQueryBuilder('auction')
      .leftJoinAndSelect('auction.creator', 'creator')
      .leftJoinAndSelect('auction.category', 'cat')
      .loadRelationCountAndMap('auction.bidsCount', 'auction.bids');

    if (search) {
      qb.andWhere(new Brackets(cb => {
        cb.where('auction.title ILIKE :search', { search: `%${search}%` })
          .orWhere('auction.description ILIKE :search', { search: `%${search}%` });
      }));
    }

    if (category) {
      qb.andWhere('cat.slug = :category', { category });
    }

    if (status) {
      qb.andWhere('auction.status = :status', { status });
    }

    if (condition) {
      qb.andWhere('auction.condition = :condition', { condition });
    }

    if (minPrice) {
      qb.andWhere('auction.currentPrice >= :minPrice', { minPrice: Number(minPrice) });
    }

    if (maxPrice) {
      qb.andWhere('auction.currentPrice <= :maxPrice', { maxPrice: Number(maxPrice) });
    }

    switch (sort) {
      case 'price_asc':
        qb.orderBy('auction.currentPrice', 'ASC');
        break;
      case 'price_desc':
        qb.orderBy('auction.currentPrice', 'DESC');
        break;
      case 'ending_soon':
        qb.orderBy('auction.endTime', 'ASC').andWhere('auction.status = :activeStatus', { activeStatus: AuctionStatus.ACTIVE });
        break;
      case 'newest':
      default:
        qb.orderBy('auction.createdAt', 'DESC');
        break;
    }

    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 12;
    qb.skip((pageNumber - 1) * limitNumber).take(limitNumber);

    const [items, total] = await qb.getManyAndCount();

    return {
      data: items,
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
    };
  }

  async findOne(id: string): Promise<Auction> {
    const auction = await this.auctionsRepository.findOne({
      where: { id },
      relations: ['creator', 'category'],
    });
    
    if (!auction) {
      throw new NotFoundException(`Auction with id "${id}" not found`);
    }

    auction.viewCount += 1;
    await this.auctionsRepository.save(auction);
    
    return auction;
  }

  async update(id: string, updateDto: UpdateAuctionDto, userId: string): Promise<Auction> {
    const auction = await this.findOne(id);
    
    if (auction.creator.id !== userId) {
      throw new ForbiddenException('You can only edit your own auctions');
    }
    
    if (auction.status !== AuctionStatus.PENDING && auction.status !== AuctionStatus.ACTIVE) {
      throw new BadRequestException('Cannot edit an auction that has ended');
    }

    Object.assign(auction, updateDto);
    
    if (updateDto.categoryId) {
      auction.category = { id: updateDto.categoryId } as any;
    }

    return this.auctionsRepository.save(auction);
  }

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    const auction = await this.findOne(id);
    
    if (auction.creator.id !== userId && userRole !== 'admin') {
      throw new ForbiddenException('You can only delete your own auctions');
    }
    
    await this.auctionsQueue.remove(`auction-${id}`).catch(() => null);
    await this.auctionsRepository.remove(auction);
  }

  async placeBid(auctionId: string, bidderId: string, amount: number): Promise<Auction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    let outbidUserId: string | null = null;
    let auctionTitle = '';

    try {
      const auction = await queryRunner.manager.findOne(Auction, {
        where: { id: auctionId },
        lock: { mode: 'pessimistic_write' },
        relations: ['bids', 'bids.bidder', 'creator'], 
      });

      if (!auction) throw new NotFoundException('Auction not found');
      if (auction.status !== AuctionStatus.ACTIVE) throw new BadRequestException('Auction is not active');
      if (auction.creator.id === bidderId) throw new BadRequestException('You cannot bid on your own auction');

      auctionTitle = auction.title;

      const currentPriceNum = Number(auction.currentPrice);
      const minBid = currentPriceNum === Number(auction.startingPrice) && (!auction.bids || auction.bids.length === 0) 
        ? currentPriceNum 
        : currentPriceNum + Number(auction.minBidIncrement);

      if (amount < minBid) {
        throw new BadRequestException(`Bid must be at least $${minBid.toFixed(2)}`);
      }

      // Check for outbid
      if (auction.bids && auction.bids.length > 0) {
        const highestBid = auction.bids.reduce(
          (max, b) => (Number(b.amount) > Number(max.amount) ? b : max),
          auction.bids[0]
        );
        if (highestBid.bidder.id !== bidderId) {
          outbidUserId = highestBid.bidder.id;
        }
      }

      const reserveMet = auction.reservePrice ? amount >= Number(auction.reservePrice) : true;
      auction.isReserveMet = reserveMet;

      const bid = queryRunner.manager.create(Bid, {
        amount,
        bidder: { id: bidderId },
        auction: { id: auctionId },
      });
      await queryRunner.manager.save(Bid, bid);

      auction.currentPrice = amount;

      const now = new Date();
      const timeLeft = auction.endTime.getTime() - now.getTime();
      if (timeLeft < 30_000) {
        auction.endTime = new Date(now.getTime() + 30_000);
        await this.auctionsQueue.remove(`auction-${auctionId}`).catch(() => null);
        await this.auctionsQueue.add(
          'endAuction',
          { auctionId: auction.id },
          { delay: 30_000, jobId: `auction-${auction.id}-extended-${now.getTime()}` },
        ).catch(e => console.error('Failed to add extended job:', e));
      }

      await queryRunner.manager.save(Auction, auction);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    // Send notification outside of transaction
    if (outbidUserId) {
      const notif = await this.notificationsService.create(
        outbidUserId,
        NotificationType.OUTBID,
        `You have been outbid on "${auctionTitle}".`,
        auctionId
      );
      this.notificationsGateway.sendNotificationToUser(outbidUserId, notif);
    }

    return this.findOne(auctionId);
  }

  async endAuction(auctionId: string): Promise<Auction> {
    const auction = await this.auctionsRepository.findOne({
      where: { id: auctionId },
      relations: ['bids', 'bids.bidder', 'creator'],
    });

    if (!auction) throw new NotFoundException('Auction not found');
    if (auction.status !== AuctionStatus.ACTIVE) return auction;

    let winnerId: string | null = null;
    let winnerAmount = 0;

    if (auction.bids && auction.bids.length > 0) {
      const highestBid = auction.bids.reduce(
        (max, bid) => (Number(bid.amount) > Number(max.amount) ? bid : max),
        auction.bids[0],
      );
      
      if (auction.reservePrice && Number(highestBid.amount) < Number(auction.reservePrice)) {
        auction.status = AuctionStatus.CANCELLED;
      } else {
        auction.status = AuctionStatus.SOLD;
        auction.winnerId = highestBid.bidder.id;
        winnerId = highestBid.bidder.id;
        winnerAmount = highestBid.amount;
        
        highestBid.isWinningBid = true;
        await this.dataSource.getRepository(Bid).save(highestBid);
      }
    } else {
      auction.status = AuctionStatus.CANCELLED;
    }

    const savedAuction = await this.auctionsRepository.save(auction);

    // Notifications
    if (auction.status === AuctionStatus.SOLD && winnerId) {
      const notifWinner = await this.notificationsService.create(
        winnerId,
        NotificationType.AUCTION_WON,
        `Congratulations! You won "${auction.title}" for $${winnerAmount}.`,
        auction.id
      );
      this.notificationsGateway.sendNotificationToUser(winnerId, notifWinner);

      const notifSeller = await this.notificationsService.create(
        auction.creator.id,
        NotificationType.AUCTION_WON,
        `Your item "${auction.title}" has sold to a bidder for $${winnerAmount}.`,
        auction.id
      );
      this.notificationsGateway.sendNotificationToUser(auction.creator.id, notifSeller);
    } else if (auction.status === AuctionStatus.CANCELLED) {
      const notifSeller = await this.notificationsService.create(
        auction.creator.id,
        NotificationType.AUCTION_ENDING, // Re-using type for ended
        `Your auction "${auction.title}" ended without a winner.`,
        auction.id
      );
      this.notificationsGateway.sendNotificationToUser(auction.creator.id, notifSeller);
    }

    return savedAuction;
  }
}
