import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/user.entity';
import { Auction, AuctionStatus } from '../auctions/auction.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Auction)
    private auctionsRepository: Repository<Auction>,
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
    });
    return {
      data: users.map(u => {
        const { password, ...rest } = u;
        return rest;
      }),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async toggleUserStatus(userId: string): Promise<{ isActive: boolean }> {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === UserRole.ADMIN) throw new NotFoundException('Cannot ban admin users');

    user.isActive = !user.isActive;
    await this.usersRepository.save(user);
    
    return { isActive: user.isActive };
  }

  async cancelAuction(auctionId: string): Promise<void> {
    const auction = await this.auctionsRepository.findOneBy({ id: auctionId });
    if (!auction) throw new NotFoundException('Auction not found');

    auction.status = AuctionStatus.CANCELLED;
    await this.auctionsRepository.save(auction);
  }
}
