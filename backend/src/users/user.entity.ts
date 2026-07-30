import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Auction } from '../auctions/auction.entity';
import { Bid } from '../bids/bid.entity';
import { Notification } from '../notifications/notification.entity';
import { WatchlistItem } from '../watchlist/watchlist.entity';
import { Rating } from '../ratings/rating.entity';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ default: true })
  isEmailVerified: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'varchar', nullable: true })
  resetPasswordToken: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  resetPasswordExpires: Date | null;

  @Column({ type: 'varchar', nullable: true })
  refreshToken: string | null;

  @Column({ default: 0 })
  followersCount: number;

  @Column({ default: 0 })
  followingCount: number;

  @Column('decimal', { precision: 3, scale: 2, default: 0 })
  sellerRating: number;

  @Column({ default: 0 })
  totalRatingsCount: number;

  @Column({ default: 0 })
  totalSales: number;

  @Column({ default: 0 })
  totalPurchases: number;

  @OneToMany(() => Auction, (auction) => auction.creator)
  auctions: Auction[];

  @OneToMany(() => Bid, (bid) => bid.bidder)
  bids: Bid[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  @OneToMany(() => WatchlistItem, (item) => item.user)
  watchlistItems: WatchlistItem[];

  @OneToMany(() => Rating, (rating) => rating.seller)
  ratingsReceived: Rating[];

  @OneToMany(() => Rating, (rating) => rating.reviewer)
  ratingsGiven: Rating[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
