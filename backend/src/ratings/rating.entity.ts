import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Unique,
  Check,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Auction } from '../auctions/auction.entity';

@Entity('ratings')
@Unique(['reviewer', 'auction'])
@Check('"stars" >= 1 AND "stars" <= 5')
export class Rating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.ratingsGiven, { onDelete: 'CASCADE' })
  reviewer: User;

  @ManyToOne(() => User, (user) => user.ratingsReceived, { onDelete: 'CASCADE' })
  seller: User;

  @ManyToOne(() => Auction, { onDelete: 'CASCADE' })
  auction: Auction;

  @Column({ type: 'int' })
  stars: number;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @CreateDateColumn()
  createdAt: Date;
}
