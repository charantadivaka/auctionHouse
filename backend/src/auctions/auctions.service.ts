import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Brackets } from 'typeorm';
import { Auction, AuctionStatus, AuctionType, PaymentStatus } from './auction.entity';
import { Bid } from '../bids/bid.entity';
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

    const startTimeDate = createAuctionDto.startTime
      ? new Date(createAuctionDto.startTime)
      : new Date();
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

    // Schedule endAuction job (skip for manual auctions to avoid ghost jobs)
    if (savedAuction.auctionType !== AuctionType.MANUAL) {
      const delay = savedAuction.endTime.getTime() - Date.now();
      if (delay > 0) {
        await this.auctionsQueue.add(
          'endAuction',
          { auctionId: savedAuction.id },
          { delay, jobId: `auction-${savedAuction.id}` },
        );
      }
    }

    // FEAT-01: If the auction is PENDING (future startTime), schedule activation job
    if (savedAuction.status === AuctionStatus.PENDING) {
      const activateDelay = savedAuction.startTime.getTime() - Date.now();
      if (activateDelay > 0) {
        await this.auctionsQueue.add(
          'activateAuction',
          { auctionId: savedAuction.id },
          { delay: activateDelay, jobId: `activate-auction-${savedAuction.id}` },
        );
      }
    }

    return savedAuction;
  }

  async findAll(query: QueryAuctionDto) {
    const {
      search,
      seller,
      category,
      status,
      condition,
      auctionType,
      minPrice,
      maxPrice,
      sort,
      page = '1',
      limit = '12',
    } = query;

    const qb = this.auctionsRepository
      .createQueryBuilder('auction')
      .leftJoinAndSelect('auction.creator', 'creator')
      .leftJoinAndSelect('auction.category', 'cat')
      .loadRelationCountAndMap('auction.bidsCount', 'auction.bids');

    if (search) {
      qb.andWhere(
        new Brackets((cb) => {
          cb.where('auction.title ILIKE :search', { search: `%${search}%` }).orWhere(
            'auction.description ILIKE :search',
            { search: `%${search}%` },
          );
        }),
      );
    }

    if (seller) {
      qb.andWhere('creator.name ILIKE :seller', { seller: `%${seller}%` });
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

    if (auctionType) {
      qb.andWhere('auction.auctionType = :auctionType', { auctionType });
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
        qb.orderBy('auction.endTime', 'ASC').andWhere('auction.status = :activeStatus', {
          activeStatus: AuctionStatus.ACTIVE,
        });
        break;
      case 'most_viewed':
        qb.orderBy('auction.viewCount', 'DESC');
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

  // Internal fetch — no side effects. Use for service-to-service calls.
  async findOneInternal(id: string): Promise<Auction> {
    const auction = await this.auctionsRepository.findOne({
      where: { id },
      relations: ['creator', 'category'],
    });
    if (!auction) {
      throw new NotFoundException(`Auction with id "${id}" not found`);
    }
    return auction;
  }

  // Public fetch — increments viewCount. Use only for user-facing GET requests.
  async findOne(id: string, viewerId?: string): Promise<Auction> {
    const auction = await this.findOneInternal(id);
    
    // Increment view count only if viewer is not the creator
    if (!viewerId || viewerId !== auction.creator.id) {
      await this.auctionsRepository.increment({ id }, 'viewCount', 1);
      auction.viewCount += 1; // reflect in returned object
    }
    
    return auction;
  }

  async update(id: string, updateDto: UpdateAuctionDto, userId: string): Promise<Auction> {
    // BUG-09: Use findOneInternal so update doesn't inflate viewCount
    const auction = await this.findOneInternal(id);

    if (auction.creator.id !== userId) {
      throw new ForbiddenException('You can only edit your own auctions');
    }

    if (auction.status !== AuctionStatus.PENDING && auction.status !== AuctionStatus.ACTIVE) {
      throw new BadRequestException('Cannot edit an auction that has ended');
    }

    // BUG FIX: Block changing reservePrice and minBidIncrement if bids exist
    const bidsCount = await this.dataSource.getRepository(Bid).count({ where: { auction: { id } } });
    if (bidsCount > 0) {
      if (updateDto.reservePrice !== undefined && Number(updateDto.reservePrice) !== Number(auction.reservePrice)) {
        throw new BadRequestException('Cannot change reserve price after bids have been placed');
      }
      if (updateDto.minBidIncrement !== undefined && Number(updateDto.minBidIncrement) !== Number(auction.minBidIncrement)) {
        throw new BadRequestException('Cannot change minimum bid increment after bids have been placed');
      }
    }

    let endTimeChanged = false;
    if (updateDto.endTime) {
      const newEndTime = new Date(updateDto.endTime);
      if (newEndTime.getTime() !== auction.endTime.getTime()) {
        endTimeChanged = true;
      }
    }

    // BUG-09: Only apply safe, whitelisted fields — never allow currentPrice/status/winnerId
    const safeFields: (keyof UpdateAuctionDto)[] = [
      'title',
      'description',
      'images',
      'condition',
      'minBidIncrement',
      'reservePrice',
      'endTime',
      'location',
      'shippingInfo',
    ];
    for (const field of safeFields) {
      if (updateDto[field] !== undefined) {
        (auction as any)[field] = updateDto[field];
      }
    }

    if (updateDto.categoryId) {
      auction.category = { id: updateDto.categoryId } as any;
    }

    const saved = await this.auctionsRepository.save(auction);

    // BUG FIX: Reschedule BullMQ job if endTime changed
    if (endTimeChanged && saved.status !== AuctionStatus.CANCELLED && saved.status !== AuctionStatus.SOLD) {
      await this.auctionsQueue.remove(`auction-${id}`).catch(() => null);
      const delay = saved.endTime.getTime() - Date.now();
      if (delay > 0) {
        await this.auctionsQueue.add(
          'endAuction',
          { auctionId: saved.id },
          { delay, jobId: `auction-${saved.id}` }
        );
      } else {
        // If the new end time is already in the past, end it immediately
        await this.endAuction(saved.id);
      }
    }

    return saved;
  }

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    // BUG-02: Use internal to avoid viewCount side effect on delete
    const auction = await this.findOneInternal(id);

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
      // BUG FIX: Prevent N+1 memory exhaustion by avoiding fetching all bids
      const auction = await queryRunner.manager.findOne(Auction, {
        where: { id: auctionId },
        lock: { mode: 'pessimistic_write' },
        relations: ['creator'],
      });

      if (!auction) throw new NotFoundException('Auction not found');
      if (auction.status !== AuctionStatus.ACTIVE)
        throw new BadRequestException('Auction is not active');
      if (auction.creator.id === bidderId)
        throw new BadRequestException('You cannot bid on your own auction');

      auctionTitle = auction.title;

      const highestBid = await queryRunner.manager.findOne(Bid, {
        where: { auction: { id: auctionId } },
        order: { amount: 'DESC' },
        relations: ['bidder'],
      });

      const currentPriceNum = Number(auction.currentPrice);
      const minBid =
        currentPriceNum === Number(auction.startingPrice) && !highestBid
          ? currentPriceNum
          : currentPriceNum + Number(auction.minBidIncrement);

      if (amount < minBid) {
        throw new BadRequestException(`Bid must be at least $${minBid.toFixed(2)}`);
      }

      // Check for outbid
      if (highestBid && highestBid.bidder.id !== bidderId) {
        outbidUserId = highestBid.bidder.id;
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
        // BUG-17: Always use the same job ID so repeated anti-snipe extensions
        // correctly remove the previous job before scheduling a new one.
        await this.auctionsQueue.remove(`auction-${auctionId}`).catch(() => null);
        await this.auctionsQueue
          .add(
            'endAuction',
            { auctionId: auction.id },
            { delay: 30_000, jobId: `auction-${auction.id}` },
          )
          .catch((e) => new Logger(AuctionsService.name).error('Failed to add extended job:', e));
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
        auctionId,
      );
      this.notificationsGateway.sendNotificationToUser(outbidUserId, notif);
    }

    // BUG-02: Use findOneInternal so returning after bid doesn't inflate viewCount
    return this.findOneInternal(auctionId);
  }

  async endAuction(auctionId: string): Promise<Auction> {
    const auction = await this.auctionsRepository.findOne({
      where: { id: auctionId },
      relations: ['bids', 'bids.bidder', 'creator'],
    });

    if (!auction) throw new NotFoundException('Auction not found');
    // Allow ending PENDING auctions too (edge case: very short start→end window)
    if (auction.status !== AuctionStatus.ACTIVE && auction.status !== AuctionStatus.PENDING)
      return auction;

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
        auction.id,
      );
      this.notificationsGateway.sendNotificationToUser(winnerId, notifWinner);

      const notifSeller = await this.notificationsService.create(
        auction.creator.id,
        NotificationType.AUCTION_WON,
        `Your item "${auction.title}" has sold to a bidder for $${winnerAmount}.`,
        auction.id,
      );
      this.notificationsGateway.sendNotificationToUser(auction.creator.id, notifSeller);
    } else if (auction.status === AuctionStatus.CANCELLED) {
      const notifSeller = await this.notificationsService.create(
        auction.creator.id,
        NotificationType.AUCTION_ENDING, // Re-using type for ended
        `Your auction "${auction.title}" ended without a winner.`,
        auction.id,
      );
      this.notificationsGateway.sendNotificationToUser(auction.creator.id, notifSeller);
    }

    return savedAuction;
  }

  // FEAT-01: Activate a PENDING auction — called by BullMQ activateAuction job
  async activateAuction(auctionId: string): Promise<void> {
    const auction = await this.auctionsRepository.findOneBy({ id: auctionId });
    if (!auction || auction.status !== AuctionStatus.PENDING) return;

    auction.status = AuctionStatus.ACTIVE;
    await this.auctionsRepository.save(auction);
  }

  // Manual auction end — seller triggers this explicitly
  async manualEndAuction(auctionId: string, userId: string): Promise<Auction> {
    const auction = await this.findOneInternal(auctionId);
    if (auction.creator.id !== userId) {
      throw new ForbiddenException('Only the seller can manually end this auction');
    }
    if (auction.auctionType !== AuctionType.MANUAL) {
      throw new BadRequestException('Only manual auctions can be ended manually');
    }
    if (auction.status !== AuctionStatus.ACTIVE) {
      throw new BadRequestException('Auction is not active');
    }
    // Cancel the BullMQ timed job if one exists
    await this.auctionsQueue.remove(`auction-${auctionId}`).catch(() => null);
    return this.endAuction(auctionId);
  }

  // FEAT-03: Check if a specific auction is in the user's watchlist
  async isInWatchlist(_userId: string, _auctionId: string): Promise<boolean> {
    // Delegated to WatchlistService; this is a thin helper used by the controller
    // The actual implementation lives in WatchlistService
    return false; // Overridden by WatchlistService.isWatchlisted
  }

  async findMine(userId: string, limit: number = 4) {
    const [items, total] = await this.auctionsRepository.findAndCount({
      where: { creator: { id: userId } },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['creator', 'category'],
    });

    return {
      data: items,
      total,
      limit,
    };
  }

  async markAsPaid(auctionId: string, userId: string): Promise<Auction> {
    const auction = await this.findOneInternal(auctionId);

    if (auction.status !== AuctionStatus.SOLD) {
      throw new BadRequestException('Only sold auctions can be marked as paid');
    }
    if (auction.winnerId !== userId) {
      throw new ForbiddenException('Only the auction winner can confirm payment');
    }
    if (auction.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('This auction has already been marked as paid');
    }

    auction.paymentStatus = PaymentStatus.PAID;
    const saved = await this.auctionsRepository.save(auction);

    // Notify the seller that payment has been confirmed
    try {
      await this.notificationsService.create(
        auction.creator.id,
        NotificationType.PAYMENT_STATUS,
        `The winner has confirmed payment for "${auction.title}".`,
        auction.id,
      );
      this.notificationsGateway.sendNotificationToUser(auction.creator.id, {
        type: NotificationType.PAYMENT_STATUS,
        message: `The winner has confirmed payment for "${auction.title}".`,
        auctionId: auction.id,
      });
    } catch {
      // notification failure must never break the payment flow
    }

    return saved;
  }
}
