import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Auction, AuctionStatus } from '../auctions/auction.entity';
import { Bid } from '../bids/bid.entity';

export interface UpdateProfileDto {
  name?: string;
  bio?: string;
  location?: string;
  phone?: string;
  avatarUrl?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Auction)
    private auctionsRepository: Repository<Auction>,
    @InjectRepository(Bid)
    private bidsRepository: Repository<Bid>,
  ) {}

  // BUG-06: Paginated findAll, DB-level password exclusion
  async findAll(page: number = 1, limit: number = 20) {
    const [users, total] = await this.usersRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, name: true, email: true, role: true,
        isActive: true, avatarUrl: true, sellerRating: true,
        totalRatingsCount: true, totalSales: true,
        totalPurchases: true, createdAt: true,
      },
    });
    return { data: users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.findOne(id);
    
    if (dto.name !== undefined) user.name = dto.name;
    if (dto.bio !== undefined) user.bio = dto.bio;
    if (dto.location !== undefined) user.location = dto.location;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;

    return this.usersRepository.save(user);
  }

  // BUG-15: Use targeted COUNT queries instead of loading all relations into memory
  async getDashboardStats(id: string) {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');

    const [activeListings, soldListings, activeBids, wonAuctions] = await Promise.all([
      this.auctionsRepository.count({
        where: { creator: { id }, status: AuctionStatus.ACTIVE },
      }),
      this.auctionsRepository.count({
        where: { creator: { id }, status: AuctionStatus.SOLD },
      }),
      this.bidsRepository.count({
        where: { bidder: { id }, auction: { status: AuctionStatus.ACTIVE } },
      }),
      this.bidsRepository.count({
        where: { bidder: { id }, isWinningBid: true },
      }),
    ]);

    return {
      activeListings,
      soldListings,
      activeBids,
      wonAuctions,
      totalSales: user.totalSales,
      totalPurchases: user.totalPurchases,
      sellerRating: user.sellerRating,
      totalRatingsCount: user.totalRatingsCount,
    };
  }
}
