import { Injectable, ConflictException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rating } from './rating.entity';
import { User } from '../users/user.entity';
import { Auction, AuctionStatus } from '../auctions/auction.entity';
import { CreateRatingDto } from './dto/create-rating.dto';

@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(Rating)
    private ratingsRepository: Repository<Rating>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Auction)
    private auctionsRepository: Repository<Auction>,
  ) {}

  async create(reviewerId: string, dto: CreateRatingDto): Promise<Rating> {
    if (reviewerId === dto.sellerId) {
      throw new BadRequestException('You cannot rate yourself');
    }

    const auction = await this.auctionsRepository.findOne({
      where: { id: dto.auctionId },
      relations: ['creator'],
    });

    if (!auction) throw new NotFoundException('Auction not found');
    if (auction.status !== AuctionStatus.SOLD) throw new BadRequestException('Auction is not sold yet');
    if (auction.winnerId !== reviewerId) throw new ForbiddenException('Only the winner can review the seller for this auction');
    if (auction.creator.id !== dto.sellerId) throw new BadRequestException('Seller ID mismatch');

    const existing = await this.ratingsRepository.findOne({
      where: { reviewer: { id: reviewerId }, auction: { id: dto.auctionId } },
    });

    if (existing) {
      throw new ConflictException('You have already rated this seller for this auction');
    }

    const rating = this.ratingsRepository.create({
      reviewer: { id: reviewerId },
      seller: { id: dto.sellerId },
      auction: { id: dto.auctionId },
      stars: dto.stars,
      comment: dto.comment,
    });

    await this.ratingsRepository.save(rating);

    // Update seller's average rating
    const seller = await this.usersRepository.findOneBy({ id: dto.sellerId });
    if (seller) {
      const allRatings = await this.ratingsRepository.find({ where: { seller: { id: dto.sellerId } } });
      const sum = allRatings.reduce((acc, r) => acc + r.stars, 0);
      seller.totalRatingsCount = allRatings.length;
      seller.sellerRating = sum / allRatings.length;
      await this.usersRepository.save(seller);
    }

    return rating;
  }

  async getBySeller(sellerId: string, page: number = 1, limit: number = 10) {
    const [ratings, total] = await this.ratingsRepository.findAndCount({
      where: { seller: { id: sellerId } },
      relations: ['reviewer', 'auction'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: ratings.map(r => ({
        ...r,
        reviewer: { id: r.reviewer.id, name: r.reviewer.name },
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
