import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { User, UserRole } from '../users/user.entity';
import { Auction, AuctionStatus } from '../auctions/auction.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Auction)
    private auctionsRepository: Repository<Auction>,
    // BUG-07: Inject queue so we can remove scheduled endAuction jobs on cancel
    @InjectQueue('auctions') private auctionsQueue: Queue,
  ) {}

  async getStats() {
    const totalUsers = await this.usersRepository.count();
    const totalAuctions = await this.auctionsRepository.count();

    const activeAuctions = await this.auctionsRepository.count({
      where: { status: AuctionStatus.ACTIVE },
    });
    const soldAuctions = await this.auctionsRepository.count({
      where: { status: AuctionStatus.SOLD },
    });

    const recentUsers = await this.usersRepository.find({
      order: { createdAt: 'DESC' },
      take: 5,
      select: ['id', 'name', 'email', 'createdAt', 'isActive'],
    });

    return {
      totalUsers,
      totalAuctions,
      activeAuctions,
      soldAuctions,
      recentUsers,
    };
  }

  async getAllUsers(page: number = 1, limit: number = 20) {
    const [users, total] = await this.usersRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      // BUG-05: Exclude password at DB level as defense-in-depth
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        avatarUrl: true,
        sellerRating: true,
        totalRatingsCount: true,
        totalSales: true,
        totalPurchases: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return {
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async toggleUserStatus(userId: string): Promise<{ isActive: boolean }> {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');
    // BUG-18: Use ForbiddenException (user exists, operation is not permitted)
    if (user.role === UserRole.ADMIN)
      throw new ForbiddenException('Cannot change status of admin users');

    user.isActive = !user.isActive;
    await this.usersRepository.save(user);

    return { isActive: user.isActive };
  }

  async cancelAuction(auctionId: string): Promise<void> {
    const auction = await this.auctionsRepository.findOneBy({ id: auctionId });
    if (!auction) throw new NotFoundException('Auction not found');

    // BUG-07: Also remove the scheduled BullMQ job so it doesn't fire after cancel
    await this.auctionsQueue.remove(`auction-${auctionId}`).catch(() => null);

    auction.status = AuctionStatus.CANCELLED;
    await this.auctionsRepository.save(auction);
  }
}
