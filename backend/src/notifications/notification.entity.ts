import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum NotificationType {
  OUTBID = 'outbid',
  AUCTION_ENDING = 'auction_ending',
  AUCTION_WON = 'auction_won',
  AUCTION_LOST = 'auction_lost',
  PAYMENT_STATUS = 'payment_status',
  NEW_BID = 'new_bid',
}

@Entity('notifications')
@Index(['user', 'isRead'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.notifications, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column()
  message: string;

  @Column({ nullable: true })
  relatedAuctionId: string;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
