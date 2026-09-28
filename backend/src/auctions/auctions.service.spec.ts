import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { DataSource } from 'typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuctionsService } from './auctions.service';
import { Auction, AuctionStatus, AuctionType, PaymentStatus } from './auction.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeAuction = (overrides: Partial<Auction> = {}): Auction =>
  ({
    id: 'auction-1',
    title: 'Test Auction',
    description: 'Description',
    images: [],
    startingPrice: 100,
    currentPrice: 100,
    minBidIncrement: 10,
    reservePrice: null,
    isReserveMet: false,
    status: AuctionStatus.ACTIVE,
    auctionType: AuctionType.TIMED,
    paymentStatus: PaymentStatus.NONE,
    startTime: new Date(),
    endTime: new Date(Date.now() + 3600000),
    creator: { id: 'seller-1', name: 'Seller' } as any,
    bids: [],
    watchlistItems: [],
    winnerId: null,
    viewCount: 0,
    watcherCount: 0,
    location: null,
    shippingInfo: null,
    videoUrl: null,
    condition: 'good' as any,
    category: null,
    categoryId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as any;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AuctionsService', () => {
  let service: AuctionsService;

  const repo = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    increment: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    })),
  };

  const queue = {
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    remove: jest.fn().mockResolvedValue(null),
  };

  const dataSource = {
    createQueryRunner: jest.fn(() => ({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(),
        save: jest.fn(),
        create: jest.fn(),
      },
    })),
  };

  const notificationsService = {
    create: jest.fn().mockResolvedValue({}),
  };

  const notificationsGateway = {
    sendNotificationToUser: jest.fn(),
    server: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuctionsService,
        { provide: getRepositoryToken(Auction), useValue: repo },
        { provide: DataSource, useValue: dataSource },
        { provide: getQueueToken('auctions'), useValue: queue },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: NotificationsGateway, useValue: notificationsGateway },
      ],
    }).compile();

    service = module.get<AuctionsService>(AuctionsService);
  });

  // ── create() ───────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('should throw BadRequestException if endTime is in the past', async () => {
      await expect(
        service.create(
          {
            title: 'T',
            description: 'D',
            startingPrice: 10,
            endTime: new Date(Date.now() - 1000).toISOString(),
            auctionType: AuctionType.TIMED,
          } as any,
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── findOne() ─────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('should throw NotFoundException if auction does not exist', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });

    it('should increment viewCount on successful fetch', async () => {
      const auction = makeAuction();
      repo.findOne.mockResolvedValue(auction);
      repo.increment.mockResolvedValue(undefined);
      await service.findOne(auction.id);
      expect(repo.increment).toHaveBeenCalledWith({ id: auction.id }, 'viewCount', 1);
    });
  });

  // ── markAsPaid() ──────────────────────────────────────────────────────────

  describe('markAsPaid()', () => {
    it('should throw BadRequestException if auction is not sold', async () => {
      repo.findOne.mockResolvedValue(makeAuction({ status: AuctionStatus.ACTIVE }));
      await expect(service.markAsPaid('auction-1', 'winner-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException if caller is not the winner', async () => {
      repo.findOne.mockResolvedValue(
        makeAuction({ status: AuctionStatus.SOLD, winnerId: 'actual-winner' }),
      );
      await expect(service.markAsPaid('auction-1', 'wrong-user')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if auction is already paid', async () => {
      repo.findOne.mockResolvedValue(
        makeAuction({
          status: AuctionStatus.SOLD,
          winnerId: 'winner-1',
          paymentStatus: PaymentStatus.PAID,
        }),
      );
      await expect(service.markAsPaid('auction-1', 'winner-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should mark auction as paid for the correct winner', async () => {
      const auction = makeAuction({ status: AuctionStatus.SOLD, winnerId: 'winner-1' });
      repo.findOne.mockResolvedValue(auction);
      repo.save.mockResolvedValue({ ...auction, paymentStatus: PaymentStatus.PAID });

      const result = await service.markAsPaid('auction-1', 'winner-1');
      expect(result.paymentStatus).toBe(PaymentStatus.PAID);
      expect(repo.save).toHaveBeenCalled();
    });
  });

  // ── manualEndAuction() ────────────────────────────────────────────────────

  describe('manualEndAuction()', () => {
    it('should throw ForbiddenException if caller is not the creator', async () => {
      repo.findOne.mockResolvedValue(makeAuction({ auctionType: AuctionType.MANUAL }));
      await expect(service.manualEndAuction('auction-1', 'wrong-user')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if auction is not manual type', async () => {
      repo.findOne.mockResolvedValue(makeAuction({ auctionType: AuctionType.TIMED }));
      await expect(service.manualEndAuction('auction-1', 'seller-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
