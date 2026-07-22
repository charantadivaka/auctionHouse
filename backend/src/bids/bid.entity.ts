import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Auction } from '../auctions/auction.entity';

@Entity('bids')
@Index(['auction', 'amount'])
export class Bid {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @ManyToOne(() => User, (user) => user.bids, { eager: false })
  bidder: User;

  @ManyToOne(() => Auction, (auction) => auction.bids, { onDelete: 'CASCADE' })
  auction: Auction;

  @Column({ default: false })
  isWinningBid: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
