import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Auction } from '../auctions/auction.entity';

@Entity()
export class Bid {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @ManyToOne(() => User, user => user.bids)
  bidder: User;

  @ManyToOne(() => Auction, auction => auction.bids)
  auction: Auction;

  @CreateDateColumn()
  createdAt: Date;
}
