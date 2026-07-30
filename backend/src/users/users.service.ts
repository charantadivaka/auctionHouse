import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Follow } from './follow.entity';
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
    @InjectRepository(Follow)
    private followRepository: Repository<Follow>,
  ) {}

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
        followersCount: true, followingCount: true,
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

  async getAuctionHistory(userId: string, page: number = 1, limit: number = 10) {
    const [auctions, total] = await this.auctionsRepository.findAndCount({
      where: { creator: { id: userId } },
      relations: ['category'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data: auctions, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async followUser(followerId: string, followingId: string) {
    if (followerId === followingId) throw new BadRequestException('You cannot follow yourself');

    const existing = await this.followRepository.findOne({
      where: { follower: { id: followerId }, following: { id: followingId } },
    });
    if (existing) throw new ConflictException('Already following this user');

    const follow = this.followRepository.create({
      follower: { id: followerId } as User,
      following: { id: followingId } as User,
    });
    await this.followRepository.save(follow);

    // Update counts
    await this.usersRepository.increment({ id: followerId }, 'followingCount', 1);
    await this.usersRepository.increment({ id: followingId }, 'followersCount', 1);

    return { message: 'Following successfully' };
  }

  async unfollowUser(followerId: string, followingId: string) {
    const follow = await this.followRepository.findOne({
      where: { follower: { id: followerId }, following: { id: followingId } },
    });
    if (!follow) throw new NotFoundException('You are not following this user');

    await this.followRepository.remove(follow);
    await this.usersRepository.decrement({ id: followerId }, 'followingCount', 1);
    await this.usersRepository.decrement({ id: followingId }, 'followersCount', 1);

    return { message: 'Unfollowed successfully' };
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await this.followRepository.findOne({
      where: { follower: { id: followerId }, following: { id: followingId } },
    });
    return !!follow;
  }

  async getFollowers(userId: string) {
    const follows = await this.followRepository.find({
      where: { following: { id: userId } },
      relations: ['follower'],
    });
    return follows.map(f => {
      const { password, refreshToken, resetPasswordToken, ...u } = f.follower as any;
      return u;
    });
  }

  async getFollowing(userId: string) {
    const follows = await this.followRepository.find({
      where: { follower: { id: userId } },
      relations: ['following'],
    });
    return follows.map(f => {
      const { password, refreshToken, resetPasswordToken, ...u } = f.following as any;
      return u;
    });
  }
}
