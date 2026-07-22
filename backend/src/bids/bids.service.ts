import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bid } from './bid.entity';

@Injectable()
export class BidsService {
  constructor(
    @InjectRepository(Bid)
    private bidsRepository: Repository<Bid>,
  ) {}

  async findByAuction(auctionId: string, page: number = 1, limit: number = 20) {
    const [bids, total] = await this.bidsRepository.findAndCount({
      where: { auction: { id: auctionId } },
      relations: ['bidder'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: bids,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByUser(userId: string, page: number = 1, limit: number = 20) {
    const [bids, total] = await this.bidsRepository.findAndCount({
      where: { bidder: { id: userId } },
      relations: ['auction'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: bids,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
