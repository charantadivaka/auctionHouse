import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Bid } from '../bids/bid.entity';
import { Category } from '../categories/category.entity';
import { WatchlistItem } from '../watchlist/watchlist.entity';

export enum AuctionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SOLD = 'sold',
  CANCELLED = 'cancelled',
}

export enum AuctionCondition {
  NEW = 'new',
  LIKE_NEW = 'like_new',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
}

export enum AuctionType {
  TIMED = 'timed',
  MANUAL = 'manual',
}

export enum PaymentStatus {
  NONE = 'none',
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}

@Entity('auctions')
@Index(['status', 'endTime'])
// BUG-23: Index createdAt for efficient ORDER BY in default listing sort
@Index('idx_auction_created_at', ['createdAt'])
export class Auction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column('simple-json', { default: '[]' })
  images: string[];

  @ManyToOne(() => Category, (category) => category.auctions, {
    nullable: true,
    eager: false,
  })
  category: Category;

  @Column({ nullable: true })
  categoryId: string;

  @Column({
    type: 'enum',
    enum: AuctionCondition,
    default: AuctionCondition.GOOD,
  })
  condition: AuctionCondition;

  @Column('decimal', { precision: 10, scale: 2 })
  startingPrice: number;

  @Column('decimal', { precision: 10, scale: 2 })
  currentPrice: number;

  @Column('decimal', { precision: 10, scale: 2, default: 1 })
  minBidIncrement: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  reservePrice: number | null;

  @Column({ default: false })
  isReserveMet: boolean;

  @Column({ type: 'varchar', nullable: true })
  videoUrl: string | null;

  @Column({ type: 'enum', enum: AuctionType, default: AuctionType.TIMED })
  auctionType: AuctionType;

  @Column({ type: 'enum', enum: AuctionStatus, default: AuctionStatus.ACTIVE })
  status: AuctionStatus;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.NONE })
  paymentStatus: PaymentStatus;

  @Column({ type: 'timestamptz' })
  startTime: Date;

  @Column({ type: 'timestamptz' })
  endTime: Date;

  @ManyToOne(() => User, (user) => user.auctions)
  creator: User;

  @OneToMany(() => Bid, (bid) => bid.auction, { cascade: true })
  bids: Bid[];

  @OneToMany(() => WatchlistItem, (item) => item.auction)
  watchlistItems: WatchlistItem[];

  @Column({ nullable: true })
  winnerId: string;

  @Column({ default: 0 })
  viewCount: number;

  @Column({ default: 0 })
  watcherCount: number;

  @Column({ nullable: true })
  location: string;

  @Column({ type: 'text', nullable: true })
  shippingInfo: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
