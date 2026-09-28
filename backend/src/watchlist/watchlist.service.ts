import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WatchlistItem } from './watchlist.entity';
import { Auction } from '../auctions/auction.entity';

@Injectable()
export class WatchlistService {
  constructor(
    @InjectRepository(WatchlistItem)
    private watchlistRepository: Repository<WatchlistItem>,
    @InjectRepository(Auction)
    private auctionsRepository: Repository<Auction>,
  ) {}

  async add(userId: string, auctionId: string): Promise<WatchlistItem> {
    const auction = await this.auctionsRepository.findOneBy({ id: auctionId });
    if (!auction) throw new NotFoundException('Auction not found');

    const existing = await this.watchlistRepository.findOne({
      where: { user: { id: userId }, auction: { id: auctionId } },
    });

    if (existing) {
      throw new ConflictException('Auction is already in your watchlist');
    }

    const item = this.watchlistRepository.create({
      user: { id: userId },
      auction: { id: auctionId },
    });

    // BUG-03: Use atomic increment to prevent race conditions
    await this.auctionsRepository.increment({ id: auctionId }, 'watcherCount', 1);

    return this.watchlistRepository.save(item);
  }

  async remove(userId: string, auctionId: string): Promise<void> {
    const item = await this.watchlistRepository.findOne({
      where: { user: { id: userId }, auction: { id: auctionId } },
    });

    if (!item) {
      throw new NotFoundException('Auction is not in your watchlist');
    }

    await this.watchlistRepository.remove(item);

    // BUG-03: Use atomic decrement, ensure it never goes below 0
    await this.auctionsRepository.decrement({ id: auctionId }, 'watcherCount', 1);
    // Guard against negative values (shouldn't happen, but safe)
    await this.auctionsRepository
      .createQueryBuilder()
      .update()
      .set({ watcherCount: () => 'GREATEST("watcherCount" - 0, 0)' })
      .where('id = :id AND "watcherCount" < 0', { id: auctionId })
      .execute()
      .catch(() => null); // non-critical, ignore if fails
  }

  // FEAT-03/BUG-12: Efficient single-item check without loading entire list
  async isWatchlisted(userId: string, auctionId: string): Promise<boolean> {
    const item = await this.watchlistRepository.findOne({
      where: { user: { id: userId }, auction: { id: auctionId } },
    });
    return !!item;
  }

  async getUserWatchlist(userId: string, page: number = 1, limit: number = 12) {
    const [items, total] = await this.watchlistRepository.findAndCount({
      where: { user: { id: userId } },
      relations: ['auction', 'auction.creator'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: items.map((i) => i.auction),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
