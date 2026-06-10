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

  async findByAuction(auctionId: string): Promise<Bid[]> {
    return this.bidsRepository.find({
      where: { auction: { id: auctionId } },
      relations: ['bidder'],
      order: { createdAt: 'DESC' },
    });
  }
}
