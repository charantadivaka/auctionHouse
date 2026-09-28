import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { Auction } from '../auctions/auction.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  iconUrl: string;

  @OneToMany(() => Auction, (auction) => auction.category)
  auctions: Auction[];

  @CreateDateColumn()
  createdAt: Date;
}
