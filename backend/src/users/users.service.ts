import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

export interface UpdateProfileDto {
  name?: string;
  bio?: string;
  location?: string;
  phone?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
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

    return this.usersRepository.save(user);
  }

  async getDashboardStats(id: string) {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['auctions', 'bids', 'bids.auction'],
    });
    
    if (!user) throw new NotFoundException('User not found');
    
    const activeListings = user.auctions.filter(a => a.status === 'active').length;
    const soldListings = user.auctions.filter(a => a.status === 'sold').length;
    
    const activeBids = user.bids.filter(b => b.auction.status === 'active').length;
    const wonAuctions = user.bids.filter(b => b.isWinningBid).length;

    return {
      activeListings,
      soldListings,
      activeBids,
      wonAuctions,
      totalSales: user.totalSales,
      totalPurchases: user.totalPurchases,
      sellerRating: user.sellerRating,
      totalRatingsCount: user.totalRatingsCount
    };
  }
}
