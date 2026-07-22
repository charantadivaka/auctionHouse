import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Auction } from '../auctions/auction.entity';

@Entity('watchlist_items')
@Unique(['user', 'auction'])
export class WatchlistItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.watchlistItems, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Auction, (auction) => auction.watchlistItems, {
    onDelete: 'CASCADE',
  })
  auction: Auction;

  @CreateDateColumn()
  createdAt: Date;
}
