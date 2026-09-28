import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
  ) {}

  async create(
    userId: string,
    type: NotificationType,
    message: string,
    relatedAuctionId?: string,
  ): Promise<Notification> {
    const notification = this.notificationsRepository.create({
      user: { id: userId },
      type,
      message,
      relatedAuctionId,
    });
    return this.notificationsRepository.save(notification);
  }

  async findByUser(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    const where: any = { user: { id: userId } };
    if (unreadOnly) {
      where.isRead = false;
    }
    return this.notificationsRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(id: string, userId: string): Promise<void> {
    const notification = await this.notificationsRepository.findOne({
      where: { id, user: { id: userId } },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.isRead = true;
    await this.notificationsRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationsRepository.update(
      { user: { id: userId }, isRead: false },
      { isRead: true },
    );
  }
}
