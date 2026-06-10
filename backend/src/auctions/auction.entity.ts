import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Bid } from '../bids/bid.entity';

export enum AuctionStatus {
  ACTIVE = 'active',
  SOLD = 'sold',
  CANCELLED = 'cancelled',
}

@Entity()
export class Auction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  startingPrice: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  currentPrice: number;

  @Column({ type: 'enum', enum: AuctionStatus, default: AuctionStatus.ACTIVE })
  status: AuctionStatus;

  @Column()
  endTime: Date;

  @ManyToOne(() => User, user => user.auctions)
  creator: User;

  @OneToMany(() => Bid, bid => bid.auction, { cascade: true })
  bids: Bid[];

  @Column({ nullable: true })
  winnerId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
